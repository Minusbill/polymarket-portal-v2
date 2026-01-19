import type { MarketInfo, PositionRow, RewardRow, Wallet } from "../types";

export const makeMockWallets = (count = 6): Wallet[] =>
  Array.from({ length: count }).map((_, idx) => ({
    id: `w-${idx + 1}`,
    nickname: `Wallet ${idx + 1}`,
    address: `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`,
    privateKey: `0x${Math.random().toString(16).padEnd(66, "0").slice(0, 66)}`,
    balance: null,
    enabled: true,
    ipName: `proxy-0${(idx % 3) + 1}`,
    ipEndpoint: `http://127.0.0.1:808${idx % 3}`,
    proxyAddress: "",
    volume: Number((Math.random() * 5200 + 300).toFixed(2)),
    pnl: Number((Math.random() * 800 - 200).toFixed(2)),
    selected: idx % 2 === 0,
  }));

export const makeMockMarket = (slug: string): MarketInfo => ({
  slug,
  title: "Will Lakers beat Celtics tonight?",
  status: "OPEN",
  yesPrice: Number((0.48 + Math.random() * 0.05).toFixed(3)),
  noPrice: Number((0.52 + Math.random() * 0.05).toFixed(3)),
  updatedAt: new Date().toLocaleString(),
  outcomes: ["YES", "NO"],
  book: {
    yesBids: [
      { price: 0.49, size: 1200 },
      { price: 0.48, size: 2100 },
      { price: 0.47, size: 2800 },
    ],
    yesAsks: [
      { price: 0.51, size: 900 },
      { price: 0.52, size: 1500 },
      { price: 0.53, size: 2000 },
    ],
    noBids: [
      { price: 0.49, size: 1100 },
      { price: 0.48, size: 2000 },
      { price: 0.47, size: 2500 },
    ],
    noAsks: [
      { price: 0.51, size: 950 },
      { price: 0.52, size: 1400 },
      { price: 0.53, size: 2100 },
    ],
  },
});

export const makeMockRewards = (wallets: Wallet[]): RewardRow[] =>
  wallets.map((w) => ({
    address: w.address,
    available: Number((Math.random() * 120).toFixed(2)),
    claimed: Number((Math.random() * 80).toFixed(2)),
  }));

export const makeMockPositions = (wallets: Wallet[]): PositionRow[] =>
  wallets.map((w, idx) => ({
    id: `pos-${idx + 1}`,
    address: w.address,
    market: idx % 2 === 0 ? "epl-ars-liv-2026-01-08" : "nba-lal-bos-2026-01-08",
    size: Number((Math.random() * 120).toFixed(2)),
    status: idx % 3 === 0 ? "可 Redeem" : "持仓中",
    endDate: "2026-01-08",
    redeemable: idx % 3 === 0,
    value: Number((Math.random() * 120).toFixed(2)),
  }));
