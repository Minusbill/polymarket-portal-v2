import type { Ref } from "vue";
import type { MarketInfo } from "../types";

type MarketTokenIds = { yes: string | null; no: string | null };

type Dependencies = {
  market: Ref<MarketInfo | null>;
  marketInput: Ref<string>;
  marketTokenIds: Ref<MarketTokenIds>;
  orderBookStatus: Ref<string>;
  parseSlug: (input: string) => string;
  pushLog: (message: string) => void;
  fetchMarketBySlug: (slug: string) => Promise<{ market: MarketInfo; tokenIds: MarketTokenIds }>;
  fetchOrderBook: (tokenId: string) => Promise<{ bids: Array<{ price: string; size: string }>; asks: Array<{ price: string; size: string }> }>;
};

export const useMarketActions = (deps: Dependencies) => {
  const applyOrderBooks = async (tokenIds: MarketTokenIds) => {
    if (!deps.market.value) return;
    if (!tokenIds.yes || !tokenIds.no) {
      deps.orderBookStatus.value = "订单簿 token_id 缺失，无法加载深度。";
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
      deps.market.value = {
        ...deps.market.value,
        updatedAt: new Date().toLocaleString(),
        book: {
          yesBids: topThree(yesBook.bids),
          yesAsks: topThree(yesBook.asks),
          noBids: topThree(noBook.bids),
          noAsks: topThree(noBook.asks),
        },
      };
      deps.orderBookStatus.value = "";
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      deps.orderBookStatus.value = `订单簿加载失败：${message}`;
      deps.pushLog(deps.orderBookStatus.value);
      console.error("Order book fetch failed:", error);
    }
  };

  const loadMarket = async () => {
    const slug = deps.parseSlug(deps.marketInput.value);
    if (!slug) {
      deps.pushLog("请输入有效的市场 slug 或链接。");
      return;
    }
    try {
      const result = await deps.fetchMarketBySlug(slug);
      deps.market.value = result.market;
      deps.marketTokenIds.value = result.tokenIds;
      deps.marketInput.value = slug;
      deps.orderBookStatus.value = "";
      await applyOrderBooks(result.tokenIds);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      deps.pushLog(`市场加载失败：${message}`);
    }
  };

  const refreshMarket = async () => {
    if (!deps.marketInput.value) return;
    const slug = deps.parseSlug(deps.marketInput.value);
    if (!slug) return;
    try {
      const result = await deps.fetchMarketBySlug(slug);
      deps.market.value = result.market;
      deps.marketTokenIds.value = result.tokenIds;
      deps.orderBookStatus.value = "";
      await applyOrderBooks(result.tokenIds);
    } catch {
      deps.pushLog("刷新失败，请稍后重试。");
    }
  };

  return {
    applyOrderBooks,
    loadMarket,
    refreshMarket,
  };
};
