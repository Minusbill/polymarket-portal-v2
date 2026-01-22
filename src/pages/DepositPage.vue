<template>
  <section class="panel">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 class="font-display text-lg">充值</h2>
        <p class="text-xs text-brand-500">从交易所批量充值到 代理地址。</p>
        <p v-if="depositStatus" class="mt-2 text-xs text-emerald-600">{{ depositStatus }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button class="btn-outline" @click="refreshFundBalances" :disabled="balanceLoading">
          {{ balanceLoading ? "查询中..." : "查询余额" }}
        </button>
        <button class="btn-outline" @click="loadDepositBridgeAddresses" :disabled="depositBridgeLoading">
          {{ depositBridgeLoading ? "加载中..." : "获取充值桥接地址" }}
        </button>
        <div class="group relative">
          <span class="flex h-8 w-8 items-center justify-center rounded-full border border-brand-200 text-xs text-brand-500">
            !
          </span>
          <div
            class="pointer-events-none absolute right-0 top-10 z-10 w-60 rounded-lg border border-brand-200 bg-white p-2 text-[11px] text-brand-600 opacity-0 shadow-soft transition-opacity group-hover:opacity-100"
          >
            EVM 地址往这里充值，会自动转化为账户的余额。
          </div>
        </div>
      </div>
    </div>

    <div class="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr]">
      <div class="rounded-2xl border border-brand-100 bg-brand-50 p-3">
        <div class="flex items-center justify-between">
          <div class="text-xs font-semibold text-brand-700">交易所配置</div>
          <button
            class="rounded-md border border-brand-200 px-2 py-1 text-[11px] text-brand-700"
            :disabled="exchangeAssetsLoading"
            @click="loadExchangeAssets"
          >
            {{ exchangeAssetsLoading ? "查询中..." : "查询交易所余额" }}
          </button>
        </div>
        <div class="mt-3 space-y-2 text-sm">
          <select v-model="exchangeConfig.name" class="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm">
            <option value="">选择交易所</option>
            <option value="binance">Binance</option>
          </select>
          <input v-model="exchangeConfig.apiKey" class="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm" placeholder="API Key" />
          <input v-model="exchangeConfig.apiSecret" class="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm" placeholder="API Secret" />
          <div class="rounded-lg border border-brand-200 bg-white/80 px-3 py-2 text-sm text-brand-700">
            本机 IP：{{ exchangePublicIp || "获取中..." }}
          </div>
        </div>
        <div class="mt-3 space-y-2 text-xs text-brand-500">
          <div v-if="exchangeAssetsStatus">{{ exchangeAssetsStatus }}</div>
          <div v-if="exchangeAssets.length" class="rounded-lg border border-brand-100 bg-white/70 p-2 text-[11px]">
            <div v-for="asset in exchangeAssets" :key="asset.coin" class="flex items-center justify-between py-1">
              <span class="text-brand-700">{{ asset.coin }}</span>
              <span>可用 {{ asset.free }}</span>
              <span>提现 {{ asset.withdrawEnable ? "Yes" : "No" }}</span>
            </div>
          </div>
        </div>
        <div class="mt-3 text-xs text-brand-500">用于交易所批量提现/充值配置。</div>
      </div>

      <div class="rounded-2xl border border-brand-100 bg-brand-50 p-3">
        <div class="text-xs font-semibold text-brand-700">交易所提现参数</div>
        <div class="mt-3 space-y-2 text-sm">
          <label class="text-xs text-brand-500">币种 / 网络</label>
          <div class="flex items-center gap-2">
            <select v-model="depositAsset" class="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm">
              <option value="USDT">USDT</option>
              <option value="USDC">USDC</option>
            </select>
            <select v-model="depositNetwork" class="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm">
              <option value="BSC">BSC (BEP20)</option>
            </select>
          </div>
          <label class="text-xs text-brand-500">每笔延迟（秒）</label>
          <input
            v-model.number="depositDelaySec"
            type="number"
            min="0"
            class="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
            placeholder="如 3 或 5"
          />
          <label class="text-xs text-brand-500">充值金额区间</label>
          <div class="flex items-center gap-2">
            <input
              v-model.number="depositAmountMin"
              type="number"
              min="0"
              class="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
              placeholder="最小金额"
            />
            <span class="text-xs text-brand-400">-</span>
            <input
              v-model.number="depositAmountMax"
              type="number"
              min="0"
              class="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
              placeholder="最大金额"
            />
          </div>
          <button class="btn-primary mt-3 w-full text-base" @click="confirmDeposit" :disabled="depositRunning">
            {{ depositRunning ? "执行中..." : "开始" }}
          </button>
        </div>
        <div class="mt-3 text-xs text-brand-500">
          充值将以“交易所提现”形式转入 代理地址，可设置币种/网络、延迟与金额区间随机。
        </div>
      </div>
    </div>

    <div class="mt-3 space-y-3">
      <div class="table-shell max-h-[560px] overflow-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-brand-50 text-xs text-brand-500">
            <tr>
              <th class="px-3 py-2 text-left">
                <div class="flex items-center gap-2">
                  <input type="checkbox" :checked="fundHeaderChecked" @change="toggleFundHeader" />
                  <span>选择</span>
                </div>
              </th>
              <th class="px-3 py-2 text-left">#</th>
              <th class="px-3 py-2 text-left">钱包地址</th>
              <th class="px-3 py-2 text-left">桥接地址</th>
              <th class="px-3 py-2 text-left">余额</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in fundRows" :key="row.id" class="border-t border-brand-100">
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
                <button
                  v-if="row.depositAddress"
                  class="text-left hover:text-brand-700"
                  @click="copyText(row.depositAddress)"
                >
                  {{ maskAddress(row.depositAddress) }}
                </button>
                <span v-else>未获取</span>
              </td>
              <td class="px-3 py-2">{{ row.balance === null ? "-" : row.balance.toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="rounded-2xl border border-brand-100 bg-brand-50 p-3 text-xs text-brand-700 shadow-soft h-[160px]">
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
  depositBridgeLoading,
  depositStatus,
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
} = state;
const {
  refreshFundBalances,
  loadDepositBridgeAddresses,
  loadExchangeAssets,
  confirmDeposit,
  toggleFundHeader,
  clearDepositLogs,
} = actions;
const { maskAddress, copyText } = utils;
</script>
