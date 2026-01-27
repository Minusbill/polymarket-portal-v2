<template>
  <section class="panel">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="font-display text-lg">钱包管理</h2>
        <p class="text-xs text-brand-500">支持 100+ 钱包滚动与分页展示。</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button class="btn-primary" @click="openImport">导入钱包</button>
        <button class="btn-outline" @click="exportKeys">
          导出钱包信息
        </button>
        <button class="btn-outline" @click="ipManagerOpen = !ipManagerOpen">
          IP 配置管理
        </button>
        <button class="btn-outline" :disabled="proxyLoading" @click="loadSelectedProxyAddresses">
          {{ proxyLoading ? "加载中..." : "获取代理地址" }}
        </button>
        <button class="btn-outline" :disabled="walletBalanceLoading" @click="refreshBalances">
          {{ walletBalanceLoading ? "查询中..." : "查询余额" }}
        </button>
        <button class="btn-outline" :disabled="walletVolumeLoading" @click="refreshWalletMetrics">
          {{ walletVolumeLoading ? "查询中..." : "查询交易量" }}
        </button>
        <button class="btn-outline" @click="clearWallets">
          清空
        </button>
      </div>
    </div>

    <div class="mt-3 space-y-3">
      <div v-if="ipManagerOpen" class="rounded-2xl border border-brand-100 bg-brand-50 p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div class="text-xs font-semibold text-brand-700">IP 配置管理</div>
            <div class="text-[11px] text-brand-500">输入配置地址/ID，查询与同步服务器 IP 信息。</div>
          </div>
          <div class="flex items-center gap-2"></div>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <input
            v-model="ipManagerId"
            class="flex-1 rounded-lg border border-brand-200 px-3 py-2 text-sm"
            placeholder="Owner 地址（0x...）"
          />
          <button class="btn-primary" :disabled="ipManagerLoading" @click="loadIpConfigs">
            {{ ipManagerLoading ? "查询中..." : "查询" }}
          </button>
          <button class="btn-primary" :disabled="ipConfigs.length === 0" @click="syncServerToLocal">
            同步服务器 → 本地
          </button>
          <button class="btn-primary" :disabled="wallets.length === 0 || !ipManagerId" @click="syncLocalConfigs">
            同步本地配置 → 服务器
          </button>
        </div>
        <div v-if="ipManagerStatus" class="mt-2 text-xs text-brand-600">{{ ipManagerStatus }}</div>
        <div class="mt-3 table-shell max-h-[360px] overflow-auto">
          <table class="min-w-full text-[12px]">
            <thead class="bg-white text-[10px] text-brand-500 uppercase font-bold tracking-wider">
              <tr>
                <th class="px-3 py-2 text-left">地址</th>
                <th class="px-3 py-2 text-left">协议</th>
                <th class="px-3 py-2 text-left">Host</th>
                <th class="px-3 py-2 text-left">Port</th>
                <th class="px-3 py-2 text-left">用户</th>
                <th class="px-3 py-2 text-left">密码</th>
                <th class="px-3 py-2 text-left">本地映射</th>
                <th class="px-3 py-2 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="ipConfigs.length === 0" class="border-t border-brand-100">
                <td colspan="8" class="px-3 py-6 text-center text-[12px] text-brand-400">
                  暂无配置，先查询或同步。
                </td>
              </tr>
              <tr v-for="item in ipConfigs" :key="item.address" class="border-t border-brand-100">
                <td class="px-3 py-2 font-mono text-neon-green text-[12px]">{{ maskAddress(item.address) }}</td>
                <td class="px-3 py-2">{{ item.proxy.protocol }}</td>
                <td class="px-3 py-2">{{ item.proxy.host }}</td>
                <td class="px-3 py-2">{{ item.proxy.port }}</td>
                <td class="px-3 py-2">{{ item.proxy.username || "-" }}</td>
                <td class="px-3 py-2 font-mono">
                  {{ item.proxy.password || "-" }}
                </td>
                <td class="px-3 py-2 text-xs">
                  <span
                    class="rounded-full px-2 py-1"
                    :class="item.mapped ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'"
                  >
                    {{ item.mapped ? "已匹配" : "未匹配" }}
                  </span>
                </td>
                <td class="px-3 py-2">
                  <button
                    class="rounded border border-brand-200 px-2 py-1 text-[11px] text-brand-700 disabled:opacity-50"
                    :disabled="!item.mapped"
                    @click="syncWalletProxy(item)"
                  >
                    更新钱包代理
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <input
          v-model="walletSearch"
          placeholder="搜索昵称或地址"
          class="flex-1 rounded-lg border border-brand-200 px-3 py-2 text-sm"
        />
        <select v-model.number="walletPageSize" class="rounded-lg border border-brand-200 px-3 py-2 text-sm">
          <option :value="20">20 / 页</option>
          <option :value="50">50 / 页</option>
          <option :value="100">100 / 页</option>
        </select>
        <div class="text-xs text-brand-500">共 {{ filteredWallets.length }} 个</div>
      </div>

      <div class="table-shell max-h-[720px] overflow-auto">
        <table class="min-w-full text-[12px]">
          <thead class="sticky top-0 bg-brand-50 text-[10px] text-brand-500 uppercase font-bold tracking-wider">
            <tr>
              <th class="px-3 py-2 text-left">
                <div class="flex items-center gap-2">
                  <input type="checkbox" :checked="walletsHeaderChecked" @change="toggleWalletsHeader" />
                  <span>选择</span>
                </div>
              </th>
              <th class="px-3 py-2 text-left">#</th>
              <th class="px-3 py-2 text-left">地址</th>
              <th class="px-3 py-2 text-left">代理地址</th>
              <th class="px-3 py-2 text-left">余额</th>
              <th class="px-3 py-2 text-left">交易量</th>
              <th class="px-3 py-2 text-left">利润</th>
              <th v-if="useProxy" class="px-3 py-2 text-left">IP 配置</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(w, idx) in visibleWallets" :key="w.id" class="border-t border-brand-100">
              <td class="px-3 py-2">
                <input type="checkbox" v-model="w.selected" />
              </td>
              <td class="px-3 py-2">
                <input
                  v-model="w.index"
                  class="w-20 rounded-md border border-brand-200 px-2 py-1 text-xs"
                  placeholder="备注"
                />
              </td>
              <td class="px-3 py-2 font-mono text-neon-green font-medium text-[12px]">
                <button class="text-left hover:text-neon-green-dark" @click="copyText(w.address)">
                  {{ maskAddress(w.address) }}
                </button>
              </td>
              <td class="px-3 py-2 font-mono text-text-muted text-[12px]">
                <button v-if="w.proxyAddress" class="text-left hover:text-text-main" @click="copyText(w.proxyAddress)">
                  {{ maskAddress(w.proxyAddress) }}
                </button>
                <span v-else>-</span>
              </td>
              <td class="px-3 py-2">{{ w.balance === null ? "-" : w.balance.toFixed(2) }}</td>
              <td class="px-3 py-2">{{ w.volume === null ? "-" : w.volume.toFixed(2) }}</td>
              <td class="px-3 py-2">{{ w.pnl === null ? "-" : w.pnl.toFixed(2) }}</td>
              <td v-if="useProxy" class="px-3 py-2">
                <div class="flex items-center justify-between gap-2">
                  <div class="text-xs text-brand-500">
                    <span>{{ w.ipName || "无" }}</span>
                    <span class="text-brand-300"> / </span>
                    <span class="text-[10px] text-brand-400">{{ w.ipEndpoint || "无" }}</span>
                  </div>
                  <button class="rounded-md border border-brand-200 px-2 py-1 text-[11px] text-brand-700" @click="openWalletIp(w)">
                    配置
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between text-xs text-brand-500">
        <div>第 {{ walletPage }} / {{ totalWalletPages }} 页</div>
        <div class="flex gap-2">
          <button
            class="rounded-lg border border-brand-200 px-3 py-1"
            :disabled="walletPage === 1"
            @click="walletPage--"
          >
            上一页
          </button>
          <button
            class="rounded-lg border border-brand-200 px-3 py-1"
            :disabled="walletPage === totalWalletPages"
            @click="walletPage++"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, inject, ref } from "vue";
