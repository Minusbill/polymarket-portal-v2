import { proxyRequest } from "./_proxy.js";

export default async function handler(req, res) {
  return proxyRequest(req, res, "https://gamma-api.polymarket.com/public-profile");
}
