import type { Ref } from "vue";
import type { PositionRow, Wallet } from "../types";

const pushToastError = (pushToast: (message: string, tone?: "info" | "error") => void, message: string) => {
  pushToast(message, "error");
};

type Dependencies = {
  wallets: Wallet[];
  positions: Ref<PositionRow[]>;
  positionsLoading: Ref<boolean>;
  positionsSlugInput: Ref<string>;
  singleSelections: Record<string, boolean>;
  singlePositionsSlugInput: Ref<string>;
  singlePositionsLoading: Ref<boolean>;
  singlePositionsByWallet: Record<string, { size: number; value: number; outcomeDetail: string }>;
  parseSlug: (input: string) => string;
  fetchPositions: (address: string) => Promise<any[]>;
  pushToast: (message: string, tone?: "info" | "error") => void;
};

export const usePositionActions = (deps: Dependencies) => {
  const loadPositions = async () => {
    if (deps.positionsLoading.value) return;
    const targets = deps.wallets.filter(
      (wallet) =>
        wallet.selected && wallet.proxyAddress && wallet.proxyAddress !== "无法获取" && wallet.proxyAddress !== "未初始化"
    );
    if (targets.length === 0) {
      pushToastError(deps.pushToast, "未选择可查询的钱包代理地址。");
      return;
    }
    const slugFilter = deps.parseSlug(deps.positionsSlugInput.value).toLowerCase();
    deps.positionsLoading.value = true;
    try {
      const results = await Promise.all(
        targets.map(async (wallet) => {
          const list = await deps.fetchPositions(wallet.proxyAddress);
          const filtered = slugFilter
            ? list.filter((item: any) => {
                const rawSlug = String(item?.slug || item?.eventSlug || "").toLowerCase();
                return rawSlug === slugFilter;
              })
            : list;
          return filtered.map((item: any) => {
            const title = item?.title || item?.slug || "未知市场";
            const outcome = item?.outcome ? ` · ${item.outcome}` : "";
            const endDate = item?.endDate ? String(item.endDate).slice(0, 10) : "";
            const redeemable = Boolean(item?.redeemable);
            const size = Number(item?.size || 0);
            const curPrice = Number(item?.curPrice || 0);
            const currentValue = Number.isFinite(size) && Number.isFinite(curPrice) ? size * curPrice : 0;
            if (currentValue === 0 && endDate) {
              const endTs = Date.parse(`${endDate}T00:00:00Z`);
              if (!Number.isNaN(endTs) && endTs < Date.now()) return null;
            }
            const slug = String(item?.slug || item?.eventSlug || "");
            return {
              id: `${item?.asset || item?.conditionId || title}-${wallet.proxyAddress}`,
              address: item?.proxyWallet || wallet.proxyAddress,
              market: `${title}${outcome}`,
              slug,
              size,
              status: redeemable ? "可 Redeem" : "持仓中",
              endDate,
              redeemable,
              value: currentValue,
            } as PositionRow;
          });
        })
      );
      deps.positions.value = results.flat().filter((item): item is PositionRow => Boolean(item));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      pushToastError(deps.pushToast, `仓位查询失败：${message}`);
      deps.positions.value = [];
    } finally {
      deps.positionsLoading.value = false;
    }
  };

  const loadSinglePositionsBySlug = async () => {
    if (deps.singlePositionsLoading.value) return;
    const slug = deps.parseSlug(deps.singlePositionsSlugInput.value).toLowerCase();
    if (!slug) {
      pushToastError(deps.pushToast, "请输入有效的 slug。");
      return;
    }
    const targets = deps.wallets.filter((wallet) => deps.singleSelections[wallet.id]);
    if (targets.length === 0) {
      pushToastError(deps.pushToast, "未选择钱包。");
      return;
    }
    deps.singlePositionsLoading.value = true;
    Object.keys(deps.singlePositionsByWallet).forEach((key) => {
      delete deps.singlePositionsByWallet[key];
    });
    try {
      await Promise.all(
        targets.map(async (wallet) => {
          if (!wallet.proxyAddress || wallet.proxyAddress === "无法获取" || wallet.proxyAddress === "未初始化") {
            return;
          }
          const list = await deps.fetchPositions(wallet.proxyAddress);
          const matches = list.filter((item: any) => {
            const rawSlug = String(item?.slug || item?.eventSlug || "").toLowerCase();
            return rawSlug === slug;
          });
          const outcomeMap = new Map<string, { size: number; value: number }>();
          matches.forEach((item: any) => {
            const label = String(item?.outcome || "").trim();
            if (!label) return;
            const sizeValue = Number(item?.size || 0);
            const priceValue = Number(item?.curPrice || 0);
            const valueValue = Number.isFinite(sizeValue) && Number.isFinite(priceValue) ? sizeValue * priceValue : 0;
            const current = outcomeMap.get(label) || { size: 0, value: 0 };
            outcomeMap.set(label, {
              size: current.size + (Number.isFinite(sizeValue) ? sizeValue : 0),
              value: current.value + (Number.isFinite(valueValue) ? valueValue : 0),
            });
          });
          const size = matches.reduce((acc: number, item: any) => acc + Number(item?.size || 0), 0);
          const value = matches.reduce((acc: number, item: any) => {
            const itemSize = Number(item?.size || 0);
            const price = Number(item?.curPrice || 0);
            if (!Number.isFinite(itemSize) || !Number.isFinite(price)) return acc;
            return acc + itemSize * price;
          }, 0);
          const outcomeDetail = Array.from(outcomeMap.entries())
            .map(([label, stats]) => `${label} ${stats.size.toFixed(4)} / ${stats.value.toFixed(2)}`)
            .join(" | ");
          deps.singlePositionsByWallet[wallet.id] = { size, value, outcomeDetail };
        })
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      pushToastError(deps.pushToast, `仓位查询失败：${message}`);
    } finally {
      deps.singlePositionsLoading.value = false;
    }
  };

  const clearPositions = () => {
    deps.positions.value = [];
  };

  return {
    loadPositions,
    loadSinglePositionsBySlug,
    clearPositions,
  };
};
