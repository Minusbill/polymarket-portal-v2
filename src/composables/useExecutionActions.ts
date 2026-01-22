import type { Ref, ComputedRef } from "vue";
import type { ExecutionPlan, MarketInfo, WalletPair } from "../types";

type Dependencies = {
  execution: ExecutionPlan;
  selectedPairs: ComputedRef<WalletPair[]>;
  market: Ref<MarketInfo | null>;
  executionOrder: Ref<"yes-no" | "no-yes">;
  executionDelayMin: Ref<number | null>;
  executionDelayMax: Ref<number | null>;
  nameForWallet: (id: string) => string;
  pushLog: (message: string) => void;
  logs: Ref<Array<{ ts: string; message: string }>>;
};

export const useExecutionActions = (deps: Dependencies) => {
  const execute = () => {
    deps.execution.pairCount = deps.selectedPairs.value.length;
    deps.execution.estimatedTrades = deps.selectedPairs.value.length * 2;
    if (!deps.market.value) {
      deps.pushLog("未加载市场，无法执行。");
      return;
    }
    if (deps.selectedPairs.value.length === 0) {
      deps.pushLog("未选择钱包对，执行终止。");
      return;
    }
    const delayMin = deps.executionDelayMin.value ?? 0;
    const delayMax = deps.executionDelayMax.value ?? 0;
    if (delayMax < delayMin) {
      deps.pushLog("随机间隔上限不能小于下限。");
      return;
    }
    const orderLabel = deps.executionOrder.value === "yes-no" ? "先 YES 后 NO" : "先 NO 后 YES";
    deps.pushLog(
      `开始执行 ${deps.selectedPairs.value.length} 个钱包对，数量 ${deps.execution.size}，${orderLabel}，随机间隔 ${delayMin}-${delayMax}s`
    );
    deps.selectedPairs.value.forEach((pair) => {
      const size = pair.amount && pair.amount > 0 ? pair.amount : deps.execution.size;
      const delay =
        delayMax > delayMin
          ? Number((delayMin + Math.random() * (delayMax - delayMin)).toFixed(2))
          : delayMin;
      deps.pushLog(
        `${pair.name}：${deps.nameForWallet(pair.a)} / ${deps.nameForWallet(pair.b)} 数量 ${size}，间隔 ${delay}s，${orderLabel} 已提交`
      );
    });
    deps.pushLog("执行完成。");
  };

  const clearLogs = () => {
    deps.logs.value = [];
  };

  return {
    execute,
    clearLogs,
  };
};
