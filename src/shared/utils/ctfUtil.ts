import {ethers, Wallet} from 'ethers';
import {getChainContracts, CONDITIONAL_TOKEN_DECIMALS} from '../config/contracts';
import {createLogger} from './logger';
import {config as dotenvConfig} from 'dotenv';
import {resolve} from 'path';
import {ctfAbi, ctfAbi as abiBalance} from '../abi/ctfAbi';
import {safeAbi} from '../abi';
import {usdcAbi} from '../abi/usdcAbi';
import {encodeMerge, encodeSplit} from "../encode";
import {getTestClobClient} from "./getTestClobClient";

dotenvConfig({path: resolve(process.cwd(), '.env')});
export const logger = createLogger('CTFUtil');

const CHAIN_ID = 137;
const ADDRESS_ZERO = ethers.constants.AddressZero;

/**
 * 查询某个 tokenId 的 ERC1155 余额（CTF）\n+ */
export const getTokenBalance = async (signer: ethers.Signer, tokenId: string): Promise<string> => {
    const contracts = getChainContracts(CHAIN_ID);
    const ctf = new ethers.Contract(contracts.conditionalTokens, abiBalance, signer);
    const bal: ethers.BigNumber = await ctf.balanceOf(await signer.getAddress(), tokenId);
    return ethers.utils.formatUnits(bal, CONDITIONAL_TOKEN_DECIMALS);
};

