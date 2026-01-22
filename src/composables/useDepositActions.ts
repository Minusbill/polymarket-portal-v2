import type { Ref } from "vue";
import type { LogEntry } from "../types";

type FundRow = {
  id: string;
  index?: string;
  address: string;
  proxyAddress: string;
  depositAddress?: string;
  balance: number | null;
  selected: boolean;
};

type ExchangeConfig = {
  name: string;
  apiKey: string;
  apiSecret: string;
};

type BinanceBalances = {
  asset: string;
  spotFree: string | number;
  spotLocked: string | number;
  fundingFree: string | number;
};

type BinanceWithdrawResult = {
  id?: string;
};

type ToastFn = (message: string, tone?: "info" | "error") => void;

type Dependencies = {
  fundRows: Ref<FundRow[]>;
  depositStatus: Ref<string>;
  depositLogs: Ref<LogEntry[]>;
  balanceLoading: Ref<boolean>;
  depositBridgeLoading: Ref<boolean>;
  depositAsset: Ref<string>;
  depositNetwork: Ref<string>;
  depositDelaySec: Ref<number>;
  depositAmountMin: Ref<number | null>;
  depositAmountMax: Ref<number | null>;
  depositRunning: Ref<boolean>;
  exchangeConfig: ExchangeConfig;
  pushToast: ToastFn;
  maskAddress: (value: string) => string;
  fetchUsdcEBalance: (address: string) => Promise<number>;
  fetchDepositBridgeAddress: (address: string) => Promise<string>;
  fetchBinanceBalances: (input: { apiKey: string; apiSecret: string; asset: string }) => Promise<BinanceBalances>;
  requestBinanceWithdraw: (input: {
    apiKey: string;
    apiSecret: string;
    coin: string;
    network: string;
    address: string;
    amount: number;
    walletType: number;
  }) => Promise<BinanceWithdrawResult>;
};

const pushDepositLog = (logs: Ref<LogEntry[]>, message: string) => {
  logs.value.push({ ts: new Date().toLocaleTimeString(), message });
};

