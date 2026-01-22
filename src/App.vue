<template>
  <div :class="['min-h-screen', darkMode ? 'theme-dark' : '']">
    <div class="min-h-screen app-bg text-brand-900">
      <header class="border-b border-brand-100 bg-white/80 backdrop-blur">
        <div class="mx-auto flex max-w-[1680px] flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between md:px-10">
          <div>
            <p class="text-xs uppercase tracking-[0.28em] text-brand-500">Polymarket Portal</p>
            <h1 class="font-display text-2xl tracking-tight md:text-3xl">多账户对刷交互门户</h1>
            <p class="text-sm text-brand-600">钱包对为最小单位，操作完全由用户手动确认。</p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <button class="btn-primary" @click="openFlow">操作说明</button>
            <button class="btn-outline" @click="darkMode = !darkMode">
              {{ darkMode ? "日间模式" : "夜间模式" }}
            </button>
          </div>
        </div>
      </header>

      <main class="mx-auto w-full max-w-[1680px] px-4 pb-10 pt-4 md:px-6">
        <div class="grid gap-4 lg:grid-cols-[200px_1fr]">
          <aside class="sticky top-4 h-fit rounded-2xl border border-brand-100 bg-white/90 p-3 shadow-card backdrop-blur">
            <div class="text-xs text-brand-600">模块导航</div>
            <div class="mt-3 space-y-2">
                <button class="nav-button" :class="currentPage === 'wallets' ? 'is-active' : ''" @click="currentPage = 'wallets'">
                钱包管理
              </button>
              <button class="nav-button" :class="currentPage === 'single' ? 'is-active' : ''" @click="currentPage = 'single'">
                单刷工作台
              </button>
              <button class="nav-button" :class="currentPage === 'positions' ? 'is-active' : ''" @click="currentPage = 'positions'">
                仓位管理
              </button>
                <button class="nav-button" :class="currentPage === 'deposit' ? 'is-active' : ''" @click="currentPage = 'deposit'">
                充值
              </button>
                <button class="nav-button" :class="currentPage === 'withdraw' ? 'is-active' : ''" @click="currentPage = 'withdraw'">
                提现
              </button>
            </div>
          </aside>

          <section class="space-y-4">
            <WalletsPage v-show="currentPage === 'wallets'" />

            <SingleWorkbenchPage v-show="currentPage === 'single'" />

            <PositionsPage v-show="currentPage === 'positions'" />

            <DepositPage v-show="currentPage === 'deposit'" />

            <WithdrawPage v-show="currentPage === 'withdraw'" />
          </section>
        </div>
      </main>
    </div>
  </div>

  <ImportModal
    :open="showImport"
    :import-text="importText"
    @close="showImport = false"
    @confirm="confirmImport"
    @csv-import="handleCsvImport"
    @update:importText="importText = $event"
  />

  <FlowModal :open="showFlow" :steps="flowSteps" @close="showFlow = false" />

  <IntroModal
    :open="showIntro"
    @close="showIntro = false"
    @hide-today="hidePopupForToday('intro'); showIntro = false"
  />


  <WalletIpModal
    :open="showWalletIpModal"
    :address-label="walletIpTarget ? maskAddress(walletIpTarget.address) : '-'"
    :ip-name="walletIpName"
    :ip-endpoint="walletIpEndpoint"
    :selected-preset="selectedIpPreset"
    :ip-name-options="ipNameOptions"
    :ip-config-options="ipConfigOptions"
    @close="showWalletIpModal = false"
    @save="saveWalletIp"
    @apply-preset="applyIpPreset"
    @update:ipName="walletIpName = $event"
    @update:ipEndpoint="walletIpEndpoint = $event"
    @update:selectedPreset="selectedIpPreset = $event"
  />

  <PairConfigModal
    :open="showPairConfig"
    :amount="pairConfigAmount"
    :label="pairConfigTarget ? `${pairConfigTarget.name}：${nameForWallet(pairConfigTarget.a)} / ${nameForWallet(pairConfigTarget.b)}` : '-'"
    @close="showPairConfig = false"
    @save="savePairConfig"
    @update:amount="pairConfigAmount = Number.isFinite($event) ? $event : null"
  />

  <div class="fixed bottom-4 right-4 z-50 space-y-2">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="rounded-lg border px-3 py-2 text-xs shadow-soft"
      :class="toast.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-brand-200 bg-white text-brand-700'"
    >
      {{ toast.message }}
    </div>
  </div>

  <PairsModal
    :open="showPairs"
    :pairs="pairs"
    :name-for-wallet="nameForWallet"
    @close="showPairs = false"
    @select-all="selectAllPairs"
  />

