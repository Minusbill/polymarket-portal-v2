<template>
  <div :class="['min-h-screen', darkMode ? 'theme-dark' : '']">
    <div class="min-h-screen app-bg text-brand-900">
      <header class="border-b border-brand-100 bg-white/80 backdrop-blur">
        <div class="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between md:px-10">
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

      <main class="mx-auto w-full max-w-[1280px] px-4 pb-10 pt-4 md:px-6">
        <div class="grid gap-4 lg:grid-cols-[200px_1fr]">
          <aside class="sticky top-4 h-fit rounded-2xl border border-brand-100 bg-white/90 p-3 shadow-card backdrop-blur">
            <div class="text-xs text-brand-600">模块导航</div>
            <div class="mt-3 space-y-2">
                <button class="nav-button" :class="currentPage === 'wallets' ? 'is-active' : ''" @click="currentPage = 'wallets'">
                钱包管理
              </button>
              <button class="nav-button" :class="currentPage === 'hedge' ? 'is-active' : ''" @click="openHedgeDesk">
                对刷工作台
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
            <section
              v-show="currentPage === 'wallets'"
              class="panel"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 class="font-display text-lg">钱包管理</h2>
                  <p class="text-xs text-brand-500">支持 100+ 钱包滚动与分页展示。</p>
                </div>
              <div class="flex flex-wrap gap-2">
                <button class="btn-primary" @click="openImport">导入钱包</button>
                <button
                  class="btn-outline"
                  @click="exportKeys"
                >
                  导出钱包信息
                </button>
                <button
                  class="btn-outline"
                  @click="openPairs"
                >
                  钱包对管理
                </button>
                <label class="flex items-center gap-2 rounded-lg border border-brand-200 px-3 py-2 text-xs text-brand-700">
                  <input type="checkbox" v-model="useProxy" />
                  使用 IP 代理
                </label>
                <button
                  class="btn-outline"
                  :disabled="proxyLoading"
                  @click="loadSelectedProxyAddresses"
                >
                  {{ proxyLoading ? "加载中..." : "获取代理地址" }}
                </button>
                <button
                  class="btn-outline"
                  :disabled="walletBalanceLoading"
                  @click="refreshBalances"
                >
                  {{ walletBalanceLoading ? "查询中..." : "查询余额" }}
                </button>
                <button
                  class="btn-outline"
                  :disabled="walletVolumeLoading"
                  @click="refreshWalletMetrics"
                >
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
                <table class="min-w-full text-sm">
                  <thead class="sticky top-0 bg-brand-50 text-xs text-brand-500">
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
                      <th class="px-3 py-2 text-left">所属交易对</th>
                      <th v-if="useProxy" class="px-3 py-2 text-left">IP 配置</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(w, idx) in visibleWallets" :key="w.id" class="border-t border-brand-100">
                      <td class="px-3 py-2">
                        <input type="checkbox" v-model="w.selected" />
                      </td>
                      <td class="px-3 py-2">{{ walletOffset + idx + 1 }}</td>
                      <td class="px-3 py-2 text-brand-600">
                        <button class="text-left hover:text-brand-700" @click="copyText(w.address)">
                          {{ maskAddress(w.address) }}
                        </button>
                      </td>
                      <td class="px-3 py-2 text-brand-600">
                        <button
                          v-if="w.proxyAddress"
                          class="text-left hover:text-brand-700"
                          @click="copyText(w.proxyAddress)"
                        >
                          {{ maskAddress(w.proxyAddress) }}
                        </button>
                        <span v-else>-</span>
                      </td>
                      <td class="px-3 py-2">{{ w.balance === null ? "-" : w.balance.toFixed(2) }}</td>
                      <td class="px-3 py-2">{{ w.volume === null ? "-" : w.volume.toFixed(2) }}</td>
                      <td class="px-3 py-2">{{ w.pnl === null ? "-" : w.pnl.toFixed(2) }}</td>
                      <td class="px-3 py-2 text-xs text-brand-500">{{ pairNameForWallet(w.id) }}</td>
                      <td v-if="useProxy" class="px-3 py-2">
                        <div class="flex items-center justify-between gap-2">
                          <div class="text-xs text-brand-500">
                            {{ w.ipName || w.ipEndpoint ? w.ipName || "已配置" : "未配置" }}
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

            <section v-show="currentPage === 'hedge'" class="panel">
                <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 class="font-display text-lg">对刷工作台</h2>
                  <p class="text-xs text-brand-500">加载市场 → 查看深度 → 统一参数 → 手动确认。</p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button class="rounded-lg border border-brand-200 px-4 py-2 text-sm text-brand-700" @click="refreshMarket">
                    刷新
                  </button>
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
                        v-model="marketInput"
                        placeholder="polymarket.com/event/... 或 slug"
                        class="flex-1 rounded-lg border border-brand-200 px-3 py-2 text-sm"
                      />
                      <button class="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white" @click="loadMarket">加载</button>
                    </div>
                    <div class="mt-3 flex flex-wrap gap-2">
                      <a
                        v-if="market?.slug"
                        class="rounded-full border border-brand-200 px-3 py-1 text-xs text-brand-600"
                        :href="`https://polymarket.com/event/${market.slug}`"
                        target="_blank"
                        rel="noreferrer"
                      >
                        进入市场
                      </a>
                    </div>
                  </div>

                  <div v-if="market" class="rounded-xl border border-brand-100 bg-white p-3 min-h-[140px]">
                    <div class="text-xs text-brand-500">市场信息</div>
                    <div class="mt-2 text-base font-medium">{{ market.title }}</div>
                    <div class="mt-1 text-xs text-brand-500">状态：{{ market.status }} ｜ 更新时间：{{ market.updatedAt }}</div>
                    <div class="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div class="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2">
                        <div class="text-xs text-brand-500">Yes 价格</div>
                        <div class="text-lg font-semibold text-brand-700">{{ market.yesPrice }}</div>
                      </div>
                      <div class="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2">
                        <div class="text-xs text-brand-500">No 价格</div>
                        <div class="text-lg font-semibold text-brand-700">{{ market.noPrice }}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="space-y-4">
                  <div class="rounded-xl border border-brand-100 bg-brand-50 p-3">
                    <div class="flex items-center justify-between">
                      <div class="text-xs text-brand-500">盘口深度</div>
                      <div class="text-xs text-brand-500">{{ showSellOnly ? '卖一合计' : '买一合计' }} {{ (showSellOnly ? sumAsk : sumBid).toFixed(3) }}</div>
                    </div>
                    <div class="mt-2 flex items-center justify-between text-xs text-brand-500">
                      <span>{{ sumHint }}</span>
                      <label class="flex items-center gap-2">
                        <input type="checkbox" v-model="showSellOnly" />
                        只显示卖单
                      </label>
                    </div>
                    <div v-if="sumAlert" class="mt-2 text-xs" :class="sumAlert.tone">
                      {{ sumAlert.message }}
                    </div>
                    <div v-if="orderBookStatus" class="mt-2 text-xs text-rose-700">
                      {{ orderBookStatus }}
                    </div>
                  </div>

                  <div v-if="market" class="space-y-3 min-h-[360px]">
                    <div class="rounded-xl border border-brand-100 bg-white p-3">
                      <div class="text-xs text-brand-500">YES</div>
                      <div class="mt-2 space-y-3 text-sm">
                        <div v-if="!showSellOnly">
                          <div
                            v-for="(row, idx) in market.book.yesBids"
                            :key="`yes-bid-${idx}`"
                            class="relative mt-1 overflow-hidden rounded-md border px-2 py-1 text-xs"
                            :class="darkMode ? 'border-emerald-900/60 bg-emerald-950/40 text-slate-100' : 'border-emerald-100 bg-emerald-50/40 text-brand-700'"
                          >
                            <div
                              class="absolute inset-y-0 left-0"
                              :class="darkMode ? 'bg-emerald-600/60' : 'bg-emerald-300/80'"
                              :style="{ width: depthWidth(row.size, market.book.yesBids) }"
                            ></div>
                            <div class="relative flex items-center justify-between">
                            <span :class="darkMode ? 'text-emerald-200' : 'text-brand-600'">#{{ idx + 1 }}</span>
                            <span class="font-semibold">{{ row.price }}</span>
                            <span :class="darkMode ? 'text-slate-200' : 'text-brand-500'">深度 {{ row.size }}</span>
                            <span :class="darkMode ? 'text-slate-200' : 'text-brand-500'">价值 {{ formatU(row.price, row.size) }} U</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <div
                            v-for="(row, idx) in market.book.yesAsks"
                            :key="`yes-ask-${idx}`"
                            class="relative mt-1 overflow-hidden rounded-md border px-2 py-1 text-xs"
                            :class="darkMode ? 'border-rose-900/60 bg-rose-950/40 text-slate-100' : 'border-rose-100 bg-rose-50/40 text-brand-700'"
                          >
                            <div
                              class="absolute inset-y-0 left-0"
                              :class="darkMode ? 'bg-rose-600/60' : 'bg-rose-300/80'"
                              :style="{ width: depthWidth(row.size, market.book.yesAsks) }"
                            ></div>
                            <div class="relative flex items-center justify-between">
                            <span :class="darkMode ? 'text-rose-200' : 'text-brand-600'">#{{ idx + 1 }}</span>
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
                        <div v-if="!showSellOnly">
                          <div
                            v-for="(row, idx) in market.book.noBids"
                            :key="`no-bid-${idx}`"
                            class="relative mt-1 overflow-hidden rounded-md border px-2 py-1 text-xs"
                            :class="darkMode ? 'border-emerald-900/60 bg-emerald-950/40 text-slate-100' : 'border-emerald-100 bg-emerald-50/40 text-brand-700'"
                          >
                            <div
                              class="absolute inset-y-0 left-0"
                              :class="darkMode ? 'bg-emerald-600/60' : 'bg-emerald-300/80'"
                              :style="{ width: depthWidth(row.size, market.book.noBids) }"
                            ></div>
                            <div class="relative flex items-center justify-between">
                            <span :class="darkMode ? 'text-emerald-200' : 'text-brand-600'">#{{ idx + 1 }}</span>
                            <span class="font-semibold">{{ row.price }}</span>
                            <span :class="darkMode ? 'text-slate-200' : 'text-brand-500'">深度 {{ row.size }}</span>
                            <span :class="darkMode ? 'text-slate-200' : 'text-brand-500'">价值 {{ formatU(row.price, row.size) }} U</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <div
                            v-for="(row, idx) in market.book.noAsks"
                            :key="`no-ask-${idx}`"
                            class="relative mt-1 overflow-hidden rounded-md border px-2 py-1 text-xs"
                            :class="darkMode ? 'border-rose-900/60 bg-rose-950/40 text-slate-100' : 'border-rose-100 bg-rose-50/40 text-brand-700'"
                          >
                            <div
                              class="absolute inset-y-0 left-0"
                              :class="darkMode ? 'bg-rose-600/60' : 'bg-rose-300/80'"
                              :style="{ width: depthWidth(row.size, market.book.noAsks) }"
                            ></div>
                            <div class="relative flex items-center justify-between">
                            <span :class="darkMode ? 'text-rose-200' : 'text-brand-600'">#{{ idx + 1 }}</span>
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

              <div class="mt-4 rounded-2xl border border-brand-100 bg-brand-50 p-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="text-sm font-medium text-brand-800">执行参数</div>
                  <div class="text-xs text-brand-500">已选钱包对 {{ selectedPairs.length }}</div>
                </div>
                <div class="mt-3 rounded-xl border border-brand-100 bg-white p-2 text-xs">
                  <div v-if="pairs.length === 0" class="px-2 py-3 text-brand-500">暂无钱包对。</div>
                  <div v-else class="grid gap-2 md:grid-cols-4">
                    <div
                      v-for="pair in pairs"
                      :key="pair.id"
                      class="flex items-center justify-between rounded-lg border border-brand-100 px-2 py-1 text-[11px]"
                    >
                      <label class="flex items-center gap-2">
                        <input type="checkbox" v-model="pair.selected" />
                        <span class="text-brand-700">{{ pair.name }}</span>
                      </label>
                      <div class="flex items-center gap-1">
                        <span class="rounded-full border border-brand-200 px-2 py-0.5 text-[10px] text-brand-600">
                          {{ pair.amount && pair.amount > 0 ? `单独 ${pair.amount}` : "统一" }}
                        </span>
                        <button class="rounded-md border border-brand-200 px-2 py-0.5 text-[10px] text-brand-600" @click="openPairConfig(pair)">
                          配置
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="mt-3 grid gap-3 lg:grid-cols-[1fr_auto]">
                  <div class="flex flex-wrap items-center gap-3">
                    <div class="rounded-lg border border-brand-100 bg-white px-3 py-2 text-xs text-brand-600">
                      执行模式：对冲单次执行（YES/NO）
                    </div>
                    <div class="flex items-center gap-2 rounded-lg border border-brand-100 bg-white px-2 py-1 text-xs text-brand-600">
                      <label class="flex items-center gap-1">
                        <input type="radio" value="yes-no" v-model="executionOrder" />
                        先 YES 后 NO
                      </label>
                      <label class="flex items-center gap-1">
                        <input type="radio" value="no-yes" v-model="executionOrder" />
                        先 NO 后 YES
                      </label>
                    </div>
                    <div class="flex items-center gap-2 rounded-lg border border-brand-100 bg-white px-2 py-1 text-xs text-brand-600">
                      <span>随机间隔(秒)</span>
                      <input v-model.number="executionDelayMin" type="number" min="0" class="w-14 rounded-md border border-brand-200 px-2 py-1 text-xs" placeholder="最小" />
                      <span class="text-brand-400">-</span>
                      <input v-model.number="executionDelayMax" type="number" min="0" class="w-14 rounded-md border border-brand-200 px-2 py-1 text-xs" placeholder="最大" />
                    </div>
                    <div class="flex items-center gap-2 rounded-lg border border-brand-100 bg-white px-2 py-1 text-xs text-brand-600">
                      <span>统一数量</span>
                      <input v-model.number="execution.size" type="number" min="0" class="w-20 rounded-md border border-brand-200 px-2 py-1 text-xs" />
                      <span v-if="customPairCount" class="text-brand-400">已配置 {{ customPairCount }} 对单独数量</span>
                    </div>
                    <div class="text-xs text-brand-500">
                      预计交易价值：{{ executionNotionalLabel }}
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <button class="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white" @click="execute">执行确定</button>
                    <button
                      class="flex h-8 w-8 items-center justify-center rounded-full border border-brand-200 text-xs text-brand-500 hover:text-brand-800"
                      @click="showExecutionNotice = !showExecutionNotice"
                      title="执行说明"
                    >
                      !
                    </button>
                  </div>
                </div>
                <div
                  v-if="showExecutionNotice"
                  class="mt-2 rounded-lg border border-brand-100 bg-white px-3 py-2 text-xs text-brand-600"
                >
                  交易对会按顺序执行：先买卖 YES/NO，执行输出是 wallet1 完成后再到 wallet2 的模拟流程。
                </div>
              </div>

              <div class="mt-3 rounded-2xl border border-brand-100 bg-brand-50 p-3 text-xs text-brand-700 shadow-soft h-[160px]">
                <div class="mb-2 flex items-center justify-between text-brand-500">
                  <span>执行输出</span>
                  <button class="text-xs text-brand-500 hover:text-brand-800" @click="clearLogs">清空</button>
                </div>
                <div class="max-h-[120px] space-y-1 overflow-auto font-mono">
                  <div v-if="logs.length === 0" class="text-brand-400">暂无输出，点击“执行确定”后显示结果。</div>
                  <div v-for="(log, idx) in logs" :key="`${log.ts}-${idx}`">
                    [{{ log.ts }}] {{ log.message }}
                  </div>
                </div>
              </div>
            </section>

            <section v-show="currentPage === 'single'" class="panel">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 class="font-display text-lg">单刷工作台</h2>
                  <p class="text-xs text-brand-500">先加载市场，再选择钱包并设置随机间隔执行。</p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button class="btn-outline" @click="refreshSingleMarket">刷新</button>
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
                    <div class="text-xs text-brand-500">{{ singleShowSellOnly ? '卖一合计' : '买一合计' }} {{ (singleShowSellOnly ? singleSumAsk : singleSumBid).toFixed(3) }}</div>
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
                      <div v-if="!singleShowSellOnly">
                        <div
                          v-for="(row, idx) in singleMarket.book.yesBids"
                          :key="`single-yes-bid-${idx}`"
                          class="relative mt-1 overflow-hidden rounded-md border px-2 py-1 text-xs"
                          :class="darkMode ? 'border-emerald-900/60 bg-emerald-950/40 text-slate-100' : 'border-emerald-100 bg-emerald-50/40 text-brand-700'"
                        >
                          <div
                            class="absolute inset-y-0 left-0"
                            :class="darkMode ? 'bg-emerald-600/60' : 'bg-emerald-300/80'"
                            :style="{ width: depthWidth(row.size, singleMarket.book.yesBids) }"
                          ></div>
                          <div class="relative flex items-center justify-between">
                            <span :class="darkMode ? 'text-emerald-200' : 'text-brand-600'">#{{ idx + 1 }}</span>
                            <span class="font-semibold">{{ row.price }}</span>
                            <span :class="darkMode ? 'text-slate-200' : 'text-brand-500'">深度 {{ row.size }}</span>
                            <span :class="darkMode ? 'text-slate-200' : 'text-brand-500'">价值 {{ formatU(row.price, row.size) }} U</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div
                          v-for="(row, idx) in singleMarket.book.yesAsks"
                          :key="`single-yes-ask-${idx}`"
                          class="relative mt-1 overflow-hidden rounded-md border px-2 py-1 text-xs"
                          :class="darkMode ? 'border-rose-900/60 bg-rose-950/40 text-slate-100' : 'border-rose-100 bg-rose-50/40 text-brand-700'"
                        >
                          <div
                            class="absolute inset-y-0 left-0"
                            :class="darkMode ? 'bg-rose-600/60' : 'bg-rose-300/80'"
                            :style="{ width: depthWidth(row.size, singleMarket.book.yesAsks) }"
                          ></div>
                          <div class="relative flex items-center justify-between">
                            <span :class="darkMode ? 'text-rose-200' : 'text-brand-600'">#{{ idx + 1 }}</span>
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
                      <div v-if="!singleShowSellOnly">
                        <div
                          v-for="(row, idx) in singleMarket.book.noBids"
                          :key="`single-no-bid-${idx}`"
                          class="relative mt-1 overflow-hidden rounded-md border px-2 py-1 text-xs"
                          :class="darkMode ? 'border-emerald-900/60 bg-emerald-950/40 text-slate-100' : 'border-emerald-100 bg-emerald-50/40 text-brand-700'"
                        >
                          <div
                            class="absolute inset-y-0 left-0"
                            :class="darkMode ? 'bg-emerald-600/60' : 'bg-emerald-300/80'"
                            :style="{ width: depthWidth(row.size, singleMarket.book.noBids) }"
                          ></div>
                          <div class="relative flex items-center justify-between">
                            <span :class="darkMode ? 'text-emerald-200' : 'text-brand-600'">#{{ idx + 1 }}</span>
                            <span class="font-semibold">{{ row.price }}</span>
                              <span :class="darkMode ? 'text-slate-200' : 'text-brand-500'">深度 {{ row.size }}</span>
                              <span :class="darkMode ? 'text-slate-200' : 'text-brand-500'">价值 {{ formatU(row.price, row.size) }} U</span>
                            </div>
                          </div>
                        </div>
                      <div>
                        <div
                          v-for="(row, idx) in singleMarket.book.noAsks"
                          :key="`single-no-ask-${idx}`"
                          class="relative mt-1 overflow-hidden rounded-md border px-2 py-1 text-xs"
                          :class="darkMode ? 'border-rose-900/60 bg-rose-950/40 text-slate-100' : 'border-rose-100 bg-rose-50/40 text-brand-700'"
                        >
                          <div
                            class="absolute inset-y-0 left-0"
                            :class="darkMode ? 'bg-rose-600/60' : 'bg-rose-300/80'"
                            :style="{ width: depthWidth(row.size, singleMarket.book.noAsks) }"
                          ></div>
                            <div class="relative flex items-center justify-between">
                              <span :class="darkMode ? 'text-rose-200' : 'text-brand-600'">#{{ idx + 1 }}</span>
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

              <div class="mt-3">
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
                        <th class="px-3 py-2 text-left">代理地址</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(wallet, idx) in wallets" :key="wallet.id" class="border-t border-brand-100">
                        <td class="px-3 py-2">
                          <input type="checkbox" v-model="singleSelections[wallet.id]" />
                        </td>
                        <td class="px-3 py-2">{{ idx + 1 }}</td>
                        <td class="px-3 py-2 text-brand-600">{{ maskAddress(wallet.address) }}</td>
                        <td class="px-3 py-2 text-brand-600">{{ wallet.proxyAddress ? maskAddress(wallet.proxyAddress) : "-" }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="mt-3 rounded-2xl border border-brand-100 bg-brand-50 p-3 text-xs text-brand-700 shadow-soft h-[160px]">
                <div class="mb-2 flex items-center justify-between text-brand-500">
                  <span>执行输出</span>
                  <button class="text-xs text-brand-500 hover:text-brand-800" @click="clearSingleLogs">清空</button>
                </div>
                <div class="max-h-[120px] space-y-1 overflow-auto font-mono">
                  <div v-if="singleLogs.length === 0" class="text-brand-400">暂无输出。</div>
                  <div v-for="(log, idx) in singleLogs" :key="`${log.ts}-${idx}`">
                    [{{ log.ts }}] {{ log.message }}
                  </div>
                </div>
              </div>
            </section>

            <section v-show="currentPage === 'positions'" class="panel">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 class="font-display text-lg">仓位管理</h2>
                  <p class="text-xs text-brand-500">点击查询后加载，避免一次性拉取大量数据。</p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button class="btn-outline" @click="loadPositions">
                    {{ positionsLoading ? '查询中...' : '查询仓位' }}
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
                <table class="min-w-full text-sm">
                  <thead class="bg-brand-50 text-xs text-brand-500">
                    <tr>
                      <th class="px-3 py-2 text-left">账户</th>
                      <th class="px-3 py-2 text-left">市场</th>
                      <th class="px-3 py-2 text-left">持仓</th>
                      <th class="px-3 py-2 text-left">价值(U)</th>
                      <th class="px-3 py-2 text-left">结束时间</th>
                      <th class="px-3 py-2 text-left">Redeem 状态</th>
                      <th class="px-3 py-2 text-left">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="positions.length === 0" class="border-t border-brand-100">
                      <td colspan="7" class="px-3 py-6 text-center text-sm text-brand-500">
                        暂无数据，请点击“查询仓位”。
                      </td>
                    </tr>
                    <template v-for="group in groupedPositions" :key="group.address">
                      <tr class="border-t border-brand-100 bg-brand-50/60">
                        <td class="px-3 py-2 text-brand-700" colspan="7">
                          {{ maskAddress(group.address) }} · {{ group.items.length }} 个仓位
                        </td>
                      </tr>
                      <tr v-for="pos in group.items" :key="pos.id" class="border-t border-brand-100">
                        <td class="px-3 py-2 text-brand-600">{{ maskAddress(pos.address) }}</td>
                        <td class="px-3 py-2">{{ pos.market }}</td>
                        <td class="px-3 py-2">{{ pos.size }}</td>
                        <td class="px-3 py-2">{{ pos.value ? pos.value.toFixed(2) : "-" }}</td>
                        <td class="px-3 py-2 text-xs text-brand-500">{{ pos.endDate || "-" }}</td>
                        <td class="px-3 py-2">
                          <span v-if="pos.value > 0" class="rounded-full px-2 py-1 text-xs" :class="pos.redeemable ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'">
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
                <div class="max-h-[120px] space-y-1 overflow-auto font-mono">
                  <div v-if="depositLogs.length === 0" class="text-brand-400">暂无输出。</div>
                  <div v-for="(log, idx) in depositLogs" :key="`${log.ts}-${idx}`">
                    [{{ log.ts }}] {{ log.message }}
                  </div>
                </div>
              </div>
            </section>

            <section v-show="currentPage === 'deposit'" class="panel">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 class="font-display text-lg">充值</h2>
                  <p class="text-xs text-brand-500">从交易所批量充值到 代理地址。</p>
                  <p v-if="depositStatus" class="mt-2 text-xs text-emerald-600">{{ depositStatus }}</p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button
                    class="btn-outline"
                    @click="refreshFundBalances"
                    :disabled="balanceLoading"
                  >
                    {{ balanceLoading ? "查询中..." : "查询余额" }}
                  </button>
                  <button
                    class="btn-outline"
                    @click="loadDepositBridgeAddresses"
                    :disabled="depositBridgeLoading"
                  >
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
                  <div class="text-xs font-semibold text-brand-700">交易所配置</div>
                  <div class="mt-3 space-y-2 text-sm">
                    <select v-model="exchangeConfig.name" class="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm">
                      <option value="">选择交易所</option>
                      <option value="binance">Binance</option>
                    </select>
                    <input v-model="exchangeConfig.apiKey" class="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm" placeholder="API Key" />
                    <input v-model="exchangeConfig.apiSecret" class="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm" placeholder="API Secret" />
                    <input v-model="exchangeConfig.ipWhitelist" class="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm" placeholder="IP 白名单（逗号分隔）" />
                  </div>
                  <div class="mt-3 text-xs text-brand-500">用于交易所批量提现/充值配置。</div>
                </div>

                <div class="rounded-2xl border border-brand-100 bg-brand-50 p-3">
                  <div class="text-xs font-semibold text-brand-700">交易所提现参数</div>
                  <div class="mt-3 space-y-2 text-sm">
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
                    <button class="btn-primary mt-3 w-full text-base" @click="confirmDeposit">开始</button>
                  </div>
                  <div class="mt-3 text-xs text-brand-500">
                    充值将以“交易所提现”形式转入 代理地址，可设置秒级延迟与金额区间随机。
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
                        <th class="px-3 py-2 text-left">代理地址</th>
                        <th class="px-3 py-2 text-left">充值地址</th>
                        <th class="px-3 py-2 text-left">余额</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, idx) in fundRows" :key="row.id" class="border-t border-brand-100">
                        <td class="px-3 py-2">
                          <input type="checkbox" v-model="row.selected" />
                        </td>
                        <td class="px-3 py-2">{{ idx + 1 }}</td>
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
                        <td class="px-3 py-2">
                          <div class="flex items-center gap-2">
                            <span class="text-brand-600">{{ row.depositAddress ? maskAddress(row.depositAddress) : "-" }}</span>
                            <button
                              v-if="row.depositAddress"
                              class="rounded-md border border-brand-200 px-2 py-1 text-[11px] text-brand-700"
                              @click="copyText(row.depositAddress)"
                              title="复制地址"
                            >
                              <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" aria-hidden="true">
                                <path
                                  fill="currentColor"
                                  d="M8 7a3 3 0 0 1 3-3h7a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-7a3 3 0 0 1-3-3V7Zm3-1a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-7ZM3 10a3 3 0 0 1 3-3h1v2H6a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-1h2v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-7Z"
                                />
                              </svg>
                            </button>
                          </div>
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
                  <div class="max-h-[120px] space-y-1 overflow-auto font-mono">
                    <div v-if="depositLogs.length === 0" class="text-brand-400">暂无输出。</div>
                    <div v-for="(log, idx) in depositLogs" :key="`${log.ts}-${idx}`">
                      [{{ log.ts }}] {{ log.message }}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section v-show="currentPage === 'withdraw'" class="panel">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 class="font-display text-lg">提现</h2>
                  <p class="text-xs text-brand-500">从 代理地址 批量转出到外部地址。</p>
                  <p v-if="withdrawStatus" class="mt-2 text-xs text-emerald-600">{{ withdrawStatus }}</p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button
                    class="btn-outline"
                    @click="refreshWithdrawBalances"
                    :disabled="balanceLoading"
                  >
                    {{ balanceLoading ? "查询中..." : "查询余额" }}
                  </button>
                  <div class="flex flex-wrap items-center gap-2 rounded-lg border border-brand-200 px-3 py-2 text-xs text-brand-700">
                    <label class="flex items-center gap-2">
                      <input type="radio" value="all" v-model="withdrawMode" />
                      清空
                    </label>
                    <label class="flex items-center gap-2">
                      <input type="radio" value="partial" v-model="withdrawMode" />
                      部分
                    </label>
                    <div class="flex items-center gap-2">
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
                        应用到选中
                      </button>
                    </div>
                  </div>
                  <button class="btn-outline" @click="openWithdrawConfig">
                    配置转入地址
                  </button>
                  <button class="btn-primary" @click="bulkWithdraw">
                    批量提现
                  </button>
                </div>
              </div>


              <div class="mt-3 space-y-3">
                  <div class="table-shell max-h-[560px] overflow-auto">
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
                          <th v-if="withdrawMode === 'partial'" class="px-3 py-2 text-left">金额</th>
                          <th class="px-3 py-2 text-left">余额</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(row, idx) in withdrawRows" :key="row.id" class="border-t border-brand-100">
                          <td class="px-3 py-2">
                            <input type="checkbox" v-model="row.selected" />
                          </td>
                          <td class="px-3 py-2">{{ idx + 1 }}</td>
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
                            <button class="text-left hover:text-brand-700" @click="copyText(row.withdrawAddress)">
                              {{ maskAddress(row.withdrawAddress) }}
                            </button>
                          </td>
                          <td v-if="withdrawMode === 'partial'" class="px-3 py-2">
                            <input
                              v-model.number="row.amount"
                              type="number"
                              min="0"
                              class="w-20 rounded-md border border-brand-200 px-2 py-1 text-xs"
                              placeholder="金额"
                            />
                          </td>
                          <td class="px-3 py-2">{{ row.balance === null ? "-" : row.balance.toFixed(2) }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div class="rounded-2xl border border-brand-100 bg-brand-50 p-3 text-xs text-brand-700 shadow-soft h-[160px]">
                    <div class="mb-2 flex items-center justify-between text-brand-500">
                      <span>执行输出</span>
                      <button class="text-xs text-brand-500 hover:text-brand-800" @click="clearWithdrawLogs">清空</button>
                    </div>
                    <div class="max-h-[120px] space-y-1 overflow-auto font-mono">
                      <div v-if="withdrawLogs.length === 0" class="text-brand-400">暂无输出。</div>
                      <div v-for="(log, idx) in withdrawLogs" :key="`${log.ts}-${idx}`">
                        [{{ log.ts }}] {{ log.message }}
                      </div>
                    </div>
                  </div>
              </div>
            </section>
          </section>
        </div>
      </main>
    </div>
  </div>

  <div v-if="showImport" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" @click.self="showImport = false">
    <div class="w-full max-w-2xl rounded-2xl border border-brand-100 bg-white p-6 shadow-[0_24px_60px_rgba(7,20,60,0.35)]">
      <div class="flex items-center justify-between">
        <h2 class="font-display text-lg text-brand-900">导入账户</h2>
        <button class="text-sm text-brand-500" @click="showImport = false">关闭</button>
      </div>
      <p class="mt-2 text-sm text-brand-700">输入私钥（仅当前会话），支持多行导入或 CSV 文件导入。</p>
      <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-brand-500">
        <label class="rounded-lg border border-brand-200 px-3 py-2 text-xs text-brand-700">
          <input type="file" accept=".csv,text/csv" class="hidden" @change="handleCsvImport" />
          选择 CSV 文件
        </label>
        <span class="text-brand-700">CSV 格式：index,privateKey,ipName,ipEndpoint 或 privateKey,ipName,ipEndpoint（含表头）</span>
      </div>
      <div class="mt-4 relative">
        <div class="pointer-events-none absolute inset-y-2 left-2 w-10 overflow-hidden text-xs text-brand-500">
          <div v-for="(line, idx) in importLines" :key="`ln-${idx}`" class="h-5 leading-5">
            {{ idx + 1 }}
          </div>
        </div>
        <textarea
          v-model="importText"
          class="h-40 w-full rounded-xl border border-brand-200 p-3 pl-12 text-sm leading-5"
          placeholder="每行一个私钥，或 CSV：index,privateKey,ipName,ipEndpoint"
        ></textarea>
      </div>
      <div class="mt-4 flex justify-end gap-2">
        <button class="rounded-lg border border-brand-200 px-4 py-2 text-sm text-brand-700" @click="showImport = false">取消</button>
        <button class="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white" @click="confirmImport">导入</button>
      </div>
    </div>
  </div>

  <div v-if="showFlow" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4" @click.self="showFlow = false">
    <div class="w-full max-w-4xl max-h-[80vh] overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-[0_28px_80px_rgba(7,20,60,0.35)]">
      <div class="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.14),transparent_55%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_45%),linear-gradient(120deg,#f8fafc,#ecfdf5)] px-6 py-4">
        <div class="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-emerald-200/40 blur-2xl"></div>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-[10px] uppercase tracking-[0.26em] text-brand-500">How It Works</div>
            <h2 class="font-display text-xl text-brand-900 md:text-2xl">操作说明</h2>
          </div>
          <button class="text-xs text-brand-500" @click="showFlow = false">关闭</button>
        </div>
      </div>
      <div class="max-h-[calc(80vh-112px)] overflow-auto p-6">
        <div class="flex flex-col gap-3">
          <div
            v-for="(step, idx) in flowSteps"
            :key="step.title"
            class="flex items-center gap-3"
          >
            <div class="w-20 text-center text-xs font-semibold text-brand-500">
              Step {{ idx + 1 }}
            </div>
            <div class="flex-1 rounded-2xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-700 shadow-soft">
              <div class="flex flex-wrap items-center gap-2 text-xs text-brand-600">
                <span class="font-semibold text-brand-700">{{ step.title }}</span>
                <span class="text-brand-400">—</span>
                <span>{{ step.desc }}</span>
              </div>
            </div>
            <div v-if="idx < flowSteps.length - 1" class="text-brand-400">
              <span class="text-xl">↓</span>
            </div>
          </div>
        </div>
        <div class="mt-5 rounded-2xl border border-brand-100 bg-white p-5">
          <div class="text-xs font-semibold text-brand-600">注意事项</div>
          <div class="mt-3 grid gap-2 md:grid-cols-2">
            <div class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              买一合计接近 1；差距过大可能产生磨损。
            </div>
            <div class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              提前卖出可能有 0.1% 磨损，建议等待 Redeem。
            </div>
          </div>
        </div>
        <div class="mt-6 flex items-center justify-end">
          <button class="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-soft hover:bg-brand-700" @click="showFlow = false">
            我已了解
          </button>
        </div>
      </div>
    </div>
  </div>

  <div v-if="showIntro" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4" @click.self="showIntro = false">
    <div class="w-full max-w-4xl overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-[0_28px_80px_rgba(7,20,60,0.35)]">
      <div class="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.18),transparent_55%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.2),transparent_45%),linear-gradient(120deg,#f8fafc,#ecfdf5)] p-6">
        <div class="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-200/40 blur-2xl"></div>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-xs uppercase tracking-[0.3em] text-brand-500">Onboarding</div>
            <h2 class="font-display text-2xl text-brand-900 md:text-3xl">Polymarket 刷交互门户</h2>
            <p class="mt-2 text-sm text-brand-600">
              用于多账户联动、刷交易量与交互记录的工作台。
            </p>
          </div>
          <button class="text-sm text-brand-500" @click="showIntro = false">关闭</button>
        </div>
      </div>
      <div class="p-6">
        <div class="grid gap-4 md:grid-cols-2">
          <div class="rounded-2xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-700 shadow-soft">
            <div class="flex items-center gap-2 text-xs font-semibold text-brand-700">
              <span class="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-white">1</span>
              平台原理
            </div>
            <div class="mt-3 text-xs text-brand-600">
              用户配置双数钱包，互相成为关联钱包，支持同时买卖进行对刷，获取交易量与交互记录。
            </div>
          </div>
          <div class="rounded-2xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-700 shadow-soft">
            <div class="flex items-center gap-2 text-xs font-semibold text-brand-700">
              <span class="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-white">2</span>
              交易模式
            </div>
            <div class="mt-3 text-xs text-brand-600">
              可等待结果结算后 Redeem，也可在市场中同时卖出完成刷交互。
            </div>
          </div>
          <div class="rounded-2xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-700 shadow-soft">
            <div class="flex items-center gap-2 text-xs font-semibold text-brand-700">
              <span class="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-white">3</span>
              IP 隔离
            </div>
            <div class="mt-3 text-xs text-brand-600">
              支持配置 IP 代理隔离不同账户，使用不同 IP 发起请求。
            </div>
          </div>
          <div class="rounded-2xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-700 shadow-soft">
            <div class="flex items-center gap-2 text-xs font-semibold text-brand-700">
              <span class="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-white">4</span>
              支持与反馈
            </div>
            <div class="mt-3 text-xs text-brand-600">
              平台目前免费，支持多个账户交互；如遇问题请及时反馈开发者。
            </div>
          </div>
        </div>
        <div class="mt-5 rounded-2xl border border-brand-100 bg-white p-5">
          <div class="text-xs font-semibold text-brand-600">使用提醒</div>
          <div class="mt-3 grid gap-2 md:grid-cols-2">
            <div class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              买一合计偏离 1 时注意磨损与差价。
            </div>
            <div class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              本平台以刷交易为主，避免赌博心态，理性参与。
            </div>
            <div class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              执行前请检查参数与钱包对，避免不必要损失。
            </div>
            <div class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              如遇异常请及时联系开发者。
            </div>
          </div>
        </div>
        <div class="mt-6 flex items-center justify-between">
          <button class="text-xs text-brand-500" @click="hidePopupForToday('intro'); showIntro = false">今天内不再显示</button>
          <button class="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-soft hover:bg-brand-700" @click="showIntro = false">
            开始使用
          </button>
        </div>
      </div>
    </div>
  </div>

  <div v-if="showHedgeGuide" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" @click.self="showHedgeGuide = false">
    <div class="w-full max-w-3xl rounded-2xl border border-brand-100 bg-white p-6 shadow-[0_24px_60px_rgba(7,20,60,0.35)]">
      <div class="flex items-center justify-between">
        <h2 class="font-display text-lg text-brand-900">对刷工作台使用说明</h2>
        <button class="text-sm text-brand-500" @click="showHedgeGuide = false">关闭</button>
      </div>
      <div class="mt-4 grid gap-3 md:grid-cols-2">
        <div class="rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm text-brand-700">
          <div class="text-xs font-semibold text-brand-600">1. 导入钱包</div>
          <div class="mt-2 text-xs text-brand-600">在“钱包管理”导入私钥并确认钱包对。</div>
        </div>
        <div class="rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm text-brand-700">
          <div class="text-xs font-semibold text-brand-600">2. 加载市场</div>
          <div class="mt-2 text-xs text-brand-600">输入链接或 slug，观察 Yes/No 与买一合计。</div>
        </div>
        <div class="rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm text-brand-700">
          <div class="text-xs font-semibold text-brand-600">3. 设置参数</div>
          <div class="mt-2 text-xs text-brand-600">选择钱包对，填写统一数量，确认预计交易价值。</div>
        </div>
        <div class="rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm text-brand-700">
          <div class="text-xs font-semibold text-brand-600">4. 执行确认</div>
          <div class="mt-2 text-xs text-brand-600">按顺序执行 YES/NO，执行输出将从 wallet1 依次到 wallet2。</div>
        </div>
      </div>
      <div class="mt-4 rounded-xl border border-brand-100 bg-white p-4 text-xs text-brand-700">
        <div class="text-xs font-semibold text-brand-600">注意事项</div>
        <div class="mt-3 space-y-2">
          <div class="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2">
            买一合计偏离 1 时注意磨损与差价。
          </div>
          <div class="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2">
            本平台以刷交易为主，避免赌博心态，理性参与。
          </div>
          <div class="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2">
            执行前请检查参数与钱包对，避免不必要损失。
          </div>
          <div class="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2">
            如遇异常请及时联系开发者。
          </div>
        </div>
      </div>
      <div class="mt-4 flex items-center justify-between">
        <button class="text-xs text-brand-500" @click="hidePopupForToday('hedgeGuide'); showHedgeGuide = false">今天内不再显示</button>
        <button class="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white" @click="showHedgeGuide = false">
          我已了解
        </button>
      </div>
    </div>
  </div>

  <div v-if="showWalletIpModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" @click.self="showWalletIpModal = false">
    <div class="w-full max-w-lg rounded-2xl border border-brand-100 bg-white p-6 shadow-[0_24px_60px_rgba(7,20,60,0.35)]">
      <div class="flex items-center justify-between">
        <h2 class="font-display text-lg text-brand-900">钱包 IP 配置</h2>
        <button class="text-sm text-brand-500" @click="showWalletIpModal = false">关闭</button>
      </div>
      <div class="mt-2 text-xs text-brand-500">
        地址：{{ walletIpTarget ? maskAddress(walletIpTarget.address) : "-" }}
      </div>
      <div class="mt-4 space-y-3">
        <input
          v-model="walletIpName"
          class="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
          placeholder="IP 名称"
        />
        <input
          v-model="walletIpEndpoint"
          class="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
          placeholder="http://user:pass@host:port"
        />
      </div>
      <div class="mt-4 flex justify-end gap-2">
        <button class="rounded-lg border border-brand-200 px-4 py-2 text-sm text-brand-700" @click="showWalletIpModal = false">
          取消
        </button>
        <button class="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white" @click="saveWalletIp">
          保存
        </button>
      </div>
    </div>
  </div>

  <div v-if="showPairConfig" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" @click.self="showPairConfig = false">
    <div class="w-full max-w-md rounded-2xl border border-brand-100 bg-white p-6 shadow-[0_24px_60px_rgba(7,20,60,0.35)]">
      <div class="flex items-center justify-between">
        <h2 class="font-display text-lg text-brand-900">钱包对数量配置</h2>
        <button class="text-sm text-brand-500" @click="showPairConfig = false">关闭</button>
      </div>
      <div class="mt-2 text-xs text-brand-500">
        {{ pairConfigTarget ? pairConfigTarget.name : "-" }}：{{ pairConfigTarget ? `${nameForWallet(pairConfigTarget.a)} / ${nameForWallet(pairConfigTarget.b)}` : "-" }}
      </div>
      <div class="mt-4 space-y-2">
        <input
          v-model.number="pairConfigAmount"
          type="number"
          min="0"
          class="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
          placeholder="单独数量（留空使用统一数量）"
        />
      </div>
      <div class="mt-4 flex justify-end gap-2">
        <button class="rounded-lg border border-brand-200 px-4 py-2 text-sm text-brand-700" @click="showPairConfig = false">
          取消
        </button>
        <button class="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white" @click="savePairConfig">
          保存
        </button>
      </div>
    </div>
  </div>

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

  <div v-if="showPairs" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" @click.self="showPairs = false">
    <div class="w-full max-w-3xl rounded-2xl border border-brand-100 bg-white p-6 shadow-[0_24px_60px_rgba(7,20,60,0.35)]">
      <div class="flex items-center justify-between">
        <h2 class="font-display text-lg text-brand-900">钱包对管理</h2>
        <button class="text-sm text-brand-500" @click="showPairs = false">关闭</button>
      </div>
      <p class="mt-2 text-xs text-brand-500">默认按导入顺序自动配对，可勾选参与并设置方向。</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <button class="rounded-lg border border-brand-200 px-3 py-1 text-xs text-brand-700" @click="selectAllPairs(true)">全选</button>
        <button class="rounded-lg border border-brand-200 px-3 py-1 text-xs text-brand-700" @click="selectAllPairs(false)">全不选</button>
      </div>
      <div class="mt-4 max-h-96 space-y-2 overflow-auto">
        <div v-for="(p, idx) in pairs" :key="p.id" class="rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm">
          <div class="flex items-center justify-between gap-3">
            <div class="text-xs font-semibold text-brand-700">Pair {{ idx + 1 }}</div>
            <div class="text-xs text-brand-500">
              {{ nameForWallet(p.a) }} ｜ {{ nameForWallet(p.b) }}
            </div>
            <label class="flex items-center gap-2 text-xs text-brand-600">
              <input type="checkbox" v-model="p.selected" /> 参与
            </label>
          </div>
        </div>
      </div>
      <div class="mt-4 flex items-center justify-end">
        <button class="rounded-lg border border-brand-200 px-4 py-2 text-sm text-brand-700" @click="showPairs = false">
          关闭
        </button>
      </div>
    </div>
  </div>

  <div v-if="showWithdrawConfig" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" @click.self="showWithdrawConfig = false">
    <div class="w-full max-w-2xl max-h-[80vh] overflow-auto rounded-2xl border border-brand-100 bg-white p-6 shadow-[0_24px_60px_rgba(7,20,60,0.35)]">
      <div class="flex items-center justify-between">
        <h2 class="font-display text-lg text-brand-900">转入地址配置</h2>
        <button class="text-sm text-brand-500" @click="showWithdrawConfig = false">关闭</button>
      </div>
      <div class="mt-3 rounded-2xl border border-brand-100 bg-brand-50 p-3">
        <div class="text-xs font-semibold text-brand-800">模式选择</div>
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
      </div>
      <div class="mt-4">
        <div v-if="transferMode === 'many-to-many'">
          <p class="text-xs text-brand-700">多转多：每行一个转入地址，或 index,address。</p>
          <textarea
            v-model="withdrawImportText"
            class="mt-3 h-48 w-full rounded-xl border border-brand-200 p-3 text-xs"
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
        <button class="rounded-lg border border-brand-200 px-4 py-2 text-sm text-brand-700" @click="showWithdrawConfig = false">
          取消
        </button>
        <button class="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white" @click="applyWithdrawAddresses">
          应用配置
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { ethers, Wallet as EthersWallet } from "ethers";
import type { ExecutionPlan, LogEntry, MarketInfo, PositionRow, Wallet, WalletPair } from "./types";
import { makeMockMarket } from "./data/mock";
import { maskAddress, parseSlug } from "./utils";

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
const showWithdrawConfig = ref(false);
const showExecutionNotice = ref(false);
const showHedgeGuide = ref(false);
const showIntro = ref(false);
const useProxy = ref(true);
const darkMode = ref(false);
const currentPage = ref<"wallets" | "hedge" | "single" | "positions" | "deposit" | "withdraw">("wallets");
const singleDelayMin = ref(1);
const singleDelayMax = ref(5);
const singleAmountMin = ref<number | null>(null);
const singleAmountMax = ref<number | null>(null);
const singleSide = ref<"YES" | "NO">("YES");
const singleLogs = ref<LogEntry[]>([]);
const singleSelections = reactive<Record<string, boolean>>({});

const shouldShowPopup = (key: string) => {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(`hidePopup:${key}`);
  return stored !== new Date().toDateString();
};

const hidePopupForToday = (key: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(`hidePopup:${key}`, new Date().toDateString());
  }
};

