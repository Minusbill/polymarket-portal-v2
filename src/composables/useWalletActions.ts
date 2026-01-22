import type { ComputedRef, Ref } from "vue";
import type { Wallet, WalletPair } from "../types";

type FundRow = {
  id: string;
  index?: string;
  address: string;
  proxyAddress: string;
  depositAddress?: string;
  balance: number | null;
  selected: boolean;
};

type WithdrawRow = {
  id: string;
  index?: string;
  address: string;
  proxyAddress: string;
  ipName: string;
  ipEndpoint: string;
  withdrawAddress: string;
  amount: number | null;
  balance: number | null;
  selected: boolean;
};

type ToastFn = (message: string, tone?: "info" | "error") => void;

type Dependencies = {
  wallets: Wallet[];
  pairs: WalletPair[];
  fundRows: Ref<FundRow[]>;
  withdrawRows: Ref<WithdrawRow[]>;
  proxyLoading: Ref<boolean>;
  walletBalanceLoading: Ref<boolean>;
  walletVolumeLoading: Ref<boolean>;
  importText: Ref<string>;
  showImport: Ref<boolean>;
  showFlow: Ref<boolean>;
  showPairs: Ref<boolean>;
  showPairConfig: Ref<boolean>;
  pairConfigTarget: Ref<WalletPair | null>;
  pairConfigAmount: Ref<number | null>;
  walletIpTarget: Ref<Wallet | null>;
  walletIpName: Ref<string>;
  walletIpEndpoint: Ref<string>;
  selectedIpPreset: Ref<string>;
  showWalletIpModal: Ref<boolean>;
  ipConfigOptions: ComputedRef<Array<{ key: string; label: string; name: string; endpoint: string }>>;
  walletsHeaderChecked: ComputedRef<boolean>;
  visibleWallets: ComputedRef<Wallet[]>;
  singleSelections: Record<string, boolean>;
  pushLog: (message: string) => void;
  pushToast: ToastFn;
  maskAddress: (value: string) => string;
  normalizeIpValue: (value: string) => string;
  normalizeIndexValue: (value: string, fallback: string) => string;
  applyWalletIpCache: (wallets: Wallet[]) => void;
  saveVault: (wallets: Wallet[]) => void;
  parseWalletImportText: (text: string, startIndex: number) => {
    wallets: Array<{
      index: string;
      privateKey: string;
      address: string;
      ipName: string;
      ipEndpoint: string;
    }>;
    invalidCount: number;
  };
  readTextFile: (file: File) => Promise<string>;
  fetchProxyProfile: (address: string) => Promise<{ proxyWallet?: string }>;
  fetchProxyAddressOnChain: (address: string) => Promise<string>;
  fetchUsdcEBalance: (address: string) => Promise<number>;
  fetchWalletLeaderboard: (address: string) => Promise<{ vol?: number; pnl?: number } | null>;
};

