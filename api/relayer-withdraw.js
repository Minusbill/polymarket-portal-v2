import { RelayClient, RelayerTxType } from "@polymarket/builder-relayer-client";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import { createWalletClient, encodeFunctionData, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygon } from "viem/chains";

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
];

const DEFAULT_TOKEN = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const DEFAULT_RELAYER = "https://relayer-v2.polymarket.com/";
const DEFAULT_RPC = process.env.RPC_URL || "https://polygon.drpc.org";
const DECIMALS = 6;

const collectBody = async (req) => {
  let data = "";
  for await (const chunk of req) {
    data += chunk;
  }
  return data;
};

const normalizePrivateKey = (value) => (value.startsWith("0x") ? value : `0x${value}`);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ message: "Method Not Allowed" }));
    return;
  }

  let payload = {};
  try {
    const raw = await collectBody(req);
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ message: "Invalid JSON body" }));
    return;
  }

  const {
    privateKey,
    builderApiKey,
    builderSecret,
    builderPassphrase,
    relayerUrl,
    toAddress,
    amount,
    tokenAddress,
  } = payload;

  const apiKey = builderApiKey || process.env.BUILDER_API_KEY;
  const secret = builderSecret || process.env.BUILDER_SECRET;
  const passphrase = builderPassphrase || process.env.BUILDER_PASSPHRASE;
  const finalRelayerUrl = relayerUrl || process.env.POLY_RELAYER_URL || DEFAULT_RELAYER;

  if (!privateKey || !apiKey || !secret || !passphrase || !toAddress || !amount) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ message: "Missing required fields" }));
    return;
  }

  const logs = [];
  try {
    const account = privateKeyToAccount(normalizePrivateKey(String(privateKey)));
    const walletClient = createWalletClient({
      account,
      chain: polygon,
      transport: http(String(DEFAULT_RPC)),
    });
    const builderConfig = new BuilderConfig({
      localBuilderCreds: {
        key: String(apiKey),
        secret: String(secret),
        passphrase: String(passphrase),
      },
    });

    const client = new RelayClient(
      String(finalRelayerUrl),
      137,
      walletClient,
      builderConfig,
      RelayerTxType.SAFE
    );

    const token = String(tokenAddress || DEFAULT_TOKEN);
    const value = parseUnits(String(amount), DECIMALS);
    logs.push(`Relayer: rpc=${DEFAULT_RPC}`);
    logs.push(`Relayer: token=${token} to=${toAddress}`);
    logs.push(`Relayer: amount=${amount} value=${value.toString()}`);

    const transferTx = {
      to: token,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [toAddress, value],
      }),
      value: "0",
    };

    const response = await client.execute([transferTx], "Transfer Token");
    const result = await response.wait();
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify({
        transactionHash: result?.transactionHash || "",
        logs,
      })
    );
  } catch (error) {
    const message = error?.message || String(error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ message, logs }));
  }
}
