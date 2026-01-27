import type { Ref } from "vue";
import type { LogEntry, MarketInfo, Wallet } from "../types";

const pushLog = (logs: Ref<LogEntry[]>, message: string) => {
  logs.value.push({ ts: new Date().toLocaleTimeString(), message });
  if (logs.value.length > 60) logs.value.shift();
};

const pickBestAsk = (rows: Array<{ price: number; size: number }>) => {
  if (!rows || rows.length === 0) return null;
  return rows.reduce((best, row) => (row.price < best.price ? row : best));
};

const pickBestBid = (rows: Array<{ price: number; size: number }>) => {
  if (!rows || rows.length === 0) return null;
  return rows.reduce((best, row) => (row.price > best.price ? row : best));
};

type Dependencies = {
  wallets: Wallet[];
  singleSelections: Record<string, boolean>;
  singleMarket: Ref<MarketInfo | null>;
  singleMarketInput: Ref<string>;
  singleMarketTokenIds: Ref<{ yes: string | null; no: string | null }>;
  singleOrderBookStatus: Ref<string>;
  singleShowSellOnly: Ref<boolean>;
  singleLogs: Ref<LogEntry[]>;
  singleDelayMin: Ref<number>;
  singleDelayMax: Ref<number>;
  singleAmountMin: Ref<number | null>;
  singleAmountMax: Ref<number | null>;
  singleSide: Ref<"YES" | "NO">;
  balanceLoading: Ref<boolean>;
  fetchUsdcEBalance: (address: string) => Promise<number>;
  maskAddress: (value: string) => string;
};

export const useSingleActions = (deps: Dependencies) => {
  let pendingTimers: Array<ReturnType<typeof setTimeout>> = [];

  const clearPendingTimers = () => {
    pendingTimers.forEach((timer) => clearTimeout(timer));
    pendingTimers = [];
  };

  const scheduleTimeout = (callback: () => void, delayMs: number) => {
    const timer = (typeof window !== "undefined" ? window.setTimeout(callback, delayMs) : setTimeout(callback, delayMs)) as ReturnType<
      typeof setTimeout
    >;
    pendingTimers.push(timer);
  };

  const pushSingleLog = (message: string) => {
    pushLog(deps.singleLogs, message);
  };

  const resetSingleState = () => {
    clearPendingTimers();
    deps.singleMarket.value = null;
    deps.singleMarketInput.value = "";
    deps.singleMarketTokenIds.value = { yes: null, no: null };
    deps.singleOrderBookStatus.value = "";
    deps.singleShowSellOnly.value = true;
    deps.singleLogs.value = [];
  };

  const toggleSingleHeader = () => {
    const nextValue = deps.wallets.length > 0 && deps.wallets.every((wallet) => deps.singleSelections[wallet.id]);
    deps.wallets.forEach((wallet) => {
      deps.singleSelections[wallet.id] = !nextValue;
    });
  };

  const refreshSingleBalances = async () => {
    const selected = deps.wallets.filter((wallet) => deps.singleSelections[wallet.id]);
    if (selected.length === 0) {
      pushSingleLog("未选择钱包，无法查询余额。");
      return;
    }
    const valid = selected.filter(
      (wallet) =>
        wallet.proxyAddress && wallet.proxyAddress !== "无法获取" && wallet.proxyAddress !== "未初始化"
    );
    if (valid.length === 0) {
      pushSingleLog("存在未获取代理地址的钱包，无法查询余额。");
      return;
    }
    deps.balanceLoading.value = true;
    pushSingleLog(`开始查询 ${valid.length} 个代理地址余额...`);
    for (const wallet of valid) {
      try {
        wallet.balance = await deps.fetchUsdcEBalance(wallet.proxyAddress);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        pushSingleLog(`余额查询失败（${deps.maskAddress(wallet.proxyAddress)}）：${message}`);
      }
    }
    deps.balanceLoading.value = false;
    pushSingleLog("余额查询完成。");
  };

  const executeSingle = () => {
    const selected = deps.wallets.filter((wallet) => deps.singleSelections[wallet.id]);
    if (!deps.singleMarket.value) {
      pushSingleLog("未加载市场，无法执行。");
      return;
    }
    if (selected.length === 0) {
      pushSingleLog("未选择钱包，执行终止。");
      return;
    }
    const delayMin = Number(deps.singleDelayMin.value || 0);
    const delayMax = Number(deps.singleDelayMax.value || 0);
    if (delayMax < delayMin) {
      pushSingleLog("随机间隔上限不能小于下限。");
      return;
    }
    if (
      !deps.singleAmountMin.value ||
      !deps.singleAmountMax.value ||
      deps.singleAmountMin.value <= 0 ||
      deps.singleAmountMax.value <= 0
    ) {
      pushSingleLog("请填写有效的随机金额区间。");
      return;
    }
    if (deps.singleAmountMax.value < deps.singleAmountMin.value) {
      pushSingleLog("随机金额上限不能小于下限。");
      return;
    }
    clearPendingTimers();
    const market = deps.singleMarket.value;
    const yesAsk = pickBestAsk(market.book.yesAsks);
    const yesBid = pickBestBid(market.book.yesBids);
    const noAsk = pickBestAsk(market.book.noAsks);
    const noBid = pickBestBid(market.book.noBids);
    const formatLevel = (level: { price: number; size: number } | null) =>
      level ? `${level.price.toFixed(3)} (${level.size.toFixed(2)})` : "-";
    pushSingleLog(`市场: ${market.title} (${market.slug}) 状态 ${market.status} 更新时间 ${market.updatedAt}`);
    pushSingleLog(
      `盘口: YES 买一 ${formatLevel(yesBid)} / 卖一 ${formatLevel(yesAsk)} | NO 买一 ${formatLevel(noBid)} / 卖一 ${formatLevel(noAsk)}`
    );
    pushSingleLog(
      `开始执行 ${selected.length} 个钱包，方向 ${deps.singleSide.value}，随机间隔 ${delayMin}-${delayMax}s。`
    );
    let cumulativeMs = 0;
    const activeAsk = deps.singleSide.value === "YES" ? yesAsk : noAsk;
    const fallbackPrice = deps.singleSide.value === "YES" ? market.yesPrice : market.noPrice;
    selected.forEach((wallet, idx) => {
      const delay =
        delayMax > delayMin
          ? Number((delayMin + Math.random() * (delayMax - delayMin)).toFixed(2))
          : delayMin;
      const amount =
        deps.singleAmountMax.value > deps.singleAmountMin.value
          ? Number(
              (deps.singleAmountMin.value +
                Math.random() * (deps.singleAmountMax.value - deps.singleAmountMin.value)).toFixed(2)
            )
          : deps.singleAmountMin.value;
      const price = activeAsk?.price ?? fallbackPrice;
      const priceLabel = activeAsk ? "卖一" : "参考价";
      cumulativeMs += delay * 1000;
      scheduleTimeout(() => {
        pushSingleLog(
          `#${idx + 1} ${deps.maskAddress(wallet.address)} 买 ${deps.singleSide.value} 金额 ${amount} 价格 ${price.toFixed(3)} (${priceLabel}) 间隔 ${delay}s 已提交`
        );
        if (idx === selected.length - 1) {
          pushSingleLog("执行完成。");
        }
      }, cumulativeMs);
    });
  };

  const clearSingleLogs = () => {
    clearPendingTimers();
    deps.singleLogs.value = [];
  };

  return {
    pushSingleLog,
    resetSingleState,
    toggleSingleHeader,
    refreshSingleBalances,
    executeSingle,
    clearSingleLogs,
  };
};