const signSafeTx = async (
    safe: ethers.Contract,
    owner: Wallet,
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



/**
 * 使用 Safe 造票：EOA 作为 owner 签名，Safe 作为交易主体
 */
export const splitPositionBySafe = async (
    owner: Wallet,
    safeAddress: string,
    conditionId: string,
    amountUSDC: number,
): Promise<string | null> => {
    try {
        const contracts = getChainContracts(CHAIN_ID);
        const provider = owner.provider as ethers.providers.JsonRpcProvider;
        if (!provider) {
            throw new Error('owner 缺少 provider，无法发送交易');
        }
        const code = await provider.getCode(safeAddress);
        if (!code || code === '0x') {
            logger.warn('Safe 未部署或地址无代码，无法造票');
            return null;
        }
        const safe = new ethers.Contract(safeAddress, safeAbi, owner);
        const amount = ethers.utils.parseUnits(Number(amountUSDC).toFixed(CONDITIONAL_TOKEN_DECIMALS), CONDITIONAL_TOKEN_DECIMALS);

        const usdc = new ethers.Contract(contracts.collateral, usdcAbi, owner);
        const allowance: ethers.BigNumber = await usdc.allowance(safeAddress, contracts.conditionalTokens);
        const balance: ethers.BigNumber = await usdc.balanceOf(safeAddress);
        if (allowance.lt(amount)) {
            logger.warn(`【Safe造票】USDC 授权不足 allowance=${ethers.utils.formatUnits(allowance, 6)} < ${amountUSDC}`);
            return null;
        }
        if (balance.lt(amount)) {
            logger.warn(`【Safe造票】USDC 余额不足 balance=${ethers.utils.formatUnits(balance, 6)} < ${amountUSDC}`);
            return null;
        }

        const data = encodeSplit(contracts.collateral, conditionId, amount);
        const safeNonce = await safe.nonce();
        const ownerNonce = await provider.getTransactionCount(owner.address, 'pending');

        const maxFeePerGas = ethers.utils.parseUnits('500', 'gwei');
        const maxPriorityFeePerGas = ethers.utils.parseUnits('500', 'gwei');

        const sig = await signSafeTx(safe, owner, {
            to: contracts.conditionalTokens,
            value: 0,
            data,
            operation: 0,
            safeTxGas: 0,
            baseGas: 0,
            gasPrice: 0,
            gasToken: ADDRESS_ZERO,
            refundReceiver: ADDRESS_ZERO,
            nonce: safeNonce,
        });

        const tx = await safe.execTransaction(
            contracts.conditionalTokens,
            0,
            data,
            0,
            0,
            0,
            0,
            ADDRESS_ZERO,
            ADDRESS_ZERO,
            sig,
            {
                gasLimit: 500_000,
                maxFeePerGas,
                maxPriorityFeePerGas,
                nonce: ownerNonce,
            },
        );

        logger.info(`【Safe造票】ownerNonce=${ownerNonce} safeNonce=${safeNonce.toString()}`);
        logger.info(`【Safe造票】提交 splitPosition tx=${tx.hash} amount=${amountUSDC}`);
        await tx.wait(1);
        return tx.hash;
    } catch (err) {
        const msg = (err as any)?.error?.message || (err as Error).message;
        logger.error('【Safe造票】splitPosition 失败', err as Error);
        logger.error(`【Safe造票】错误信息：${msg}`);
        return null;
    }
};

/**
 * 使用 Safe 合并票：EOA 作为 owner 签名，Safe 作为交易主体
 */
export const mergePositionsBySafe = async (
    owner: Wallet,
    safeAddress: string,
    conditionId: string,
    yesTokenId: string,
    noTokenId: string,
    amount?: ethers.BigNumber,
): Promise<string | null> => {
    try {
        const contracts = getChainContracts(CHAIN_ID);
        const provider = owner.provider as ethers.providers.JsonRpcProvider;
        if (!provider) {
            throw new Error('owner 缺少 provider，无法发送交易');
        }
        const code = await provider.getCode(safeAddress);
        if (!code || code === '0x') {
            logger.warn('Safe 未部署或地址无代码，无法合并');
            return null;
        }
        const safe = new ethers.Contract(safeAddress, safeAbi, owner);
        const ctf = new ethers.Contract(contracts.conditionalTokens, ctfAbi, owner);

        let amt = amount;
        if (!amt) {
            const balYes: ethers.BigNumber = await ctf.balanceOf(safeAddress, yesTokenId);
            const balNo: ethers.BigNumber = await ctf.balanceOf(safeAddress, noTokenId);
            logger.info(
                `【Safe合并】余额检查 yesId=${yesTokenId} balYes=${ethers.utils.formatUnits(balYes, CONDITIONAL_TOKEN_DECIMALS)} noId=${noTokenId} balNo=${ethers.utils.formatUnits(
                    balNo,
                    CONDITIONAL_TOKEN_DECIMALS,
                )}`,
            );
            amt = balYes.lt(balNo) ? balYes : balNo;
        }
        if (!amt || amt.isZero()) {
            logger.warn('【Safe合并】无可 merge 持仓，跳过');
            return null;
        }

        const data = encodeMerge(contracts.collateral, conditionId, amt);
        const safeNonce = await safe.nonce();
        const ownerNonce = await provider.getTransactionCount(owner.address, 'pending');

        const maxFeePerGas = ethers.utils.parseUnits('700', 'gwei');
        const maxPriorityFeePerGas = ethers.utils.parseUnits('700', 'gwei');

        const sig = await signSafeTx(safe, owner, {
            to: contracts.conditionalTokens,
            value: 0,
            data,
            operation: 0,
            safeTxGas: 0,
            baseGas: 0,
            gasPrice: 0,
            gasToken: ADDRESS_ZERO,
            refundReceiver: ADDRESS_ZERO,
            nonce: safeNonce,
        });

        const tx = await safe.execTransaction(
            contracts.conditionalTokens,
            0,
            data,
            0,
            0,
            0,
            0,
            ADDRESS_ZERO,
            ADDRESS_ZERO,
            sig,
            {
                gasLimit: 500_000,
                maxFeePerGas,
                maxPriorityFeePerGas,
                nonce: ownerNonce,
            },
        );

        logger.info(`【Safe合并】ownerNonce=${ownerNonce} safeNonce=${safeNonce.toString()}`);
        logger.info(`【Safe合并】提交 mergePositions tx=${tx.hash} amount=${ethers.utils.formatUnits(amt, CONDITIONAL_TOKEN_DECIMALS)}`);
        await tx.wait(1);
        return tx.hash;
    } catch (err) {
        const msg = (err as any)?.error?.message || (err as Error).message;
        logger.error('【Safe合并】mergePositions 失败', err as Error);
        logger.error(`【Safe合并】错误信息：${msg}`);
        return null;
    }
};

/**
 * 便捷测试：使用 .env 的 PK 在标准二元市场上铸造 YES+NO
 * 用法：在脚本中调用 testSplitPosition('<conditionId>', 5)
 */
export const testSplitPosition = async (conditionId: string, amountUsd: number): Promise<void> => {
    const provider = new ethers.providers.JsonRpcProvider('https://polygon.drpc.org');


    let testClobClient = await getTestClobClient();
    const pk = testClobClient.wallet.privateKey;

    const owner = new ethers.Wallet(pk, provider);
    logger.info(`使用 owner 地址：${owner.address} Safe: ${testClobClient.wallet.proxyPublicKey}`);
    const tx = await splitPositionBySafe(owner, testClobClient.wallet.proxyPublicKey || "", conditionId, amountUsd);
    if (tx) {
        logger.success(`造票提交成功 tx=${tx}`);
    }
};

export const testMergePositions = async (conditionId: string, yesId: string, noId: string): Promise<void> => {
    const provider = new ethers.providers.JsonRpcProvider('https://polygon.drpc.org');

    let testClobClient = await getTestClobClient();
    const pk = testClobClient.wallet.privateKey;

    const signer = new ethers.Wallet(pk, provider);
    logger.info(`使用 owner 地址：${signer.address}, Safe: ${testClobClient.wallet.proxyPublicKey || ""}`);
    const tx = await mergePositionsBySafe(signer, testClobClient.wallet.proxyPublicKey || "", conditionId, yesId, noId);
    if (tx) {
        logger.success(`merge 提交成功 tx=${tx}`);
    }
};

export const testTokenBalance = async (tokenId: string): Promise<void> => {
    const provider = new ethers.providers.JsonRpcProvider('');

    let testClobClient = await getTestClobClient();
    const pk = testClobClient.wallet.privateKey;

    const signer = new ethers.Wallet(pk, provider);

    let amount = await getTokenBalance(signer, tokenId);
    logger.info(`tokenId: ${tokenId} 余额: ${amount}`)
};


async function test() {
    let conditionId = "0x85c21822935272188a7e4120b41e22c3e9c8a7a83748775927b2fffb50579189";
    let usdcAmount = 1;

    let yesId = '107304261111525064103207984838181959789682970840092415021608210339948891720616';
    let noId = '26310511444966676152901239545213464869875480698266972830365142324057733576025';


    //await testSplitPosition(conditionId, usdcAmount);
    //await testMergePositions(conditionId, yesId, noId);


    // await testTokenBalance(yesId);
    // await testTokenBalance(noId);

}

//test();
