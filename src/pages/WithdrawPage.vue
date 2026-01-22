<template>
  <section class="panel">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 class="font-display text-lg">提现</h2>
        <p class="text-xs text-brand-500">从 代理地址 批量转出到外部地址。</p>
        <p v-if="withdrawStatus" class="mt-2 text-xs text-emerald-600">{{ withdrawStatus }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button class="btn-outline" @click="refreshWithdrawBalances" :disabled="balanceLoading">
          {{ balanceLoading ? "查询中..." : "查询余额" }}
        </button>
        <button class="btn-primary" @click="bulkWithdraw">
          批量提现
        </button>
      </div>
    </div>

    <div class="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div class="space-y-3">
        <div class="table-shell max-h-[640px] overflow-auto">
          <table class="min-w-full text-sm">
            <thead class="bg-brand-50 text-xs text-brand-500">
              <tr>
                <th class="px-3 py-2 text-left">
                  <div class="flex items-center gap-2">
                    <input type="checkbox" :checked="withdrawHeaderChecked" @change="toggleWithdrawHeader" />
                    <span>选择</span>
                  </div>
                </th>
                <th class="px-3 py-2 text-left">#</th>
                <th class="px-3 py-2 text-left">钱包地址</th>
                <th class="px-3 py-2 text-left">代理地址</th>
                <th class="px-3 py-2 text-left">转入地址</th>
                <th class="px-3 py-2 text-left">IP 配置</th>
                <th class="px-3 py-2 text-left">
                  <div class="flex flex-col gap-2">
                    <span>金额</span>
                    <div class="flex flex-wrap items-center gap-2">
                      <select v-model="withdrawMode" class="rounded-md border border-brand-200 px-2 py-1 text-xs">
                        <option value="all">清空</option>
                        <option value="partial">部分</option>
                      </select>
                      <input
                        v-model.number="withdrawAmount"
                        type="number"
                        min="0"
                        :disabled="withdrawMode !== 'partial'"
                        class="w-20 rounded-md border border-brand-200 px-2 py-1 text-xs"
                        placeholder="批量金额"
                      />
                      <button
                        class="rounded-md border border-brand-200 px-2 py-1 text-[11px]"
                        :disabled="withdrawMode !== 'partial'"
                        @click="applyWithdrawAmount"
                      >
                        应用
                      </button>
                    </div>
                  </div>
                </th>
                <th class="px-3 py-2 text-left">余额</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in withdrawRows" :key="row.id" class="border-t border-brand-100">
                <td class="px-3 py-2">
                  <input type="checkbox" v-model="row.selected" />
                </td>
                <td class="px-3 py-2 text-xs text-brand-600">{{ row.index || "-" }}</td>
                <td class="px-3 py-2 text-brand-600">
                  <button class="text-left hover:text-brand-700" @click="copyText(row.address)">
                    {{ maskAddress(row.address) }}
                  </button>
                </td>
                <td class="px-3 py-2 text-brand-600">
                  <button class="text-left hover:text-brand-700" @click="copyText(row.proxyAddress)">
                    {{ maskAddress(row.proxyAddress) }}
                  </button>
                </td>
                <td class="px-3 py-2 text-brand-600">
                  <button
                    v-if="row.withdrawAddress"
                    class="text-left hover:text-brand-700"
                    @click="copyText(row.withdrawAddress)"
                  >
                    {{ maskAddress(row.withdrawAddress) }}
                  </button>
                  <span v-else class="text-brand-400">未配置</span>
                </td>
                <td class="px-3 py-2 text-xs text-brand-500">
                  <span>{{ row.ipName || "无" }}</span>
                  <span class="text-brand-300"> / </span>
                  <span class="text-[10px] text-brand-400">{{ row.ipEndpoint || "无" }}</span>
                </td>
                <td class="px-3 py-2">
                  <input
                    v-model.number="row.amount"
                    type="number"
                    min="0"
                    :disabled="withdrawMode !== 'partial'"
                    class="w-20 rounded-md border border-brand-200 px-2 py-1 text-xs"
                    placeholder="金额"
                  />
                </td>
                <td class="px-3 py-2">{{ row.balance === null ? "-" : row.balance.toFixed(2) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="rounded-2xl border border-brand-100 bg-brand-50 p-3 text-xs text-brand-700 shadow-soft h-[220px]">
          <div class="mb-2 flex items-center justify-between text-brand-500">
            <span>执行输出</span>
            <button class="text-xs text-brand-500 hover:text-brand-800" @click="clearWithdrawLogs">清空</button>
          </div>
          <div class="max-h-[180px] space-y-1 overflow-auto font-mono break-all whitespace-pre-wrap">
            <div v-if="withdrawLogs.length === 0" class="text-brand-400">暂无输出。</div>
            <div v-for="(log, idx) in [...withdrawLogs].reverse()" :key="`${log.ts}-${idx}`">
              [{{ log.ts }}] {{ log.message }}
            </div>
          </div>
        </div>
      </div>
      <div class="space-y-3">
        <div class="rounded-2xl border border-brand-100 bg-white p-3">
          <div class="text-xs font-semibold text-brand-800">RPC 选择</div>
          <div class="mt-2 space-y-2 text-xs text-brand-600">
            <div class="flex flex-wrap items-center gap-3 text-xs text-brand-700">
              <label class="flex items-center gap-2 rounded-lg border border-brand-200 px-3 py-2" @click="applyPolygonRpc">
                <input type="radio" :value="false" v-model="useCustomPolygonRpc" />
                默认
              </label>
              <label class="flex items-center gap-2 rounded-lg border border-brand-200 px-3 py-2" @click="applyPolygonRpc">
                <input type="radio" :value="true" v-model="useCustomPolygonRpc" />
                自定义
              </label>
            </div>
            <select
              v-model="selectedPolygonRpc"
              class="w-full rounded-lg border border-brand-200 px-3 py-2 text-xs"
              :disabled="useCustomPolygonRpc"
              @change="applyPolygonRpc"
            >
              <option v-for="rpc in polygonRpcOptions" :key="rpc" :value="rpc">{{ rpc }}</option>
            </select>
            <input
              v-if="useCustomPolygonRpc"
              v-model="customPolygonRpc"
              class="w-full rounded-lg border border-brand-200 px-3 py-2 text-xs"
              placeholder="自定义 RPC URL"
              @input="applyPolygonRpc"
            />
          </div>
        </div>
        <div class="rounded-2xl border border-brand-100 bg-brand-50 p-3">
          <div class="text-xs font-semibold text-brand-800">转入地址配置</div>
          <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-brand-800">
            <label class="flex items-center gap-2 rounded-lg border border-brand-200 px-3 py-2">
              <input type="radio" value="many-to-many" v-model="transferMode" />
              多转多
            </label>
            <label class="flex items-center gap-2 rounded-lg border border-brand-200 px-3 py-2">
              <input type="radio" value="many-to-one" v-model="transferMode" />
              多转一
            </label>
          </div>
          <div class="mt-3">
            <div v-if="transferMode === 'many-to-many'">
              <p class="text-xs text-brand-700">多转多：每行一个转入地址，或 index,address。</p>
              <textarea
                v-model="withdrawImportText"
                class="mt-3 h-40 w-full rounded-xl border border-brand-200 p-3 text-xs"
                placeholder="0x...\n0x..."
              ></textarea>
            </div>
            <div v-else>
              <p class="text-xs text-brand-700">多转一：填写单一转入地址。</p>
              <input
                v-model="singleTargetAddress"
                class="mt-3 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                placeholder="目标地址"
              />
            </div>
          </div>
          <div class="mt-4 flex items-center justify-end gap-2">
            <button class="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white" @click="applyWithdrawAddresses">
              应用配置
            </button>
          </div>
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
const {
  balanceLoading,
  withdrawMode,
  withdrawAmount,
  transferMode,
  withdrawImportText,
  singleTargetAddress,
  withdrawRows,
  withdrawHeaderChecked,
  withdrawLogs,
  withdrawStatus,
  polygonRpcOptions,
  customPolygonRpc,
  selectedPolygonRpc,
  useCustomPolygonRpc,
} = state;
const {
  refreshWithdrawBalances,
  applyWithdrawAmount,
  applyWithdrawAddresses,
  toggleWithdrawHeader,
  clearWithdrawLogs,
  bulkWithdraw,
  applyPolygonRpc,
} = actions;
const { maskAddress, copyText } = utils;
</script>
