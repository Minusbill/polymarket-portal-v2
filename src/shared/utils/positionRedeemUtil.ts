import {ethers} from 'ethers';
import {createLogger} from './logger';
import {getChainContracts, CONDITIONAL_TOKEN_DECIMALS} from '../config/contracts';
import {ctfAbi} from '../abi/ctfAbi';
import {negRiskAdapterAbi} from '../abi/negRiskAdapterAbi';
import {wcolAbi} from '../abi/wcolAbi';
import {encodeRedeem} from '../encode';
import {safeAbi} from '../abi';

const logger = createLogger('PositionRedeemUtil');
const CHAIN_ID = 137;

export type MarketToken = {
    tokenId: string;
    outcome?: string;
    index?: number;
};

export type RedeemCheckResult = {
    redeemable: boolean;
    settled: boolean;
    isWin: boolean;
    outcomeIndex: number;
    reason?: string;
};

export class PositionRedeemUtil {
    static async canRedeem(params: {
        conditionId: string;
        tokenId: string;
        tokens: MarketToken[];
        signer: ethers.Signer;
        holderAddress?: string;
        negRisk?: boolean;
    }): Promise<RedeemCheckResult> {
        const {conditionId, tokenId, tokens, signer} = params;
        const holder = params.holderAddress ?? (await signer.getAddress());
        const outcomeIndex = tokens.findIndex((t) => t.tokenId === tokenId);
        if (outcomeIndex < 0) {
            return {redeemable: false, settled: false, isWin: false, outcomeIndex: -1, reason: 'token 未匹配选项'};
        }

        const provider = signer.provider ?? new ethers.providers.JsonRpcProvider('https://polygon-rpc.com');
        const contracts = getChainContracts(CHAIN_ID);
        const ctfReader = new ethers.Contract(contracts.conditionalTokens, ctfAbi, provider);

        const payouts: ethers.BigNumber[] = [];
        for (let i = 0; i < tokens.length; i += 1) {
            try {
                const num = await ctfReader.payoutNumerators(conditionId, i);
                payouts.push(num);
            } catch {
                payouts.push(ethers.constants.Zero);
            }
        }
        const settled = payouts.some((p) => p.gt(0));
        if (!settled) {
            return {redeemable: false, settled: false, isWin: false, outcomeIndex, reason: '未结算'};
        }

        const isWin = payouts[outcomeIndex]?.gt(0);
        if (!isWin) {
            return {redeemable: false, settled: true, isWin: false, outcomeIndex, reason: '未获胜'};
        }

        const ctf = new ethers.Contract(contracts.conditionalTokens, ctfAbi, provider);
        const bal: ethers.BigNumber = await ctf.balanceOf(holder, tokenId);
        if (bal.isZero()) {
            return {redeemable: false, settled: true, isWin: true, outcomeIndex, reason: '余额为 0'};
        }

        return {redeemable: true, settled: true, isWin: true, outcomeIndex};
    }

    static async redeem(params: {
        conditionId: string;
        tokenId: string;
        tokens: MarketToken[];
        signer: ethers.Signer;
        holderAddress?: string;
        negRisk?: boolean;
        safe?: {
            owner: ethers.Wallet;
            safeAddress: string;
        };
    }): Promise<string | null> {
        const check = await PositionRedeemUtil.canRedeem(params);
        if (!check.redeemable) {
            logger.warn(`【Redeem】不可赎回 condition=${params.conditionId} reason=${check.reason ?? 'unknown'}`);
            return null;
        }
        if (params.negRisk) {
            return PositionRedeemUtil.redeemNegRisk(
                params.conditionId,
                params.signer,
                params.holderAddress,
                params.safe,
            );
        }
        return PositionRedeemUtil.redeemStandard(params.conditionId, params.signer, params.safe);
    }

    private static async signSafeTx(
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
    ): Promise<string> {
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
    }