if (shouldShowPopup("intro")) {
  showIntro.value = true;
}

onMounted(() => {
  const stored = localStorage.getItem("walletVault");
  const key = localStorage.getItem("walletVaultKey");
  if (stored && key) {
    try {
      const parsed = JSON.parse(stored);
      const keyBytes = new Uint8Array(base64ToBuffer(key));
      decryptVault(keyBytes, parsed).then(hydrateWalletsFromVault).catch(() => {});
    } catch {}
  }
});

const readWalletIpCache = () => {
  if (typeof window === "undefined") return {} as Record<string, { name: string; endpoint: string }>;
  const mapRaw = localStorage.getItem("walletIpMap");
  return mapRaw ? (JSON.parse(mapRaw) as Record<string, { name: string; endpoint: string }>) : {};
};

const applyWalletIpCache = () => {
  const cached = readWalletIpCache();
  wallets.forEach((wallet) => {
    const entry = cached[wallet.address];
    if (entry && !wallet.ipName && !wallet.ipEndpoint) {
      wallet.ipName = entry.name || "";
      wallet.ipEndpoint = entry.endpoint || "";
    }
  });
};

const marketSamples = [];

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
const transferMode = ref<"many-to-many" | "many-to-one">("many-to-many");
const singleTargetAddress = ref("");
const orderBookStatus = ref("");
const showSellOnly = ref(true);
const singleOrderBookStatus = ref("");
const singleShowSellOnly = ref(true);
const showWalletIpModal = ref(false);
const walletIpTarget = ref<Wallet | null>(null);
const walletIpName = ref("");
const walletIpEndpoint = ref("");
const showProxyAddress = ref(true);
const proxyLoading = ref(false);
const balanceLoading = ref(false);
const walletBalanceLoading = ref(false);
const depositBridgeLoading = ref(false);
const walletVolumeLoading = ref(false);
const toasts = ref<Array<{ id: number; message: string; tone: "info" | "error" }>>([]);
const executionOrder = ref<"yes-no" | "no-yes">("yes-no");
const executionDelayMin = ref<number | null>(null);
const executionDelayMax = ref<number | null>(null);
const showPairConfig = ref(false);
const pairConfigTarget = ref<WalletPair | null>(null);
const pairConfigAmount = ref<number | null>(null);
const depositDelaySec = ref(0);
const depositAmountMin = ref<number | null>(null);
const depositAmountMax = ref<number | null>(null);
const withdrawImportText = ref("");
const withdrawMode = ref<"all" | "partial">("all");
const withdrawAmount = ref<number | null>(null);
const exchangeConfig = reactive({
  name: "",
  apiKey: "",
  apiSecret: "",
  ipWhitelist: "",
});
const depositStatus = ref("");
const depositLogs = ref<LogEntry[]>([]);
const withdrawStatus = ref("");
const withdrawLogs = ref<LogEntry[]>([]);
const defaultProxyEndpoints = [
  "http://127.0.0.1:8080",
  "http://127.0.0.1:8081",
  "http://127.0.0.1:8082",
];
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

