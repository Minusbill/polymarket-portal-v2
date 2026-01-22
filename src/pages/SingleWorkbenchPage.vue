<template>
  <section class="panel">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 class="font-display text-lg">单刷工作台</h2>
        <p class="text-xs text-brand-500">先加载市场，再选择钱包并设置随机间隔执行。</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button class="btn-outline" @click="refreshSingleMarket">刷新</button>
      </div>
    </div>

    <div class="mt-3 space-y-2">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="text-sm font-medium text-brand-800">钱包选择</div>
        <div class="flex flex-wrap gap-2">
          <input
            v-model="singlePositionsSlugInput"
            class="rounded-lg border border-brand-200 px-3 py-1 text-xs"
            placeholder="按 slug 查询仓位"
          />
          <button class="btn-outline text-xs" @click="loadSinglePositionsBySlug" :disabled="singlePositionsLoading">
            {{ singlePositionsLoading ? "查询中..." : "查询仓位" }}
          </button>
          <button class="btn-outline text-xs" @click="refreshSingleBalances" :disabled="balanceLoading">
            {{ balanceLoading ? "查询中..." : "查询余额" }}
          </button>
        </div>
      </div>
      <div class="table-shell max-h-[520px] overflow-auto">
        <table class="min-w-full text-sm">
          <thead class="sticky top-0 bg-brand-50 text-xs text-brand-500">
            <tr>
              <th class="px-3 py-2 text-left">
                <div class="flex items-center gap-2">
                  <input type="checkbox" :checked="singleHeaderChecked" @change="toggleSingleHeader" />
                  <span>选择</span>
                </div>
              </th>
              <th class="px-3 py-2 text-left">#</th>
              <th class="px-3 py-2 text-left">钱包地址</th>
              <th class="px-3 py-2 text-left">桥接地址</th>
              <th class="px-3 py-2 text-left">余额</th>
              <th class="px-3 py-2 text-left">仓位数量</th>
              <th class="px-3 py-2 text-left">仓位价值(U)</th>
              <th class="px-3 py-2 text-left">Outcome(数量/价值)</th>
              <th class="px-3 py-2 text-left">IP 配置</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(wallet, idx) in wallets" :key="wallet.id" class="border-t border-brand-100">
              <td class="px-3 py-2">
                <input type="checkbox" v-model="singleSelections[wallet.id]" />
              </td>
              <td class="px-3 py-2 text-xs text-brand-600">{{ wallet.index || String(idx + 1) }}</td>
              <td class="px-3 py-2 text-brand-600">{{ maskAddress(wallet.address) }}</td>
              <td class="px-3 py-2 text-brand-600">{{ wallet.proxyAddress ? maskAddress(wallet.proxyAddress) : "-" }}</td>
              <td class="px-3 py-2">{{ wallet.balance === null ? "-" : wallet.balance.toFixed(2) }}</td>
              <td class="px-3 py-2">
                {{
                  singlePositionsByWallet[wallet.id]
                    ? singlePositionsByWallet[wallet.id].size.toFixed(4)
                    : "-"
                }}
              </td>
              <td class="px-3 py-2">
                {{
                  singlePositionsByWallet[wallet.id]
                    ? singlePositionsByWallet[wallet.id].value.toFixed(2)
                    : "-"
                }}
              </td>
              <td class="px-3 py-2 text-xs text-brand-500">
                {{ singlePositionsByWallet[wallet.id]?.outcomeDetail || "-" }}
              </td>
              <td class="px-3 py-2 text-xs text-brand-500">
                <span>{{ wallet.ipName || "无" }}</span>
                <span class="text-brand-300"> / </span>
                <span class="text-[10px] text-brand-400">{{ wallet.ipEndpoint || "无" }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="mt-3 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
      <div class="space-y-4">
        <div class="rounded-xl border border-brand-100 bg-brand-50 p-3">
          <div class="flex items-center justify-between">
            <div class="text-xs text-brand-500">市场加载</div>
            <div class="text-xs text-brand-500">手动刷新</div>
          </div>
          <div class="mt-3 flex gap-2">
            <input
              v-model="singleMarketInput"
              placeholder="polymarket.com/event/... 或 slug"
              class="flex-1 rounded-lg border border-brand-200 px-3 py-2 text-sm"
            />
            <button class="btn-primary" @click="loadSingleMarket">加载</button>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <a
              v-if="singleMarket?.slug"
              class="rounded-full border border-brand-200 px-3 py-1 text-xs text-brand-600"
              :href="`https://polymarket.com/event/${singleMarket.slug}`"
              target="_blank"
              rel="noreferrer"
            >
              进入市场
            </a>
          </div>
        </div>

        <div v-if="singleMarket" class="rounded-xl border border-brand-100 bg-white p-3 min-h-[140px]">
          <div class="text-xs text-brand-500">市场信息</div>
          <div class="mt-2 text-base font-medium">{{ singleMarket.title }}</div>
          <div class="mt-1 text-xs text-brand-500">状态：{{ singleMarket.status }} ｜ 更新时间：{{ singleMarket.updatedAt }}</div>
          <div class="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div class="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2">
              <div class="text-xs text-brand-500">Yes 价格</div>
              <div class="text-lg font-semibold text-brand-700">{{ singleMarket.yesPrice }}</div>
            </div>
            <div class="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2">
              <div class="text-xs text-brand-500">No 价格</div>
              <div class="text-lg font-semibold text-brand-700">{{ singleMarket.noPrice }}</div>
            </div>
          </div>
        </div>

        <div class="rounded-xl border border-brand-100 bg-brand-50 p-3">
          <div class="flex items-center justify-between">
            <div class="text-xs font-semibold text-brand-700">执行参数</div>
            <button class="btn-primary px-3 py-1.5 text-xs" @click="executeSingle">执行确定</button>
          </div>
          <div class="mt-2 grid gap-3 text-sm">
            <div>
              <label class="text-xs text-brand-500">策略方向</label>
              <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-brand-700">
                <label class="flex items-center gap-2 rounded-lg border border-brand-200 px-3 py-2">
                  <input type="radio" value="YES" v-model="singleSide" />
                  买 YES
                </label>
                <label class="flex items-center gap-2 rounded-lg border border-brand-200 px-3 py-2">
                  <input type="radio" value="NO" v-model="singleSide" />
                  买 NO
                </label>
              </div>
            </div>
            <div>
              <label class="text-xs text-brand-500">随机间隔范围（秒）</label>
              <div class="mt-2 flex items-center gap-2">
                <input
                  v-model.number="singleDelayMin"
                  type="number"
                  min="0"
                  class="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                  placeholder="最小"
                />
                <span class="text-xs text-brand-400">-</span>
                <input
                  v-model.number="singleDelayMax"
                  type="number"
                  min="0"
                  class="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                  placeholder="最大"
                />
              </div>
            </div>
            <div>
              <label class="text-xs text-brand-500">金额范围（USDC）</label>
              <div class="mt-2 flex items-center gap-2">
                <input
                  v-model.number="singleAmountMin"
                  type="number"
                  min="0"
                  class="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                  placeholder="最小金额"
                />
                <span class="text-xs text-brand-400">-</span>
                <input
                  v-model.number="singleAmountMax"
                  type="number"
                  min="0"
                  class="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                  placeholder="最大金额"
                />
              </div>
            </div>
            <div class="text-xs text-brand-500">每个钱包执行时将随机取间隔与金额。</div>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <div class="rounded-xl border border-brand-100 bg-brand-50 p-3">
          <div class="flex items-center justify-between">
            <div class="text-xs text-brand-500">盘口深度</div>
            <div class="text-xs text-brand-500">
              {{ singleShowSellOnly ? "卖一合计" : "买一合计" }} {{ (singleShowSellOnly ? singleSumAsk : singleSumBid).toFixed(3) }}
            </div>
          </div>
          <div class="mt-2 flex items-center justify-between text-xs text-brand-500">
            <span>{{ singleSumHint }}</span>
            <label class="flex items-center gap-2">
              <input type="checkbox" v-model="singleShowSellOnly" />
              只显示卖单
            </label>
          </div>
          <div v-if="singleSumAlert" class="mt-2 text-xs" :class="singleSumAlert.tone">
            {{ singleSumAlert.message }}
          </div>
          <div v-if="singleOrderBookStatus" class="mt-2 text-xs text-rose-700">
            {{ singleOrderBookStatus }}
          </div>
        </div>

        <div v-if="singleMarket" class="space-y-3 min-h-[360px]">
          <div class="rounded-xl border border-brand-100 bg-white p-3">
            <div class="text-xs text-brand-500">YES</div>
            <div class="mt-2 space-y-3 text-sm">
              <div>
                <div
                  v-for="(row, idx) in singleYesAsks"
                  :key="`single-yes-ask-${idx}`"
                  class="relative mt-1 overflow-hidden rounded-md border px-2 py-1 text-xs"
                  :class="darkMode ? 'border-rose-900/60 bg-rose-950/40 text-slate-100' : 'border-rose-100 bg-rose-50/40 text-brand-700'"
                >
                  <div
                    class="absolute inset-y-0 left-0"
                    :class="darkMode ? 'bg-rose-600/60' : 'bg-rose-300/80'"
                    :style="{ width: depthWidth(row.size, singleYesAsks) }"
                  ></div>
                  <div class="relative flex items-center justify-between" :class="idx === singleYesAsks.length - 1 ? 'text-sm font-semibold' : ''">
                    <span :class="darkMode ? 'text-rose-200' : 'text-brand-600'">#{{ singleYesAsks.length - idx }}</span>
                    <span class="font-semibold">{{ row.price }}</span>
                    <span :class="darkMode ? 'text-slate-200' : 'text-brand-500'">深度 {{ row.size }}</span>
                    <span :class="darkMode ? 'text-slate-200' : 'text-brand-500'">价值 {{ formatU(row.price, row.size) }} U</span>
                  </div>
                </div>
              </div>
              <div v-if="!singleShowSellOnly">
                <div
                  v-for="(row, idx) in singleYesBids"
                  :key="`single-yes-bid-${idx}`"
                  class="relative mt-1 overflow-hidden rounded-md border px-2 py-1 text-xs"
                  :class="darkMode ? 'border-emerald-900/60 bg-emerald-950/40 text-slate-100' : 'border-emerald-100 bg-emerald-50/40 text-brand-700'"
                >
                  <div
                    class="absolute inset-y-0 left-0"
                    :class="darkMode ? 'bg-emerald-600/60' : 'bg-emerald-300/80'"
                    :style="{ width: depthWidth(row.size, singleYesBids) }"
                  ></div>
                  <div class="relative flex items-center justify-between" :class="idx === singleYesBids.length - 1 ? 'text-sm font-semibold' : ''">
                    <span :class="darkMode ? 'text-emerald-200' : 'text-brand-600'">#{{ singleYesBids.length - idx }}</span>
                    <span class="font-semibold">{{ row.price }}</span>
                    <span :class="darkMode ? 'text-slate-200' : 'text-brand-500'">深度 {{ row.size }}</span>
                    <span :class="darkMode ? 'text-slate-200' : 'text-brand-500'">价值 {{ formatU(row.price, row.size) }} U</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="rounded-2xl border border-brand-100 bg-white p-3">
            <div class="text-xs text-brand-500">NO</div>
            <div class="mt-2 space-y-3 text-sm">
              <div>
                <div
                  v-for="(row, idx) in singleNoAsks"
                  :key="`single-no-ask-${idx}`"
                  class="relative mt-1 overflow-hidden rounded-md border px-2 py-1 text-xs"
                  :class="darkMode ? 'border-rose-900/60 bg-rose-950/40 text-slate-100' : 'border-rose-100 bg-rose-50/40 text-brand-700'"
                >
                  <div
                    class="absolute inset-y-0 left-0"
                    :class="darkMode ? 'bg-rose-600/60' : 'bg-rose-300/80'"
                    :style="{ width: depthWidth(row.size, singleNoAsks) }"
                  ></div>
                  <div class="relative flex items-center justify-between" :class="idx === singleNoAsks.length - 1 ? 'text-sm font-semibold' : ''">
                    <span :class="darkMode ? 'text-rose-200' : 'text-brand-600'">#{{ singleNoAsks.length - idx }}</span>
                    <span class="font-semibold">{{ row.price }}</span>
                    <span :class="darkMode ? 'text-slate-200' : 'text-brand-500'">深度 {{ row.size }}</span>
                    <span :class="darkMode ? 'text-slate-200' : 'text-brand-500'">价值 {{ formatU(row.price, row.size) }} U</span>
                  </div>
                </div>
              </div>
              <div v-if="!singleShowSellOnly">
                <div
                  v-for="(row, idx) in singleNoBids"
                  :key="`single-no-bid-${idx}`"
                  class="relative mt-1 overflow-hidden rounded-md border px-2 py-1 text-xs"
                  :class="darkMode ? 'border-emerald-900/60 bg-emerald-950/40 text-slate-100' : 'border-emerald-100 bg-emerald-50/40 text-brand-700'"
                >
                  <div
                    class="absolute inset-y-0 left-0"
                    :class="darkMode ? 'bg-emerald-600/60' : 'bg-emerald-300/80'"
                    :style="{ width: depthWidth(row.size, singleNoBids) }"
                  ></div>
                  <div class="relative flex items-center justify-between" :class="idx === singleNoBids.length - 1 ? 'text-sm font-semibold' : ''">
                    <span :class="darkMode ? 'text-emerald-200' : 'text-brand-600'">#{{ singleNoBids.length - idx }}</span>
                    <span class="font-semibold">{{ row.price }}</span>
                    <span :class="darkMode ? 'text-slate-200' : 'text-brand-500'">深度 {{ row.size }}</span>
                    <span :class="darkMode ? 'text-slate-200' : 'text-brand-500'">价值 {{ formatU(row.price, row.size) }} U</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="rounded-xl border border-dashed border-brand-200 p-4 text-sm text-brand-500 min-h-[360px] flex items-center justify-center">
          请输入市场链接或 slug 后加载盘口。
        </div>
      </div>
    </div>

    <div class="mt-3 rounded-2xl border border-brand-100 bg-brand-50 p-3 text-xs text-brand-700 shadow-soft h-[160px]">
      <div class="mb-2 flex items-center justify-between text-brand-500">
        <span>执行输出</span>
        <button class="text-xs text-brand-500 hover:text-brand-800" @click="clearSingleLogs">清空</button>
      </div>
      <div class="max-h-[120px] space-y-1 overflow-auto font-mono break-all whitespace-pre-wrap">
        <div v-if="singleLogs.length === 0" class="text-brand-400">暂无输出。</div>
        <div v-for="(log, idx) in [...singleLogs].reverse()" :key="`${log.ts}-${idx}`">
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
const {
  wallets,
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
} = state;
const {
  refreshSingleMarket,
  loadSingleMarket,
  loadSinglePositionsBySlug,
  refreshSingleBalances,
  toggleSingleHeader,
  executeSingle,
  clearSingleLogs,
} = actions;
const { maskAddress, formatU, depthWidth } = utils;
</script>