    private static async redeemStandard(
        conditionId: string,
        signer: ethers.Signer,
        safe?: { owner: ethers.Wallet; safeAddress: string },
    ): Promise<string | null> {
        const contracts = getChainContracts(CHAIN_ID);
        const provider = signer.provider ?? new ethers.providers.JsonRpcProvider('https://polygon-rpc.com');
        const feeData = await provider.getFeeData();
        const floor = ethers.utils.parseUnits('100', 'gwei');
        const maxFeePerGas = (feeData.maxFeePerGas?.gt(floor) ? feeData.maxFeePerGas : floor).mul(12).div(10);
        const maxPriorityFeePerGas = (feeData.maxPriorityFeePerGas?.gt(floor) ? feeData.maxPriorityFeePerGas : floor)
            .mul(12)
            .div(10);

        try {
            const data = encodeRedeem(contracts.collateral, conditionId);
            let lastTxHash: string | null = null;
            if (safe) {
                const safeContract = new ethers.Contract(safe.safeAddress, safeAbi, safe.owner);
                const safeNonce = await safeContract.nonce();
                const ownerNonce = await provider.getTransactionCount(safe.owner.address, 'pending');
                const sig = await PositionRedeemUtil.signSafeTx(safeContract, safe.owner, {
                    to: contracts.conditionalTokens,
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
                const tx = await safeContract.execTransaction(
                    contracts.conditionalTokens,
                    0,
                    data,
                    0,
                    0,
                    0,
                    0,
                    ethers.constants.AddressZero,
                    ethers.constants.AddressZero,
                    sig,
                    {
                        gasLimit: 700_000,
                        maxFeePerGas,
                        maxPriorityFeePerGas,
                        nonce: ownerNonce,
                    },
                );
                lastTxHash = tx.hash;
                logger.info(`【Redeem】Safe 赎回 tx=${tx.hash}`);
                const receipt = await tx.wait();
                if (receipt.status === 1) return tx.hash;
            } else {
                const tx = await signer.sendTransaction({
                    to: contracts.conditionalTokens,
                    data,
                    gasLimit: 500_000,
                    maxFeePerGas,
                    maxPriorityFeePerGas,
                });
                lastTxHash = tx.hash;
                logger.info(`【Redeem】提交赎回 tx=${tx.hash}`);
                const receipt = await tx.wait();
                if (receipt.status === 1) return tx.hash;
            }
            logger.error(`【Redeem】赎回失败（receipt status!=1） tx=${lastTxHash ?? 'unknown'}`);
            return null;
        } catch (err) {
            logger.error('【Redeem】赎回异常', err as Error);
            return null;
        }
    }

    private static async redeemNegRisk(
        conditionId: string,
        signer: ethers.Signer,
        holderAddress?: string,
        safe?: { owner: ethers.Wallet; safeAddress: string },
    ): Promise<string | null> {
        const contracts = getChainContracts(CHAIN_ID);
        if (!contracts.negRiskAdapter) {
            logger.warn('【Redeem】未配置 negRiskAdapter 地址，跳过');
            return null;
        }
        const provider = signer.provider ?? new ethers.providers.JsonRpcProvider('https://polygon-rpc.com');
        const adapter = new ethers.Contract(contracts.negRiskAdapter, negRiskAdapterAbi, signer);
        const wcol: string = await adapter.wcol();
        const holder = holderAddress ?? (await signer.getAddress());

        const parentCollectionId = ethers.constants.HashZero;
        const yesCollectionId = ethers.utils.solidityKeccak256(
            ['bytes32', 'bytes32', 'uint256'],
            [parentCollectionId, conditionId, 1],
        );
        const noCollectionId = ethers.utils.solidityKeccak256(
            ['bytes32', 'bytes32', 'uint256'],
            [parentCollectionId, conditionId, 2],
        );

        const collAddrs = [wcol, contracts.collateral];
        let pickedCollateral: string | null = null;
        let yesId: ethers.BigNumber | null = null;
        let noId: ethers.BigNumber | null = null;
        let yesBal: ethers.BigNumber | null = null;
        let noBal: ethers.BigNumber | null = null;

        const ctfReader = new ethers.Contract(contracts.conditionalTokens, ctfAbi, provider);
        for (const col of collAddrs) {
            const yId = await ctfReader.getPositionId(col, yesCollectionId);
            const nId = await ctfReader.getPositionId(col, noCollectionId);
            const yBal = await ctfReader.balanceOf(holder, yId);
            const nBal = await ctfReader.balanceOf(holder, nId);
            if (!yBal.isZero() || !nBal.isZero()) {
                pickedCollateral = col;
                yesId = yId;
                noId = nId;
                yesBal = yBal;
                noBal = nBal;
                break;
            }
        }

        const feeData = await provider.getFeeData();
        const floor = ethers.utils.parseUnits('100', 'gwei');
        const maxFeePerGas = (feeData.maxFeePerGas?.gt(floor) ? feeData.maxFeePerGas : floor).mul(12).div(10);
        const maxPriorityFeePerGas = (feeData.maxPriorityFeePerGas?.gt(floor) ? feeData.maxPriorityFeePerGas : floor)
            .mul(12)
            .div(10);

        if (!pickedCollateral || !yesId || !noId || !yesBal || !noBal) {
            logger.warn(`【Redeem】Neg-Risk 余额未命中 wcol/usdc，尝试直接 CTF 赎回 condition=${conditionId}`);
            for (const col of collAddrs) {
                try {
                    if (safe) {
                        const safeContract = new ethers.Contract(safe.safeAddress, safeAbi, safe.owner);
                        const data = ctfReader.interface.encodeFunctionData('redeemPositions', [
                            col,
                            parentCollectionId,
                            conditionId,
                            [1, 2],
                        ]);
                        const safeNonce = await safeContract.nonce();
                        const ownerNonce = await provider.getTransactionCount(safe.owner.address, 'pending');
                        const sig = await PositionRedeemUtil.signSafeTx(safeContract, safe.owner, {
                            to: contracts.conditionalTokens,
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
                        const tx = await safeContract.execTransaction(
                            contracts.conditionalTokens,
                            0,
                            data,
                            0,
                            0,
                            0,
                            0,
                            ethers.constants.AddressZero,
                            ethers.constants.AddressZero,
                            sig,
                            {
                                gasLimit: 700_000,
                                maxFeePerGas,
                                maxPriorityFeePerGas,
                                nonce: ownerNonce,
                            },
                        );
                        logger.info(`【Redeem】Neg-Risk fallback Safe redeem collateral=${col} tx=${tx.hash}`);
                        const receipt = await tx.wait();
                        if (receipt.status === 1) return tx.hash;
                    } else {
                        const tx = await ctfReader.connect(signer).redeemPositions(col, parentCollectionId, conditionId, [1, 2], {
                            gasLimit: 700_000,
                            maxFeePerGas,
                            maxPriorityFeePerGas,
                        });
                        logger.info(`【Redeem】Neg-Risk fallback redeem collateral=${col} tx=${tx.hash}`);
                        const receipt = await tx.wait();
                        if (receipt.status === 1) return tx.hash;
                    }
                } catch (err) {
                    logger.warn(`【Redeem】Neg-Risk fallback redeem 失败 collateral=${col}`, err as Error);
                }
            }
            return null;
        }

        try {
            if (pickedCollateral.toLowerCase() !== wcol.toLowerCase()) {
                if (safe) {
                    const safeContract = new ethers.Contract(safe.safeAddress, safeAbi, safe.owner);
                    const data = ctfReader.interface.encodeFunctionData('redeemPositions', [
                        pickedCollateral,
                        parentCollectionId,
                        conditionId,
                        [1, 2],
                    ]);
                    const safeNonce = await safeContract.nonce();
                    const ownerNonce = await provider.getTransactionCount(safe.owner.address, 'pending');
                    const sig = await PositionRedeemUtil.signSafeTx(safeContract, safe.owner, {
                        to: contracts.conditionalTokens,
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
                    const tx = await safeContract.execTransaction(
                        contracts.conditionalTokens,
                        0,
                        data,
                        0,
                        0,
                        0,
                        0,
                        ethers.constants.AddressZero,
                        ethers.constants.AddressZero,
                        sig,
                        {
                            gasLimit: 700_000,
                            maxFeePerGas,
                            maxPriorityFeePerGas,
                            nonce: ownerNonce,
                        },
                    );
                    logger.info(`【Redeem】Neg-Risk fallback Safe CTF redeem tx=${tx.hash}`);
                    const receipt = await tx.wait();
                    if (receipt.status === 1) return tx.hash;
                    logger.error(`【Redeem】Neg-Risk fallback redeem 失败（receipt status!=1） tx=${tx.hash}`);
                    return null;
                }
                const tx = await ctfReader.connect(signer).redeemPositions(pickedCollateral, parentCollectionId, conditionId, [1, 2], {
                    gasLimit: 700_000,
                    maxFeePerGas,
                    maxPriorityFeePerGas,
                });
                logger.info(`【Redeem】Neg-Risk fallback CTF redeem tx=${tx.hash}`);
                const receipt = await tx.wait();
                if (receipt.status === 1) return tx.hash;
                logger.error(`【Redeem】Neg-Risk fallback redeem 失败（receipt status!=1） tx=${tx.hash}`);
                return null;
            }

            if (safe) {
                const safeContract = new ethers.Contract(safe.safeAddress, safeAbi, safe.owner);
                const data = adapter.interface.encodeFunctionData('redeemPositions', [conditionId, [yesBal, noBal]]);
                const safeNonce = await safeContract.nonce();
                const ownerNonce = await provider.getTransactionCount(safe.owner.address, 'pending');
                const sig = await PositionRedeemUtil.signSafeTx(safeContract, safe.owner, {
                    to: contracts.negRiskAdapter,
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
                const tx = await safeContract.execTransaction(
                    contracts.negRiskAdapter,
                    0,
                    data,
                    0,
                    0,
                    0,
                    0,
                    ethers.constants.AddressZero,
                    ethers.constants.AddressZero,
                    sig,
                    {
                        gasLimit: 700_000,
                        maxFeePerGas,
                        maxPriorityFeePerGas,
                        nonce: ownerNonce,
                    },
                );
                logger.info(`【Redeem】提交 Neg-Risk Safe 赎回 tx=${tx.hash} yes=${yesBal.toString()} no=${noBal.toString()}`);
                const receipt = await tx.wait();
                if (receipt.status === 1) return tx.hash;
                logger.error(`【Redeem】Neg-Risk Safe 赎回失败（receipt status!=1） tx=${tx.hash}`);
                return null;
            }

            const tx = await adapter.redeemPositions(conditionId, [yesBal, noBal], {
                gasLimit: 700_000,
                maxFeePerGas,
                maxPriorityFeePerGas,
            });
            logger.info(`【Redeem】提交 Neg-Risk 赎回 tx=${tx.hash} yes=${yesBal.toString()} no=${noBal.toString()}`);
            const receipt = await tx.wait();
            if (receipt.status === 1) return tx.hash;
            logger.error(`【Redeem】Neg-Risk 赎回失败（receipt status!=1） tx=${tx.hash}`);
            return null;
        } catch (err) {
            logger.error('【Redeem】Neg-Risk 赎回异常', err as Error);
            return null;
        }
    }
}
