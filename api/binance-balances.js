import crypto from "crypto";

const collectBody = async (req) => {
  let data = "";
  for await (const chunk of req) {
    data += chunk;
  }
  return data;
};

const signedRequest = async ({ apiKey, apiSecret, method, path, params }) => {
  const search = new URLSearchParams({
    ...params,
    timestamp: String(Date.now()),
    recvWindow: "5000",
  });
  const signature = crypto.createHmac("sha256", String(apiSecret)).update(search.toString()).digest("hex");
  search.set("signature", signature);
  const url = `https://api.binance.com${path}?${search.toString()}`;
  const response = await fetch(url, {
    method,
    headers: {
      "X-MBX-APIKEY": String(apiKey),
    },
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
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

  const { apiKey, apiSecret, asset } = payload;
  if (!apiKey || !apiSecret || !asset) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ message: "Missing required fields" }));
    return;
  }

  const spotResult = await signedRequest({
    apiKey,
    apiSecret,
    method: "POST",
    path: "/sapi/v3/asset/getUserAsset",
    params: { asset: String(asset) },
  });

  if (!spotResult.response.ok) {
    res.statusCode = spotResult.response.status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(spotResult.data));
    return;
  }

  const fundingResult = await signedRequest({
    apiKey,
    apiSecret,
    method: "POST",
    path: "/sapi/v1/asset/get-funding-asset",
    params: { asset: String(asset) },
  });

  if (!fundingResult.response.ok) {
    res.statusCode = fundingResult.response.status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(fundingResult.data));
    return;
  }

  const spotEntry = Array.isArray(spotResult.data)
    ? spotResult.data.find((item) => String(item?.asset).toUpperCase() === String(asset).toUpperCase())
    : null;
  const fundingEntry = Array.isArray(fundingResult.data)
    ? fundingResult.data.find((item) => String(item?.asset).toUpperCase() === String(asset).toUpperCase())
    : null;

  const response = {
    asset: String(asset).toUpperCase(),
    spotFree: Number(spotEntry?.free || 0),
    spotLocked: Number(spotEntry?.locked || 0),
    fundingFree: Number(fundingEntry?.free || 0),
  };

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(response));
}
