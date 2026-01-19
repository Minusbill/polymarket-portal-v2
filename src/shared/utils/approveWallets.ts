import {ethers, constants} from 'ethers';
import {config as dotenvConfig} from 'dotenv';
import {resolve} from 'path';
import fs from 'fs';
import {createLogger} from './logger';
import {ctfAbi, safeAbi} from '../abi';
import {getChainContracts} from '../config/contracts';
import {usdcAbi} from '../abi/usdcAbi';

dotenvConfig({path: resolve(process.cwd(), '.env')});

type WalletItem = {
    privateKey: string;
    publicKey: string;
    proxyPublicKey?: string;
    clobApiKey: string;
    clobSecret: string;
    clobPassPhrase: string;
};

const RPC_URL = process.env.RPC_URL || 'https://polygon.drpc.org';
const GAS_FLOOR_GWEI = 60;
const DEFAULT_JSON = resolve(process.cwd(), 'src/shared/config/poly-wallet.json');
const logger = createLogger('ApproveWallets');

const loadWallets = (filePath: string): WalletItem[] => {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as WalletItem[];
};

const signSafeTx = async (
    safe: ethers.Contract,
    owner: ethers.Wallet,
    params: {
        to: string;
        value: ethers.BigNumberish;
        data: string;
        operation: number;
        safeTxGas: ethers.BigNumberish;
        baseGas: ethers.BigNumberish;
        gasPrice: ethers.BigNumberish;
        gasToken: string;
        refundReceiver: string;
        nonce: ethers.BigNumberish;
    },
) => {
    const txHash = await safe.getTransactionHash(
        params.to,
        params.value,
        params.data,
        params.operation,
        params.safeTxGas,
        params.baseGas,
        params.gasPrice,
        params.gasToken,
        params.refundReceiver,
        params.nonce,
    );
    const sig = await owner.signMessage(ethers.utils.arrayify(txHash));
    const {r, s, v} = ethers.utils.splitSignature(sig);
    const vFixed = ethers.utils.hexZeroPad(ethers.utils.hexlify(v + 4), 1);
    return ethers.utils.hexConcat([r, s, vFixed]);
};

