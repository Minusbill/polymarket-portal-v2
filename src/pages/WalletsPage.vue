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
        <table class="min-w-full text-[11px]">
          <thead class="sticky top-0 bg-brand-50 text-[9px] text-brand-500 uppercase font-bold tracking-wider">
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
              <td class="px-3 py-2 font-mono text-neon-green font-medium text-[10px]">
                <button class="text-left hover:text-neon-green-dark" @click="copyText(w.address)">
                  {{ maskAddress(w.address) }}
                </button>
              </td>
              <td class="px-3 py-2 font-mono text-text-muted text-[10px]">
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
import { inject } from "vue";
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
</script>