</template>

<script setup lang="ts">
import { computed, onMounted, provide, reactive, ref, watch } from "vue";
import type { ExecutionPlan, LogEntry, MarketInfo, PositionRow, Wallet, WalletPair } from "./types";
import { maskAddress, parseSlug } from "./utils";
import { formatU, depthWidth } from "./utils/uiHelpers";
import { withdrawUsdcFromSafeClient } from "./services/safeWithdraw";
import { sortAsks, sortBids } from "./utils/orderBookSort";
import { hidePopupForToday, shouldShowPopup } from "./utils/popupStorage";
import { fetchBinanceAssets, fetchBinanceBalances, fetchPublicIp, requestBinanceWithdraw } from "./services/binanceApi";
import {
  fetchDepositBridgeAddress,
  fetchMarketBySlug,
  fetchOrderBook,
  fetchPositions,
  fetchWalletLeaderboard,
  fetchProxyProfile,
} from "./services/polymarketApi";
import {
  fetchProxyAddressOnChain,
  fetchUsdcEBalance,
  getDefaultPolygonRpc,
  setActivePolygonRpc,
  setPolygonRpcList,
} from "./services/balanceService";
import { normalizeIndexValue, normalizeIpValue } from "./utils/walletFormat";
import { applyWalletIpCache, buildWalletIpMap, saveWalletIpMap } from "./services/walletIpCache";
import { decryptVault, getStoredVaultKey, hydrateWalletsFromVault, saveVault } from "./services/walletVault";
import { createToastHelpers } from "./utils/toast";
import { parseWalletImportText } from "./services/walletImport";
import { readTextFile } from "./utils/fileReaders";
import { PortalKey } from "./context/portalContext";
import { useExecutionActions } from "./composables/useExecutionActions";
import { useDepositActions } from "./composables/useDepositActions";
import { useExchangeActions } from "./composables/useExchangeActions";
import { useMarketActions } from "./composables/useMarketActions";
import { usePositionActions } from "./composables/usePositionActions";
import { useSingleActions } from "./composables/useSingleActions";
import { useSingleMarketActions } from "./composables/useSingleMarketActions";
import { useWalletActions } from "./composables/useWalletActions";
import { useWithdrawActions } from "./composables/useWithdrawActions";
import FlowModal from "./components/FlowModal.vue";
import ImportModal from "./components/ImportModal.vue";
import IntroModal from "./components/IntroModal.vue";
import PairConfigModal from "./components/PairConfigModal.vue";
import PairsModal from "./components/PairsModal.vue";
import WalletIpModal from "./components/WalletIpModal.vue";
import WalletsPage from "./pages/WalletsPage.vue";
import SingleWorkbenchPage from "./pages/SingleWorkbenchPage.vue";
import PositionsPage from "./pages/PositionsPage.vue";
import DepositPage from "./pages/DepositPage.vue";
import WithdrawPage from "./pages/WithdrawPage.vue";

const wallets = reactive<Wallet[]>([]);
const pairs = reactive<WalletPair[]>([]);
const market = ref<MarketInfo | null>(null);
const marketInput = ref("");
const singleMarket = ref<MarketInfo | null>(null);
const singleMarketInput = ref("");
const importText = ref("");
const showImport = ref(false);
const showPairs = ref(false);
const showFlow = ref(false);
const showIntro = ref(false);
const useProxy = ref(true);
const darkMode = ref(false);
const currentPage = ref<"wallets" | "single" | "positions" | "deposit" | "withdraw">("single");
const singleDelayMin = ref(1);
const singleDelayMax = ref(5);
const singleAmountMin = ref<number | null>(null);
const singleAmountMax = ref<number | null>(null);
const singleSide = ref<"YES" | "NO">("YES");
const singleLogs = ref<LogEntry[]>([]);
const singleSelections = reactive<Record<string, boolean>>({});

