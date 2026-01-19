const collectBody = async (req) => {
  let data = "";
  for await (const chunk of req) {
    data += chunk;
  }
  return data;
};

export const proxyRequest = async (req, res, targetBase) => {
  const url = new URL(req.url, "http://localhost");
  const target = new URL(targetBase);
  target.search = url.search;

  const init = {
    method: req.method,
    headers: {
      "Content-Type": req.headers["content-type"] || "application/json",
    },
  };

  if (req.method && !["GET", "HEAD"].includes(req.method)) {
    init.body = await collectBody(req);
  }

  const response = await fetch(target.toString(), init);
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "content-encoding") return;
    res.setHeader(key, value);
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  res.end(buffer);
};
