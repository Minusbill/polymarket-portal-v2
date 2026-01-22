import type { MarketInfo } from "../types";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const parseTokenIds = (raw: any) => {
  if (Array.isArray(raw?.clobTokenIds)) {
    return { yes: raw.clobTokenIds[0] || null, no: raw.clobTokenIds[1] || null };
  }
  if (typeof raw?.clobTokenIds === "string") {
    try {
      const parsed = JSON.parse(raw.clobTokenIds);
      if (Array.isArray(parsed)) {
        return { yes: parsed[0] || null, no: parsed[1] || null };
      }
    } catch {
      return { yes: null, no: null };
    }
  }
  return { yes: null, no: null };
};

const normalizePrice = (value: number | null | undefined, fallback: number) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0 || num >= 1) return fallback;
  return num;
};

const mapMarket = (raw: any, slug: string): MarketInfo => {
  const title = raw?.question || raw?.title || slug;
  const outcomes = (() => {
    if (Array.isArray(raw?.outcomes)) return raw.outcomes;
    if (typeof raw?.outcomes === "string") {
      try {
        const parsed = JSON.parse(raw.outcomes);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return ["YES", "NO"];
      }
    }
    return ["YES", "NO"];
  })();
  const outcomePrices = (() => {
    if (Array.isArray(raw?.outcomePrices)) return raw.outcomePrices;
    if (typeof raw?.outcomePrices === "string") {
      try {
        const parsed = JSON.parse(raw.outcomePrices);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return null;
      }
    }
    return null;
  })();
  const rawYes = normalizePrice(outcomePrices?.[0] ?? raw?.bestBid ?? raw?.lastTradePrice, 0.5);
  const rawNo = normalizePrice(outcomePrices?.[1] ?? 1 - rawYes, 0.5);
  const yesBid = clamp(rawYes, 0.01, 0.99);
  const noBid = clamp(rawNo, 0.01, 0.99);
  const yesAsk = clamp(normalizePrice(raw?.bestAsk ?? yesBid, yesBid), yesBid, 0.99);
  const noAsk = clamp(normalizePrice(rawNo, noBid), noBid, 0.99);
  const resolved = Boolean(raw?.resolved || raw?.closed || raw?.status === "resolved");
  return {
    slug: raw?.slug || slug,
    title,
    status: resolved ? "RESOLVED" : "OPEN",
    yesPrice: Number(yesBid.toFixed(3)),
    noPrice: Number(noBid.toFixed(3)),
    updatedAt: raw?.updatedAt || raw?.updated_at || new Date().toLocaleString(),
    outcomes: outcomes.length === 2 ? outcomes : ["YES", "NO"],
    book: {
      yesBids: [],
      yesAsks: [],
      noBids: [],
      noAsks: [],
    },
  };
};

export const fetchMarketBySlug = async (slug: string) => {
  const isConditionId = /^0x[0-9a-fA-F]{64}$/.test(slug);
  const queryKey = isConditionId ? "conditionId" : "slug";
  const response = await fetch(`/api/market?${queryKey}=${encodeURIComponent(slug)}`);
  if (!response.ok) throw new Error("API 请求失败");
  const data = await response.json();
  const raw = Array.isArray(data) ? data[0] : data;
  if (!raw) throw new Error("未找到市场数据");
  return { market: mapMarket(raw, slug), tokenIds: parseTokenIds(raw) };
};

export const fetchOrderBook = async (tokenId: string) => {
  const response = await fetch(`/api/book?token_id=${encodeURIComponent(tokenId)}`);
  if (!response.ok) throw new Error("订单簿请求失败");
  const data = await response.json();
  return {
    bids: Array.isArray(data?.bids) ? data.bids : [],
    asks: Array.isArray(data?.asks) ? data.asks : [],
  };
};

export const fetchProxyProfile = async (address: string) => {
  const response = await fetch(`/api/profile?address=${encodeURIComponent(address)}`);
  if (!response.ok) throw new Error("代理地址请求失败");
  return response.json();
};

export const fetchWalletLeaderboard = async (address: string) => {
  const params = new URLSearchParams({
    category: "OVERALL",
    timePeriod: "ALL",
    orderBy: "PNL",
    limit: "25",
    user: address,
  });
  const response = await fetch(`/api/leaderboard?${params.toString()}`);
  if (!response.ok) throw new Error("交易量请求失败");
  const data = await response.json();
  return Array.isArray(data) && data.length ? data[0] : null;
};

export const fetchDepositBridgeAddress = async (address: string) => {
  const response = await fetch("/api/bridge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });
  if (!response.ok) throw new Error("充值桥接地址请求失败");
  const data = await response.json();
  const evm = data?.address?.evm;
  if (!evm) throw new Error("充值桥接地址返回为空");
  return evm as string;
};

export const fetchPositions = async (address: string) => {
  const params = new URLSearchParams({
    sizeThreshold: "1",
    limit: "100",
    sortBy: "TOKENS",
    sortDirection: "DESC",
    user: address,
  });
  const response = await fetch(`/api/positions?${params.toString()}`);
  if (!response.ok) throw new Error("仓位请求失败");
  const data = await response.json();
  return Array.isArray(data) ? data : [];
};