if (shouldShowPopup("intro")) {
  showIntro.value = true;
}

const flowSteps = [
  { title: "导入账户", desc: "在钱包管理中导入私钥或 CSV，确保钱包为双数并完成基础校验。" },
  { title: "配置钱包对", desc: "进入钱包对管理，确认配对与参与状态；需要隔离时绑定不同 IP 代理。" },
  { title: "加载市场", desc: "粘贴市场链接或 slug，确认市场状态、更新时间与 Yes/No 报价。" },
  { title: "查看盘口", desc: "关注买一价格与深度，合计接近 1 时更稳；偏离过大需谨慎。" },
  { title: "设置参数", desc: "选择参与的钱包对，输入统一数量，核对预计交易价值。" },
  { title: "执行确认", desc: "点击执行确认，系统按顺序模拟买卖 YES/NO，输出执行日志。" },
  { title: "复盘处理", desc: "查看仓位与执行结果，可等待结算 Redeem 或择机卖出。" },
];


const execution = reactive<ExecutionPlan>({
  size: 10,
  side: "BOTH",
  pairCount: 0,
  estimatedTrades: 0,
});

const positions = ref<PositionRow[]>([]);
const positionsLoading = ref(false);
const positionsSlugInput = ref("");
const transferMode = ref<"many-to-many" | "many-to-one">("many-to-many");
const singleTargetAddress = ref("");
const orderBookStatus = ref("");
const showSellOnly = ref(true);
const singleOrderBookStatus = ref("");
const singleShowSellOnly = ref(true);
const singlePositionsSlugInput = ref("");
const singlePositionsLoading = ref(false);
const singlePositionsByWallet = reactive<
  Record<string, { size: number; value: number; outcomeDetail: string }>
>({});
const showWalletIpModal = ref(false);
const walletIpTarget = ref<Wallet | null>(null);
const walletIpName = ref("");
const walletIpEndpoint = ref("");
const selectedIpPreset = ref("");
const proxyLoading = ref(false);
const balanceLoading = ref(false);
const walletBalanceLoading = ref(false);
const depositBridgeLoading = ref(false);
const walletVolumeLoading = ref(false);
const toasts = ref<Array<{ id: number; message: string; tone: "info" | "error" }>>([]);
const { pushToast, copyText } = createToastHelpers(toasts);
const executionOrder = ref<"yes-no" | "no-yes">("yes-no");
const executionDelayMin = ref<number | null>(null);
const executionDelayMax = ref<number | null>(null);
const showPairConfig = ref(false);
const pairConfigTarget = ref<WalletPair | null>(null);
const pairConfigAmount = ref<number | null>(null);
const depositDelaySec = ref(0);
const depositAmountMin = ref<number | null>(null);
const depositAmountMax = ref<number | null>(null);
const depositAsset = ref("USDT");
const depositNetwork = ref("BSC");
const depositRunning = ref(false);
const withdrawImportText = ref("");
const withdrawMode = ref<"all" | "partial">("all");
const withdrawAmount = ref<number | null>(null);
const exchangeConfig = reactive({
  name: "",
  apiKey: "",
  apiSecret: "",
});
const exchangeAssets = ref<Array<{ coin: string; free: string; withdrawEnable: boolean }>>([]);
const exchangeAssetsLoading = ref(false);
const exchangeAssetsStatus = ref("");
const exchangePublicIp = ref("");
const exchangePublicIpLoading = ref(false);
const depositStatus = ref("");
const depositLogs = ref<LogEntry[]>([]);
const withdrawStatus = ref("");
const withdrawLogs = ref<LogEntry[]>([]);
const polygonRpcOptions = ref<string[]>([
  "https://poly.api.pocket.network",
  "https://rpc-mainnet.matic.quiknode.pro",
  "https://1rpc.io/matic",
]);
const customPolygonRpc = ref("");
const selectedPolygonRpc = ref(polygonRpcOptions.value[0]);
const useCustomPolygonRpc = ref(false);
const ipNameOptions = computed(() => {
  const set = new Set<string>();
  wallets.forEach((wallet) => {
    if (wallet.ipName) set.add(wallet.ipName);
  });
  return Array.from(set);
});
const ipConfigOptions = computed(() => {
  const list: Array<{ key: string; label: string; name: string; endpoint: string }> = [];
  const seen = new Set<string>();
  wallets.forEach((wallet) => {
    if (!wallet.ipName && !wallet.ipEndpoint) return;
    const name = wallet.ipName || "无";
    const endpoint = wallet.ipEndpoint || "无";
    const key = `${name}::${endpoint}`;
    if (seen.has(key)) return;
    seen.add(key);
    list.push({ key, label: `${name} / ${endpoint}`, name: wallet.ipName || "", endpoint: wallet.ipEndpoint || "" });
  });
  return list;
});
const fundRows = ref(
  wallets.map((wallet, idx) => ({
    id: `fund-${idx + 1}`,
    address: wallet.address,
    proxyAddress: wallet.proxyAddress || "",
    balance: null as number | null,
    selected: idx % 2 === 0,
  }))
);
const withdrawRows = ref(
  wallets.map((wallet, idx) => ({
    id: `wd-${idx + 1}`,
    address: wallet.address,
    proxyAddress: wallet.proxyAddress || "",
    withdrawAddress: `0xwd${wallet.address.slice(2, 6)}...${wallet.address.slice(-4)}`,
    amount: null as number | null,
    balance: null as number | null,
    selected: idx % 2 === 0,
  }))
);
const logs = ref<LogEntry[]>([]);
const pushLog = (message: string) => {
  logs.value.push({ ts: new Date().toLocaleTimeString(), message });
  if (logs.value.length > 60) logs.value.shift();
};

