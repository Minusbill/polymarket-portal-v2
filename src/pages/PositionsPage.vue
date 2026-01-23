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
        <button class="btn-primary" @click="redeemAll" :disabled="positions.length === 0">
          等待并 Redeem
        </button>
      </div>
    </div>
    <div class="table-shell mt-3 max-h-[560px] overflow-auto">
      <table class="min-w-full text-[11px]">
        <thead class="bg-brand-50 text-[9px] text-brand-500 uppercase font-bold tracking-wider">
          <tr>
            <th class="px-3 py-2 text-left">账户</th>
            <th class="px-3 py-2 text-left">市场</th>
            <th class="px-3 py-2 text-left">Slug</th>
            <th class="px-3 py-2 text-left">持仓</th>
            <th class="px-3 py-2 text-left">价值(U)</th>
            <th class="px-3 py-2 text-left">结束时间</th>
            <th class="px-3 py-2 text-left">Redeem 状态</th>
            <th class="px-3 py-2 text-left">状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="positions.length === 0" class="border-t border-brand-100">
            <td colspan="8" class="px-3 py-6 text-center text-[11px] text-brand-500">
              暂无数据，请点击“查询仓位”。
            </td>
          </tr>
          <template v-for="group in groupedPositions" :key="group.address">
            <tr class="border-t border-brand-100 bg-brand-50/60">
              <td class="px-3 py-2 font-mono text-neon-green text-[10px]" colspan="8">
                {{ maskAddress(group.address) }} · {{ group.items.length }} 个仓位
              </td>
            </tr>
            <tr v-for="pos in group.items" :key="pos.id" class="border-t border-brand-100">
              <td class="px-3 py-2 font-mono text-neon-green text-[10px]">{{ maskAddress(pos.address) }}</td>
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
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <div class="mt-3 rounded-2xl border border-brand-100 bg-brand-50 p-3 text-xs text-brand-700 shadow-soft h-[160px]">
      <div class="mb-2 flex items-center justify-between text-brand-500">
        <span>执行输出</span>
        <button class="text-xs text-brand-500 hover:text-brand-800" @click="clearDepositLogs">清空</button>
      </div>
      <div class="max-h-[120px] space-y-1 overflow-auto font-mono break-all whitespace-pre-wrap">
        <div v-if="depositLogs.length === 0" class="text-brand-400">暂无输出。</div>
        <div v-for="(log, idx) in [...depositLogs].reverse()" :key="`${log.ts}-${idx}`">
          [{{ log.ts }}] {{ log.message }}
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { inject } from "vue";
import { PortalKey } from "../context/portalContext";

const portal = inject(PortalKey) as any;
if (!portal) {
  throw new Error("Portal context missing");
}

const { state, actions, utils } = portal;
const { positionsSlugInput, positionsLoading, positions, groupedPositions, depositLogs } = state;
const { loadPositions, clearPositions, redeemAll, clearDepositLogs } = actions;
const { maskAddress } = utils;
</script>