const walletSearch = ref("");
const walletPage = ref(1);
const walletPageSize = ref(50);

const filteredWallets = computed(() =>
  wallets.filter((w) =>
    `${w.nickname} ${w.address}`.toLowerCase().includes(walletSearch.value.toLowerCase())
  )
);

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

const importLines = computed(() => {
  const lines = importText.value.split(/\r?\n/);
  return lines.length ? lines : [""];
});

if (typeof window !== "undefined") {
  applyWalletIpCache();
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
    if (typeof window === "undefined") return;
    const map = list.reduce<Record<string, { name: string; endpoint: string }>>((acc, wallet) => {
      if (wallet.ipName || wallet.ipEndpoint) {
        acc[wallet.address] = { name: wallet.ipName || "", endpoint: wallet.ipEndpoint || "" };
      }
      return acc;
    }, {});
    localStorage.setItem("walletIpMap", JSON.stringify(map));
    saveVault();
  },
  { deep: true }
);

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

const resetHedgeState = () => {
  market.value = null;
  marketInput.value = "";
  marketTokenIds.value = { yes: null, no: null };
  orderBookStatus.value = "";
  showSellOnly.value = true;
  logs.value = [];
};

const resetSingleState = () => {
  singleMarket.value = null;
  singleMarketInput.value = "";
  singleMarketTokenIds.value = { yes: null, no: null };
  singleOrderBookStatus.value = "";
  singleShowSellOnly.value = true;
  singleLogs.value = [];
};