const main = async () => {
    const filePath = process.argv[2] ? resolve(process.cwd(), process.argv[2]) : DEFAULT_JSON;
    if (!fs.existsSync(filePath)) {
        logger.error(`未找到钱包文件: ${filePath}`);
        process.exit(1);
    }
    const wallets = loadWallets(filePath);
    logger.info(`加载 ${wallets.length} 个钱包，开始授权 USDC/CTF`);

    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const contractConfig = getChainContracts(137);
    const primaryUSDC = contractConfig.collateral; // USDC.e（0x2791...）
    const altUSDC = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'; // 新 USDC
    const usdcList = Array.from(new Set([primaryUSDC, altUSDC].filter(Boolean)));
    const ctfAddress = contractConfig.conditionalTokens;
    const exchange = contractConfig.exchange;
    const negRiskExchange = contractConfig.negRiskExchange;
    const negRiskAdapter = contractConfig.negRiskAdapter;

    for (let i = 0; i < wallets.length; i += 1) {
        const item = wallets[i];
        const owner = new ethers.Wallet(item.privateKey, provider);
        const safeAddress = item.proxyPublicKey?.toLowerCase();
        if (!safeAddress) {
            logger.error(`(${i + 1}/${wallets.length}) 缺少 proxyPublicKey，无法 Safe 授权`);
            continue;
        }
        const code = await provider.getCode(safeAddress);
        if (!code || code === '0x') {
            logger.warn(`(${i + 1}/${wallets.length}) Safe 未部署或地址无代码，跳过`);
            continue;
        }
        logger.info(`(${i + 1}/${wallets.length}) Safe 地址: ${safeAddress} (owner=${owner.address})`);
        const safe = new ethers.Contract(safeAddress, safeAbi, owner);
        const ctf = new ethers.Contract(ctfAddress, ctfAbi, owner);

        // 余额检查
        const polBal = await provider.getBalance(owner.address);
        logger.info(`  余额：POL=${ethers.utils.formatUnits(polBal, 18)}`);
        for (const uAddr of usdcList) {
            const usdcTmp = new ethers.Contract(uAddr, usdcAbi, owner);
            const bal = await usdcTmp.balanceOf(safeAddress);
            logger.info(`  Safe USDC(${uAddr})=${ethers.utils.formatUnits(bal, 6)} raw=${bal.toString()}`);
        }

        // Safe nonce
        let safeNonce = await safe.nonce();

        const feeData = await provider.getFeeData();
        const floor = ethers.utils.parseUnits(GAS_FLOOR_GWEI.toString(), 'gwei'); // 可用 GAS_FLOOR_GWEI 覆盖
        const maxFeePerGas = (feeData.maxFeePerGas?.gt(floor) ? feeData.maxFeePerGas : floor).mul(12).div(10);
        const maxPriorityFeePerGas = (feeData.maxPriorityFeePerGas?.gt(floor) ? feeData.maxPriorityFeePerGas : floor)
            .mul(12)
            .div(10);
        const gasLimit = 300_000;
        const baseOpts = {gasLimit, maxFeePerGas, maxPriorityFeePerGas};
        logger.info(
            `  gas 设置: maxFeePerGas=${ethers.utils.formatUnits(maxFeePerGas, 'gwei')} gwei, maxPrio=${ethers.utils.formatUnits(
                maxPriorityFeePerGas,
                'gwei',
            )} gwei, Safe nonce=${safeNonce.toString()}`,
        );

        try {
            const approvedCTFEx = await ctf.isApprovedForAll(safeAddress, exchange);
            const approvedCTFNREx = await ctf.isApprovedForAll(safeAddress, negRiskExchange);
            const approvedCTFNRAdp = await ctf.isApprovedForAll(safeAddress, negRiskAdapter);

            // 遍历所有 USDC Token 做授权（阈值：小于 MaxUint/2 则补全）
            for (const usdcAddr of usdcList) {
                const usdc = new ethers.Contract(usdcAddr, usdcAbi, owner);
                const allowEx = await usdc.allowance(safeAddress, exchange);
                const allowNREx = await usdc.allowance(safeAddress, negRiskExchange);
                const allowNRAdp = await usdc.allowance(safeAddress, negRiskAdapter);
                const allowCTF = await usdc.allowance(safeAddress, ctfAddress);
                const needEx = allowEx.lt(constants.MaxUint256.div(2));
                const needNREx = allowNREx.lt(constants.MaxUint256.div(2));
                const needNRAdp = allowNRAdp.lt(constants.MaxUint256.div(2));
                const needCTF = allowCTF.lt(constants.MaxUint256.div(2));

                if (needEx) {
                    const bal = await provider.getBalance(owner.address);
                    const maxCost = maxFeePerGas.mul(gasLimit);
                    if (bal.lt(maxCost)) {
                        logger.warn(`  跳过 USDC(${usdcAddr})->Exchange，POL 余额不足，需至少 ${ethers.utils.formatUnits(maxCost, 18)} POL`);
                    } else {
                        logger.info(`  授权 USDC(${usdcAddr}) -> Exchange(${exchange}) MaxUint`);
                        const data = usdc.interface.encodeFunctionData('approve', [exchange, constants.MaxUint256]);
                        const sig = await signSafeTx(safe, owner, {
                            to: usdcAddr,
                            value: 0,
                            data,
                            operation: 0,
                            safeTxGas: 0,
                            baseGas: 0,
                            gasPrice: 0,
                            gasToken: ethers.constants.AddressZero,
                            refundReceiver: ethers.constants.AddressZero,
                            nonce: safeNonce,
                        });
                        const tx = await safe.execTransaction(
                            usdcAddr,
                            0,
                            data,
                            0,
                            0,
                            0,
                            0,
                            ethers.constants.AddressZero,
                            ethers.constants.AddressZero,
                            sig,
                            {...baseOpts},
                        );
                        logger.info(`  Safe USDC -> Exchange 授权: ${tx.hash}`);
                        await tx.wait();
                        safeNonce = safeNonce.add(1);
                    }
                }
                if (needNREx) {
                    const bal = await provider.getBalance(owner.address);
                    const maxCost = maxFeePerGas.mul(gasLimit);
                    if (bal.lt(maxCost)) {
                        logger.warn(`  跳过 USDC(${usdcAddr})->NegRiskExchange，POL 余额不足，需至少 ${ethers.utils.formatUnits(maxCost, 18)} POL`);
                    } else {
                        logger.info(`  授权 USDC(${usdcAddr}) -> NegRiskExchange(${negRiskExchange}) MaxUint`);
                        const data = usdc.interface.encodeFunctionData('approve', [negRiskExchange, constants.MaxUint256]);
                        const sig = await signSafeTx(safe, owner, {
                            to: usdcAddr,
                            value: 0,
                            data,
                            operation: 0,
                            safeTxGas: 0,
                            baseGas: 0,
                            gasPrice: 0,
                            gasToken: ethers.constants.AddressZero,
                            refundReceiver: ethers.constants.AddressZero,
                            nonce: safeNonce,
                        });
                        const tx = await safe.execTransaction(
                            usdcAddr,
                            0,
                            data,
                            0,
                            0,
                            0,
                            0,
                            ethers.constants.AddressZero,
                            ethers.constants.AddressZero,
                            sig,
                            {...baseOpts},
                        );
                        logger.info(`  Safe USDC -> NegRiskExchange 授权: ${tx.hash}`);
                        await tx.wait();
                        safeNonce = safeNonce.add(1);
                    }
                }
                if (needNRAdp) {
                    const bal = await provider.getBalance(owner.address);
                    const maxCost = maxFeePerGas.mul(gasLimit);
                    if (bal.lt(maxCost)) {
                        logger.warn(`  跳过 USDC(${usdcAddr})->NegRiskAdapter，POL 余额不足，需至少 ${ethers.utils.formatUnits(maxCost, 18)} POL`);
                    } else {
                        logger.info(`  授权 USDC(${usdcAddr}) -> NegRiskAdapter(${negRiskAdapter}) MaxUint`);
                        const data = usdc.interface.encodeFunctionData('approve', [negRiskAdapter, constants.MaxUint256]);
                        const sig = await signSafeTx(safe, owner, {
                            to: usdcAddr,
                            value: 0,
                            data,
                            operation: 0,
                            safeTxGas: 0,
                            baseGas: 0,
                            gasPrice: 0,
                            gasToken: ethers.constants.AddressZero,
                            refundReceiver: ethers.constants.AddressZero,
                            nonce: safeNonce,
                        });
                        const tx = await safe.execTransaction(
                            usdcAddr,
                            0,
                            data,
                            0,
                            0,
                            0,
                            0,
                            ethers.constants.AddressZero,
                            ethers.constants.AddressZero,
                            sig,
                            {...baseOpts},
                        );
                        logger.info(`  Safe USDC -> NegRiskAdapter 授权: ${tx.hash}`);
                        await tx.wait();
                        safeNonce = safeNonce.add(1);
                    }
                }
                // 造票需要 USDC -> CTF 授权
                if (needCTF) {
                    const bal = await provider.getBalance(owner.address);
                    const maxCost = maxFeePerGas.mul(gasLimit);
                    if (bal.lt(maxCost)) {
                        logger.warn(`  跳过 USDC(${usdcAddr})->CTF，POL 余额不足，需至少 ${ethers.utils.formatUnits(maxCost, 18)} POL`);
                    } else {
                        logger.info(`  授权 USDC(${usdcAddr}) -> CTF(${ctfAddress}) MaxUint`);
                        const data = usdc.interface.encodeFunctionData('approve', [ctfAddress, constants.MaxUint256]);
                        const sig = await signSafeTx(safe, owner, {
                            to: usdcAddr,
                            value: 0,
                            data,
                            operation: 0,
                            safeTxGas: 0,
                            baseGas: 0,
                            gasPrice: 0,
                            gasToken: ethers.constants.AddressZero,
                            refundReceiver: ethers.constants.AddressZero,
                            nonce: safeNonce,
                        });
                        const tx = await safe.execTransaction(
                            usdcAddr,
                            0,
                            data,
                            0,
                            0,
                            0,
                            0,
                            ethers.constants.AddressZero,
                            ethers.constants.AddressZero,
                            sig,
                            {...baseOpts},
                        );
                        logger.info(`  Safe USDC -> CTF 授权: ${tx.hash}`);
                        await tx.wait();
                        safeNonce = safeNonce.add(1);
                    }
                }
            }
            if (!approvedCTFEx) {
                const bal = await provider.getBalance(owner.address);
                const maxCost = maxFeePerGas.mul(gasLimit);
                if (bal.lt(maxCost)) {
                    logger.warn(`  跳过 CTF->Exchange，POL 余额不足，需至少 ${ethers.utils.formatUnits(maxCost, 18)} POL`);
                } else {
                    logger.info(`  准备授权 CTF setApprovalForAll -> Exchange(${exchange})`);
                    const data = ctf.interface.encodeFunctionData('setApprovalForAll', [exchange, true]);
                    const sig = await signSafeTx(safe, owner, {
                        to: ctfAddress,
                        value: 0,
                        data,
                        operation: 0,
                        safeTxGas: 0,
                        baseGas: 0,
                        gasPrice: 0,
                        gasToken: ethers.constants.AddressZero,
                        refundReceiver: ethers.constants.AddressZero,
                        nonce: safeNonce,
                    });
                    const tx = await safe.execTransaction(
                        ctfAddress,
                        0,
                        data,
                        0,
                        0,
                        0,
                        0,
                        ethers.constants.AddressZero,
                        ethers.constants.AddressZero,
                        sig,
                        {...baseOpts},
                    );
                    logger.info(`  Safe CTF -> Exchange 授权: ${tx.hash}`);
                    await tx.wait();
                    safeNonce = safeNonce.add(1);
                }
            }
            if (!approvedCTFNREx) {
                const bal = await provider.getBalance(owner.address);
                const maxCost = maxFeePerGas.mul(gasLimit);
                if (bal.lt(maxCost)) {
                    logger.warn(`  跳过 CTF->NegRiskExchange，POL 余额不足，需至少 ${ethers.utils.formatUnits(maxCost, 18)} POL`);
                } else {
                    logger.info(`  准备授权 CTF setApprovalForAll -> NegRiskExchange(${negRiskExchange})`);
                    const data = ctf.interface.encodeFunctionData('setApprovalForAll', [negRiskExchange, true]);
                    const sig = await signSafeTx(safe, owner, {
                        to: ctfAddress,
                        value: 0,
                        data,
                        operation: 0,
                        safeTxGas: 0,
                        baseGas: 0,
                        gasPrice: 0,
                        gasToken: ethers.constants.AddressZero,
                        refundReceiver: ethers.constants.AddressZero,
                        nonce: safeNonce,
                    });
                    const tx = await safe.execTransaction(
                        ctfAddress,
                        0,
                        data,
                        0,
                        0,
                        0,
                        0,
                        ethers.constants.AddressZero,
                        ethers.constants.AddressZero,
                        sig,
                        {...baseOpts},
                    );
                    logger.info(`  Safe CTF -> NegRiskExchange 授权: ${tx.hash}`);
                    await tx.wait();
                    safeNonce = safeNonce.add(1);
                }
            }
            if (!approvedCTFNRAdp) {
                const bal = await provider.getBalance(owner.address);
                const maxCost = maxFeePerGas.mul(gasLimit);
                if (bal.lt(maxCost)) {
                    logger.warn(`  跳过 CTF->NegRiskAdapter，POL 余额不足，需至少 ${ethers.utils.formatUnits(maxCost, 18)} POL`);
                } else {
                    logger.info(`  准备授权 CTF setApprovalForAll -> NegRiskAdapter(${negRiskAdapter})`);
                    const data = ctf.interface.encodeFunctionData('setApprovalForAll', [negRiskAdapter, true]);
                    const sig = await signSafeTx(safe, owner, {
                        to: ctfAddress,
                        value: 0,
                        data,
                        operation: 0,
                        safeTxGas: 0,
                        baseGas: 0,
                        gasPrice: 0,
                        gasToken: ethers.constants.AddressZero,
                        refundReceiver: ethers.constants.AddressZero,
                        nonce: safeNonce,
                    });
                    const tx = await safe.execTransaction(
                        ctfAddress,
                        0,
                        data,
                        0,
                        0,
                        0,
                        0,
                        ethers.constants.AddressZero,
                        ethers.constants.AddressZero,
                        sig,
                        {...baseOpts},
                    );
                    logger.info(`  Safe CTF -> NegRiskAdapter 授权: ${tx.hash}`);
                    await tx.wait();
                    safeNonce = safeNonce.add(1);
                }
            }
            // 授权完成后，打印各 USDC 的 allowance 情况
            for (const uAddr of usdcList) {
                const usdcTmp = new ethers.Contract(uAddr, usdcAbi, owner);
                const allowExNow = await usdcTmp.allowance(safeAddress, exchange);
                const allowCTFNow = await usdcTmp.allowance(safeAddress, ctfAddress);
                const allowNRExNow = await usdcTmp.allowance(safeAddress, negRiskExchange);
                const allowNRAdpNow = await usdcTmp.allowance(safeAddress, negRiskAdapter);
                logger.info(`  授权结果 USDC(${uAddr}) -> Exchange: ${ethers.utils.formatUnits(allowExNow, 6)}`);
                logger.info(`                 USDC(${uAddr}) -> CTF: ${ethers.utils.formatUnits(allowCTFNow, 6)}`);
                logger.info(`                 USDC(${uAddr}) -> NegRiskExchange: ${ethers.utils.formatUnits(allowNRExNow, 6)}`);
                logger.info(`                 USDC(${uAddr}) -> NegRiskAdapter: ${ethers.utils.formatUnits(allowNRAdpNow, 6)}`);
            }
            logger.success('  授权完成');
        } catch (err) {
            logger.error('  授权失败', err);
        }
    }
};

main().catch((err) => {
    logger.error('执行失败', err);
    process.exit(1);
});