import { buildWalletIpMap, saveWalletIpMap } from "../services/walletIpCache";
import { PortalKey } from "../context/portalContext";

const portal = inject(PortalKey) as any;
if (!portal) {
  throw new Error("Portal context missing");
}

const { state, actions, utils } = portal;
const {
  walletSearch,
  walletPageSize,
  filteredWallets,
  wallets,
  walletsHeaderChecked,
  visibleWallets,
  useProxy,
  walletPage,
  totalWalletPages,
  proxyLoading,
  walletBalanceLoading,
  walletVolumeLoading,
} = state;
const {
  openImport,
  exportKeys,
  loadSelectedProxyAddresses,
  refreshBalances,
  refreshWalletMetrics,
  clearWallets,
  toggleWalletsHeader,
  openWalletIp,
} = actions;
const { maskAddress, copyText } = utils;

const ipManagerOpen = ref(false);
const ipManagerId = ref("");
const ipManagerLoading = ref(false);
const ipManagerStatus = ref("");
const ipConfigs = ref<
  Array<{
    address: string;
    proxy: { protocol: string; host: string; port: number; username?: string; password?: string };
    mapped: boolean;
  }>
>([]);

const buildIpName = (proxy: { protocol: string; host: string; port: number }) =>
  `${proxy.protocol}://${proxy.host}:${proxy.port}`;

const buildEndpoint = (proxy: { protocol?: string; host?: string; port?: number; username?: string; password?: string }) => {
  const protocol = proxy.protocol || "http";
  const host = proxy.host || "";
  const port = proxy.port ? `:${proxy.port}` : "";
  const auth =
    proxy.username || proxy.password ? `${encodeURIComponent(proxy.username || "")}:${encodeURIComponent(proxy.password || "")}@` : "";
  return `${protocol}://${auth}${host}${port}`;
};