watch(currentPage, (page, prev) => {
  if (page === prev) return;
  if (page === "hedge") resetHedgeState();
  if (page === "single") resetSingleState();
});

const selectedPairs = computed(() => pairs.filter((p) => p.selected));
const customPairCount = computed(() => pairs.filter((p) => p.amount && p.amount > 0).length);

const pairNameForWallet = (walletId: string) => {
  const match = pairs.find((p) => p.a === walletId || p.b === walletId);
  return match ? match.name : "未配对";
};

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

const singleSumBid = computed(() => {
  if (!singleMarket.value) return 0;
  return (
    Number(singleMarket.value.book.yesBids[0]?.price || 0) +
    Number(singleMarket.value.book.noBids[0]?.price || 0)
  );
});

const singleSumAsk = computed(() => {
  if (!singleMarket.value) return 0;
  return (
    Number(singleMarket.value.book.yesAsks[0]?.price || 0) +
    Number(singleMarket.value.book.noAsks[0]?.price || 0)
  );
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

const formatU = (price: number, size: number) => {
  const value = Number(price) * Number(size);
  if (!Number.isFinite(value)) return "-";
  return value.toFixed(2);
};

const depthWidth = (size: number, rows: Array<{ price: number; size: number }>) => {
  const maxSize = rows.reduce((acc, row) => Math.max(acc, Number(row.size) || 0), 0);
  if (!maxSize) return "0%";
  const ratio = Math.min(1, (Number(size) || 0) / maxSize);
  return `${(ratio * 100).toFixed(2)}%`;
};

const POLYGON_RPCS = ["https://1rpc.io/matic"];
const EXCHANGE_ADDRESS = "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E";
const EXCHANGE_ABI = [
  "function getSafeAddress(address owner) view returns (address)",
  "function getPolyProxyWalletAddress(address owner) view returns (address)",
];
const USDC_E_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const ERC20_ABI = ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"];
let rpcIndex = 0;
const rpcProviders = new Map<string, ethers.providers.JsonRpcProvider>();
const usdcContracts = new Map<string, ethers.Contract>();
let usdcDecimals: number | null = null;

const nextRpc = () => {
  const url = POLYGON_RPCS[rpcIndex % POLYGON_RPCS.length];
  rpcIndex += 1;
  return url;
};

const proxyProvider = new ethers.providers.JsonRpcProvider(POLYGON_RPCS[0], { chainId: 137, name: "polygon" });
const proxyExchange = new ethers.Contract(EXCHANGE_ADDRESS, EXCHANGE_ABI, proxyProvider);

const fetchUsdcEBalance = async (address: string) => {
  const rpcUrl = nextRpc();
  const provider =
    rpcProviders.get(rpcUrl) ||
    new ethers.providers.JsonRpcProvider(rpcUrl, {
      chainId: 137,
      name: "polygon",
    });
  rpcProviders.set(rpcUrl, provider);

  const contract = usdcContracts.get(rpcUrl) || new ethers.Contract(USDC_E_ADDRESS, ERC20_ABI, provider);
  usdcContracts.set(rpcUrl, contract);

  const validated = ethers.utils.getAddress(address);
  const [decimals, rawBalance] = await Promise.all([
    usdcDecimals ?? contract.decimals().catch(() => 6),
    contract.balanceOf(validated),
  ]);
  if (usdcDecimals === null && typeof decimals === "number") usdcDecimals = decimals;

  return Number(ethers.utils.formatUnits(rawBalance, decimals));
};

const pushToast = (message: string, tone: "info" | "error" = "info") => {
  const id = Date.now() + Math.random();
  toasts.value.push({ id, message, tone });
  window.setTimeout(() => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
  }, 2400);
};

const copyText = async (value: string) => {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    pushToast("已复制地址。");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    pushToast(`复制失败：${message}`, "error");
  }
};