const walletSearch = ref("");
const walletPage = ref(1);
const walletPageSize = ref(50);

const filteredWallets = computed(() => {
  const keyword = walletSearch.value.toLowerCase();
  return wallets.filter((w) => `${w.nickname} ${w.address}`.toLowerCase().includes(keyword));
});

const groupedPositions = computed(() => {
  const groups = new Map<string, PositionRow[]>();
  positions.value.forEach((pos) => {
    if (!groups.has(pos.address)) groups.set(pos.address, []);
    groups.get(pos.address)?.push(pos);
  });
  return Array.from(groups.entries()).map(([address, items]) => ({ address, items }));
});

const singleHeaderChecked = computed(
  () => wallets.length > 0 && wallets.every((wallet) => singleSelections[wallet.id])
);

if (typeof window !== "undefined") {
  applyWalletIpCache(wallets);
}

const totalWalletPages = computed(() => Math.max(1, Math.ceil(filteredWallets.value.length / walletPageSize.value)));
const walletOffset = computed(() => (walletPage.value - 1) * walletPageSize.value);
const visibleWallets = computed(() => filteredWallets.value.slice(walletOffset.value, walletOffset.value + walletPageSize.value));
const walletsHeaderChecked = computed(
  () => visibleWallets.value.length > 0 && visibleWallets.value.every((wallet) => wallet.selected)
);

watch([walletSearch, walletPageSize], () => {
  walletPage.value = 1;
});

watch(totalWalletPages, (value) => {
  if (walletPage.value > value) walletPage.value = value;
});

watch(
  wallets,
  (list) => {
    list.forEach((wallet) => {
      if (singleSelections[wallet.id] === undefined) singleSelections[wallet.id] = true;
    });
    Object.keys(singleSelections).forEach((id) => {
      if (!list.find((wallet) => wallet.id === id)) delete singleSelections[id];
    });
  },
  { deep: true, immediate: true }
);

const selectedPairs = computed(() => pairs.filter((p) => p.selected));
const customPairCount = computed(() => pairs.filter((p) => p.amount && p.amount > 0).length);

const sumBid = computed(() => {
  if (!market.value) return 0;
  return Number(market.value.book.yesBids[0]?.price || 0) + Number(market.value.book.noBids[0]?.price || 0);
});

const sumAsk = computed(() => {
  if (!market.value) return 0;
  return Number(market.value.book.yesAsks[0]?.price || 0) + Number(market.value.book.noAsks[0]?.price || 0);
});

