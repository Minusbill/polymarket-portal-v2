import { ethers, Wallet as EthersWallet } from "ethers";
import { safeAbi } from "../shared/abi";
import { usdcAbi } from "../shared/abi/usdcAbi";
import { COLLATERAL_TOKEN_DECIMALS, getChainContracts } from "../shared/config/contracts.ts";

const signSafeTx = async (
  safe: ethers.Contract,
  owner: EthersWallet,
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
  }
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
    params.nonce
  );
  const sig = await owner.signMessage(ethers.utils.arrayify(txHash));
  const { r, s, v } = ethers.utils.splitSignature(sig);
  const vFixed = ethers.utils.hexZeroPad(ethers.utils.hexlify(v + 4), 1);
  return ethers.utils.hexConcat([r, s, vFixed]);
};

export const withdrawUsdcFromSafeClient = async (
  owner: EthersWallet,
  safeAddress: string,
  toAddress: string,
  amount: string | number,
  logger?: (message: string) => void
) => {
  const provider = owner.provider as ethers.providers.JsonRpcProvider;
  if (!provider) {
    throw new Error("owner 缺少 provider，无法发送交易");
  }
  const code = await provider.getCode(safeAddress);
  if (!code || code === "0x") {
    throw new Error("Safe 未部署或地址无代码");
  }
  const contracts = getChainContracts(137);
  const tokenAddress = contracts.collateral;
  const safe = new ethers.Contract(safeAddress, safeAbi, owner);
  const safeNonce = await safe.nonce();
  const ownerNonce = await provider.getTransactionCount(owner.address, "pending");
  const value = ethers.utils.parseUnits(String(amount), COLLATERAL_TOKEN_DECIMALS);
  if (logger) {
    logger(`提现参数: chain=137 token=${tokenAddress}`);
    logger(`提现参数: safe=${safeAddress} to=${toAddress}`);
    logger(`提现参数: amount=${amount} decimals=${COLLATERAL_TOKEN_DECIMALS} value=${value.toString()}`);
    logger(`提现参数: safeNonce=${safeNonce.toString()} ownerNonce=${ownerNonce}`);
  }

  const token = new ethers.Contract(tokenAddress, usdcAbi, owner);
  const balance: ethers.BigNumber = await token.balanceOf(safeAddress);
  if (logger) {
    logger(`Safe 余额: ${ethers.utils.formatUnits(balance, COLLATERAL_TOKEN_DECIMALS)}`);
  }
  if (balance.lt(value)) {
    throw new Error(
      `Safe 余额不足: balance=${ethers.utils.formatUnits(balance, COLLATERAL_TOKEN_DECIMALS)} < ${amount}`
    );
  }

  const data = new ethers.utils.Interface(usdcAbi).encodeFunctionData("transfer", [toAddress, value]);
  const sig = await signSafeTx(safe, owner, {
    to: tokenAddress,
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

  const feeData = await provider.getFeeData();
  const minPriority = ethers.utils.parseUnits("100", "gwei");
  const minMaxFee = ethers.utils.parseUnits("700", "gwei");
  const maxPriorityFeePerGas =
    feeData.maxPriorityFeePerGas && feeData.maxPriorityFeePerGas.gt(minPriority)
      ? feeData.maxPriorityFeePerGas
      : minPriority;
  const maxFeePerGas =
    feeData.maxFeePerGas && feeData.maxFeePerGas.gt(minMaxFee) ? feeData.maxFeePerGas : minMaxFee;
  if (logger) {
    logger(
      `FeeData: maxPriority=${maxPriorityFeePerGas.toString()} maxFee=${maxFeePerGas.toString()}`
    );
  }

  const tx = await safe.execTransaction(
    tokenAddress,
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
      gasLimit: 500_000,
      maxFeePerGas,
      maxPriorityFeePerGas,
      nonce: ownerNonce,
    }
  );
  await tx.wait(1);
  return tx.hash as string;
};