const pickRandomAmount = (min: number, max: number) => {
  if (max < min) return min;
  return Number((min + Math.random() * (max - min)).toFixed(2));
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const useDepositActions = (deps: Dependencies) => {
  const refreshFundBalances = () => {
    const targets = deps.fundRows.value.filter((row) => row.selected);
    if (targets.length === 0) {
      deps.depositStatus.value = "未选择 Fund 地址，无法查询余额。";
      pushDepositLog(deps.depositLogs, deps.depositStatus.value);
      return;
    }
    const valid = targets.filter(
      (row) => row.proxyAddress && row.proxyAddress !== "无法获取" && row.proxyAddress !== "未初始化"
    );
    const skipped = targets.length - valid.length;
    if (valid.length === 0) {
      deps.depositStatus.value = "存在未获取代理地址的行，请先加载代理地址。";
      pushDepositLog(deps.depositLogs, deps.depositStatus.value);
      return;
    }
    deps.balanceLoading.value = true;
    deps.depositStatus.value = `开始查询 ${valid.length} 个代理地址余额...`;
    pushDepositLog(deps.depositLogs, deps.depositStatus.value);
    Promise.all(
      valid.map(async (row) => {
        row.balance = await deps.fetchUsdcEBalance(row.proxyAddress);
      })
    )
      .then(() => {
        deps.depositStatus.value = `已更新 ${valid.length} 个代理地址余额`;
        pushDepositLog(deps.depositLogs, deps.depositStatus.value);
        if (skipped > 0) {
          pushDepositLog(deps.depositLogs, `已跳过 ${skipped} 个未初始化或无法获取代理地址的钱包。`);
        }
      })
      .catch((error) => {
        deps.depositStatus.value = `查询失败：${error instanceof Error ? error.message : String(error)}`;
        pushDepositLog(deps.depositLogs, deps.depositStatus.value);
      })
      .finally(() => {
        deps.balanceLoading.value = false;
      });
  };

  const loadDepositBridgeAddresses = () => {
    const targets = deps.fundRows.value.filter((row) => row.selected);
    if (targets.length === 0) {
      pushDepositLog(deps.depositLogs, "未选择钱包，无法获取充值桥接地址。");
      deps.pushToast("未选择钱包，无法获取充值桥接地址。", "error");
      return;
    }
    const valid = targets.filter(
      (row) => row.proxyAddress && row.proxyAddress !== "无法获取" && row.proxyAddress !== "未初始化"
    );
    const skipped = targets.length - valid.length;
    if (valid.length === 0) {
      pushDepositLog(deps.depositLogs, "存在未获取代理地址的行，请先加载代理地址。");
      deps.pushToast("存在未获取代理地址的行，请先加载代理地址。", "error");
      return;
    }
    deps.depositBridgeLoading.value = true;
    pushDepositLog(deps.depositLogs, `开始获取 ${valid.length} 个充值桥接地址...`);
    let failed = 0;
    const run = async () => {
      for (const row of valid) {
        try {
          row.depositAddress = await deps.fetchDepositBridgeAddress(row.proxyAddress);
        } catch (error) {
          failed += 1;
          const message = error instanceof Error ? error.message : String(error);
          pushDepositLog(
            deps.depositLogs,
            `桥接地址获取失败（${deps.maskAddress(row.proxyAddress)}）：${message}`
          );
        }
      }
      if (skipped > 0) {
        pushDepositLog(deps.depositLogs, `已跳过 ${skipped} 个未初始化或无法获取代理地址的钱包。`);
      }
      deps.depositBridgeLoading.value = false;
      if (failed > 0) {
        pushDepositLog(deps.depositLogs, `完成，失败 ${failed} 个。`);
        deps.pushToast(`充值桥接地址完成，失败 ${failed} 个`, "error");
      } else {
        pushDepositLog(deps.depositLogs, "充值桥接地址已更新。");
        deps.pushToast("充值桥接地址已更新。");
      }
    };
    run();
  };

  const toggleFundHeader = () => {
    const nextValue = !deps.fundRows.value.every((row) => row.selected);
    deps.fundRows.value.forEach((row) => {
      row.selected = nextValue;
    });
  };

  const confirmDeposit = async () => {
    const targets = deps.fundRows.value.filter((row) => row.selected);
    if (targets.length === 0) {
      deps.depositStatus.value = "未选择 Fund 地址，无法开始。";
      pushDepositLog(deps.depositLogs, "未选择 Fund 地址，无法开始。");
      return;
    }
    const missingBridge = targets.filter((row) => !row.depositAddress);
    if (missingBridge.length > 0) {
      deps.depositStatus.value = "请先获取桥接地址后再充值。";
      pushDepositLog(
        deps.depositLogs,
        "请先点击“获取充值桥接地址”，提现到桥接账户会自动转入代理账户。"
      );
      return;
    }
    if (deps.exchangeConfig.name !== "binance") {
      deps.depositStatus.value = "请先选择 Binance 交易所。";
      pushDepositLog(deps.depositLogs, deps.depositStatus.value);
      return;
    }
    if (!deps.exchangeConfig.apiKey.trim() || !deps.exchangeConfig.apiSecret.trim()) {
      deps.depositStatus.value = "请填写 Binance API Key 与 Secret。";
      pushDepositLog(deps.depositLogs, deps.depositStatus.value);
      return;
    }
    if (
      !deps.depositAmountMin.value ||
      !deps.depositAmountMax.value ||
      deps.depositAmountMin.value <= 0 ||
      deps.depositAmountMax.value <= 0
    ) {
      deps.depositStatus.value = "请填写有效的充值金额区间。";
      pushDepositLog(deps.depositLogs, deps.depositStatus.value);
      return;
    }
    if (deps.depositAmountMax.value < deps.depositAmountMin.value) {
      deps.depositStatus.value = "充值金额区间上限不能小于下限。";
      pushDepositLog(deps.depositLogs, deps.depositStatus.value);
      return;
    }
    deps.depositRunning.value = true;
    deps.depositStatus.value = `开始执行交易所提现：${targets.length} 个地址，${deps.depositAsset.value}/${deps.depositNetwork.value}，延迟 ${deps.depositDelaySec.value}s，金额区间 ${deps.depositAmountMin.value}-${deps.depositAmountMax.value}`;
    pushDepositLog(
      deps.depositLogs,
      `开始执行：${targets.length} 个地址，${deps.depositAsset.value}/${deps.depositNetwork.value}，延迟 ${deps.depositDelaySec.value}s，金额区间 ${deps.depositAmountMin.value}-${deps.depositAmountMax.value}`
    );
    try {
      const balances = await deps.fetchBinanceBalances({
        apiKey: deps.exchangeConfig.apiKey.trim(),
        apiSecret: deps.exchangeConfig.apiSecret.trim(),
        asset: deps.depositAsset.value,
      });
      pushDepositLog(
        deps.depositLogs,
        `${balances.asset} 现货余额 free=${balances.spotFree} locked=${balances.spotLocked}`
      );
      pushDepositLog(deps.depositLogs, `${balances.asset} 资金余额 free=${balances.fundingFree}`);
      const total = Number(balances.spotFree) + Number(balances.fundingFree);
      if (!Number.isFinite(total) || total <= 0) {
        pushDepositLog(deps.depositLogs, `${balances.asset} 可用余额不足，已停止执行。`);
        deps.depositRunning.value = false;
        return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      pushDepositLog(deps.depositLogs, `余额查询失败：${message}`);
    }
    for (let idx = 0; idx < targets.length; idx += 1) {
      const row = targets[idx];
      const amount = pickRandomAmount(deps.depositAmountMin.value as number, deps.depositAmountMax.value as number);
      try {
        const result = await deps.requestBinanceWithdraw({
          apiKey: deps.exchangeConfig.apiKey.trim(),
          apiSecret: deps.exchangeConfig.apiSecret.trim(),
          coin: deps.depositAsset.value,
          network: deps.depositNetwork.value,
          address: row.depositAddress as string,
          amount,
          walletType: 0,
        });
        pushDepositLog(
          deps.depositLogs,
          `#${idx + 1} ${deps.maskAddress(row.address)} -> ${deps.maskAddress(
            row.depositAddress as string
          )} 金额 ${amount} 已提交${result?.id ? `，订单 ${result.id}` : ""}`
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        pushDepositLog(deps.depositLogs, `#${idx + 1} ${deps.maskAddress(row.address)} 提现失败：${message}`);
      }
      if (deps.depositDelaySec.value > 0 && idx < targets.length - 1) {
        await sleep(deps.depositDelaySec.value * 1000);
      }
    }
    deps.depositRunning.value = false;
    pushDepositLog(deps.depositLogs, "执行结束。");
  };

  const clearDepositLogs = () => {
    deps.depositLogs.value = [];
  };

  return {
    refreshFundBalances,
    loadDepositBridgeAddresses,
    toggleFundHeader,
    confirmDeposit,
    clearDepositLogs,
  };
};
