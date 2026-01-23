import type { Ref } from "vue";
import type { LogEntry, Wallet } from "../types";
import { relayerWithdrawToken } from "../services/relayerWithdraw";

const pushWithdrawLog = (logs: Ref<LogEntry[]>, message: string) => {
  logs.value.push({ ts: new Date().toLocaleTimeString(), message });
};

const formatWithdrawError = (error: unknown) => {
  const raw = error as any;
  const base = error instanceof Error ? error.message : String(error);
  const code = raw?.code ? `code=${raw.code}` : "";
  const reason = raw?.reason || raw?.error?.reason || raw?.shortMessage || "";
  let rpcMessage = "";
  const body = raw?.error?.body || raw?.body;
  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body);
      rpcMessage = parsed?.error?.message || "";
    } catch {
      rpcMessage = body;
    }
  }
  const extras = [code, reason, rpcMessage].filter(Boolean).join(" | ");
  const message = [base, extras].filter(Boolean).join(" | ");
  return message.length > 280 ? `${message.slice(0, 280)}...` : message;
};

type WithdrawRow = {
  id: string;
  index?: string;
  address: string;
  proxyAddress: string;
  withdrawAddress: string;
  amount: number | null;
  balance: number | null;
  selected: boolean;
};

type Dependencies = {
  wallets: Wallet[];
  withdrawRows: Ref<WithdrawRow[]>;
  withdrawStatus: Ref<string>;
  withdrawLogs: Ref<LogEntry[]>;
  balanceLoading: Ref<boolean>;
  withdrawMode: Ref<"all" | "partial">;
  withdrawAmount: Ref<number | null>;
  withdrawImportText: Ref<string>;
  transferMode: Ref<"many-to-many" | "many-to-one">;
  singleTargetAddress: Ref<string>;
  fetchUsdcEBalance: (address: string) => Promise<number>;
  maskAddress: (value: string) => string;
};

