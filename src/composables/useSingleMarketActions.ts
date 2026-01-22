import type { Ref } from "vue";
import type { MarketInfo } from "../types";

type MarketTokenIds = { yes: string | null; no: string | null };

type Dependencies = {
  singleMarket: Ref<MarketInfo | null>;
  singleMarketInput: Ref<string>;
  singleMarketTokenIds: Ref<MarketTokenIds>;
  singleOrderBookStatus: Ref<string>;
  parseSlug: (input: string) => string;
  pushSingleLog: (message: string) => void;
  fetchMarketBySlug: (slug: string) => Promise<{ market: MarketInfo; tokenIds: MarketTokenIds }>;
  fetchOrderBook: (tokenId: string) => Promise<{ bids: Array<{ price: string; size: string }>; asks: Array<{ price: string; size: string }> }>;
};

export const useSingleMarketActions = (deps: Dependencies) => {
  const applySingleOrderBooks = async (tokenIds: MarketTokenIds) => {
    if (!deps.singleMarket.value) return;
    if (!tokenIds.yes || !tokenIds.no) {
      deps.singleOrderBookStatus.value = "订单簿 token_id 缺失，无法加载深度。";
      return;
    }
    try {
      const [yesBook, noBook] = await Promise.all([
        deps.fetchOrderBook(tokenIds.yes),
        deps.fetchOrderBook(tokenIds.no),
      ]);
      const topThree = (list: Array<{ price: string; size: string }> | undefined) =>
        list && list.length
          ? list.slice(-3).reverse().map((item) => ({ price: Number(item.price), size: Number(item.size) }))
          : [];
      deps.singleMarket.value = {
        ...deps.singleMarket.value,
        updatedAt: new Date().toLocaleString(),
        book: {
          yesBids: topThree(yesBook.bids),
          yesAsks: topThree(yesBook.asks),
          noBids: topThree(noBook.bids),
          noAsks: topThree(noBook.asks),
        },
      };
      deps.singleOrderBookStatus.value = "";
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      deps.singleOrderBookStatus.value = `订单簿加载失败：${message}`;
      deps.pushSingleLog(deps.singleOrderBookStatus.value);
      console.error("Order book fetch failed:", error);
    }
  };

  const loadSingleMarket = async () => {
    const slug = deps.parseSlug(deps.singleMarketInput.value);
    if (!slug) {
      deps.pushSingleLog("请输入有效的市场 slug 或链接。");
      return;
    }
    try {
      const result = await deps.fetchMarketBySlug(slug);
      deps.singleMarket.value = result.market;
      deps.singleMarketTokenIds.value = result.tokenIds;
      deps.singleMarketInput.value = slug;
      deps.singleOrderBookStatus.value = "";
      await applySingleOrderBooks(result.tokenIds);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      deps.pushSingleLog(`市场加载失败：${message}`);
    }
  };

  const refreshSingleMarket = async () => {
    if (!deps.singleMarketInput.value) return;
    const slug = deps.parseSlug(deps.singleMarketInput.value);
    if (!slug) return;
    try {
      const result = await deps.fetchMarketBySlug(slug);
      deps.singleMarket.value = result.market;
      deps.singleMarketTokenIds.value = result.tokenIds;
      deps.singleOrderBookStatus.value = "";
      await applySingleOrderBooks(result.tokenIds);
    } catch {
      deps.pushSingleLog("刷新失败，请稍后重试。");
    }
  };

  return {
    applySingleOrderBooks,
    loadSingleMarket,
    refreshSingleMarket,
  };
};
