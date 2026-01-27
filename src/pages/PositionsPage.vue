<template>
  <section class="panel">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 class="font-display text-lg">仓位管理</h2>
        <p class="text-xs text-brand-500">点击查询后加载，避免一次性拉取大量数据。</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <input
          v-model="positionsSlugInput"
          class="rounded-lg border border-brand-200 px-3 py-2 text-sm"
          placeholder="筛选 slug（可选）"
        />
        <button class="btn-outline" @click="loadPositions">
          {{ positionsLoading ? "查询中..." : "查询仓位" }}
        </button>
        <button class="btn-outline" @click="clearPositions">
          清空
        </button>
      </div>
    </div>
    <div class="table-shell mt-3 max-h-[560px] overflow-auto">
      <table class="min-w-full text-[12px]">
        <thead class="bg-brand-50 text-[10px] text-brand-500 uppercase font-bold tracking-wider">
          <tr>
            <th class="px-3 py-2 text-left">账户</th>
            <th class="px-3 py-2 text-left">市场</th>
            <th class="px-3 py-2 text-left">Slug</th>
            <th class="px-3 py-2 text-left">持仓</th>
            <th class="px-3 py-2 text-left">价值(U)</th>
            <th class="px-3 py-2 text-left">结束时间</th>
            <th class="px-3 py-2 text-left">Redeem 状态</th>
            <th class="px-3 py-2 text-left">状态</th>
            <th class="px-3 py-2 text-left">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="displayGroups.length === 0" class="border-t border-brand-100">
            <td colspan="9" class="px-3 py-6 text-center text-[12px] text-brand-500">
              暂无数据，请点击“查询仓位”。
            </td>
          </tr>
          <template v-for="group in displayGroups" :key="group.address">
            <tr class="border-t border-brand-100 bg-brand-50/60">
              <td class="px-3 py-2 font-mono text-neon-green text-[12px]" colspan="9">
                {{ maskAddress(group.address) }} · {{ group.items.length }}个仓位
              </td>
            </tr>
            <tr v-for="pos in group.items" :key="pos.id" class="border-t border-brand-100 cursor-pointer" @click="openPosition(pos)">
              <td class="px-3 py-2 font-mono text-neon-green text-[12px]">{{ maskAddress(pos.address) }}</td>
              <td class="px-3 py-2">{{ pos.market }}</td>
              <td class="px-3 py-2 text-[10px] text-text-muted">{{ pos.slug || "-" }}</td>
              <td class="px-3 py-2">{{ pos.size }}</td>
              <td class="px-3 py-2">{{ pos.value ? pos.value.toFixed(2) : "-" }}</td>
              <td class="px-3 py-2 text-[10px] text-text-muted">{{ pos.endDate || "-" }}</td>
              <td class="px-3 py-2">
                <span
                  v-if="pos.value > 0"
                  class="rounded-full px-2 py-1 text-xs"
                  :class="pos.redeemable ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'"
                >
                  {{ pos.redeemable ? "Yes" : "No" }}
                </span>
                <span v-else class="text-xs text-brand-400">-</span>
              </td>
              <td class="px-3 py-2">
                <span
                  class="rounded-full px-2 py-1 text-xs"
                  :class="pos.status === '可 Redeem' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'"
                >
                  {{ pos.status }}
                </span>
              </td>
              <td class="px-3 py-2">
                <button
                  v-if="pos.redeemable"
                  class="rounded bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-blue-500"
                  @click.stop
                >
                  Claim
                </button>
                <button
                  v-else
                  class="rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-emerald-500"
                  @click.stop
                >
                  Sell
                </button>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <div class="mt-3 rounded-2xl border border-brand-100 bg-brand-50 p-3 text-xs text-brand-700 shadow-soft h-[160px]">
      <div class="mb-2 flex items-center justify-between text-brand-500">
        <span>执行输出</span>
        <button class="text-xs text-brand-500 hover:text-brand-800" @click="clearPositionsLogs">清空</button>
      </div>
      <div class="max-h-[120px] space-y-1 overflow-auto font-mono break-all whitespace-pre-wrap">
        <div v-if="positionsLogs.length === 0" class="text-brand-400">暂无输出。</div>
        <div v-for="(log, idx) in [...positionsLogs].reverse()" :key="`${log.ts}-${idx}`">
          [{{ log.ts }}] {{ log.message }}
        </div>
      </div>
    </div>

    <div v-if="showPositionModal && selectedPosition" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4" @click.self="closePosition">
      <div class="w-full max-w-2xl overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-[0_28px_80px_rgba(7,20,60,0.35)]">
        <div class="flex items-center justify-between border-b border-brand-100 bg-brand-50 px-5 py-3">
          <div>
            <div class="text-[10px] uppercase tracking-[0.26em] text-brand-500">仓位详情</div>
            <h2 class="font-display text-lg text-brand-900">仓位详情</h2>
          </div>
          <button class="text-xs text-brand-500 hover:text-brand-800" @click="closePosition">关闭</button>
        </div>
        <div class="p-5">
          <div class="grid grid-cols-1 gap-3 md:grid-cols-2 text-sm">
            <div class="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
              <div class="text-[10px] text-brand-500 uppercase tracking-wider">账户</div>
              <div class="mt-1 font-mono text-brand-800">{{ maskAddress(selectedPosition.address) }}</div>
            </div>
            <div class="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
              <div class="text-[10px] text-brand-500 uppercase tracking-wider">市场</div>
              <div class="mt-1 text-brand-800">{{ selectedPosition.market }}</div>
            </div>
            <div class="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
              <div class="text-[10px] text-brand-500 uppercase tracking-wider">Slug</div>
              <div class="mt-1 text-brand-800">{{ selectedPosition.slug || "-" }}</div>
            </div>
            <div class="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
              <div class="text-[10px] text-brand-500 uppercase tracking-wider">持仓</div>
              <div class="mt-1 text-brand-800">{{ selectedPosition.size }}</div>
            </div>
            <div class="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
              <div class="text-[10px] text-brand-500 uppercase tracking-wider">价值 (U)</div>
              <div class="mt-1 text-brand-800">{{ selectedPosition.value ? selectedPosition.value.toFixed(2) : "-" }}</div>
            </div>
            <div class="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
              <div class="text-[10px] text-brand-500 uppercase tracking-wider">结束时间</div>
              <div class="mt-1 text-brand-800">{{ selectedPosition.endDate || "-" }}</div>
            </div>
            <div class="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
              <div class="text-[10px] text-brand-500 uppercase tracking-wider">Redeem</div>
              <div class="mt-1 text-brand-800">{{ selectedPosition.redeemable ? "Yes" : "No" }}</div>
            </div>
            <div class="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
              <div class="text-[10px] text-brand-500 uppercase tracking-wider">状态</div>
              <div class="mt-1 text-brand-800">{{ selectedPosition.status }}</div>
            </div>
          </div>
          <div class="mt-5 flex items-center justify-between gap-2">
            <div class="text-[11px] text-brand-600">
              {{ selectedPosition.redeemable ? "可操作：Claim" : selectedPosition.value > 0 ? "可操作：Sell" : "暂无可操作" }}
            </div>
            <div class="flex items-center gap-2">
              <button
                v-if="selectedPosition.redeemable"
                class="rounded bg-blue-600 px-4 py-2 text-[12px] font-semibold text-white hover:bg-blue-500"
              >
                Claim
              </button>
              <button
                v-else-if="selectedPosition.value > 0"
                class="rounded bg-emerald-600 px-4 py-2 text-[12px] font-semibold text-white hover:bg-emerald-500"
              >
                Sell
              </button>
              <button class="rounded border border-brand-200 px-4 py-2 text-[12px] text-brand-700 hover:text-brand-900" @click="closePosition">
                关闭
              </button>
            </div>
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
const { wallets, positionsSlugInput, positionsLoading, positions, groupedPositions, positionsLogs } = state;
const { loadPositions, clearPositions, clearPositionsLogs } = actions;
const { maskAddress } = utils;

const showPositionModal = ref(false);
const selectedPosition = ref<any | null>(null);

const displayGroups = computed(() => {
  const baseGroups = Array.isArray(groupedPositions.value) ? groupedPositions.value : [];
  const map = new Map<string, any[]>();
  baseGroups.forEach((group: any) => {
    map.set(group.address, group.items || []);
  });
  const groups: Array<{ address: string; items: any[] }> = [];
  const walletList = Array.isArray(wallets?.value) ? wallets.value : [];
  walletList.forEach((wallet: any) => {
    const direct = map.get(wallet.address);
    const proxy = wallet.proxyAddress ? map.get(wallet.proxyAddress) : undefined;
    const items = direct || proxy || [];
    groups.push({ address: wallet.address, items });
    map.delete(wallet.address);
    if (wallet.proxyAddress) map.delete(wallet.proxyAddress);
  });
  map.forEach((items, address) => {
    groups.push({ address, items });
  });
  return groups;
});

const openPosition = (pos: any) => {
  selectedPosition.value = pos;
  showPositionModal.value = true;
};

const closePosition = () => {
  showPositionModal.value = false;
  selectedPosition.value = null;
};
</script>
