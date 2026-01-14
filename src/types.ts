export type Wallet = {
  id: string;
  nickname: string;
  address: string;
  privateKey?: string;
  balance: number | null;
  enabled: boolean;
  ipName: string;
  ipEndpoint: string;
  volume: number;
  selected: boolean;
};

export type WalletPair = {
  id: string;
  name: string;
  a: string;
  b: string;
  direction: "BUY" | "SELL";
  selected: boolean;
};

export type MarketInfo = {
  slug: string;
  title: string;
  status: "OPEN" | "RESOLVED";
  yesPrice: number;
  noPrice: number;
  updatedAt: string;
  outcomes: [string, string];
  book: {
    yesBids: Array<{ price: number; size: number }>;
    yesAsks: Array<{ price: number; size: number }>;
    noBids: Array<{ price: number; size: number }>;
    noAsks: Array<{ price: number; size: number }>;
  };
};

export type ExecutionPlan = {
  size: number;
  side: "BOTH";
  pairCount: number;
  estimatedTrades: number;
};

export type RewardRow = {
  address: string;
  available: number;
  claimed: number;
};

export type PositionRow = {
  id: string;
  address: string;
  market: string;
  size: number;
  status: "可 Redeem" | "持仓中";
};

export type LogEntry = {
  ts: string;
  message: string;
};
