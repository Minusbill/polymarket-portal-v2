export default async function handler(req, res) {
  const response = await fetch("https://api.ipify.org?format=json");
  const data = await response.json().catch(() => ({}));
  res.statusCode = response.status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}