export const useWalletActions = (deps: Dependencies) => {
  const nameForWallet = (id: string) => deps.wallets.find((w) => w.id === id)?.nickname || "-";

  const rebuildPairs = () => {
    deps.pairs.splice(0, deps.pairs.length);
    for (let i = 0; i < deps.wallets.length; i += 2) {
      const a = deps.wallets[i];
      const b = deps.wallets[i + 1];
      if (!a || !b) break;
      deps.pairs.push({
        id: `pair-${i / 2}`,
        name: `Pair ${i / 2 + 1}`,
        a: a.id,
        b: b.id,
        direction: "BUY",
        selected: true,
        amount: null,
      });
    }
  };

  const rebuildFundRows = () => {
    deps.fundRows.value = deps.wallets.map((wallet, idx) => ({
      id: `fund-${idx + 1}`,
      index: wallet.index || String(idx + 1),
      address: wallet.address,
      proxyAddress: wallet.proxyAddress || "",
      depositAddress: "",
      balance: null,
      selected: idx % 2 === 0,
    }));
    deps.withdrawRows.value = deps.wallets.map((wallet, idx) => ({
      id: `wd-${idx + 1}`,
      index: wallet.index || String(idx + 1),
      address: wallet.address,
      proxyAddress: wallet.proxyAddress || "",
      ipName: wallet.ipName || "",
      ipEndpoint: wallet.ipEndpoint || "",
      withdrawAddress: "",
      amount: null,
      balance: null,
      selected: idx % 2 === 0,
    }));
  };

  const syncRowIndexes = () => {
    const map = new Map(
      deps.wallets.map((wallet) => [
        wallet.address,
        { index: wallet.index || "", ipName: wallet.ipName || "", ipEndpoint: wallet.ipEndpoint || "" },
      ])
    );
    deps.fundRows.value.forEach((row) => {
      const entry = map.get(row.address);
      if (entry) {
        row.index = entry.index;
      }
    });
    deps.withdrawRows.value.forEach((row) => {
      const entry = map.get(row.address);
      if (entry) {
        row.index = entry.index;
        row.ipName = entry.ipName;
        row.ipEndpoint = entry.ipEndpoint;
      }
    });
  };

  const confirmImport = () => {
    const startIndex = deps.wallets.length + 1;
    const { wallets: parsedWallets, invalidCount } = deps.parseWalletImportText(deps.importText.value, startIndex);
    parsedWallets.forEach((item, idx) => {
      deps.wallets.push({
        id: `w-${startIndex + idx}`,
        index: String(item.index),
        nickname: `Wallet ${item.index}`,
        address: item.address,
        privateKey: item.privateKey,
        balance: null,
        enabled: true,
        ipName: item.ipName,
        ipEndpoint: item.ipEndpoint,
        proxyAddress: "",
        volume: null,
        pnl: null,
        selected: true,
      });
    });
    rebuildPairs();
    rebuildFundRows();
    deps.showImport.value = false;
    deps.applyWalletIpCache(deps.wallets);
    deps.saveVault(deps.wallets);
    if (invalidCount > 0) {
      deps.pushLog(`导入完成，${invalidCount} 条私钥无效已跳过。`);
    }
  };

  const handleCsvImport = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;
    const text = await deps.readTextFile(file);
    const rows = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (rows.length === 0) return;
    deps.importText.value = rows.join("\n");
    target.value = "";
  };

  const clearWallets = () => {
    deps.wallets.splice(0, deps.wallets.length);
    deps.pairs.splice(0, deps.pairs.length);
    deps.fundRows.value = [];
  };

  const toggleWalletsHeader = () => {
    const nextValue = !deps.walletsHeaderChecked.value;
    deps.visibleWallets.value.forEach((wallet) => {
      wallet.selected = nextValue;
    });
  };

  const openPairConfig = (pair: WalletPair) => {
    deps.pairConfigTarget.value = pair;
    deps.pairConfigAmount.value = pair.amount;
    deps.showPairConfig.value = true;
  };

  const savePairConfig = () => {
    if (!deps.pairConfigTarget.value) return;
    deps.pairConfigTarget.value.amount =
      deps.pairConfigAmount.value && deps.pairConfigAmount.value > 0 ? deps.pairConfigAmount.value : null;
    deps.showPairConfig.value = false;
  };

  const loadProxyAddress = async (wallet: Wallet) => {
    try {
      const data = await deps.fetchProxyProfile(wallet.address);
      if (data?.proxyWallet) {
        wallet.proxyAddress = data.proxyWallet;
        rebuildFundRows();
        deps.pushLog(`已获取代理地址：${deps.maskAddress(wallet.proxyAddress)}`);
      } else {
        deps.pushLog("未返回代理地址，尝试链上获取...");
        deps.pushToast("未返回代理地址，正在链上获取。");
        const onchain = await deps.fetchProxyAddressOnChain(wallet.address);
        wallet.proxyAddress = onchain;
        rebuildFundRows();
        deps.pushLog(`已获取代理地址：${deps.maskAddress(wallet.proxyAddress)}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      deps.pushLog(`代理地址接口失败：${message}，尝试链上获取...`);
      try {
        const onchain = await deps.fetchProxyAddressOnChain(wallet.address);
        wallet.proxyAddress = onchain;
        rebuildFundRows();
        deps.pushLog(`已获取代理地址：${deps.maskAddress(wallet.proxyAddress)}`);
      } catch (inner) {
        const innerMessage = inner instanceof Error ? inner.message : String(inner);
        deps.pushLog(`链上获取失败：${innerMessage}`);
        wallet.proxyAddress = "无法获取";
      }
    }
  };

  const loadSelectedProxyAddresses = async () => {
    const targets = deps.wallets.filter(
      (wallet) =>
        wallet.selected && (!wallet.proxyAddress || wallet.proxyAddress === "无法获取" || wallet.proxyAddress === "未初始化")
    );
    if (targets.length === 0) {
      deps.pushLog("无可查询的钱包（已获取或未选择）。");
      deps.pushToast("无可查询的钱包（已获取或未选择）。", "error");
      return;
    }
    deps.proxyLoading.value = true;
    deps.pushLog(`开始获取代理地址：${targets.length} 个钱包`);
    deps.pushToast(`开始获取代理地址：${targets.length} 个钱包`);
    for (const wallet of targets) {
      await loadProxyAddress(wallet);
    }
    deps.proxyLoading.value = false;
    deps.pushLog("代理地址获取完成。");
    deps.pushToast("代理地址获取完成。");
  };

  const openWalletIp = (wallet: Wallet) => {
    deps.walletIpTarget.value = wallet;
    deps.walletIpName.value = wallet.ipName || "";
    deps.walletIpEndpoint.value = wallet.ipEndpoint || "";
    deps.selectedIpPreset.value = "";
    deps.showWalletIpModal.value = true;
  };

  const applyIpPreset = () => {
    const preset = deps.ipConfigOptions.value.find((item) => item.key === deps.selectedIpPreset.value);
    if (!preset) return;
    deps.walletIpName.value = preset.name;
    deps.walletIpEndpoint.value = preset.endpoint;
  };

  const saveWalletIp = () => {
    if (!deps.walletIpTarget.value) return;
    deps.walletIpTarget.value.ipName = deps.normalizeIpValue(deps.walletIpName.value);
    deps.walletIpTarget.value.ipEndpoint = deps.normalizeIpValue(deps.walletIpEndpoint.value);
    deps.showWalletIpModal.value = false;
  };

  const openFlow = () => {
    deps.showFlow.value = true;
  };

  const openImport = () => {
    deps.importText.value = "";
    deps.showImport.value = true;
  };

  const openPairs = () => {
    deps.showPairs.value = true;
  };

  const refreshBalances = async () => {
    const targets = deps.wallets.filter((wallet) => wallet.selected);
    if (targets.length === 0) {
      deps.pushLog("未选择钱包，无法查询余额。");
      deps.pushToast("未选择钱包，无法查询余额。", "error");
      return;
    }
    const valid = targets.filter(
      (wallet) =>
        wallet.proxyAddress && wallet.proxyAddress !== "无法获取" && wallet.proxyAddress !== "未初始化"
    );
    const skipped = targets.length - valid.length;
    if (valid.length === 0) {
      deps.pushLog("存在未获取代理地址的行，请先加载代理地址。");
      deps.pushToast("存在未获取代理地址的行，请先加载代理地址。", "error");
      return;
    }
    deps.walletBalanceLoading.value = true;
    deps.pushLog(`开始查询 ${valid.length} 个代理地址余额...`);
    deps.pushToast(`开始查询 ${valid.length} 个代理地址余额...`);
    let failed = 0;
    for (const wallet of valid) {
      try {
        wallet.balance = await deps.fetchUsdcEBalance(wallet.proxyAddress);
      } catch (err) {
        failed += 1;
        const message = err instanceof Error ? err.message : String(err);
        deps.pushLog(`余额查询失败（${deps.maskAddress(wallet.proxyAddress)}）：${message}`);
      }
    }
    if (skipped > 0) {
      deps.pushLog(`已跳过 ${skipped} 个未初始化或无法获取代理地址的钱包。`);
    }
    deps.walletBalanceLoading.value = false;
    if (failed > 0) {
      deps.pushToast(`余额查询完成，失败 ${failed} 个`, "error");
    } else {
      deps.pushToast("余额查询完成。");
    }
  };

  const refreshWalletMetrics = async () => {
    const targets = deps.wallets.filter((wallet) => wallet.selected);
    if (targets.length === 0) {
      deps.pushLog("未选择钱包，无法查询交易量。");
      deps.pushToast("未选择钱包，无法查询交易量。", "error");
      return;
    }
    const valid = targets.filter(
      (wallet) =>
        wallet.proxyAddress && wallet.proxyAddress !== "无法获取" && wallet.proxyAddress !== "未初始化"
    );
    const skipped = targets.length - valid.length;
    if (valid.length === 0) {
      deps.pushLog("存在未获取代理地址的行，请先加载代理地址。");
      deps.pushToast("存在未获取代理地址的行，请先加载代理地址。", "error");
      return;
    }
    deps.walletVolumeLoading.value = true;
    deps.pushLog(`开始查询 ${valid.length} 个代理地址交易量...`);
    let failed = 0;
    for (const wallet of valid) {
      try {
        const data = await deps.fetchWalletLeaderboard(wallet.proxyAddress);
        wallet.volume = data?.vol ?? 0;
        wallet.pnl = data?.pnl ?? 0;
      } catch (error) {
        failed += 1;
        wallet.volume = 0;
        wallet.pnl = 0;
        const message = error instanceof Error ? error.message : String(error);
        deps.pushLog(`交易量查询失败（${deps.maskAddress(wallet.proxyAddress)}）：${message}`);
      }
    }
    if (skipped > 0) {
      deps.pushLog(`已跳过 ${skipped} 个未初始化或无法获取代理地址的钱包。`);
    }
    deps.walletVolumeLoading.value = false;
    if (failed > 0) {
      deps.pushToast(`交易量查询完成，失败 ${failed} 个`, "error");
    } else {
      deps.pushToast("交易量查询完成。");
    }
  };

  const exportKeys = () => {
    if (deps.wallets.length === 0) {
      deps.pushLog("无可导出的钱包。");
      return;
    }
    const rows = deps.wallets
      .map((wallet) => {
        if (!wallet.privateKey) return "";
        const ipName = wallet.ipName || "无";
        const ipEndpoint = wallet.ipEndpoint || "无";
        const index = deps.normalizeIndexValue(wallet.index, "无");
        return [index, wallet.privateKey, ipName, ipEndpoint].join(",");
      })
      .filter(Boolean);
    const content = ["index,privateKey,ipName,ipEndpoint", ...rows].join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "polymarket-wallets.csv";
    link.click();
    URL.revokeObjectURL(url);
    deps.pushLog("已导出私钥 CSV。");
  };

  const selectAllPairs = (value: boolean) => {
    deps.pairs.forEach((pair) => {
      pair.selected = value;
    });
  };

  return {
    nameForWallet,
    rebuildPairs,
    rebuildFundRows,
    syncRowIndexes,
    confirmImport,
    handleCsvImport,
    clearWallets,
    toggleWalletsHeader,
    openPairConfig,
    savePairConfig,
    loadProxyAddress,
    loadSelectedProxyAddresses,
    openWalletIp,
    applyIpPreset,
    saveWalletIp,
    openFlow,
    openImport,
    openPairs,
    refreshBalances,
    refreshWalletMetrics,
    exportKeys,
    selectAllPairs,
  };
};
