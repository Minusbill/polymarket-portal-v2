import {ethers, Wallet} from 'ethers';
import {createLogger} from './logger';
import {safeAbi} from '../abi';
import {usdcAbi} from '../abi/usdcAbi';
import {getChainContracts, COLLATERAL_TOKEN_DECIMALS} from '../config/contracts';

const logger = createLogger('DepositAndWithdrawUtil');
const ADDRESS_ZERO = ethers.constants.AddressZero;

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

// 存钱到代理钱包
export const depositToSafe = async (
    owner: Wallet,
    safeAddress: string,
    amountEth: string | number,
): Promise<string> => {
    const provider = owner.provider as ethers.providers.JsonRpcProvider;
    if (!provider) {
        throw new Error('owner 缺少 provider，无法发送交易');
    }
    const value = ethers.utils.parseEther(String(amountEth));
    const feeData = await provider.getFeeData();
    const minPriority = ethers.utils.parseUnits('100', 'gwei');
    const minMaxFee = ethers.utils.parseUnits('700', 'gwei');
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas && feeData.maxPriorityFeePerGas.gt(minPriority)
        ? feeData.maxPriorityFeePerGas
        : minPriority;
    const maxFeePerGas = feeData.maxFeePerGas && feeData.maxFeePerGas.gt(minMaxFee)
        ? feeData.maxFeePerGas
        : minMaxFee;

    const tx = await owner.sendTransaction({
        to: safeAddress,
        value,
        gasLimit: 21_000,
        maxFeePerGas,
        maxPriorityFeePerGas,
    });
    logger.info(`【充值】EOA -> Safe tx=${tx.hash} value=${amountEth}`);
    await tx.wait(1);
    return tx.hash;
};

// 提前到代理钱包
export const withdrawFromSafe = async (
    owner: Wallet,
    safeAddress: string,
    toAddress: string,
    amountEth: string | number,
): Promise<string> => {
    const provider = owner.provider as ethers.providers.JsonRpcProvider;
    if (!provider) {
        throw new Error('owner 缺少 provider，无法发送交易');
    }
    const code = await provider.getCode(safeAddress);
    if (!code || code === '0x') {
        throw new Error('Safe 未部署或地址无代码');
    }

    const safe = new ethers.Contract(safeAddress, safeAbi, owner);
    const safeNonce = await safe.nonce();
    const ownerNonce = await provider.getTransactionCount(owner.address, 'pending');
    const value = ethers.utils.parseEther(String(amountEth));
    const feeData = await provider.getFeeData();
    const minPriority = ethers.utils.parseUnits('100', 'gwei');
    const minMaxFee = ethers.utils.parseUnits('700', 'gwei');
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas && feeData.maxPriorityFeePerGas.gt(minPriority)
        ? feeData.maxPriorityFeePerGas
        : minPriority;
    const maxFeePerGas = feeData.maxFeePerGas && feeData.maxFeePerGas.gt(minMaxFee)
        ? feeData.maxFeePerGas
        : minMaxFee;

    const sig = await signSafeTx(safe, owner, {
        to: toAddress,
        value,
        data: '0x',
        operation: 0,
        safeTxGas: 0,
        baseGas: 0,
        gasPrice: 0,
        gasToken: ADDRESS_ZERO,
        refundReceiver: ADDRESS_ZERO,
        nonce: safeNonce,
    });

    const tx = await safe.execTransaction(
        toAddress,
        value,
        '0x',
        0,
        0,
        0,
        0,
        ADDRESS_ZERO,
        ADDRESS_ZERO,
        sig,
        {
            gasLimit: 300_000,
            maxFeePerGas,
            maxPriorityFeePerGas,
            nonce: ownerNonce,
        },
    );
    logger.info(`【提现】Safe -> ${toAddress} tx=${tx.hash} value=${amountEth} ownerNonce=${ownerNonce} safeNonce=${safeNonce.toString()}`);
    await tx.wait(1);
    return tx.hash;
};