const fundHeaderChecked = computed(
  () => fundRows.value.length > 0 && fundRows.value.every((row) => row.selected)
);
const withdrawHeaderChecked = computed(
  () => withdrawRows.value.length > 0 && withdrawRows.value.every((row) => row.selected)
);

const sumHint = computed(() => {
  if (!market.value) return "请先加载市场";
  const value = showSellOnly.value ? sumAsk.value : sumBid.value;
  if (value > 1) return "合计高于 1，可能存在磨损偏差";
  if (value < 1) return "合计低于 1，可能存在磨损偏差";
  return "合计接近 1，请关注深度";
});

const sumAlert = computed(() => {
  if (!market.value) return null;
  const diff = Number(((showSellOnly.value ? sumAsk.value : sumBid.value) - 1).toFixed(3));
  if (Math.abs(diff) < 0.001) return null;
  const direction = diff > 0 ? "+" : "";
  return {
    message: `合计偏离 1（${direction}${diff}），注意差价`,
    tone: diff > 0 ? "text-amber-700" : "text-rose-700",
  };
});

const singleYesAsks = computed(() =>
  singleMarket.value ? sortAsks(singleMarket.value.book.yesAsks) : []
);
const singleYesBids = computed(() =>
  singleMarket.value ? sortBids(singleMarket.value.book.yesBids) : []
);
const singleNoAsks = computed(() =>
  singleMarket.value ? sortAsks(singleMarket.value.book.noAsks) : []
);
const singleNoBids = computed(() =>
  singleMarket.value ? sortBids(singleMarket.value.book.noBids) : []
);

const singleSumBid = computed(() => {
  if (!singleMarket.value) return 0;
  return Number(singleYesBids.value[0]?.price || 0) + Number(singleNoBids.value[0]?.price || 0);
});

const singleSumAsk = computed(() => {
  if (!singleMarket.value) return 0;
  return Number(singleYesAsks.value[0]?.price || 0) + Number(singleNoAsks.value[0]?.price || 0);
});

const singleSumHint = computed(() => {
  if (!singleMarket.value) return "请先加载市场";
  const value = singleShowSellOnly.value ? singleSumAsk.value : singleSumBid.value;
  if (value > 1) return "合计高于 1，可能存在磨损偏差";
  if (value < 1) return "合计低于 1，可能存在磨损偏差";
  return "合计接近 1，请关注深度";
});

const singleSumAlert = computed(() => {
  if (!singleMarket.value) return null;
  const diff = Number(((singleShowSellOnly.value ? singleSumAsk.value : singleSumBid.value) - 1).toFixed(3));
  if (Math.abs(diff) < 0.001) return null;
  const direction = diff > 0 ? "+" : "";
  return {
    message: `合计偏离 1（${direction}${diff}），注意差价`,
    tone: diff > 0 ? "text-amber-700" : "text-rose-700",
  };
});

const executionNotionalLabel = computed(() => {
  if (!market.value) return "请先加载市场";
  if (!execution.size || execution.size <= 0) return "请输入数量";
  const perPairDefault = execution.size * (market.value.yesPrice + market.value.noPrice);
  const total = selectedPairs.value.reduce((acc, pair) => {
    const size = pair.amount && pair.amount > 0 ? pair.amount : execution.size;
    return acc + size * (market.value.yesPrice + market.value.noPrice);
  }, 0);
  return `${perPairDefault.toFixed(2)} U / 对（总计 ${total.toFixed(2)} U）`;
});


const marketTokenIds = ref<{ yes: string | null; no: string | null }>({ yes: null, no: null });
const singleMarketTokenIds = ref<{ yes: string | null; no: string | null }>({ yes: null, no: null });

