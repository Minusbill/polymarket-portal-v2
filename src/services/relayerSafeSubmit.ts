import { ethers } from "ethers";
import {
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  getCreate2Address,
  hashTypedData,
  hexToBigInt,
  keccak256,
  zeroAddress,
} from "viem";

const SAFE_INIT_CODE_HASH = "0x2bce2127ff07fb632d16c8347c4ebf501f4841168bed00d9e6ef715ddb6fcecf";
const SAFE_FACTORY = "0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b";
const COLLATERAL_TOKEN_DECIMALS = 6;
const DEFAULT_TOKEN = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

const splitAndPackSig = (sig: string) => {
  let sigV = parseInt(sig.slice(-2), 16);
  switch (sigV) {
    case 0:
    case 1:
      sigV += 31;
      break;
    case 27:
    case 28:
      sigV += 4;
      break;
    default:
      throw new Error("Invalid signature");
  }
  sig = sig.slice(0, -2) + sigV.toString(16);
  const r = hexToBigInt(`0x${sig.slice(2, 66)}`).toString();
  const s = hexToBigInt(`0x${sig.slice(66, 130)}`).toString();
  const v = hexToBigInt(`0x${sig.slice(130, 132)}`).toString();
  return encodePacked(["uint256", "uint256", "uint8"], [BigInt(r), BigInt(s), parseInt(v)]);
};

const deriveSafe = (address: string) =>
  getCreate2Address({
    bytecodeHash: SAFE_INIT_CODE_HASH,
    from: SAFE_FACTORY,
    salt: keccak256(encodeAbiParameters([{ name: "address", type: "address" }], [address])),
  });

const buildSafeRequest = async ({
  privateKey,
  to,
  amount,
  token,
  nonce,
}: {
  privateKey: string;
  to: string;
  amount: number;
  token?: string;
  nonce: string | number;
}) => {
  const wallet = new ethers.Wallet(privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`);
  const from = wallet.address;
  const safeAddress = deriveSafe(from);
  const value = ethers.utils.parseUnits(String(amount), COLLATERAL_TOKEN_DECIMALS).toString();
  const data = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [to, BigInt(value)],
  });
  const domain = { chainId: 137, verifyingContract: safeAddress };
  const types = {
    SafeTx: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
      { name: "operation", type: "uint8" },
      { name: "safeTxGas", type: "uint256" },
      { name: "baseGas", type: "uint256" },
      { name: "gasPrice", type: "uint256" },
      { name: "gasToken", type: "address" },
      { name: "refundReceiver", type: "address" },
      { name: "nonce", type: "uint256" },
    ],
  };
  const message = {
    to: token || DEFAULT_TOKEN,
    value: "0",
    data,
    operation: 0,
    safeTxGas: "0",
    baseGas: "0",
    gasPrice: "0",
    gasToken: zeroAddress,
    refundReceiver: zeroAddress,
    nonce: String(nonce),
  };
  const structHash = hashTypedData({ primaryType: "SafeTx", domain, types, message });
  const sig = await wallet.signMessage(ethers.utils.arrayify(structHash));
  const packedSig = splitAndPackSig(sig);
  return {
    from,
    to: message.to,
    proxyWallet: safeAddress,
    data: message.data,
    nonce: message.nonce,
    signature: packedSig,
    signatureParams: {
      gasPrice: message.gasPrice,
      operation: String(message.operation),
      safeTxnGas: message.safeTxGas,
      baseGas: message.baseGas,
      gasToken: message.gasToken,
      refundReceiver: message.refundReceiver,
    },
    type: "SAFE",
    metadata: "withdraw",
  };
};

export const submitSafeTransfer = async ({
  baseUrl,
  privateKey,
  to,
  amount,
  token,
  logger,
}: {
  baseUrl: string;
  privateKey: string;
  to: string;
  amount: number;
  token?: string;
  logger?: (message: string) => void;
}) => {
  const wallet = new ethers.Wallet(privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`);
  logger?.(`Relayer: from=${wallet.address}`);
  const nonceRes = await fetch(`${baseUrl}/relayer/nonce`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: wallet.address, type: "SAFE" }),
  });
  const nonceData = await nonceRes.json().catch(() => ({}));
  if (!nonceRes.ok) {
    throw new Error(nonceData?.message || "获取 nonce 失败");
  }
  const nonce = nonceData?.nonce;
  logger?.(`Relayer: nonce=${nonce}`);
  const request = await buildSafeRequest({ privateKey, to, amount, token, nonce });
  const submitRes = await fetch(`${baseUrl}/relayer/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ request }),
  });
  const submitData = await submitRes.json().catch(() => ({}));
  if (!submitRes.ok) {
    throw new Error(submitData?.message || "提交失败");
  }
  return submitData?.transactionHash || "";
};
