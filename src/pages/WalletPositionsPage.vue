<template>
  <section class="panel">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 class="font-display text-lg">钱包仓位管理</h2>
        <p class="text-xs text-brand-500">按钱包维度汇总展示仓位信息。</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <input
          v-model="positionsSlugInput"
          class="rounded-lg border border-brand-200 px-3 py-2 text-sm w-72"
          placeholder="筛选 slug（可选）"
        />
        <button class="btn-primary" @click="runQuery">
          {{ positionsLoading ? "查询中..." : "查询仓位" }}
        </button>
        <button class="btn-outline" @click="clearPositions">
          清空
        </button>
      </div>
    </div>

    <div class="table-shell mt-3 max-h-[680px] overflow-auto">
      <table class="min-w-full table-fixed text-[12px]">
        <thead class="bg-brand-50 text-[10px] text-brand-500 uppercase font-bold tracking-wider">
          <tr>
            <th class="px-3 py-2 text-left w-8">
              <input
                type="checkbox"
                :checked="allSelected"
                @change="toggleAll"
                class="rounded border-brand-200"
              />
            </th>
            <th class="px-3 py-2 text-left w-16">#</th>
            <th class="px-3 py-2 text-left w-56">钱包地址</th>
            <th class="px-3 py-2 text-left w-56">代理地址</th>
            <th class="px-3 py-2 text-left">仓位信息</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="walletRows.length === 0" class="border-t border-brand-100">
            <td colspan="5" class="px-3 py-6 text-center text-[12px] text-brand-500">
              暂无钱包数据。
            </td>
          </tr>
          <tr v-for="(row, idx) in walletRows" :key="row.wallet.id" class="border-t border-brand-100 cursor-pointer" @click="openWalletModal(row)">
            <td class="px-3 py-2">
              <input
                type="checkbox"
                v-model="row.wallet.selected"
                class="rounded border-brand-200"
                @click.stop
              />
            </td>
            <td class="px-3 py-2 text-text-muted font-mono text-[12px]">{{ row.wallet.index || String(idx + 1) }}</td>
            <td class="px-3 py-2 font-mono text-neon-green text-[12px] truncate">
              {{ maskAddress(row.wallet.address) }}
            </td>
            <td class="px-3 py-2 font-mono text-text-muted text-[12px] truncate">
              {{ row.wallet.proxyAddress ? maskAddress(row.wallet.proxyAddress) : "-" }}
            </td>
            <td class="px-3 py-2">
              <div class="w-full text-left rounded-lg border border-brand-100 bg-white/70 px-3 py-2 text-[12px]">
                <div class="flex items-center justify-between">
                  <span class="text-brand-700">{{ hasQueried ? `${row.items.length} 个仓位` : "" }}</span>
                  <span class="text-[11px] text-brand-500">{{ hasQueried ? "点击查看" : "" }}</span>
                </div>
                <div v-if="hasQueriedRow(row.wallet) && row.items.length === 0" class="mt-2 text-[12px] text-text-muted">
                  0 个仓位
                </div>
                <div v-else-if="hasQueriedRow(row.wallet)" class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-[12px]">
                  <div
                    v-for="pos in row.items.slice(0, 4)"
                    :key="pos.id"
                    class="rounded-xl border border-brand-100 px-3 py-2 bg-white"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <div class="min-w-0 flex-1">
                        <div class="truncate text-brand-800 font-medium">{{ pos.market }}</div>
                        <div class="text-[11px] text-text-muted truncate">{{ pos.slug || "-" }}</div>
                      </div>
                      <span
                        class="rounded-full px-2 py-0.5 text-[10px]"
                        :class="pos.status === '可 Redeem' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'"
                      >
                        {{ pos.status }}
                      </span>
                    </div>
                    <div class="mt-2 flex items-center justify-between text-[11px] text-brand-700 font-mono">
                      <span>持仓 {{ pos.size }}</span>
                      <span class="text-[13px] font-semibold text-brand-900">
                        {{ pos.value ? pos.value.toFixed(2) : "0.00" }}U
                      </span>
                    </div>
                    <div class="mt-2 flex items-center gap-2">
                      <button
                        v-if="pos.redeemable"
                        class="rounded bg-blue-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-blue-500"
                        @click.stop="logClaim(pos)"
                      >
                        Claim
                      </button>
                      <button
                        v-else-if="pos.value > 0"
                        class="rounded bg-emerald-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-emerald-500"
                        @click.stop="logSell(pos)"
                      >
                        Sell
                      </button>
                    </div>
                  </div>
                  <div v-if="row.items.length > 4" class="text-[11px] text-brand-500">
                    还有 {{ row.items.length - 4 }} 条仓位，点击查看
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-3 rounded-2xl border border-brand-100 bg-brand-50 p-3 text-xs text-brand-700 shadow-soft h-[280px]">
      <div class="mb-2 flex items-center justify-between text-brand-500">
        <span>执行输出</span>
        <button class="text-xs text-brand-500 hover:text-brand-800" @click="clearPositionsLogs">清空</button>
      </div>
      <div class="max-h-[240px] space-y-1 overflow-auto font-mono break-all whitespace-pre-wrap">
        <div v-if="logs.length === 0" class="text-brand-400">暂无输出。</div>
        <div v-for="(log, idx) in [...logs].reverse()" :key="`${log.ts}-${idx}`">
          [{{ log.ts }}] {{ log.message }}
        </div>
      </div>
    </div>

    <div v-if="showWalletModal && selectedWalletRow" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4" @click.self="closeWalletModal">
      <div class="w-full max-w-4xl overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-[0_28px_80px_rgba(7,20,60,0.35)]">
        <div class="flex items-center justify-between border-b border-brand-100 bg-brand-50 px-5 py-3">
          <div>
            <div class="text-[10px] uppercase tracking-[0.26em] text-brand-500">仓位详情</div>
            <h2 class="font-display text-lg text-brand-900">
              {{ maskAddress(selectedWalletRow.wallet.address) }} · {{ selectedWalletRow.items.length }} 个仓位
            </h2>
          </div>
          <button class="text-xs text-brand-500 hover:text-brand-800" @click="closeWalletModal">关闭</button>
        </div>
        <div class="p-5">
          <div v-if="selectedWalletRow.items.length === 0" class="text-sm text-text-muted">
            当前钱包暂无仓位。
          </div>
          <div v-else class="table-shell max-h-[60vh] overflow-auto">
            <table class="min-w-full text-[12px]">
              <thead class="bg-brand-50 text-[10px] text-brand-500 uppercase font-bold tracking-wider">
                <tr>
                  <th class="px-3 py-2 text-left">市场</th>
                  <th class="px-3 py-2 text-left">Slug</th>
                  <th class="px-3 py-2 text-left">持仓</th>
                  <th class="px-3 py-2 text-left">价值(U)</th>
                  <th class="px-3 py-2 text-left">结束时间</th>
                  <th class="px-3 py-2 text-left">状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="pos in selectedWalletRow.items" :key="pos.id" class="border-t border-brand-100">
                  <td class="px-3 py-2">{{ pos.market }}</td>
                  <td class="px-3 py-2 text-[10px] text-text-muted">{{ pos.slug || "-" }}</td>
                  <td class="px-3 py-2">{{ pos.size }}</td>
                  <td class="px-3 py-2">{{ pos.value ? pos.value.toFixed(2) : "-" }}</td>
                  <td class="px-3 py-2 text-[10px] text-text-muted">{{ pos.endDate || "-" }}</td>
                  <td class="px-3 py-2">
                    <span
                      class="rounded-full px-2 py-1 text-xs"
                      :class="pos.status === '可 Redeem' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'"
                    >
                      {{ pos.status }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="mt-4 flex items-center justify-end">
            <button class="rounded border border-brand-200 px-4 py-2 text-[12px] text-brand-700 hover:text-brand-900" @click="closeWalletModal">
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>

  </section>
</template>

<script setup lang="ts">
import { computed, inject, ref } from "vue";
import { PortalKey } from "../context/portalContext";

const portal = inject(PortalKey) as any;
if (!portal) {
  throw new Error("Portal context missing");
}

const { state, actions, utils } = portal;
const { wallets, positions, positionsLoading, positionsSlugInput, positionsLogs } = state;
const { loadPositions, clearPositions, clearPositionsLogs } = actions;
const { maskAddress } = utils;
const showWalletModal = ref(false);
const selectedWalletRow = ref<any | null>(null);

const walletRows = computed(() => {
  const map = new Map<string, any[]>();
  const positionList = Array.isArray(positions)
    ? positions
    : Array.isArray(positions?.value)
      ? positions.value
      : [];
  positionList.forEach((pos: any) => {
    const key = pos.address;
    if (!map.has(key)) map.set(key, []);
    map.get(key)?.push(pos);
  });
  const walletList = Array.isArray(wallets)
    ? wallets
    : Array.isArray(wallets?.value)
      ? wallets.value
      : [];
  return walletList.map((wallet: any) => {
    const direct = map.get(wallet.address);
    const proxy = wallet.proxyAddress ? map.get(wallet.proxyAddress) : undefined;
    return {
      wallet,
      items: direct || proxy || [],
    };
  });
});

const logs = computed(() => (Array.isArray(positionsLogs) ? positionsLogs : positionsLogs?.value || []));

const hasQueried = computed(() => {
  const list = Array.isArray(positions)
    ? positions
    : Array.isArray(positions?.value)
      ? positions.value
      : [];
  return list.length > 0 || logs.value.length > 0;
});

const queriedAddresses = ref<string[]>([]);
const queriedSet = computed(() => new Set(queriedAddresses.value.map((a) => a.toLowerCase())));

const runQuery = () => {
  const walletList = Array.isArray(wallets)
    ? wallets
    : Array.isArray(wallets?.value)
      ? wallets.value
      : [];
  queriedAddresses.value = walletList
    .filter((w: any) => w.selected)
    .flatMap((w: any) => [w.address, w.proxyAddress].filter(Boolean));
  loadPositions();
};

const hasQueriedRow = (wallet: any) => {
  if (!hasQueried.value) return false;
  const set = queriedSet.value;
  const address = String(wallet.address || "").toLowerCase();
  const proxy = String(wallet.proxyAddress || "").toLowerCase();
  return set.has(address) || (proxy && set.has(proxy));
};

const allSelected = computed(() => walletRows.value.length > 0 && walletRows.value.every((row: any) => row.wallet.selected));

const toggleAll = () => {
  const next = !allSelected.value;
  walletRows.value.forEach((row: any) => {
    row.wallet.selected = next;
  });
};

const openWalletModal = (row: any) => {
  selectedWalletRow.value = row;
  showWalletModal.value = true;
};

const closeWalletModal = () => {
  showWalletModal.value = false;
  selectedWalletRow.value = null;
};

const pushPositionLog = (message: string) => {
  if (Array.isArray(positionsLogs)) {
    positionsLogs.push({ ts: new Date().toLocaleTimeString(), message });
  } else if (positionsLogs?.value) {
    positionsLogs.value.push({ ts: new Date().toLocaleTimeString(), message });
  }
};

const logClaim = (pos: any) => {
  const amount = pos.value ? pos.value.toFixed(2) : "0.00";
  pushPositionLog(`Claim 模拟：领取 ${amount} U（${pos.market}）`);
};

const logSell = (pos: any) => {
  const amount = pos.value ? pos.value.toFixed(2) : "0.00";
  pushPositionLog(`Sell 模拟：卖出获得 ${amount} U（${pos.market}）`);
};

</script>