export const useWithdrawActions = (deps: Dependencies) => {
  const refreshWithdrawBalances = () => {
    const targets = deps.withdrawRows.value.filter((row) => row.selected);
    if (targets.length === 0) {
      deps.withdrawStatus.value = "未选择提现地址，无法查询余额。";
      pushWithdrawLog(deps.withdrawLogs, deps.withdrawStatus.value);
      return;
    }
    const valid = targets.filter(
      (row) => row.proxyAddress && row.proxyAddress !== "无法获取" && row.proxyAddress !== "未初始化"
    );
    const skipped = targets.length - valid.length;
    if (valid.length === 0) {
      deps.withdrawStatus.value = "存在未获取代理地址的行，请先加载代理地址。";
      pushWithdrawLog(deps.withdrawLogs, deps.withdrawStatus.value);
      return;
    }
    deps.balanceLoading.value = true;
    deps.withdrawStatus.value = `开始查询 ${valid.length} 个代理地址余额...`;
    pushWithdrawLog(deps.withdrawLogs, deps.withdrawStatus.value);
    Promise.all(
      valid.map(async (row) => {
        row.balance = await deps.fetchUsdcEBalance(row.proxyAddress);
      })
    )
      .then(() => {
        deps.withdrawStatus.value = `已更新 ${valid.length} 个代理地址余额`;
        pushWithdrawLog(deps.withdrawLogs, deps.withdrawStatus.value);
        if (skipped > 0) {
          pushWithdrawLog(deps.withdrawLogs, `已跳过 ${skipped} 个未初始化或无法获取代理地址的钱包。`);
        }
      })
      .catch((error) => {
        deps.withdrawStatus.value = `查询失败：${error instanceof Error ? error.message : String(error)}`;
        pushWithdrawLog(deps.withdrawLogs, deps.withdrawStatus.value);
      })
      .finally(() => {
        deps.balanceLoading.value = false;
      });
  };

  const toggleWithdrawHeader = () => {
    const nextValue = !deps.withdrawRows.value.every((row) => row.selected);
    deps.withdrawRows.value.forEach((row) => {
      row.selected = nextValue;
    });
  };

  const applyWithdrawAmount = () => {
    if (deps.withdrawMode.value !== "partial") return;
    if (!deps.withdrawAmount.value || deps.withdrawAmount.value <= 0) {
      deps.withdrawStatus.value = "请填写批量金额后再应用。";
      pushWithdrawLog(deps.withdrawLogs, deps.withdrawStatus.value);
      return;
    }
    deps.withdrawRows.value.forEach((row) => {
      if (row.selected) row.amount = deps.withdrawAmount.value;
    });
    deps.withdrawStatus.value = "已应用批量金额到选中地址。";
    pushWithdrawLog(deps.withdrawLogs, deps.withdrawStatus.value);
  };

  const applyWithdrawAddresses = () => {
    const lines = deps.withdrawImportText.value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (deps.transferMode.value === "many-to-many") {
      if (lines.length === 0) {
        deps.withdrawStatus.value = "未检测到可导入的地址。";
        pushWithdrawLog(deps.withdrawLogs, deps.withdrawStatus.value);
        return;
      }
      const targets = deps.withdrawRows.value.filter((row) => row.selected);
      if (targets.length === 0) {
        deps.withdrawStatus.value = "未选择要应用的地址。";
        pushWithdrawLog(deps.withdrawLogs, deps.withdrawStatus.value);
        return;
      }
      targets.forEach((row) => {
        row.withdrawAddress = "";
      });
      const withIndex: Array<{ index: number; address: string }> = [];
      const sequential: string[] = [];
      lines.forEach((line) => {
        const parts = line.split(",").map((part) => part.trim()).filter(Boolean);
        if (parts.length >= 2) {
          const indexValue = Number(parts[0]);
          if (Number.isFinite(indexValue) && indexValue > 0) {
            const address = parts[1];
            if (address) {
              withIndex.push({ index: indexValue, address });
            }
            return;
          }
        }
        if (parts[0]) sequential.push(parts[0]);
      });
      withIndex.forEach((entry) => {
        const row = deps.withdrawRows.value[entry.index - 1];
        if (row) row.withdrawAddress = entry.address;
      });
      let cursor = 0;
      targets.forEach((row) => {
        if (row.withdrawAddress) return;
        const nextAddress = sequential[cursor];
        if (nextAddress) {
          row.withdrawAddress = nextAddress;
          cursor += 1;
        }
      });
      const appliedCount = withIndex.length + cursor;
      deps.withdrawStatus.value = `已导入 ${appliedCount} 个提现地址`;
      pushWithdrawLog(deps.withdrawLogs, deps.withdrawStatus.value);
    } else {
      if (!deps.singleTargetAddress.value.trim()) {
        deps.withdrawStatus.value = "多转一模式需要填写目标地址。";
        pushWithdrawLog(deps.withdrawLogs, deps.withdrawStatus.value);
        return;
      }
      const targets = deps.withdrawRows.value.filter((row) => row.selected);
      if (targets.length === 0) {
        deps.withdrawStatus.value = "未选择要应用的地址。";
        pushWithdrawLog(deps.withdrawLogs, deps.withdrawStatus.value);
        return;
      }
      targets.forEach((row) => {
        row.withdrawAddress = deps.singleTargetAddress.value.trim();
      });
      deps.withdrawStatus.value = "多转一目标地址已保存。";
      pushWithdrawLog(deps.withdrawLogs, deps.withdrawStatus.value);
    }
  };

  const bulkWithdraw = async () => {
    const targets = deps.withdrawRows.value.filter((row) => row.selected);
    if (targets.length === 0) {
      deps.withdrawStatus.value = "未选择提现地址，无法批量提现。";
      pushWithdrawLog(deps.withdrawLogs, deps.withdrawStatus.value);
      return;
    }
    if (deps.transferMode.value === "many-to-one" && !deps.singleTargetAddress.value.trim()) {
      deps.withdrawStatus.value = "多转一模式需要填写目标地址。";
      pushWithdrawLog(deps.withdrawLogs, deps.withdrawStatus.value);
      return;
    }
    if (deps.withdrawMode.value === "partial") {
      const invalid = targets.find((row) => !row.amount || row.amount <= 0);
      if (invalid) {
        deps.withdrawStatus.value = "部分提现需要为每个选中地址填写金额。";
        pushWithdrawLog(deps.withdrawLogs, deps.withdrawStatus.value);
        return;
      }
    }
    deps.withdrawStatus.value = `开始批量提现：${targets.length} 个代理地址，${
      deps.withdrawMode.value === "partial" ? "部分金额" : "清空"
    }，${deps.transferMode.value === "many-to-one" ? "多转一" : "多转多"}`;
    pushWithdrawLog(deps.withdrawLogs, deps.withdrawStatus.value);
    for (let idx = 0; idx < targets.length; idx += 1) {
      const row = targets[idx];
      const wallet = deps.wallets.find((item) => item.address === row.address);
      if (!wallet?.privateKey) {
        pushWithdrawLog(deps.withdrawLogs, `#${idx + 1} ${deps.maskAddress(row.address)} 缺少私钥，已跳过`);
        continue;
      }
      if (!row.proxyAddress || row.proxyAddress === "无法获取" || row.proxyAddress === "未初始化") {
        pushWithdrawLog(deps.withdrawLogs, `#${idx + 1} ${deps.maskAddress(row.address)} 代理地址无效，已跳过`);
        continue;
      }
      const toAddress = deps.transferMode.value === "many-to-one" ? deps.singleTargetAddress.value : row.withdrawAddress;
      if (!toAddress) {
        pushWithdrawLog(deps.withdrawLogs, `#${idx + 1} ${deps.maskAddress(row.address)} 缺少转入地址，已跳过`);
        continue;
      }
      let amount = deps.withdrawMode.value === "partial" ? Number(row.amount) : row.balance ?? 0;
      const modeLabel = deps.withdrawMode.value === "partial" ? "部分" : "清空";
      pushWithdrawLog(
        deps.withdrawLogs,
        `#${idx + 1} 模式=${modeLabel} EOA=${deps.maskAddress(wallet.address)} Safe=${deps.maskAddress(row.proxyAddress)} -> ${deps.maskAddress(toAddress)}`
      );
      let safeBalance: number | null = null;
      if (deps.withdrawMode.value !== "partial") {
        try {
          amount = await deps.fetchUsdcEBalance(row.proxyAddress);
          safeBalance = amount;
          pushWithdrawLog(
            deps.withdrawLogs,
            `#${idx + 1} 读取余额 ${amount} (Safe ${deps.maskAddress(row.proxyAddress)})`
          );
        } catch (error) {
          const message = formatWithdrawError(error);
          pushWithdrawLog(
            deps.withdrawLogs,
            `#${idx + 1} ${deps.maskAddress(row.proxyAddress)} 余额查询失败：${message}`
          );
          continue;
        }
      } else {
        try {
          safeBalance = await deps.fetchUsdcEBalance(row.proxyAddress);
          pushWithdrawLog(
            deps.withdrawLogs,
            `#${idx + 1} 读取余额 ${safeBalance} (Safe ${deps.maskAddress(row.proxyAddress)})`
          );
        } catch (error) {
          const message = formatWithdrawError(error);
          pushWithdrawLog(
            deps.withdrawLogs,
            `#${idx + 1} ${deps.maskAddress(row.proxyAddress)} 余额查询失败：${message}`
          );
        }
      }
      if (deps.withdrawMode.value === "partial" && !Number.isFinite(amount)) {
        pushWithdrawLog(deps.withdrawLogs, `#${idx + 1} 未提供有效金额，已跳过`);
        continue;
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        pushWithdrawLog(deps.withdrawLogs, `#${idx + 1} ${deps.maskAddress(row.proxyAddress)} 余额为 0，已跳过`);
        continue;
      }
      if (safeBalance !== null && Number.isFinite(safeBalance) && amount > safeBalance) {
        pushWithdrawLog(
          deps.withdrawLogs,
          `#${idx + 1} 提现金额 ${amount} 大于余额 ${safeBalance}，已跳过`
        );
        continue;
      }
      pushWithdrawLog(
        deps.withdrawLogs,
        `#${idx + 1} ${deps.maskAddress(row.proxyAddress)} -> ${deps.maskAddress(toAddress)} 准备提现 ${amount}`
      );
      try {
        const txHash = await relayerWithdrawToken({
          privateKey: wallet.privateKey,
          builderApiKey: "",
          builderSecret: "",
          builderPassphrase: "",
          relayerUrl: "",
          toAddress,
          amount,
          tokenAddress: undefined,
          logger: (message) => pushWithdrawLog(deps.withdrawLogs, `#${idx + 1} ${message}`),
        });
        pushWithdrawLog(
          deps.withdrawLogs,
          `#${idx + 1} ${deps.maskAddress(row.proxyAddress)} -> ${deps.maskAddress(toAddress)} 提现 ${amount} 成功，tx ${txHash || "无 hash"}`
        );
      } catch (error) {
        const message = formatWithdrawError(error);
        pushWithdrawLog(deps.withdrawLogs, `#${idx + 1} ${deps.maskAddress(row.proxyAddress)} 提现失败：${message}`);
      }
    }
    deps.withdrawStatus.value = "批量提现执行完成。";
    pushWithdrawLog(deps.withdrawLogs, deps.withdrawStatus.value);
  };

  const clearWithdrawLogs = () => {
    deps.withdrawLogs.value = [];
  };

  return {
    refreshWithdrawBalances,
    toggleWithdrawHeader,
    applyWithdrawAmount,
    applyWithdrawAddresses,
    bulkWithdraw,
    clearWithdrawLogs,
  };
};