export const depositErc20ToSafe = async (
    owner: Wallet,
    tokenAddress: string,
    safeAddress: string,
    amount: string | number,
    decimals = 6,
): Promise<string> => {
    const provider = owner.provider as ethers.providers.JsonRpcProvider;
    if (!provider) {
        throw new Error('owner 缺少 provider，无法发送交易');
    }
    const token = new ethers.Contract(tokenAddress, usdcAbi, owner);
    const value = ethers.utils.parseUnits(String(amount), decimals);
    const feeData = await provider.getFeeData();
    const minPriority = ethers.utils.parseUnits('100', 'gwei');
    const minMaxFee = ethers.utils.parseUnits('700', 'gwei');
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas && feeData.maxPriorityFeePerGas.gt(minPriority)
        ? feeData.maxPriorityFeePerGas
        : minPriority;
    const maxFeePerGas = feeData.maxFeePerGas && feeData.maxFeePerGas.gt(minMaxFee)
        ? feeData.maxFeePerGas
        : minMaxFee;
    const tx = await token.transfer(safeAddress, value, {
        maxFeePerGas,
        maxPriorityFeePerGas,
    });
    logger.info(`【充值ERC20】EOA -> Safe tx=${tx.hash} token=${tokenAddress} amount=${amount}`);
    await tx.wait(1);
    return tx.hash;
};

export const withdrawErc20FromSafe = async (
    owner: Wallet,
    safeAddress: string,
    tokenAddress: string,
    toAddress: string,
    amount: string | number,
    decimals = 6,
): Promise<string> => {
    const provider = owner.provider as ethers.providers.JsonRpcProvider;
    if (!provider) {
        throw new Error('owner 缺少 provider，无法发送交易');
    }
    const code = await provider.getCode(safeAddress);
    if (!code || code === '0x') {
        throw new Error('Safe 未部署或地址无代码');
    }
    const safe = new ethers.Contract(safeAddress, safeAbi, owner);
    const safeNonce = await safe.nonce();
    const ownerNonce = await provider.getTransactionCount(owner.address, 'pending');
    const value = ethers.utils.parseUnits(String(amount), decimals);

    const token = new ethers.Contract(tokenAddress, usdcAbi, owner);
    const balance: ethers.BigNumber = await token.balanceOf(safeAddress);
    if (balance.lt(value)) {
        throw new Error(`Safe 余额不足: balance=${ethers.utils.formatUnits(balance, decimals)} < ${amount}`);
    }

    const data = new ethers.utils.Interface(usdcAbi).encodeFunctionData('transfer', [toAddress, value]);
    const sig = await signSafeTx(safe, owner, {
        to: tokenAddress,
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

    const feeData = await provider.getFeeData();
    const minPriority = ethers.utils.parseUnits('100', 'gwei');
    const minMaxFee = ethers.utils.parseUnits('700', 'gwei');
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas && feeData.maxPriorityFeePerGas.gt(minPriority)
        ? feeData.maxPriorityFeePerGas
        : minPriority;
    const maxFeePerGas = feeData.maxFeePerGas && feeData.maxFeePerGas.gt(minMaxFee)
        ? feeData.maxFeePerGas
        : minMaxFee;

    const tx = await safe.execTransaction(
        tokenAddress,
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
    logger.info(`【提现ERC20】Safe -> ${toAddress} tx=${tx.hash} token=${tokenAddress} amount=${amount} ownerNonce=${ownerNonce} safeNonce=${safeNonce.toString()}`);
    await tx.wait(1);
    return tx.hash;
};

// 从eoa钱包存款到代理钱包
export const depositUsdcToSafe = async (
    owner: Wallet,
    safeAddress: string,
    amount: string | number,
): Promise<string> => {
    const contracts = getChainContracts(137);
    return depositErc20ToSafe(owner, contracts.collateral, safeAddress, amount, COLLATERAL_TOKEN_DECIMALS);
};

// 从代理钱包提取usdc到指定地址
export const withdrawUsdcFromSafe = async (
    owner: Wallet,
    safeAddress: string,
    toAddress: string,
    amount: string | number,
): Promise<string> => {
    const contracts = getChainContracts(137);
    return withdrawErc20FromSafe(owner, safeAddress, contracts.collateral, toAddress, amount, COLLATERAL_TOKEN_DECIMALS);
};

// 从eoa钱包存款到代理钱包
export const depositNativeToSafe = async (
    owner: Wallet,
    safeAddress: string,
    amount: string | number,
): Promise<string> => {
    return depositToSafe(owner, safeAddress, amount);
};

// 从代理钱包提取原生币到指定地址
export const withdrawNativeFromSafe = async (
    owner: Wallet,
    safeAddress: string,
    toAddress: string,
    amount: string | number,
): Promise<string> => {
    return withdrawFromSafe(owner, safeAddress, toAddress, amount);
};