const walletActions = useWalletActions({
  wallets,
  pairs,
  fundRows,
  withdrawRows,
  proxyLoading,
  walletBalanceLoading,
  walletVolumeLoading,
  importText,
  showImport,
  showFlow,
  showPairs,
  showPairConfig,
  pairConfigTarget,
  pairConfigAmount,
  walletIpTarget,
  walletIpName,
  walletIpEndpoint,
  selectedIpPreset,
  showWalletIpModal,
  ipConfigOptions,
  walletsHeaderChecked,
  visibleWallets,
  singleSelections,
  pushLog,
  pushToast,
  maskAddress,
  normalizeIpValue,
  normalizeIndexValue,
  applyWalletIpCache,
  saveVault,
  parseWalletImportText,
  readTextFile,
  fetchProxyProfile,
  fetchProxyAddressOnChain,
  fetchUsdcEBalance,
  fetchWalletLeaderboard,
});

const {
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
} = walletActions;

watch(
  wallets,
  (list) => {
    if (typeof window === "undefined") return;
    const map = buildWalletIpMap(list);
    saveWalletIpMap(map);
    saveVault(list);
    syncRowIndexes();
  },
  { deep: true }
);

const { loadExchangePublicIp, loadExchangeAssets } = useExchangeActions({
  exchangeConfig,
  exchangeAssets,
  exchangeAssetsLoading,
  exchangeAssetsStatus,
  exchangePublicIp,
  exchangePublicIpLoading,
  fetchPublicIp,
  fetchBinanceAssets,
});

const singleActions = useSingleActions({
  wallets,
  singleSelections,
  singleMarket,
  singleMarketInput,
  singleMarketTokenIds,
  singleOrderBookStatus,
  singleShowSellOnly,
  singleLogs,
  singleDelayMin,
  singleDelayMax,
  singleAmountMin,
  singleAmountMax,
  singleSide,
  balanceLoading,
  fetchUsdcEBalance,
  maskAddress,
});

const { pushSingleLog, resetSingleState, toggleSingleHeader, refreshSingleBalances, executeSingle, clearSingleLogs } =
  singleActions;

const { loadMarket, refreshMarket } = useMarketActions({
  market,
  marketInput,
  marketTokenIds,
  orderBookStatus,
  parseSlug,
  pushLog,
  fetchMarketBySlug,
  fetchOrderBook,
});

const { loadSingleMarket, refreshSingleMarket } = useSingleMarketActions({
  singleMarket,
  singleMarketInput,
  singleMarketTokenIds,
  singleOrderBookStatus,
  parseSlug,
  pushSingleLog,
  fetchMarketBySlug,
  fetchOrderBook,
});

const { loadPositions, loadSinglePositionsBySlug, clearPositions } = usePositionActions({
  wallets,
  positions,
  positionsLoading,
  positionsSlugInput,
  singleSelections,
  singlePositionsSlugInput,
  singlePositionsLoading,
  singlePositionsByWallet,
  parseSlug,
  fetchPositions,
  pushToast,
});

const { refreshFundBalances, loadDepositBridgeAddresses, toggleFundHeader, confirmDeposit, clearDepositLogs } =
  useDepositActions({
    fundRows,
    depositStatus,
    depositLogs,
    balanceLoading,
    depositBridgeLoading,
    depositAsset,
    depositNetwork,
    depositDelaySec,
    depositAmountMin,
    depositAmountMax,
    depositRunning,
    exchangeConfig,
    pushToast,
    maskAddress,
    fetchUsdcEBalance,
    fetchDepositBridgeAddress,
    fetchBinanceBalances,
    requestBinanceWithdraw,
  });

const {
  refreshWithdrawBalances,
  toggleWithdrawHeader,
  applyWithdrawAmount,
  applyWithdrawAddresses,
  bulkWithdraw,
  clearWithdrawLogs,
} = useWithdrawActions({
  wallets,
  withdrawRows,
  withdrawStatus,
  withdrawLogs,
  balanceLoading,
  withdrawMode,
  withdrawAmount,
  withdrawImportText,
  transferMode,
  singleTargetAddress,
  getDefaultPolygonRpc,
  fetchUsdcEBalance,
  withdrawUsdcFromSafeClient: withdrawUsdcFromSafeClient,
  maskAddress,
});

const applyPolygonRpc = () => {
  setPolygonRpcList(polygonRpcOptions.value);
  if (useCustomPolygonRpc.value) {
    const value = customPolygonRpc.value.trim();
    if (!value) return;
    setActivePolygonRpc(value);
    pushLog(`已切换 RPC：${value}`);
    return;
  }
  const value = selectedPolygonRpc.value;
  if (!value) return;
  setActivePolygonRpc(value);
  pushLog(`已切换 RPC：${value}`);
};