const bufferToBase64 = (buffer: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));
const base64ToBuffer = (value: string) =>
  Uint8Array.from(atob(value), (c) => c.charCodeAt(0)).buffer;

const importVaultKey = async (keyBytes: Uint8Array) =>
  crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt", "decrypt"]);

const ensureVaultKey = async () => {
  const stored = localStorage.getItem("walletVaultKey");
  if (stored) return new Uint8Array(base64ToBuffer(stored));
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  localStorage.setItem("walletVaultKey", bufferToBase64(keyBytes.buffer));
  return keyBytes;
};

const encryptVault = async (keyBytes: Uint8Array, payload: unknown) => {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await importVaultKey(keyBytes);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(JSON.stringify(payload))
  );
  return {
    v: 1,
    iv: bufferToBase64(iv.buffer),
    data: bufferToBase64(ciphertext),
  };
};

const decryptVault = async (keyBytes: Uint8Array, vault: { iv: string; data: string }) => {
  const dec = new TextDecoder();
  const iv = new Uint8Array(base64ToBuffer(vault.iv));
  const key = await importVaultKey(keyBytes);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    base64ToBuffer(vault.data)
  );
  return JSON.parse(dec.decode(plaintext));
};

const saveVault = async () => {
  if (typeof window === "undefined") return;
  const payload = wallets.map((wallet) => ({
    privateKey: wallet.privateKey || "",
    ipName: wallet.ipName || "",
    ipEndpoint: wallet.ipEndpoint || "",
    proxyAddress: wallet.proxyAddress || "",
  }));
  const keyBytes = await ensureVaultKey();
  const encrypted = await encryptVault(keyBytes, { wallets: payload });
  localStorage.setItem("walletVault", JSON.stringify(encrypted));
};

const hydrateWalletsFromVault = (vaultData: { wallets?: Array<{ privateKey: string; ipName: string; ipEndpoint: string }> }) => {
  const items = vaultData.wallets || [];
  wallets.splice(0, wallets.length);
  let invalidCount = 0;
  items.forEach((item, idx) => {
    try {
      const address = new EthersWallet(item.privateKey).address;
      wallets.push({
        id: `w-${idx + 1}`,
        nickname: `Wallet ${idx + 1}`,
        address,
        privateKey: item.privateKey,
        balance: null,
        enabled: true,
        ipName: item.ipName || "",
        ipEndpoint: item.ipEndpoint || "",
        proxyAddress: item.proxyAddress || "",
        volume: null,
        pnl: null,
        selected: true,
      });
    } catch {
      invalidCount += 1;
    }
  });
  rebuildPairs();
  rebuildFundRows();
  if (invalidCount > 0) {
    pushLog(`解锁完成，${invalidCount} 条私钥无效已跳过。`);
  }
};


const marketTokenIds = ref<{ yes: string | null; no: string | null }>({ yes: null, no: null });
const singleMarketTokenIds = ref<{ yes: string | null; no: string | null }>({ yes: null, no: null });

const rebuildPairs = () => {
  pairs.splice(0, pairs.length);
  for (let i = 0; i < wallets.length; i += 2) {
    const a = wallets[i];
    const b = wallets[i + 1];
    if (!a || !b) break;
    pairs.push({
      id: `pair-${i / 2}`,
      name: `Pair ${i / 2 + 1}`,
      a: a.id,
      b: b.id,
      direction: "BUY",
      selected: true,
      amount: null,
    });
  }
};

const rebuildFundRows = () => {
  fundRows.value = wallets.map((wallet, idx) => ({
    id: `fund-${idx + 1}`,
    address: wallet.address,
    proxyAddress: wallet.proxyAddress || "",
    depositAddress: "",
    balance: null,
    selected: idx % 2 === 0,
  }));
  withdrawRows.value = wallets.map((wallet, idx) => ({
    id: `wd-${idx + 1}`,
    address: wallet.address,
    proxyAddress: wallet.proxyAddress || "",
    withdrawAddress: `0xwd${wallet.address.slice(2, 6)}...${wallet.address.slice(-4)}`,
    amount: null,
    balance: null,
    selected: idx % 2 === 0,
  }));
};

const nameForWallet = (id: string) => wallets.find((w) => w.id === id)?.nickname || "-";

const buildDefaultIp = (idx: number) => {
  const endpoint = defaultProxyEndpoints[idx % defaultProxyEndpoints.length] || "";
  const name = `proxy-${String((idx % defaultProxyEndpoints.length) + 1).padStart(2, "0")}`;
  return { name, endpoint };
};

