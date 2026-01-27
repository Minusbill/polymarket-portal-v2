<template>
  <div class="col-span-12 grid grid-cols-12 gap-2 h-full min-h-0 overflow-hidden">
    <div class="col-span-12 xl:col-span-8 flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-1 min-h-0">
      <div class="glass-panel p-3 flex justify-between items-center">
        <div>
          <h2 class="text-sm font-bold text-text-main flex items-center gap-2 uppercase tracking-wide">
            <span class="text-neon-green material-symbols-outlined text-lg">terminal</span>
            活跃工作台
          </h2>
        </div>
        <div class="flex items-center gap-2">
          <input
            v-model="singlePositionsSlugInput"
            class="input-dark py-1.5 px-3 text-[10px] rounded w-80 font-mono"
            placeholder="查询持仓：输入 slug"
          />
          <button
            class="btn-outline text-[10px] uppercase tracking-wide"
            @click="loadSinglePositionsBySlug"
            :disabled="singlePositionsLoading"
          >
            持仓
          </button>
          <button
            class="btn-outline text-[10px] uppercase tracking-wide"
            @click="refreshSingleBalances"
            :disabled="balanceLoading"
          >
            余额
          </button>
          <button
            class="flex items-center gap-1.5 px-3 py-1.5 bg-panel-border-light hover:bg-panel-border text-text-muted hover:text-text-main text-[10px] font-mono rounded border border-panel-border transition-colors"
            @click="refreshSingleMarket"
          >
            <span class="material-symbols-outlined text-sm">refresh</span>
            刷新数据
          </button>
        </div>
      </div>

      <div class="glass-panel flex flex-col">
        <div class="p-2 border-b border-panel-border flex items-center justify-between bg-panel-border-light">
          <h3 class="font-bold text-text-light text-[10px] uppercase tracking-widest flex items-center gap-1.5">
            <span class="material-symbols-outlined text-text-muted text-sm">account_balance_wallet</span>
            钱包选择
          </h3>
          <div class="flex items-center gap-2"></div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-[12px] whitespace-nowrap">
            <thead class="bg-panel-border-light text-text-muted text-[9px] uppercase font-bold tracking-wider">
              <tr>
                <th class="px-3 py-2 w-8 border-b border-panel-border">
                  <input
                    type="checkbox"
                    :checked="singleHeaderChecked"
                    @change="toggleSingleHeader"
                    class="rounded border-panel-border text-neon-green focus:ring-neon-green/20 focus:ring-offset-0"
                    :class="darkMode ? 'bg-[#0A0A0C]' : 'bg-white'"
                  />
                </th>
                <th class="px-3 py-2 border-b border-panel-border">#</th>
                <th class="px-3 py-2 border-b border-panel-border">钱包地址</th>
                <th class="px-3 py-2 border-b border-panel-border">代理地址</th>
                <th class="px-3 py-2 border-b border-panel-border text-right">余额</th>
                <th class="px-3 py-2 border-b border-panel-border text-right">持仓数</th>
                <th class="px-3 py-2 border-b border-panel-border text-right">估值 (U)</th>
                <th class="px-3 py-2 border-b border-panel-border text-center">结果</th>
                <th class="px-3 py-2 border-b border-panel-border text-right">IP 配置</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-panel-border-light">
              <tr v-for="(wallet, idx) in wallets" :key="wallet.id" class="hover:bg-panel-border-light transition-colors group">
                <td class="px-3 py-2">
                  <input
                    type="checkbox"
                    v-model="singleSelections[wallet.id]"
                    class="rounded border-panel-border text-neon-green focus:ring-neon-green/20 focus:ring-offset-0"
                    :class="darkMode ? 'bg-[#0A0A0C]' : 'bg-white'"
                  />
                </td>
                <td class="px-3 py-2 text-text-muted font-mono text-[11px]">{{ wallet.index || String(idx + 1) }}</td>
                <td class="px-3 py-2 font-mono text-neon-green font-medium cursor-pointer text-[12px]">
                  {{ maskAddress(wallet.address) }}
                </td>
                <td class="px-3 py-2 font-mono text-text-muted text-[12px]">
                  {{ wallet.proxyAddress ? maskAddress(wallet.proxyAddress) : "-" }}
                </td>
                <td class="px-3 py-2 text-right text-text-main font-mono text-[12px]">
                  {{ wallet.balance === null ? "-" : wallet.balance.toFixed(2) }}
                </td>
                <td class="px-3 py-2 text-right text-text-muted font-mono text-[12px]">
                  {{
                    singlePositionsByWallet[wallet.id]
                      ? singlePositionsByWallet[wallet.id].size.toFixed(4)
                      : "-"
                  }}
                </td>
                <td class="px-3 py-2 text-right text-neon-green font-mono font-bold text-[12px]">
                  {{
                    singlePositionsByWallet[wallet.id]
                      ? singlePositionsByWallet[wallet.id].value.toFixed(2)
                      : "-"
                  }}
                </td>
                <td class="px-3 py-2 text-center">
                  <span
                    v-if="singlePositionsByWallet[wallet.id]?.outcomeDetail"
                    class="bg-neon-green/10 text-neon-green border border-neon-green/30 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono"
                  >
                    {{ singlePositionsByWallet[wallet.id].outcomeDetail }}
                  </span>
                  <span v-else class="text-text-light font-mono">-</span>
                </td>
                <td class="px-3 py-2 text-right text-text-light text-[10px] font-mono">
                  {{ wallet.ipEndpoint || "无" }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="glass-panel p-4">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-text-light text-[10px] uppercase tracking-widest flex items-center gap-1.5">
            <span class="material-symbols-outlined text-neon-green text-sm">tune</span>
            执行参数
          </h3>
          <button class="btn-neon px-4 py-1.5 rounded text-[11px] flex items-center gap-1.5 uppercase tracking-wide" @click="executeSingle">
            批量执行 <span class="material-symbols-outlined text-sm">play_arrow</span>
          </button>
        </div>
        <div v-if="singleStrategy === 'limit'" class="mb-3 text-[10px] font-semibold text-danger">
          挂单还在开发中，请稍等
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label class="block text-text-muted text-[9px] font-bold uppercase tracking-wider mb-2">执行方式</label>
            <div class="flex items-center gap-2 rounded-full border border-panel-border p-1" :class="darkMode ? 'bg-[#0A0A0C]' : 'bg-white'">
              <label class="cursor-pointer flex-1">
                <input class="peer sr-only" name="strategy" type="radio" value="buy-yes" v-model="singleStrategy" />
                <div
                  class="flex items-center justify-center gap-1.5 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all"
                  :class="darkMode ? 'text-text-muted peer-checked:bg-neon-green peer-checked:text-black' : 'text-text-muted peer-checked:bg-neon-green peer-checked:text-white'"
                >
                  市价买入
                </div>
              </label>
              <label class="cursor-pointer flex-1">
                <input class="peer sr-only" name="strategy" type="radio" value="limit" v-model="singleStrategy" />
                <div
                  class="flex items-center justify-center gap-1.5 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all"
                  :class="darkMode ? 'text-text-muted peer-checked:bg-indigo-500 peer-checked:text-white' : 'text-text-muted peer-checked:bg-indigo-500 peer-checked:text-white'"
                >
                  挂单
                </div>
              </label>
            </div>
            <div class="mt-2 text-[10px] text-text-muted">
              {{ singleStrategy === "limit" ? "限价挂单，按价格排队成交" : "市价撮合，立即成交" }}
            </div>
          </div>
          <div>
            <label class="block text-text-muted text-[9px] font-bold uppercase tracking-wider mb-2">交易方向</label>
            <div class="flex gap-2">
              <label class="cursor-pointer flex-1">
                <input class="peer sr-only" name="direction" type="radio" value="YES" v-model="singleSide" />
                <div
                  class="flex items-center justify-center gap-1.5 py-2 rounded border border-panel-border text-text-muted hover:border-neon-green/50 transition-all text-[11px] font-bold uppercase"
                  :class="darkMode ? 'bg-[#0A0A0C] peer-checked:bg-neon-green peer-checked:text-black peer-checked:border-neon-green' : 'bg-white peer-checked:bg-neon-green peer-checked:text-white peer-checked:border-neon-green'"
                >
                  买入 YES
                </div>
              </label>
              <label class="cursor-pointer flex-1">
                <input class="peer sr-only" name="direction" type="radio" value="NO" v-model="singleSide" />
                <div
                  class="flex items-center justify-center gap-1.5 py-2 rounded border border-panel-border text-text-muted hover:border-danger/50 transition-all text-[11px] font-bold uppercase"
                  :class="darkMode ? 'bg-[#0A0A0C] peer-checked:bg-danger peer-checked:text-white peer-checked:border-danger' : 'bg-white peer-checked:bg-danger peer-checked:text-white peer-checked:border-danger'"
                >
                  买入 NO
                </div>
              </label>
            </div>
          </div>
          <div v-if="singleStrategy === 'limit'">
            <label class="block text-text-muted text-[9px] font-bold uppercase tracking-wider mb-2">挂单方向</label>
            <div class="flex gap-2 mb-3">
              <label class="cursor-pointer flex-1">
                <input class="peer sr-only" name="limit-side" type="radio" value="YES" v-model="singleLimitSide" />
                <div
                  class="flex items-center justify-center gap-1.5 py-2 rounded border border-panel-border text-text-muted hover:border-neon-green/50 transition-all text-[11px] font-bold uppercase"
                  :class="darkMode ? 'bg-[#0A0A0C] peer-checked:bg-neon-green peer-checked:text-black peer-checked:border-neon-green' : 'bg-white peer-checked:bg-neon-green peer-checked:text-white peer-checked:border-neon-green'"
                >
                  YES
                </div>
              </label>
              <label class="cursor-pointer flex-1">
                <input class="peer sr-only" name="limit-side" type="radio" value="NO" v-model="singleLimitSide" />
                <div
                  class="flex items-center justify-center gap-1.5 py-2 rounded border border-panel-border text-text-muted hover:border-danger/50 transition-all text-[11px] font-bold uppercase"
                  :class="darkMode ? 'bg-[#0A0A0C] peer-checked:bg-danger peer-checked:text-white peer-checked:border-danger' : 'bg-white peer-checked:bg-danger peer-checked:text-white peer-checked:border-danger'"
                >
                  NO
                </div>
              </label>
            </div>
            <label class="block text-text-muted text-[9px] font-bold uppercase tracking-wider mb-2">挂单价格</label>
            <div class="flex items-center gap-2">
              <input
                class="flex-1 input-dark py-2 px-2 font-mono text-center rounded text-xs"
                type="number"
                min="0"
                max="1"
                step="0.001"
                placeholder="如 0.52"
                v-model.number="singleLimitPrice"
              />
              <span class="text-text-muted text-[10px] font-mono">USDC</span>
            </div>
          </div>
          <div>
            <label class="block text-text-muted text-[9px] font-bold uppercase tracking-wider mb-2">随机延迟 (秒)</label>
            <div class="flex items-center gap-3">
              <input class="flex-1 min-w-0 input-dark py-2 px-2 font-mono text-center rounded text-xs" type="number" v-model.number="singleDelayMin" />
              <span class="text-text-muted font-bold">-</span>
              <input class="flex-1 min-w-0 input-dark py-2 px-2 font-mono text-center rounded text-xs" type="number" v-model.number="singleDelayMax" />
            </div>
          </div>
          <div>
            <label class="block text-text-muted text-[9px] font-bold uppercase tracking-wider mb-2">金额范围 (USDC)</label>
            <div class="flex items-center gap-3">
              <div class="relative flex-1 min-w-0">
                <span class="absolute left-2 top-2 text-text-muted text-[10px] font-mono">$</span>
                <input class="w-full input-dark py-2 pl-5 pr-2 font-mono rounded text-xs" placeholder="最小" type="number" v-model.number="singleAmountMin" />
              </div>
              <span class="text-text-muted font-bold">-</span>
              <div class="relative flex-1 min-w-0">
                <span class="absolute left-2 top-2 text-text-muted text-[10px] font-mono">$</span>
                <input class="w-full input-dark py-2 pl-5 pr-2 font-mono rounded text-xs" placeholder="最大" type="number" v-model.number="singleAmountMax" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="glass-panel p-3 h-1/3 flex flex-col min-h-0" :class="darkMode ? 'bg-[#0A0A0C] border-neon-green/20' : 'bg-white border-neon-green/10'">
        <div class="flex justify-between items-center mb-2">
          <h3 class="font-bold text-neon-green text-[10px] uppercase tracking-widest flex items-center gap-1.5 shadow-neon">
            <span class="material-symbols-outlined text-sm">terminal</span>
            执行输出
          </h3>
          <button class="text-text-muted hover:text-text-main text-[9px] transition-colors font-bold uppercase" @click="clearSingleLogs">清除日志</button>
        </div>
        <div class="flex-1 rounded border-t border-panel-border pt-2 font-mono text-[10px] overflow-y-auto custom-scrollbar text-text-muted">
          <div v-if="singleLogs.length === 0" class="text-text-light">暂无输出。</div>
          <div v-for="(log, idx) in [...singleLogs].reverse()" :key="`${log.ts}-${idx}`" class="flex gap-2">
            <span class="text-text-light">[{{ log.ts }}]</span>
            <span class="text-text-main">{{ log.message }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="col-span-12 xl:col-span-4 flex flex-col gap-2 min-h-0">
      <div class="glass-panel p-3">
        <div class="flex justify-between items-center mb-2">
          <h3 class="font-bold text-text-light text-[10px] uppercase tracking-widest flex items-center gap-1.5">
            <span class="material-symbols-outlined text-text-main text-sm">download</span>
            市场加载
          </h3>
          <button class="text-neon-green text-[9px] font-bold hover:text-neon-green-dark transition-colors uppercase tracking-wider" @click="refreshSingleMarket">
            手动刷新
          </button>
        </div>
        <div class="flex gap-2">
          <input
            class="flex-1 input-dark rounded px-3 py-1.5 text-xs font-mono"
            placeholder="输入市场 slug"
            type="text"
            v-model="singleMarketInput"
          />
          <button
            class="btn-outline text-[10px] uppercase tracking-wide"
            @click="loadSingleMarket"
          >
            加载
          </button>
        </div>
        <div class="mt-2 flex flex-wrap gap-2">
          <a
            v-if="singleMarket?.slug"
            class="rounded-full border border-panel-border px-3 py-1 text-[10px] text-text-muted"
            :href="`https://polymarket.com/event/${singleMarket.slug}`"
            target="_blank"
            rel="noreferrer"
          >
            进入市场
          </a>
        </div>
      </div>

      <div class="glass-panel p-3 flex-1 flex flex-col min-h-0">
        <div class="flex justify-between items-center mb-2">
          <h3 class="font-bold text-text-light text-[10px] uppercase tracking-widest">市场深度</h3>
          <div class="flex items-center gap-3">
            <span class="text-text-muted text-[10px]">
              {{ singleShowSellOnly ? "卖一合计" : "买一合计" }}:
              <span class="text-text-main font-mono font-bold">
                {{ (singleShowSellOnly ? singleSumAsk : singleSumBid).toFixed(3) }}
              </span>
            </span>
            <label class="flex items-center gap-1.5 cursor-pointer select-none">
              <input class="rounded border-panel-border text-neon-green focus:ring-neon-green/20 w-3 h-3" type="checkbox" v-model="singleShowSellOnly" :class="darkMode ? 'bg-[#0A0A0C]' : 'bg-white'" />
              <span class="text-[9px] text-text-muted font-bold uppercase">仅显示卖单</span>
            </label>
          </div>
        </div>
        <div class="text-text-muted text-[10px] mb-2">{{ singleSumHint }}</div>
        <div v-if="singleSumAlert" class="mb-2 text-xs" :class="singleSumAlert.tone">
          {{ singleSumAlert.message }}
        </div>
        <div v-if="singleOrderBookStatus" class="mb-2 text-xs text-danger">
          {{ singleOrderBookStatus }}
        </div>

        <div v-if="singleMarket" class="flex-1 space-y-3 overflow-y-auto custom-scrollbar">
          <div class="rounded-xl border border-panel-border bg-panel-border-light p-3">
            <div class="text-[10px] text-text-muted uppercase tracking-wide">市场信息</div>
            <div class="mt-2 text-sm font-medium text-text-main">{{ singleMarket.title }}</div>
            <div class="mt-1 text-[10px] text-text-muted">状态：{{ singleMarket.status }} ｜ 更新时间：{{ singleMarket.updatedAt }}</div>
            <div class="mt-3">
              <div class="flex items-center gap-2 rounded-full border border-panel-border p-1" :class="darkMode ? 'bg-[#0A0A0C]' : 'bg-white'">
                <button
                  class="flex-1 rounded-full px-3 py-1 text-center"
                  :class="singleSide === 'YES' ? 'bg-neon-green text-white' : 'text-text-muted'"
                  @click="singleSide = 'YES'"
                >
                  <div class="text-[9px] uppercase tracking-wider">YES 价格</div>
                  <div class="text-[12px] font-semibold">{{ formatPrice(singleMarket.yesPrice) }}</div>
                </button>
                <button
                  class="flex-1 rounded-full px-3 py-1 text-center"
                  :class="singleSide === 'NO' ? 'bg-danger text-white' : 'text-text-muted'"
                  @click="singleSide = 'NO'"
                >
                  <div class="text-[9px] uppercase tracking-wider">NO 价格</div>
                  <div class="text-[12px] font-semibold">{{ formatPrice(singleMarket.noPrice) }}</div>
                </button>
              </div>
            </div>
          </div>

          <div v-if="singleSide === 'YES'" class="rounded-xl border border-panel-border bg-panel-bg p-3">
            <div class="text-[10px] text-text-muted uppercase tracking-wide">YES</div>
            <div class="mt-2 space-y-3 text-sm">
              <div>
                <div
                  v-for="(row, idx) in [...singleYesAsks].reverse()"
                  :key="`single-yes-ask-${idx}`"
                  class="relative mt-1 overflow-hidden rounded-md border px-2 py-1 text-xs"
                  :class="darkMode ? 'border-rose-900/60 bg-rose-950/40 text-slate-100' : 'border-rose-100 bg-rose-50/40 text-text-main'"
                >
                  <div
                    class="absolute inset-y-0 left-0"
                    :class="darkMode ? 'bg-rose-600/60' : 'bg-rose-300/80'"
                    :style="{ width: depthWidth(row.size, singleYesAsks) }"
                  ></div>
                  <div class="relative flex items-center justify-between" :class="idx === singleYesAsks.length - 1 ? 'text-sm font-semibold' : ''">
                    <span
                      v-if="idx === singleYesAsks.length - 1"
                      class="mr-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest"
                      :class="darkMode ? 'bg-rose-600/80 text-white' : 'bg-rose-500 text-white'"
                    >
                      Asks
                    </span>
                    <span v-else :class="darkMode ? 'text-rose-200' : 'text-text-muted'">#{{ idx + 1 }}</span>
                    <span class="font-semibold">{{ formatPrice(row.price) }}</span>
                    <span :class="darkMode ? 'text-slate-200' : 'text-text-muted'">深度 {{ row.size }}</span>
                    <span :class="darkMode ? 'text-slate-200' : 'text-text-muted'">价值 {{ formatU(row.price, row.size) }} U</span>
                  </div>
                </div>
              </div>
              <div v-if="!singleShowSellOnly">
                <div
                  v-for="(row, idx) in [...singleYesBids].reverse()"
                  :key="`single-yes-bid-${idx}`"
                  class="relative mt-1 overflow-hidden rounded-md border px-2 py-1 text-xs"
                  :class="darkMode ? 'border-emerald-900/60 bg-emerald-950/40 text-slate-100' : 'border-emerald-100 bg-emerald-50/40 text-text-main'"
                >
                  <div
                    class="absolute inset-y-0 left-0"
                    :class="darkMode ? 'bg-emerald-600/60' : 'bg-emerald-300/80'"
                    :style="{ width: depthWidth(row.size, singleYesBids) }"
                  ></div>
                  <div class="relative flex items-center justify-between" :class="idx === singleYesBids.length - 1 ? 'text-sm font-semibold' : ''">
                    <span
                      v-if="idx === 0"
                      class="mr-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest"
                      :class="darkMode ? 'bg-emerald-600/80 text-white' : 'bg-emerald-500 text-white'"
                    >
                      Bids
                    </span>
                    <span v-else :class="darkMode ? 'text-emerald-200' : 'text-text-muted'">#{{ idx + 1 }}</span>
                    <span class="font-semibold">{{ formatPrice(row.price) }}</span>
                    <span :class="darkMode ? 'text-slate-200' : 'text-text-muted'">深度 {{ row.size }}</span>
                    <span :class="darkMode ? 'text-slate-200' : 'text-text-muted'">价值 {{ formatU(row.price, row.size) }} U</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="rounded-xl border border-panel-border bg-panel-bg p-3">
            <div class="text-[10px] text-text-muted uppercase tracking-wide">NO</div>
            <div class="mt-2 space-y-3 text-sm">
              <div>
                <div
                  v-for="(row, idx) in [...singleNoAsks].reverse()"
                  :key="`single-no-ask-${idx}`"
                  class="relative mt-1 overflow-hidden rounded-md border px-2 py-1 text-xs"
                  :class="darkMode ? 'border-rose-900/60 bg-rose-950/40 text-slate-100' : 'border-rose-100 bg-rose-50/40 text-text-main'"
                >
                  <div
                    class="absolute inset-y-0 left-0"
                    :class="darkMode ? 'bg-rose-600/60' : 'bg-rose-300/80'"
                    :style="{ width: depthWidth(row.size, singleNoAsks) }"
                  ></div>
                  <div class="relative flex items-center justify-between" :class="idx === singleNoAsks.length - 1 ? 'text-sm font-semibold' : ''">
                    <span
                      v-if="idx === singleNoAsks.length - 1"
                      class="mr-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest"
                      :class="darkMode ? 'bg-rose-600/80 text-white' : 'bg-rose-500 text-white'"
                    >
                      Asks
                    </span>
                    <span v-else :class="darkMode ? 'text-rose-200' : 'text-text-muted'">#{{ idx + 1 }}</span>
                    <span class="font-semibold">{{ formatPrice(row.price) }}</span>
                    <span :class="darkMode ? 'text-slate-200' : 'text-text-muted'">深度 {{ row.size }}</span>
                    <span :class="darkMode ? 'text-slate-200' : 'text-text-muted'">价值 {{ formatU(row.price, row.size) }} U</span>
                  </div>
                </div>
              </div>
              <div v-if="!singleShowSellOnly">
                <div
                  v-for="(row, idx) in [...singleNoBids].reverse()"
                  :key="`single-no-bid-${idx}`"
                  class="relative mt-1 overflow-hidden rounded-md border px-2 py-1 text-xs"
                  :class="darkMode ? 'border-emerald-900/60 bg-emerald-950/40 text-slate-100' : 'border-emerald-100 bg-emerald-50/40 text-text-main'"
                >
                  <div
                    class="absolute inset-y-0 left-0"
                    :class="darkMode ? 'bg-emerald-600/60' : 'bg-emerald-300/80'"
                    :style="{ width: depthWidth(row.size, singleNoBids) }"
                  ></div>
                  <div class="relative flex items-center justify-between" :class="idx === singleNoBids.length - 1 ? 'text-sm font-semibold' : ''">
                    <span
                      v-if="idx === 0"
                      class="mr-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest"
                      :class="darkMode ? 'bg-emerald-600/80 text-white' : 'bg-emerald-500 text-white'"
                    >
                      Bids
                    </span>
                    <span v-else :class="darkMode ? 'text-emerald-200' : 'text-text-muted'">#{{ idx + 1 }}</span>
                    <span class="font-semibold">{{ formatPrice(row.price) }}</span>
                    <span :class="darkMode ? 'text-slate-200' : 'text-text-muted'">深度 {{ row.size }}</span>
                    <span :class="darkMode ? 'text-slate-200' : 'text-text-muted'">价值 {{ formatU(row.price, row.size) }} U</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="flex-1 rounded border border-panel-border flex items-center justify-center flex-col gap-3 relative overflow-hidden group" :class="darkMode ? 'bg-[#0A0A0C]' : 'bg-panel-border-light'">
          <div
            class="absolute inset-0 pointer-events-none"
            :class="
              darkMode
                ? 'bg-[linear-gradient(rgba(30,30,30,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,30,30,0.5)_1px,transparent_1px)] bg-[size:20px_20px] opacity-20'
                : 'bg-[linear-gradient(rgba(200,200,200,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(200,200,200,0.2)_1px,transparent_1px)] bg-[size:20px_20px]'
            "
          ></div>
          <div class="relative z-10 flex flex-col items-center">
            <span class="material-symbols-outlined text-5xl transition-colors duration-500" :class="darkMode ? 'text-[#27272A] group-hover:text-neon-green/20' : 'text-brand-300 group-hover:text-neon-green/30'">
              candlestick_chart
            </span>
            <p class="text-text-muted text-[10px] font-mono mt-2 uppercase tracking-wide text-center">输入市场 URL 加载数据</p>
          </div>
        </div>
      </div>

    </div>
  </div>
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
  singleStrategy,
  singleLimitSide,
  singleLimitPrice,
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

const formatPrice = (price: number | string) => {
  const value = Number(price);
  if (!Number.isFinite(value)) return "-";
  return (value * 100).toFixed(0);
};
</script>