const { execute, clearLogs } = useExecutionActions({
  execution,
  selectedPairs,
  market,
  executionOrder,
  executionDelayMin,
  executionDelayMax,
  nameForWallet,
  pushLog,
  logs,
});

onMounted(() => {
  const stored = localStorage.getItem("walletVault");
  const keyBytes = getStoredVaultKey();
  if (stored && keyBytes) {
    try {
      const parsed = JSON.parse(stored);
      decryptVault(keyBytes, parsed)
        .then((data) => {
          const invalid = hydrateWalletsFromVault(wallets, data);
          rebuildPairs();
          rebuildFundRows();
          applyWalletIpCache(wallets);
          if (invalid > 0) {
            pushLog(`解锁完成，${invalid} 条私钥无效已跳过。`);
          }
        })
        .catch(() => {});
    } catch {}
  }
  loadExchangePublicIp();
  setPolygonRpcList(polygonRpcOptions.value);
  setActivePolygonRpc(selectedPolygonRpc.value);
});

watch(currentPage, (page, prev) => {
  if (page === prev) return;
  if (page === "single") resetSingleState();
});

const redeemAll = () => {};

const portalContext = {
  state: {
    wallets,
    walletSearch,
    walletPageSize,
    filteredWallets,
    walletsHeaderChecked,
    visibleWallets,
    useProxy,
    walletPage,
    totalWalletPages,
    proxyLoading,
    walletBalanceLoading,
    walletVolumeLoading,
    singleSelections,
    singleHeaderChecked,
    singlePositionsSlugInput,
    singlePositionsLoading,
    balanceLoading,
    singlePositionsByWallet,
    singleMarketInput,
    singleMarket,
    singleSide,
    singleDelayMin,
    singleDelayMax,
    singleAmountMin,
    singleAmountMax,
    singleShowSellOnly,
    singleSumAsk,
    singleSumBid,
    singleSumHint,
    singleSumAlert,
    singleOrderBookStatus,
    singleYesAsks,
    singleYesBids,
    singleNoAsks,
    singleNoBids,
    darkMode,
    singleLogs,
    positionsSlugInput,
    positionsLoading,
    positions,
    groupedPositions,
    depositStatus,
    depositBridgeLoading,
    exchangeAssetsLoading,
    exchangeAssetsStatus,
    exchangeAssets,
    exchangeConfig,
    exchangePublicIp,
    depositAsset,
    depositNetwork,
    depositDelaySec,
    depositAmountMin,
    depositAmountMax,
    depositRunning,
    fundRows,
    fundHeaderChecked,
    depositLogs,
    withdrawStatus,
    withdrawMode,
    withdrawAmount,
    transferMode,
    withdrawImportText,
    singleTargetAddress,
    withdrawRows,
    withdrawHeaderChecked,
    withdrawLogs,
    polygonRpcOptions,
    customPolygonRpc,
    selectedPolygonRpc,
    useCustomPolygonRpc,
  },
  actions: {
    openImport,
    exportKeys,
    loadSelectedProxyAddresses,
    refreshBalances,
    refreshWalletMetrics,
    clearWallets,
    toggleWalletsHeader,
    openWalletIp,
    refreshSingleMarket,
    loadSingleMarket,
    loadSinglePositionsBySlug,
    refreshSingleBalances,
    toggleSingleHeader,
    executeSingle,
    clearSingleLogs,
    loadPositions,
    clearPositions,
    redeemAll,
    clearDepositLogs,
    refreshFundBalances,
    loadDepositBridgeAddresses,
    loadExchangeAssets,
    confirmDeposit,
    toggleFundHeader,
    refreshWithdrawBalances,
    applyWithdrawAmount,
    applyWithdrawAddresses,
    toggleWithdrawHeader,
    clearWithdrawLogs,
    bulkWithdraw,
    applyPolygonRpc,
  },
  utils: {
    maskAddress,
    copyText,
    formatU,
    depthWidth,
  },
};

provide(PortalKey, portalContext);

rebuildPairs();
</script>