const confirmImport = () => {
  const lines = importText.value
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const header = lines[0]?.toLowerCase() || "";
  const hasHeader =
    header.includes("privatekey") || header.includes("ipname") || header.includes("ipendpoint") || header.includes("index");
  const dataLines = hasHeader ? lines.slice(1) : lines;
  let invalidCount = 0;
  const startIndex = wallets.length + 1;
  dataLines.forEach((line, idx) => {
    const parts = line.split(",").map((part) => part.trim());
    const hasIndex = /^\d+$/.test(parts[0] || "");
    const index = hasIndex ? Number(parts[0]) : startIndex + idx;
    const key = hasIndex ? parts[1] || "" : parts[0] || "";
    const ipNameRaw = hasIndex ? parts[2] || "" : parts[1] || "";
    const ipEndpointRaw = hasIndex ? parts.slice(3).join(",") : parts.slice(2).join(",");
    const defaults = !ipNameRaw && !ipEndpointRaw ? buildDefaultIp(idx) : null;
    let address = "";
    try {
      address = new EthersWallet(key).address;
    } catch {
      invalidCount += 1;
      return;
    }
    wallets.push({
      id: `w-${index}`,
      nickname: `Wallet ${index}`,
        address,
        privateKey: key,
        balance: null,
        enabled: true,
        ipName: defaults ? defaults.name : ipNameRaw,
        ipEndpoint: defaults ? defaults.endpoint : ipEndpointRaw,
        proxyAddress: "",
        volume: null,
        pnl: null,
        selected: true,
      });
  });
  rebuildPairs();
  rebuildFundRows();
  showImport.value = false;
  applyWalletIpCache();
  saveVault();
  if (invalidCount > 0) {
    pushLog(`导入完成，${invalidCount} 条私钥无效已跳过。`);
  }
};

const handleCsvImport = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  const text = await file.text();
  const rows = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (rows.length === 0) return;
  importText.value = rows.join("\n");
  target.value = "";
};

const clearWallets = () => {
  wallets.splice(0, wallets.length);
  pairs.splice(0, pairs.length);
  fundRows.value = [];
};


const toggleWalletsHeader = () => {
  const nextValue = !walletsHeaderChecked.value;
  visibleWallets.value.forEach((wallet) => {
    wallet.selected = nextValue;
  });
};

const toggleSingleHeader = () => {
  const nextValue = !singleHeaderChecked.value;
  wallets.forEach((wallet) => {
    singleSelections[wallet.id] = nextValue;
  });
};

const openPairConfig = (pair: WalletPair) => {
  pairConfigTarget.value = pair;
  pairConfigAmount.value = pair.amount;
  showPairConfig.value = true;
};

const savePairConfig = () => {
  if (!pairConfigTarget.value) return;
  pairConfigTarget.value.amount = pairConfigAmount.value && pairConfigAmount.value > 0 ? pairConfigAmount.value : null;
  showPairConfig.value = false;
};

const loadProxyAddress = async (wallet: Wallet) => {
  try {
    const data = await fetchProxyAddress(wallet.address);
    if (data?.proxyWallet) {
      wallet.proxyAddress = data.proxyWallet;
      rebuildFundRows();
      pushLog(`已获取代理地址：${maskAddress(wallet.proxyAddress)}`);
    } else {
      pushLog("未返回代理地址，尝试链上获取...");
      pushToast("未返回代理地址，正在链上获取。");
      const onchain = await fetchProxyAddressOnChain(wallet.address);
      wallet.proxyAddress = onchain;
      rebuildFundRows();
      pushLog(`已获取代理地址：${maskAddress(wallet.proxyAddress)}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    pushLog(`代理地址接口失败：${message}，尝试链上获取...`);
    try {
      const onchain = await fetchProxyAddressOnChain(wallet.address);
      wallet.proxyAddress = onchain;
      rebuildFundRows();
      pushLog(`已获取代理地址：${maskAddress(wallet.proxyAddress)}`);
    } catch (inner) {
      const innerMessage = inner instanceof Error ? inner.message : String(inner);
      pushLog(`链上获取失败：${innerMessage}`);
      wallet.proxyAddress = "无法获取";
    }
  }
};

const loadSelectedProxyAddresses = async () => {
  const targets = wallets.filter(
    (wallet) =>
      wallet.selected && (!wallet.proxyAddress || wallet.proxyAddress === "无法获取" || wallet.proxyAddress === "未初始化")
  );
  if (targets.length === 0) {
    pushLog("无可查询的钱包（已获取或未选择）。");
    pushToast("无可查询的钱包（已获取或未选择）。", "error");
    return;
  }
  proxyLoading.value = true;
  pushLog(`开始获取代理地址：${targets.length} 个钱包`);
  pushToast(`开始获取代理地址：${targets.length} 个钱包`);
  for (const wallet of targets) {
    await loadProxyAddress(wallet);
  }
  proxyLoading.value = false;
  pushLog("代理地址获取完成。");
  pushToast("代理地址获取完成。");
};

const openWalletIp = (wallet: Wallet) => {
  walletIpTarget.value = wallet;
  walletIpName.value = wallet.ipName || "";
  walletIpEndpoint.value = wallet.ipEndpoint || "";
  showWalletIpModal.value = true;
};

const saveWalletIp = () => {
  if (!walletIpTarget.value) return;
  walletIpTarget.value.ipName = walletIpName.value.trim();
  walletIpTarget.value.ipEndpoint = walletIpEndpoint.value.trim();
  showWalletIpModal.value = false;
};

const openHedgeDesk = () => {
  currentPage.value = "hedge";
  if (shouldShowPopup("hedgeGuide")) showHedgeGuide.value = true;
};

const openFlow = () => {
  showFlow.value = true;
};

const openImport = () => {
  importText.value = "";
  showImport.value = true;
};

const openPairs = () => {
  showPairs.value = true;
};

const openWithdrawConfig = () => {
  showWithdrawConfig.value = true;
};

const refreshBalances = async () => {
  const targets = wallets.filter((wallet) => wallet.selected);
  if (targets.length === 0) {
    pushLog("未选择钱包，无法查询余额。");
    pushToast("未选择钱包，无法查询余额。", "error");
    return;
  }

  const valid = targets.filter(
    (wallet) =>
      wallet.proxyAddress && wallet.proxyAddress !== "无法获取" && wallet.proxyAddress !== "未初始化"
  );
  const skipped = targets.length - valid.length;
  if (valid.length === 0) {
    pushLog("存在未获取代理地址的行，请先加载代理地址。");
    pushToast("存在未获取代理地址的行，请先加载代理地址。", "error");
    return;
  }

  walletBalanceLoading.value = true;
  pushLog(`开始查询 ${valid.length} 个代理地址余额...`);
  pushToast(`开始查询 ${valid.length} 个代理地址余额...`);

  let failed = 0;
  for (const wallet of valid) {
    try {
      wallet.balance = await fetchUsdcEBalance(wallet.proxyAddress);
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      pushLog(`余额查询失败（${maskAddress(wallet.proxyAddress)}）：${message}`);
    }
  }

  if (skipped > 0) {
    pushLog(`已跳过 ${skipped} 个未初始化或无法获取代理地址的钱包。`);
  }

  walletBalanceLoading.value = false;
  if (failed > 0) {
    pushToast(`余额查询完成，失败 ${failed} 个`, "error");
  } else {
    pushToast("余额查询完成。");
  }
};

const refreshWalletMetrics = async () => {
  const targets = wallets.filter((wallet) => wallet.selected);
  if (targets.length === 0) {
    pushLog("未选择钱包，无法查询交易量。");
    pushToast("未选择钱包，无法查询交易量。", "error");
    return;
  }
  const valid = targets.filter(
    (wallet) =>
      wallet.proxyAddress && wallet.proxyAddress !== "无法获取" && wallet.proxyAddress !== "未初始化"
  );
  const skipped = targets.length - valid.length;
  if (valid.length === 0) {
    pushLog("存在未获取代理地址的行，请先加载代理地址。");
    pushToast("存在未获取代理地址的行，请先加载代理地址。", "error");
    return;
  }
  walletVolumeLoading.value = true;
  pushLog(`开始查询 ${valid.length} 个代理地址交易量...`);
  let failed = 0;
  for (const wallet of valid) {
    try {
      const data = await fetchWalletLeaderboard(wallet.proxyAddress);
      wallet.volume = data?.vol ?? 0;
      wallet.pnl = data?.pnl ?? 0;
    } catch (error) {
      failed += 1;
      wallet.volume = 0;
      wallet.pnl = 0;
      const message = error instanceof Error ? error.message : String(error);
      pushLog(`交易量查询失败（${maskAddress(wallet.proxyAddress)}）：${message}`);
    }
  }
  if (skipped > 0) {
    pushLog(`已跳过 ${skipped} 个未初始化或无法获取代理地址的钱包。`);
  }
  walletVolumeLoading.value = false;
  if (failed > 0) {
    pushToast(`交易量查询完成，失败 ${failed} 个`, "error");
  } else {
    pushToast("交易量查询完成。");
  }
};

const refreshFundBalances = () => {
  const targets = fundRows.value.filter((row) => row.selected);
  if (targets.length === 0) {
    depositStatus.value = "未选择 Fund 地址，无法查询余额。";
    depositLogs.value.push({ ts: new Date().toLocaleTimeString(), message: depositStatus.value });
    return;
  }
  const valid = targets.filter(
    (row) => row.proxyAddress && row.proxyAddress !== "无法获取" && row.proxyAddress !== "未初始化"
  );
  const skipped = targets.length - valid.length;
  if (valid.length === 0) {
    depositStatus.value = "存在未获取代理地址的行，请先加载代理地址。";
    depositLogs.value.push({ ts: new Date().toLocaleTimeString(), message: depositStatus.value });
    return;
  }
  balanceLoading.value = true;
  depositStatus.value = `开始查询 ${valid.length} 个代理地址余额...`;
  depositLogs.value.push({ ts: new Date().toLocaleTimeString(), message: depositStatus.value });
  Promise.all(
    valid.map(async (row) => {
      row.balance = await fetchUsdcEBalance(row.proxyAddress);
    })
  )
    .then(() => {
      depositStatus.value = `已更新 ${valid.length} 个代理地址余额`;
      depositLogs.value.push({ ts: new Date().toLocaleTimeString(), message: depositStatus.value });
      if (skipped > 0) {
        depositLogs.value.push({
          ts: new Date().toLocaleTimeString(),
          message: `已跳过 ${skipped} 个未初始化或无法获取代理地址的钱包。`,
        });
      }
    })
    .catch((error) => {
      depositStatus.value = `查询失败：${error instanceof Error ? error.message : String(error)}`;
      depositLogs.value.push({ ts: new Date().toLocaleTimeString(), message: depositStatus.value });
    })
    .finally(() => {
      balanceLoading.value = false;
    });
};

const loadDepositBridgeAddresses = () => {
  const targets = fundRows.value.filter((row) => row.selected);
  if (targets.length === 0) {
    depositLogs.value.push({ ts: new Date().toLocaleTimeString(), message: "未选择钱包，无法获取充值桥接地址。" });
    pushToast("未选择钱包，无法获取充值桥接地址。", "error");
    return;
  }
  const valid = targets.filter(
    (row) => row.proxyAddress && row.proxyAddress !== "无法获取" && row.proxyAddress !== "未初始化"
  );
  const skipped = targets.length - valid.length;
  if (valid.length === 0) {
    depositLogs.value.push({ ts: new Date().toLocaleTimeString(), message: "存在未获取代理地址的行，请先加载代理地址。" });
    pushToast("存在未获取代理地址的行，请先加载代理地址。", "error");
    return;
  }
  depositBridgeLoading.value = true;
  depositLogs.value.push({ ts: new Date().toLocaleTimeString(), message: `开始获取 ${valid.length} 个充值桥接地址...` });
  let failed = 0;
  const run = async () => {
    for (const row of valid) {
      try {
        row.depositAddress = await fetchDepositBridgeAddress(row.proxyAddress);
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        depositLogs.value.push({
          ts: new Date().toLocaleTimeString(),
          message: `桥接地址获取失败（${maskAddress(row.proxyAddress)}）：${message}`,
        });
      }
    }
    if (skipped > 0) {
      depositLogs.value.push({
        ts: new Date().toLocaleTimeString(),
        message: `已跳过 ${skipped} 个未初始化或无法获取代理地址的钱包。`,
      });
    }
    depositBridgeLoading.value = false;
    if (failed > 0) {
      depositLogs.value.push({ ts: new Date().toLocaleTimeString(), message: `完成，失败 ${failed} 个。` });
      pushToast(`充值桥接地址完成，失败 ${failed} 个`, "error");
    } else {
      depositLogs.value.push({ ts: new Date().toLocaleTimeString(), message: "充值桥接地址已更新。" });
      pushToast("充值桥接地址已更新。");
    }
  };
  run();
};

const toggleFundHeader = () => {
  const nextValue = !fundHeaderChecked.value;
  fundRows.value.forEach((row) => {
    row.selected = nextValue;
  });
};

const refreshWithdrawBalances = () => {
  const targets = withdrawRows.value.filter((row) => row.selected);
  if (targets.length === 0) {
    withdrawStatus.value = "未选择提现地址，无法查询余额。";
    withdrawLogs.value.push({ ts: new Date().toLocaleTimeString(), message: withdrawStatus.value });
    return;
  }
  const valid = targets.filter(
    (row) => row.proxyAddress && row.proxyAddress !== "无法获取" && row.proxyAddress !== "未初始化"
  );
  const skipped = targets.length - valid.length;
  if (valid.length === 0) {
    withdrawStatus.value = "存在未获取代理地址的行，请先加载代理地址。";
    withdrawLogs.value.push({ ts: new Date().toLocaleTimeString(), message: withdrawStatus.value });
    return;
  }
  balanceLoading.value = true;
  withdrawStatus.value = `开始查询 ${valid.length} 个代理地址余额...`;
  withdrawLogs.value.push({ ts: new Date().toLocaleTimeString(), message: withdrawStatus.value });
  Promise.all(
    valid.map(async (row) => {
      row.balance = await fetchUsdcEBalance(row.proxyAddress);
    })
  )
    .then(() => {
      withdrawStatus.value = `已更新 ${valid.length} 个代理地址余额`;
      withdrawLogs.value.push({ ts: new Date().toLocaleTimeString(), message: withdrawStatus.value });
      if (skipped > 0) {
        withdrawLogs.value.push({
          ts: new Date().toLocaleTimeString(),
          message: `已跳过 ${skipped} 个未初始化或无法获取代理地址的钱包。`,
        });
      }
    })
    .catch((error) => {
      withdrawStatus.value = `查询失败：${error instanceof Error ? error.message : String(error)}`;
      withdrawLogs.value.push({ ts: new Date().toLocaleTimeString(), message: withdrawStatus.value });
    })
    .finally(() => {
      balanceLoading.value = false;
    });
};

const toggleWithdrawHeader = () => {
  const nextValue = !withdrawHeaderChecked.value;
  withdrawRows.value.forEach((row) => {
    row.selected = nextValue;
  });
};

const pickDepositAmount = (min: number, max: number) => {
  if (max < min) return min;
  return Number((min + Math.random() * (max - min)).toFixed(2));
};

const confirmDeposit = () => {
  const targets = fundRows.value.filter((row) => row.selected);
  if (targets.length === 0) {
    depositStatus.value = "未选择 Fund 地址，无法开始。";
    depositLogs.value.push({ ts: new Date().toLocaleTimeString(), message: "未选择 Fund 地址，无法开始。" });
    return;
  }
  if (!depositAmountMin.value || !depositAmountMax.value || depositAmountMin.value <= 0 || depositAmountMax.value <= 0) {
    depositStatus.value = "请填写有效的充值金额区间。";
    depositLogs.value.push({ ts: new Date().toLocaleTimeString(), message: depositStatus.value });
    return;
  }
  if (depositAmountMax.value < depositAmountMin.value) {
    depositStatus.value = "充值金额区间上限不能小于下限。";
    depositLogs.value.push({ ts: new Date().toLocaleTimeString(), message: depositStatus.value });
    return;
  }
  depositStatus.value = `开始执行交易所提现：${targets.length} 个地址，延迟 ${depositDelaySec.value}s，金额区间 ${depositAmountMin.value}-${depositAmountMax.value}`;
  depositLogs.value.push({
    ts: new Date().toLocaleTimeString(),
    message: `开始执行：${targets.length} 个地址，延迟 ${depositDelaySec.value}s，金额区间 ${depositAmountMin.value}-${depositAmountMax.value}`,
  });
  targets.forEach((row, idx) => {
    const amount = pickDepositAmount(depositAmountMin.value as number, depositAmountMax.value as number);
    depositLogs.value.push({
      ts: new Date().toLocaleTimeString(),
      message: `#${idx + 1} ${maskAddress(row.address)} -> ${maskAddress(row.proxyAddress)} 金额 ${amount} 已提交`,
    });
  });
};