const parseEndpoint = (value: string) => {
  const raw = (value || "").trim();
  if (!raw) return null;
  const match =
    /^(?<protocol>[^:\/]+):\/\/(?:(?<username>[^:@]*)(?::(?<password>[^@]*))?@)?(?<host>[^:\/]+)(?::(?<port>\d+))?/i.exec(
      raw
    );
  if (match?.groups) {
    return {
      protocol: match.groups.protocol || "http",
      host: match.groups.host || "",
      port: Number(match.groups.port || 0),
      username: match.groups.username || "",
      password: match.groups.password || "",
    };
  }
  return null;
};

const relayerBaseUrl = (import.meta as any).env?.VITE_RELAYER_SERVICE_URL || "http://127.0.0.1:4000";

const persistIpCache = () => {
  saveWalletIpMap(buildWalletIpMap(wallets));
};

const recomputeMappings = () => {
  const mappedSet = new Set(wallets.map((w) => w.address.toLowerCase()));
  ipConfigs.value = ipConfigs.value.map((item) => ({
    ...item,
    mapped: mappedSet.has(String(item.address || "").toLowerCase()),
  }));
};

const loadIpConfigs = async () => {
  if (!ipManagerId.value.trim()) {
    ipManagerStatus.value = "请输入 Owner 地址。";
    return;
  }
  ipManagerLoading.value = true;
  ipManagerStatus.value = "";
  try {
    const owner = ipManagerId.value.trim();
    const res = await fetch(`${relayerBaseUrl}/proxy/configs/${owner}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const items = Array.isArray(data?.items) ? data.items : [];
    ipConfigs.value = items.map((item: any) => ({
      address: item.address,
      proxy: item.proxy || {},
      mapped: false,
    }));
    recomputeMappings();
    ipManagerStatus.value = `已加载 ${ipConfigs.value.length} 条配置。`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ipManagerStatus.value = `查询失败：${message}`;
    ipConfigs.value = [];
  } finally {
    ipManagerLoading.value = false;
  }
};

const syncServerToLocal = () => {
  const map = new Map(ipConfigs.value.map((item) => [String(item.address).toLowerCase(), item]));
  let applied = 0;
  wallets.forEach((w) => {
    const hit =
      map.get(String(w.address).toLowerCase()) ||
      (w.proxyAddress ? map.get(String(w.proxyAddress).toLowerCase()) : undefined);
    if (!hit?.proxy) return;
    w.ipName = buildIpName(hit.proxy);
    w.ipEndpoint = buildEndpoint(hit.proxy);
    applied += 1;
  });
  recomputeMappings();
  persistIpCache();
  ipManagerStatus.value = `已同步 ${applied} 条配置到本地钱包。`;
};

const syncOwnerWallets = async () => {
  if (!ipManagerId.value.trim()) {
    ipManagerStatus.value = "请输入 Owner 地址。";
    return;
  }
  ipManagerLoading.value = true;
  ipManagerStatus.value = "";
  try {
    const owner = ipManagerId.value.trim();
    const addresses = wallets.map((w) => w.address);
    const res = await fetch(`${relayerBaseUrl}/proxy/configs/${owner}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addresses }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    ipManagerStatus.value = `已同步 ${addresses.length} 个钱包到服务器。`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ipManagerStatus.value = `同步失败：${message}`;
  } finally {
    ipManagerLoading.value = false;
  }
};

const syncWalletProxy = async (item: any) => {
  if (!ipManagerId.value.trim()) {
    ipManagerStatus.value = "请输入 Owner 地址。";
    return;
  }
  if (!item?.address || !item?.proxy) return;
  ipManagerLoading.value = true;
  ipManagerStatus.value = "";
  try {
    const owner = ipManagerId.value.trim();
    const res = await fetch(`${relayerBaseUrl}/proxy/wallets/${item.address}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, proxy: item.proxy }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    ipManagerStatus.value = `已更新 ${maskAddress(item.address)} 的代理配置。`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ipManagerStatus.value = `更新失败：${message}`;
  } finally {
    ipManagerLoading.value = false;
  }
};

const syncLocalConfigs = async () => {
  if (!ipManagerId.value.trim()) {
    ipManagerStatus.value = "请输入 Owner 地址。";
    return;
  }
  const owner = ipManagerId.value.trim();
  const targets = wallets.filter((w) => w.ipEndpoint);
  if (targets.length === 0) {
    ipManagerStatus.value = "本地没有可同步的 IP 配置。";
    return;
  }
  ipManagerLoading.value = true;
  ipManagerStatus.value = "";
  let success = 0;
  let failed = 0;
  for (const w of targets) {
    const proxy = parseEndpoint(String(w.ipEndpoint));
    if (!proxy || !proxy.host) {
      failed += 1;
      continue;
    }
    try {
      const res = await fetch(`${relayerBaseUrl}/proxy/wallets/${w.address}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, proxy }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      success += 1;
    } catch {
      failed += 1;
    }
  }
  ipManagerStatus.value = `已同步 ${success} 条配置到服务器，失败 ${failed} 条。`;
  ipManagerLoading.value = false;
};
</script>
