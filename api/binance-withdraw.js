import crypto from "crypto";

const collectBody = async (req) => {
  let data = "";
  for await (const chunk of req) {
    data += chunk;
  }
  return data;
};

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

  const { apiKey, apiSecret, coin, network, address, amount, walletType } = payload;
  if (!apiKey || !apiSecret || !coin || !network || !address || !amount) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ message: "Missing required fields" }));
    return;
  }

  const params = new URLSearchParams({
    coin: String(coin),
    network: String(network),
    address: String(address),
    amount: String(amount),
    timestamp: String(Date.now()),
    recvWindow: "5000",
  });
  if (walletType !== undefined && walletType !== null) {
    params.set("walletType", String(walletType));
  }

  const signature = crypto.createHmac("sha256", String(apiSecret)).update(params.toString()).digest("hex");
  params.set("signature", signature);

  const response = await fetch("https://api.binance.com/sapi/v1/capital/withdraw/apply", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-MBX-APIKEY": String(apiKey),
    },
    body: params.toString(),
  });

  const data = await response.json().catch(() => ({}));
  res.statusCode = response.status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}