const clearDepositLogs = () => {
  depositLogs.value = [];
};

const clearWithdrawLogs = () => {
  withdrawLogs.value = [];
};

const bulkWithdraw = () => {
  const targets = withdrawRows.value.filter((row) => row.selected);
  if (targets.length === 0) {
    withdrawStatus.value = "未选择提现地址，无法批量提现。";
    withdrawLogs.value.push({ ts: new Date().toLocaleTimeString(), message: withdrawStatus.value });
    return;
  }
  if (transferMode.value === "many-to-one" && !singleTargetAddress.value.trim()) {
    withdrawStatus.value = "多转一模式需要填写目标地址。";
    withdrawLogs.value.push({ ts: new Date().toLocaleTimeString(), message: withdrawStatus.value });
    return;
  }
  if (withdrawMode.value === "partial") {
    const invalid = targets.find((row) => !row.amount || row.amount <= 0);
    if (invalid) {
      withdrawStatus.value = "部分提现需要为每个选中地址填写金额。";
      withdrawLogs.value.push({ ts: new Date().toLocaleTimeString(), message: withdrawStatus.value });
      return;
    }
  }
  withdrawStatus.value = `批量转出已提交：${targets.length} 个代理地址，${withdrawMode.value === "partial" ? "部分金额" : "清空"}，${transferMode.value === "many-to-one" ? "多转一" : "多转多"}`;
  withdrawLogs.value.push({ ts: new Date().toLocaleTimeString(), message: withdrawStatus.value });
  targets.forEach((row, idx) => {
    withdrawLogs.value.push({
      ts: new Date().toLocaleTimeString(),
      message: `#${idx + 1} ${maskAddress(row.proxyAddress)} -> ${maskAddress(transferMode.value === "many-to-one" ? singleTargetAddress.value : row.withdrawAddress)} ${withdrawMode.value === "partial" ? `金额 ${row.amount}` : "清空"} 已提交`,
    });
  });
};

const applyWithdrawAmount = () => {
  if (withdrawMode.value !== "partial") return;
  if (!withdrawAmount.value || withdrawAmount.value <= 0) {
    withdrawStatus.value = "请填写批量金额后再应用。";
    withdrawLogs.value.push({ ts: new Date().toLocaleTimeString(), message: withdrawStatus.value });
    return;
  }
  withdrawRows.value.forEach((row) => {
    if (row.selected) row.amount = withdrawAmount.value;
  });
  withdrawStatus.value = "已应用批量金额到选中地址。";
  withdrawLogs.value.push({ ts: new Date().toLocaleTimeString(), message: withdrawStatus.value });
};

const applyWithdrawAddresses = () => {
  const lines = withdrawImportText.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (transferMode.value === "many-to-many") {
    if (lines.length === 0) {
      withdrawStatus.value = "未检测到可导入的地址。";
      withdrawLogs.value.push({ ts: new Date().toLocaleTimeString(), message: withdrawStatus.value });
      return;
    }
    const addresses = lines.map((line) => {
      const parts = line.split(",");
      return (parts.length === 1 ? parts[0] : parts[1]).trim();
    });
    withdrawRows.value.forEach((row, idx) => {
      row.withdrawAddress = addresses[idx] || row.withdrawAddress;
    });
    withdrawStatus.value = `已导入 ${Math.min(addresses.length, withdrawRows.value.length)} 个提现地址`;
    withdrawLogs.value.push({ ts: new Date().toLocaleTimeString(), message: withdrawStatus.value });
  } else {
    if (!singleTargetAddress.value.trim()) {
      withdrawStatus.value = "多转一模式需要填写目标地址。";
      withdrawLogs.value.push({ ts: new Date().toLocaleTimeString(), message: withdrawStatus.value });
      return;
    }
    withdrawStatus.value = "多转一目标地址已保存。";
    withdrawLogs.value.push({ ts: new Date().toLocaleTimeString(), message: withdrawStatus.value });
  }
  showWithdrawConfig.value = false;
};

const selectAllPairs = (value: boolean) => {
  pairs.forEach((pair) => {
    pair.selected = value;
  });
};

const exportKeys = () => {
  if (wallets.length === 0) {
    pushLog("无可导出的钱包。");
    return;
  }
  const rows = wallets.map((wallet) => wallet.privateKey || "").filter(Boolean);
  const content = ["privateKey", ...rows].join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "polymarket-wallets.csv";
  link.click();
  URL.revokeObjectURL(url);
  pushLog("已导出私钥 CSV。");
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const parseTokenIds = (raw: any) => {
  if (Array.isArray(raw?.clobTokenIds)) {
    return { yes: raw.clobTokenIds[0] || null, no: raw.clobTokenIds[1] || null };
  }
  if (typeof raw?.clobTokenIds === "string") {
    try {
      const parsed = JSON.parse(raw.clobTokenIds);
      if (Array.isArray(parsed)) {
        return { yes: parsed[0] || null, no: parsed[1] || null };
      }
    } catch {
      return { yes: null, no: null };
    }
  }
  return { yes: null, no: null };
};

const normalizePrice = (value: number | null | undefined, fallback: number) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0 || num >= 1) return fallback;
  return num;
};

const mapMarket = (raw: any, slug: string): MarketInfo => {
  const title = raw?.question || raw?.title || slug;
  const outcomes = (() => {
    if (Array.isArray(raw?.outcomes)) return raw.outcomes;
    if (typeof raw?.outcomes === "string") {
      try {
        const parsed = JSON.parse(raw.outcomes);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return ["YES", "NO"];
      }
    }
    return ["YES", "NO"];
  })();
  const outcomePrices = (() => {
    if (Array.isArray(raw?.outcomePrices)) return raw.outcomePrices;
    if (typeof raw?.outcomePrices === "string") {
      try {
        const parsed = JSON.parse(raw.outcomePrices);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return null;
      }
    }
    return null;
  })();
  const rawYes = normalizePrice(outcomePrices?.[0] ?? raw?.bestBid ?? raw?.lastTradePrice, 0.5);
  const rawNo = normalizePrice(outcomePrices?.[1] ?? 1 - rawYes, 0.5);
  const yesBid = clamp(rawYes, 0.01, 0.99);
  const noBid = clamp(rawNo, 0.01, 0.99);
  const yesAsk = clamp(normalizePrice(raw?.bestAsk ?? yesBid, yesBid), yesBid, 0.99);
  const noAsk = clamp(normalizePrice(rawNo, noBid), noBid, 0.99);
  const resolved = Boolean(raw?.resolved || raw?.closed || raw?.status === "resolved");
  return {
    slug: raw?.slug || slug,
    title,
    status: resolved ? "RESOLVED" : "OPEN",
    yesPrice: Number(yesBid.toFixed(3)),
    noPrice: Number(noBid.toFixed(3)),
    updatedAt: raw?.updatedAt || raw?.updated_at || new Date().toLocaleString(),
    outcomes: outcomes.length === 2 ? outcomes : ["YES", "NO"],
    book: {
      yesBids: [],
      yesAsks: [],
      noBids: [],
      noAsks: [],
    },
  };
};

const fetchMarketBySlug = async (slug: string) => {
  const response = await fetch(`/api/market?slug=${encodeURIComponent(slug)}`);
  if (!response.ok) throw new Error("API 请求失败");
  const data = await response.json();
  const raw = Array.isArray(data) ? data[0] : data;
  if (!raw) throw new Error("未找到市场数据");
  return { market: mapMarket(raw, slug), tokenIds: parseTokenIds(raw) };
};

