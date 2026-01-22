export const fetchBinanceAssets = async (payload: { apiKey: string; apiSecret: string }) => {
  const response = await fetch("/api/binance-assets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (data as any)?.msg || (data as any)?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return Array.isArray(data) ? data : [];
};

export const fetchBinanceBalances = async (payload: { apiKey: string; apiSecret: string; asset: string }) => {
  const response = await fetch("/api/binance-balances", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (data as any)?.msg || (data as any)?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return data as { asset: string; spotFree: number; spotLocked: number; fundingFree: number };
};

export const requestBinanceWithdraw = async (payload: {
  apiKey: string;
  apiSecret: string;
  coin: string;
  network: string;
  address: string;
  amount: number;
  walletType?: number;
}) => {
  const response = await fetch("/api/binance-withdraw", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (data as any)?.msg || (data as any)?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return data as { id?: string; success?: boolean };
};

export const fetchPublicIp = async () => {
  const response = await fetch("/api/public-ip");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json().catch(() => ({}));
  if (!(data as any)?.ip) throw new Error("IP 获取失败");
  return String((data as any).ip);
};
