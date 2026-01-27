import type { MarketInfo, PositionRow, RewardRow, Wallet } from "../types";

const randomHex = (length: number) =>
  Array.from({ length })
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join("");

const randomBetween = (min: number, max: number, decimals = 2) =>
  Number((min + Math.random() * (max - min)).toFixed(decimals));

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const makeMockWallets = (count = 6): Wallet[] =>
  Array.from({ length: count }).map((_, idx) => ({
    id: `w-${idx + 1}`,
    index: String(idx + 1),
    nickname: `Wallet ${idx + 1}`,
    address: `0x${randomHex(40)}`,
    privateKey: `0x${randomHex(64)}`,
    balance: null,
    enabled: true,
    ipName: `proxy-0${(idx % 3) + 1}`,
    ipEndpoint: `http://127.0.0.1:808${idx % 3}`,
    proxyAddress: idx % 2 === 0 ? `0x${randomHex(40)}` : "",
    volume: randomBetween(500, 9800, 2),
    pnl: randomBetween(-600, 1400, 2),
    selected: idx % 2 === 0,
  }));

export const makeMockMarket = (slug: string): MarketInfo => {
  const yesMid = randomBetween(0.35, 0.65, 3);
  const noMid = Number((1 - yesMid).toFixed(3));
  const spread = randomBetween(0.01, 0.03, 3);
  const step = randomBetween(0.003, 0.008, 3);
  const yesBid = clamp(yesMid - spread / 2, 0.01, 0.99);
  const yesAsk = clamp(yesMid + spread / 2, 0.01, 0.99);
  const noBid = clamp(noMid - spread / 2, 0.01, 0.99);
  const noAsk = clamp(noMid + spread / 2, 0.01, 0.99);
  const makeBids = (start: number) =>
    [0, 1, 2].map((idx) => ({
      price: Number(clamp(start - step * idx, 0.01, 0.99).toFixed(3)),
      size: randomBetween(400, 2600, 2),
    }));
  const makeAsks = (start: number) =>
    [0, 1, 2].map((idx) => ({
      price: Number(clamp(start + step * idx, 0.01, 0.99).toFixed(3)),
      size: randomBetween(400, 2600, 2),
    }));
  return {
    slug,
    title: "Will Lakers beat Celtics tonight?",
    status: "OPEN",
    yesPrice: Number(yesBid.toFixed(3)),
    noPrice: Number(noBid.toFixed(3)),
    updatedAt: new Date().toLocaleString(),
    outcomes: ["YES", "NO"],
    book: {
      yesBids: makeBids(yesBid),
      yesAsks: makeAsks(yesAsk),
      noBids: makeBids(noBid),
      noAsks: makeAsks(noAsk),
    },
  };
};

export const makeMockRewards = (wallets: Wallet[]): RewardRow[] =>
  wallets.map((w) => {
    const claimed = randomBetween(0, 80, 2);
    return {
      address: w.address,
      available: Number((claimed + randomBetween(10, 120, 2)).toFixed(2)),
      claimed,
    };
  });

export const makeMockPositions = (wallets: Wallet[]): PositionRow[] => {
  const slugs = ["epl-ars-liv-2026-01-08", "nba-lal-bos-2026-01-08", "crypto-btc-2026-01-08"];
  return wallets.map((w, idx) => {
    const slug = slugs[idx % slugs.length];
    const size = randomBetween(5, 90, 2);
    const price = randomBetween(0.3, 0.7, 3);
    const value = Number((size * price).toFixed(2));
    const redeemable = idx % 3 === 0;
    return {
      id: `pos-${idx + 1}`,
      address: w.address,
      market: slug,
      slug,
      size,
      status: redeemable ? "可 Redeem" : "持仓中",
      endDate: "2026-01-08",
      redeemable,
      value,
    };
  });
};