const fetchOrderBook = async (tokenId: string) => {
  const response = await fetch(`/api/book?token_id=${encodeURIComponent(tokenId)}`);
  if (!response.ok) throw new Error("订单簿请求失败");
  const data = await response.json();
  return {
    bids: Array.isArray(data?.bids) ? data.bids : [],
    asks: Array.isArray(data?.asks) ? data.asks : [],
  };
};

const fetchProxyAddress = async (address: string) => {
  const response = await fetch(`/api/profile?address=${encodeURIComponent(address)}`);
  if (!response.ok) throw new Error("代理地址请求失败");
  return response.json();
};

const fetchWalletLeaderboard = async (address: string) => {
  const params = new URLSearchParams({
    category: "OVERALL",
    timePeriod: "ALL",
    orderBy: "PNL",
    limit: "25",
    user: address,
  });
  const response = await fetch(`/api/leaderboard?${params.toString()}`);
  if (!response.ok) throw new Error("交易量请求失败");
  const data = await response.json();
  return Array.isArray(data) && data.length ? data[0] : null;
};

const fetchProxyAddressOnChain = async (address: string) => {
  const owner = ethers.utils.getAddress(address);
  return proxyExchange.getSafeAddress(owner);
};

const fetchDepositBridgeAddress = async (address: string) => {
  const response = await fetch("/api/bridge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });
  if (!response.ok) throw new Error("充值桥接地址请求失败");
  const data = await response.json();
  const evm = data?.address?.evm;
  if (!evm) throw new Error("充值桥接地址返回为空");
  return evm as string;
};

const fetchPositions = async (address: string) => {
  const params = new URLSearchParams({
    sizeThreshold: "1",
    limit: "100",
    sortBy: "TOKENS",
    sortDirection: "DESC",
    user: address,
  });
  const response = await fetch(`/api/positions?${params.toString()}`);
  if (!response.ok) throw new Error("仓位请求失败");
  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

const applyOrderBooks = async (tokenIds: { yes: string | null; no: string | null }) => {
  if (!market.value) return;
  if (!tokenIds.yes || !tokenIds.no) {
    orderBookStatus.value = "订单簿 token_id 缺失，无法加载深度。";
    return;
  }
  try {
    const [yesBook, noBook] = await Promise.all([fetchOrderBook(tokenIds.yes), fetchOrderBook(tokenIds.no)]);
    const topThree = (list: Array<{ price: string; size: string }> | undefined) =>
      list && list.length
        ? list.slice(-3).reverse().map((item) => ({ price: Number(item.price), size: Number(item.size) }))
        : [];
    market.value = {
      ...market.value,
      updatedAt: new Date().toLocaleString(),
      book: {
        yesBids: topThree(yesBook.bids),
        yesAsks: topThree(yesBook.asks),
        noBids: topThree(noBook.bids),
        noAsks: topThree(noBook.asks),
      },
    };
    orderBookStatus.value = "";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    orderBookStatus.value = `订单簿加载失败：${message}`;
    pushLog(orderBookStatus.value);
    console.error("Order book fetch failed:", error);
  }
};

const applySingleOrderBooks = async (tokenIds: { yes: string | null; no: string | null }) => {
  if (!singleMarket.value) return;
  if (!tokenIds.yes || !tokenIds.no) {
    singleOrderBookStatus.value = "订单簿 token_id 缺失，无法加载深度。";
    return;
  }
  try {
    const [yesBook, noBook] = await Promise.all([fetchOrderBook(tokenIds.yes), fetchOrderBook(tokenIds.no)]);
    const topThree = (list: Array<{ price: string; size: string }> | undefined) =>
      list && list.length
        ? list.slice(-3).reverse().map((item) => ({ price: Number(item.price), size: Number(item.size) }))
        : [];
    singleMarket.value = {
      ...singleMarket.value,
      updatedAt: new Date().toLocaleString(),
      book: {
        yesBids: topThree(yesBook.bids),
        yesAsks: topThree(yesBook.asks),
        noBids: topThree(noBook.bids),
        noAsks: topThree(noBook.asks),
      },
    };
    singleOrderBookStatus.value = "";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    singleOrderBookStatus.value = `订单簿加载失败：${message}`;
    pushSingleLog(singleOrderBookStatus.value);
    console.error("Order book fetch failed:", error);
  }
};

const loadMarket = async () => {
  const slug = parseSlug(marketInput.value);
  if (!slug) {
    pushLog("请输入有效的市场 slug 或链接。");
    return;
  }
  try {
    const result = await fetchMarketBySlug(slug);
    market.value = result.market;
    marketTokenIds.value = result.tokenIds;
    marketInput.value = slug;
    orderBookStatus.value = "";
    await applyOrderBooks(result.tokenIds);
  } catch (error) {
    pushLog("市场加载失败，请检查 slug 或稍后重试。");
  }
};

const loadSingleMarket = async () => {
  const slug = parseSlug(singleMarketInput.value);
  if (!slug) {
    pushSingleLog("请输入有效的市场 slug 或链接。");
    return;
  }
  try {
    const result = await fetchMarketBySlug(slug);
    singleMarket.value = result.market;
    singleMarketTokenIds.value = result.tokenIds;
    singleMarketInput.value = slug;
    singleOrderBookStatus.value = "";
    await applySingleOrderBooks(result.tokenIds);
  } catch (error) {
    pushSingleLog("市场加载失败，请检查 slug 或稍后重试。");
  }
};

const refreshMarket = async () => {
  if (!marketInput.value) return;
  const slug = parseSlug(marketInput.value);
  if (!slug) return;
  try {
    const result = await fetchMarketBySlug(slug);
    market.value = result.market;
    marketTokenIds.value = result.tokenIds;
    orderBookStatus.value = "";
    await applyOrderBooks(result.tokenIds);
  } catch {
    pushLog("刷新失败，请稍后重试。");
  }
};

const refreshSingleMarket = async () => {
  if (!singleMarketInput.value) return;
  const slug = parseSlug(singleMarketInput.value);
  if (!slug) return;
  try {
    const result = await fetchMarketBySlug(slug);
    singleMarket.value = result.market;
    singleMarketTokenIds.value = result.tokenIds;
    singleOrderBookStatus.value = "";
    await applySingleOrderBooks(result.tokenIds);
  } catch {
    pushSingleLog("刷新失败，请稍后重试。");
  }
};

const pushLog = (message: string) => {
  logs.value.push({ ts: new Date().toLocaleTimeString(), message });
  if (logs.value.length > 60) logs.value.shift();
};

const pushSingleLog = (message: string) => {
  singleLogs.value.push({ ts: new Date().toLocaleTimeString(), message });
  if (singleLogs.value.length > 60) singleLogs.value.shift();
};

const executeSingle = () => {
  const selected = wallets.filter((wallet) => singleSelections[wallet.id]);
  if (!singleMarket.value) {
    pushSingleLog("未加载市场，无法执行。");
    return;
  }
  if (selected.length === 0) {
    pushSingleLog("未选择钱包，执行终止。");
    return;
  }
  const delayMin = Number(singleDelayMin.value || 0);
  const delayMax = Number(singleDelayMax.value || 0);
  if (delayMax < delayMin) {
    pushSingleLog("随机间隔上限不能小于下限。");
    return;
  }
  if (!singleAmountMin.value || !singleAmountMax.value || singleAmountMin.value <= 0 || singleAmountMax.value <= 0) {
    pushSingleLog("请填写有效的随机金额区间。");
    return;
  }
  if (singleAmountMax.value < singleAmountMin.value) {
    pushSingleLog("随机金额上限不能小于下限。");
    return;
  }
  pushSingleLog(`开始执行 ${selected.length} 个钱包，方向 ${singleSide.value}，随机间隔 ${delayMin}-${delayMax}s。`);
  selected.forEach((wallet, idx) => {
    const delay =
      delayMax > delayMin
        ? Number((delayMin + Math.random() * (delayMax - delayMin)).toFixed(2))
        : delayMin;
    const amount =
      singleAmountMax.value > singleAmountMin.value
        ? Number((singleAmountMin.value + Math.random() * (singleAmountMax.value - singleAmountMin.value)).toFixed(2))
        : singleAmountMin.value;
    pushSingleLog(`#${idx + 1} ${maskAddress(wallet.address)} 买 ${singleSide.value} 金额 ${amount} 间隔 ${delay}s 已提交`);
  });
  pushSingleLog("执行完成。");
};

const clearSingleLogs = () => {
  singleLogs.value = [];
};

const execute = () => {
  execution.pairCount = selectedPairs.value.length;
  execution.estimatedTrades = selectedPairs.value.length * 2;
  if (!market.value) {
    pushLog("未加载市场，无法执行。");
    return;
  }
  if (selectedPairs.value.length === 0) {
    pushLog("未选择钱包对，执行终止。");
    return;
  }
  const delayMin = executionDelayMin.value ?? 0;
  const delayMax = executionDelayMax.value ?? 0;
  if (delayMax < delayMin) {
    pushLog("随机间隔上限不能小于下限。");
    return;
  }
  const orderLabel = executionOrder.value === "yes-no" ? "先 YES 后 NO" : "先 NO 后 YES";
  pushLog(
    `开始执行 ${selectedPairs.value.length} 个钱包对，数量 ${execution.size}，${orderLabel}，随机间隔 ${delayMin}-${delayMax}s`
  );
  selectedPairs.value.forEach((pair, idx) => {
    const size = pair.amount && pair.amount > 0 ? pair.amount : execution.size;
    const delay =
      delayMax > delayMin
        ? Number((delayMin + Math.random() * (delayMax - delayMin)).toFixed(2))
        : delayMin;
    pushLog(
      `${pair.name}：${nameForWallet(pair.a)} / ${nameForWallet(pair.b)} 数量 ${size}，间隔 ${delay}s，${orderLabel} 已提交`
    );
  });
  pushLog("执行完成。");
};

const clearLogs = () => {
  logs.value = [];
};

const loadPositions = async () => {
  if (positionsLoading.value) return;
  const targets = wallets.filter(
    (wallet) =>
      wallet.selected && wallet.proxyAddress && wallet.proxyAddress !== "无法获取" && wallet.proxyAddress !== "未初始化"
  );
  if (targets.length === 0) {
    pushToast("未选择可查询的钱包代理地址。", "error");
    return;
  }
  positionsLoading.value = true;
  try {
    const results = await Promise.all(
      targets.map(async (wallet) => {
        const list = await fetchPositions(wallet.proxyAddress);
        return list.map((item: any) => {
          const title = item?.title || item?.slug || "未知市场";
          const outcome = item?.outcome ? ` · ${item.outcome}` : "";
          const endDate = item?.endDate ? String(item.endDate).slice(0, 10) : "";
          const redeemable = Boolean(item?.redeemable);
          const size = Number(item?.size || 0);
          const curPrice = Number(item?.curPrice || 0);
          const currentValue = Number.isFinite(size) && Number.isFinite(curPrice) ? size * curPrice : 0;
          if (currentValue === 0 && endDate) {
            const endTs = Date.parse(`${endDate}T00:00:00Z`);
            if (!Number.isNaN(endTs) && endTs < Date.now()) return null;
          }
          return {
            id: `${item?.asset || item?.conditionId || title}-${wallet.proxyAddress}`,
            address: item?.proxyWallet || wallet.proxyAddress,
            market: `${title}${outcome}`,
            size,
            status: redeemable ? "可 Redeem" : "持仓中",
            endDate,
            redeemable,
            value: currentValue,
          } as PositionRow;
        });
      })
    );
    positions.value = results.flat().filter((item): item is PositionRow => Boolean(item));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    pushToast(`仓位查询失败：${message}`, "error");
    positions.value = [];
  } finally {
    positionsLoading.value = false;
  }
};

const clearPositions = () => {
  positions.value = [];
};

const redeemAll = () => {};

rebuildPairs();
</script>
