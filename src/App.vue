<template>
  <div class="min-h-screen">
    <div class="min-h-screen bg-brand-50 text-brand-900 dark:bg-slate-950 dark:text-slate-100">
      <header class="border-b border-brand-100 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div class="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between md:px-10">
          <div>
            <p class="text-xs uppercase tracking-[0.28em] text-brand-500 dark:text-slate-400">Polymarket Portal</p>
            <h1 class="font-display text-2xl md:text-3xl">多账户对刷交互门户</h1>
            <p class="text-sm text-brand-600 dark:text-slate-300">钱包对为最小单位，操作完全由用户手动确认。</p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <button
              class="rounded-full bg-brand-600 px-4 py-2 text-sm text-white shadow-soft hover:bg-brand-700"
              @click="showFlow = true"
            >
              操作说明
            </button>
          </div>
        </div>
      </header>

      <main class="mx-auto w-full max-w-[1280px] px-3 pb-8 pt-3 md:px-4">
        <div class="grid gap-3 lg:grid-cols-[180px_1fr]">
          <aside class="h-fit rounded-2xl border border-brand-100 bg-white p-2 shadow-card dark:border-slate-800 dark:bg-slate-900">
            <div class="text-xs text-brand-600 dark:text-slate-200">模块导航</div>
            <div class="mt-3 space-y-2">
              <button
                class="w-full rounded-xl border px-3 py-2 text-left text-sm dark:border-slate-700 dark:text-slate-200"
                :class="currentPage === 'wallets' ? 'border-brand-300 bg-brand-50 text-brand-800 dark:border-slate-500 dark:bg-slate-800 dark:text-white' : 'border-brand-100'"
                @click="currentPage = 'wallets'"
              >
                钱包管理
              </button>
              <button
                class="w-full rounded-xl border px-3 py-2 text-left text-sm dark:border-slate-700 dark:text-slate-200"
                :class="currentPage === 'hedge' ? 'border-brand-300 bg-brand-50 text-brand-800 dark:border-slate-500 dark:bg-slate-800 dark:text-white' : 'border-brand-100'"
                @click="currentPage = 'hedge'"
              >
                对刷工作台
              </button>
              <button
                class="w-full rounded-xl border px-3 py-2 text-left text-sm dark:border-slate-700 dark:text-slate-200"
                :class="currentPage === 'positions' ? 'border-brand-300 bg-brand-50 text-brand-800 dark:border-slate-500 dark:bg-slate-800 dark:text-white' : 'border-brand-100'"
                @click="currentPage = 'positions'"
              >
                仓位管理
              </button>
              <button
                class="w-full rounded-xl border px-3 py-2 text-left text-sm dark:border-slate-700 dark:text-slate-200"
                :class="currentPage === 'deposit' ? 'border-brand-300 bg-brand-50 text-brand-800 dark:border-slate-500 dark:bg-slate-800 dark:text-white' : 'border-brand-100'"
                @click="currentPage = 'deposit'"
              >
                充值
              </button>
              <button
                class="w-full rounded-xl border px-3 py-2 text-left text-sm dark:border-slate-700 dark:text-slate-200"
                :class="currentPage === 'withdraw' ? 'border-brand-300 bg-brand-50 text-brand-800 dark:border-slate-500 dark:bg-slate-800 dark:text-white' : 'border-brand-100'"
                @click="currentPage = 'withdraw'"
              >
                提现
              </button>
            </div>
          </aside>

          <section class="space-y-4">
            <section
              v-show="currentPage === 'wallets'"
              class="rounded-2xl border border-brand-100 bg-white p-3 shadow-card dark:border-slate-800 dark:bg-slate-900"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 class="font-display text-lg">钱包管理</h2>
                  <p class="text-xs text-brand-500 dark:text-slate-400">支持 100+ 钱包滚动与分页展示。</p>
                </div>
              <div class="flex flex-wrap gap-2">
                <button class="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white" @click="showImport = true">导入钱包</button>
                <button
                  class="rounded-lg border border-brand-200 px-4 py-2 text-sm text-brand-700 dark:border-slate-700 dark:text-slate-200"
                  @click="exportKeys"
                >
                  导出私钥
                </button>
                <button
                  class="rounded-lg border border-brand-200 px-4 py-2 text-sm text-brand-700 dark:border-slate-700 dark:text-slate-200"
                  @click="showPairs = true"
                >
                  钱包对管理
                </button>
                <label class="flex items-center gap-2 rounded-lg border border-brand-200 px-3 py-2 text-xs text-brand-700 dark:border-slate-700 dark:text-slate-200">
                  <input type="checkbox" v-model="useProxy" />
                  使用 IP 代理
                </label>
                <button
                  class="rounded-lg border border-brand-200 px-4 py-2 text-sm text-brand-700 dark:border-slate-700 dark:text-slate-200"
                  @click="showProxy = true"
                >
                  IP 配置
                </button>
                <button class="rounded-lg border border-brand-200 px-4 py-2 text-sm text-brand-700 dark:border-slate-700 dark:text-slate-200" @click="seedWallets(100)">
                  加载 100 个
                </button>
                <button class="rounded-lg border border-brand-200 px-4 py-2 text-sm text-brand-700 dark:border-slate-700 dark:text-slate-200" @click="clearWallets">
                  清空
                </button>
              </div>
            </div>

            <div class="mt-3 space-y-3">
              <div class="flex flex-wrap items-center gap-3">
                <input
                  v-model="walletSearch"
                  placeholder="搜索昵称或地址"
                  class="flex-1 rounded-lg border border-brand-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <select v-model.number="walletPageSize" class="rounded-lg border border-brand-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                  <option :value="20">20 / 页</option>
                  <option :value="50">50 / 页</option>
                  <option :value="100">100 / 页</option>
                </select>
                <button
                  class="rounded-lg border border-brand-200 px-3 py-2 text-xs text-brand-700 dark:border-slate-700 dark:text-slate-200"
                  @click="refreshBalances"
                >
                  查询余额
                </button>
                <div class="text-xs text-brand-500 dark:text-slate-400">共 {{ filteredWallets.length }} 个</div>
              </div>

              <div class="max-h-[720px] overflow-auto rounded-xl border border-brand-100 dark:border-slate-800">
                <table class="min-w-full text-sm">
                  <thead class="sticky top-0 bg-brand-50 text-xs text-brand-500 dark:bg-slate-800 dark:text-slate-400">
                    <tr>
                      <th class="px-3 py-2 text-left">选择</th>
                      <th class="px-3 py-2 text-left">#</th>
                      <th class="px-3 py-2 text-left">地址</th>
                      <th class="px-3 py-2 text-left">余额</th>
                      <th class="px-3 py-2 text-left">所属交易对</th>
                      <th v-if="useProxy" class="px-3 py-2 text-left">IP 配置</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(w, idx) in visibleWallets" :key="w.id" class="border-t border-brand-100 dark:border-slate-800">
                      <td class="px-3 py-2">
                        <input type="checkbox" v-model="w.selected" />
                      </td>
                      <td class="px-3 py-2">{{ walletOffset + idx + 1 }}</td>
                      <td class="px-3 py-2 text-brand-600 dark:text-slate-300">{{ maskAddress(w.address) }}</td>
                      <td class="px-3 py-2">{{ w.balance === null ? "-" : w.balance.toFixed(2) }}</td>
                      <td class="px-3 py-2 text-xs text-brand-500 dark:text-slate-400">{{ pairNameForWallet(w.id) }}</td>
                      <td v-if="useProxy" class="px-3 py-2">
                        <select v-model="w.profileId" class="w-full rounded-lg border border-brand-200 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800">
                          <option v-for="profile in ipProfiles" :key="profile.id" :value="profile.id">{{ profile.name }}</option>
                        </select>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="flex items-center justify-between text-xs text-brand-500 dark:text-slate-400">
                <div>第 {{ walletPage }} / {{ totalWalletPages }} 页</div>
                <div class="flex gap-2">
                  <button
                    class="rounded-lg border border-brand-200 px-3 py-1 dark:border-slate-700"
                    :disabled="walletPage === 1"
                    @click="walletPage--"
                  >
                    上一页
                  </button>
                  <button
                    class="rounded-lg border border-brand-200 px-3 py-1 dark:border-slate-700"
                    :disabled="walletPage === totalWalletPages"
                    @click="walletPage++"
                  >
                    下一页
                  </button>
                </div>
              </div>
            </div>
            </section>

            <section
              v-show="currentPage === 'hedge'"
              class="rounded-2xl border border-brand-100 bg-white p-3 shadow-card dark:border-slate-800 dark:bg-slate-900"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 class="font-display text-lg">对刷工作台</h2>
                  <p class="text-xs text-brand-500 dark:text-slate-400">加载市场 → 查看深度 → 统一参数 → 手动确认。</p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button class="rounded-lg border border-brand-200 px-4 py-2 text-sm text-brand-700 dark:border-slate-700 dark:text-slate-200" @click="toggleRefresh">
                    {{ autoRefresh ? '暂停刷新' : '继续刷新' }}
                  </button>
                  <button class="rounded-lg border border-brand-200 px-4 py-2 text-sm text-brand-700 dark:border-slate-700 dark:text-slate-200" @click="refreshMarket">
                    模拟刷新
                  </button>
                </div>
              </div>

              <div class="mt-3 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
                <div class="space-y-4">
                  <div class="rounded-xl border border-brand-100 bg-brand-50 p-3 dark:border-slate-800 dark:bg-slate-800">
                    <div class="flex items-center justify-between">
                      <div class="text-xs text-brand-500 dark:text-slate-400">市场加载</div>
                      <div class="text-xs text-brand-500 dark:text-slate-400">{{ autoRefresh ? '自动刷新中' : '暂停刷新' }}</div>
                    </div>
                    <div class="mt-3 flex gap-2">
                      <input
                        v-model="marketInput"
                        placeholder="polymarket.com/event/... 或 slug"
                        class="flex-1 rounded-lg border border-brand-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                      />
                      <button class="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white" @click="loadMarket">加载</button>
                    </div>
                    <div class="mt-3 flex flex-wrap gap-2">
                      <button
                        v-for="sample in marketSamples"
                        :key="sample.slug"
                        class="rounded-full border border-brand-200 px-3 py-1 text-xs text-brand-600 dark:border-slate-700 dark:text-slate-200"
                        @click="loadSampleMarket(sample.slug)"
                      >
                        {{ sample.title }}
                      </button>
                    </div>
                  </div>

                  <div v-if="market" class="rounded-xl border border-brand-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 min-h-[140px]">
                    <div class="text-xs text-brand-500 dark:text-slate-400">市场信息</div>
                    <div class="mt-2 text-base font-medium">{{ market.title }}</div>
                    <div class="mt-1 text-xs text-brand-500 dark:text-slate-400">状态：{{ market.status }} ｜ 更新时间：{{ market.updatedAt }}</div>
                    <div class="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div class="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800">
                        <div class="text-xs text-brand-500 dark:text-slate-400">Yes 价格</div>
                        <div class="text-lg font-semibold text-brand-700 dark:text-slate-100">{{ market.yesPrice }}</div>
                      </div>
                      <div class="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800">
                        <div class="text-xs text-brand-500 dark:text-slate-400">No 价格</div>
                        <div class="text-lg font-semibold text-brand-700 dark:text-slate-100">{{ market.noPrice }}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="space-y-4">
                  <div class="rounded-xl border border-brand-100 bg-brand-50 p-3 dark:border-slate-800 dark:bg-slate-800">
                    <div class="flex items-center justify-between">
                      <div class="text-xs text-brand-500 dark:text-slate-400">盘口深度</div>
                      <div class="text-xs text-brand-500 dark:text-slate-400">买一合计 {{ sumBid.toFixed(3) }}</div>
                    </div>
                    <div class="mt-2 text-xs text-brand-600 dark:text-slate-300">{{ sumHint }}</div>
                  </div>

                  <div v-if="market" class="space-y-3 min-h-[360px]">
                    <div class="rounded-xl border border-brand-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                      <div class="text-xs text-brand-500 dark:text-slate-400">YES</div>
                      <div class="mt-2 space-y-1 text-sm">
                        <div class="flex items-center justify-between">
                          <span>买一价格</span>
                          <span class="font-semibold">{{ market.book.yesBids[0].price }}</span>
                        </div>
                        <div class="flex items-center justify-between text-xs text-brand-500 dark:text-slate-400">
                          <span>买一深度</span>
                          <span>{{ market.book.yesBids[0].size }}</span>
                        </div>
                        <div class="mt-2 flex items-center justify-between">
                          <span>卖一价格</span>
                          <span class="font-semibold">{{ market.book.yesAsks[0].price }}</span>
                        </div>
                        <div class="flex items-center justify-between text-xs text-brand-500 dark:text-slate-400">
                          <span>卖一深度</span>
                          <span>{{ market.book.yesAsks[0].size }}</span>
                        </div>
                      </div>
                    </div>

                    <div class="rounded-2xl border border-brand-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                      <div class="text-xs text-brand-500 dark:text-slate-400">NO</div>
                      <div class="mt-2 space-y-1 text-sm">
                        <div class="flex items-center justify-between">
                          <span>买一价格</span>
                          <span class="font-semibold">{{ market.book.noBids[0].price }}</span>
                        </div>
                        <div class="flex items-center justify-between text-xs text-brand-500 dark:text-slate-400">
                          <span>买一深度</span>
                          <span>{{ market.book.noBids[0].size }}</span>
                        </div>
                        <div class="mt-2 flex items-center justify-between">
                          <span>卖一价格</span>
                          <span class="font-semibold">{{ market.book.noAsks[0].price }}</span>
                        </div>
                        <div class="flex items-center justify-between text-xs text-brand-500 dark:text-slate-400">
                          <span>卖一深度</span>
                          <span>{{ market.book.noAsks[0].size }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else class="rounded-xl border border-dashed border-brand-200 p-4 text-sm text-brand-500 dark:border-slate-700 dark:text-slate-400 min-h-[360px] flex items-center justify-center">
                    请输入市场链接或 slug 后加载盘口。
                  </div>
                </div>
              </div>

              <div class="mt-4 rounded-2xl border border-brand-100 bg-brand-50 p-3 dark:border-slate-800 dark:bg-slate-800">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="text-sm font-medium text-brand-800 dark:text-slate-200">执行参数</div>
                  <div class="text-xs text-brand-500 dark:text-slate-400">已选钱包对 {{ selectedPairs.length }}</div>
                </div>
                <div class="mt-3 rounded-xl border border-brand-100 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900">
                  <div v-if="pairs.length === 0" class="px-2 py-3 text-brand-500 dark:text-slate-400">暂无钱包对。</div>
                  <div v-else class="grid gap-2 md:grid-cols-4">
                    <label
                      v-for="pair in pairs"
                      :key="pair.id"
                      class="flex items-center justify-between rounded-lg border border-brand-100 px-2 py-1 text-[11px] dark:border-slate-800"
                    >
                      <span class="text-brand-700 dark:text-slate-200">{{ pair.name }}</span>
                      <input type="checkbox" v-model="pair.selected" />
                    </label>
                  </div>
                </div>
                <div class="mt-3 flex flex-wrap items-center gap-3">
                  <div class="rounded-lg border border-brand-100 bg-white px-3 py-2 text-xs text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    执行模式：对冲单次执行（YES/NO）
                  </div>
                  <label class="text-xs text-brand-500 dark:text-slate-400">统一数量</label>
                  <input v-model.number="execution.size" type="number" min="0" class="w-24 rounded-lg border border-brand-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
                  <button class="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white" @click="execute">执行确定</button>
                </div>
              </div>

              <div class="mt-3 rounded-2xl border border-brand-100 bg-slate-950 p-3 text-xs text-slate-200 shadow-soft dark:border-slate-800 h-[160px]">
                <div class="mb-2 flex items-center justify-between text-slate-400">
                  <span>执行输出</span>
                  <button class="text-xs text-slate-400 hover:text-slate-200" @click="clearLogs">清空</button>
                </div>
                <div class="max-h-[120px] space-y-1 overflow-auto font-mono">
                  <div v-if="logs.length === 0" class="text-slate-500">暂无输出，点击“执行确定”后显示结果。</div>
                  <div v-for="(log, idx) in logs" :key="`${log.ts}-${idx}`">
                    [{{ log.ts }}] {{ log.message }}
                  </div>
                </div>
              </div>
            </section>

            <section
              v-show="currentPage === 'positions'"
              class="rounded-2xl border border-brand-100 bg-white p-3 shadow-card dark:border-slate-800 dark:bg-slate-900"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 class="font-display text-lg">仓位管理</h2>
                  <p class="text-xs text-brand-500 dark:text-slate-400">点击查询后加载，避免一次性拉取大量数据。</p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button
                    class="rounded-lg border border-brand-200 px-4 py-2 text-sm text-brand-700 dark:border-slate-700 dark:text-slate-200"
                    @click="loadPositions"
                  >
                    {{ positionsLoading ? '查询中...' : '查询仓位' }}
                  </button>
                  <button class="rounded-lg border border-brand-200 px-4 py-2 text-sm text-brand-700 dark:border-slate-700 dark:text-slate-200" @click="clearPositions">
                    清空
                  </button>
                  <button class="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white" @click="redeemAll" :disabled="positions.length === 0">
                    等待并 Redeem
                  </button>
                </div>
              </div>
              <div class="mt-3 max-h-[560px] overflow-auto rounded-xl border border-brand-100 dark:border-slate-800">
                <table class="min-w-full text-sm">
                  <thead class="bg-brand-50 text-xs text-brand-500 dark:bg-slate-800 dark:text-slate-400">
                    <tr>
                      <th class="px-3 py-2 text-left">#</th>
                      <th class="px-3 py-2 text-left">账户</th>
                      <th class="px-3 py-2 text-left">市场</th>
                      <th class="px-3 py-2 text-left">持仓</th>
                      <th class="px-3 py-2 text-left">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="positions.length === 0" class="border-t border-brand-100 dark:border-slate-800">
                      <td colspan="5" class="px-3 py-6 text-center text-sm text-brand-500 dark:text-slate-400">
                        暂无数据，请点击“查询仓位”。
                      </td>
                    </tr>
                    <tr v-for="(pos, idx) in positions" :key="pos.id" class="border-t border-brand-100 dark:border-slate-800">
                      <td class="px-3 py-2">{{ idx + 1 }}</td>
                      <td class="px-3 py-2 text-brand-600 dark:text-slate-300">{{ maskAddress(pos.address) }}</td>
                      <td class="px-3 py-2">{{ pos.market }}</td>
                      <td class="px-3 py-2">{{ pos.size }}</td>
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

              <div class="mt-3 rounded-2xl border border-brand-100 bg-slate-950 p-3 text-xs text-slate-200 shadow-soft dark:border-slate-800 h-[160px]">
                <div class="mb-2 flex items-center justify-between text-slate-400">
                  <span>执行输出</span>
                  <button class="text-xs text-slate-400 hover:text-slate-200" @click="clearDepositLogs">清空</button>
                </div>
                <div class="max-h-[120px] space-y-1 overflow-auto font-mono">
                  <div v-if="depositLogs.length === 0" class="text-slate-500">暂无输出。</div>
                  <div v-for="(log, idx) in depositLogs" :key="`${log.ts}-${idx}`">
                    [{{ log.ts }}] {{ log.message }}
                  </div>
                </div>
              </div>
            </section>

            <section
              v-show="currentPage === 'deposit'"
              class="rounded-2xl border border-brand-100 bg-white p-3 shadow-card dark:border-slate-800 dark:bg-slate-900"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 class="font-display text-lg">充值</h2>
                  <p class="text-xs text-brand-500 dark:text-slate-400">从交易所批量充值到 Fund Address。</p>
                  <p v-if="depositStatus" class="mt-2 text-xs text-emerald-600 dark:text-emerald-300">{{ depositStatus }}</p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button
                    class="rounded-lg border border-brand-200 px-4 py-2 text-sm text-brand-700 dark:border-slate-700 dark:text-slate-200"
                    @click="refreshFundBalances"
                  >
                    查询余额
                  </button>
                  <button class="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white" @click="confirmDeposit">
                    开始
                  </button>
                </div>
              </div>

              <div class="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr]">
                <div class="rounded-2xl border border-brand-100 bg-brand-50 p-3 dark:border-slate-800 dark:bg-slate-800">
                  <div class="text-xs font-semibold text-brand-700 dark:text-slate-200">交易所配置</div>
                  <div class="mt-3 space-y-2 text-sm">
                    <select v-model="exchangeConfig.name" class="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                      <option value="">选择交易所</option>
                      <option value="okx">OKX</option>
                      <option value="binance">Binance</option>
                    </select>
                    <input v-model="exchangeConfig.apiKey" class="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" placeholder="API Key" />
                    <input v-model="exchangeConfig.apiSecret" class="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" placeholder="API Secret" />
                    <input v-model="exchangeConfig.ipWhitelist" class="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" placeholder="IP 白名单（逗号分隔）" />
                  </div>
                  <div class="mt-3 text-xs text-brand-500 dark:text-slate-400">用于交易所批量提现/充值配置。</div>
                </div>

                <div class="rounded-2xl border border-brand-100 bg-brand-50 p-3 dark:border-slate-800 dark:bg-slate-800">
                  <div class="text-xs font-semibold text-brand-700 dark:text-slate-200">交易所提现参数</div>
                  <div class="mt-3 space-y-2 text-sm">
                    <label class="text-xs text-brand-500 dark:text-slate-400">每笔延迟（秒）</label>
                    <input
                      v-model.number="depositDelaySec"
                      type="number"
                      min="0"
                      class="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      placeholder="如 3 或 5"
                    />
                  </div>
                  <div class="mt-3 text-xs text-brand-500 dark:text-slate-400">
                    充值将以“交易所提现”形式转入 Fund Address，可设置秒级延迟。
                  </div>
                </div>
              </div>

              <div class="mt-3 space-y-3">
                <div class="max-h-[560px] overflow-auto rounded-xl border border-brand-100 dark:border-slate-800">
                  <table class="min-w-full text-sm">
                    <thead class="bg-brand-50 text-xs text-brand-500 dark:bg-slate-800 dark:text-slate-400">
                      <tr>
                        <th class="px-3 py-2 text-left">选择</th>
                        <th class="px-3 py-2 text-left">#</th>
                        <th class="px-3 py-2 text-left">钱包地址</th>
                        <th class="px-3 py-2 text-left">Fund Address</th>
                        <th class="px-3 py-2 text-left">余额</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, idx) in fundRows" :key="row.id" class="border-t border-brand-100 dark:border-slate-800">
                        <td class="px-3 py-2">
                          <input type="checkbox" v-model="row.selected" />
                        </td>
                        <td class="px-3 py-2">{{ idx + 1 }}</td>
                        <td class="px-3 py-2 text-brand-600 dark:text-slate-300">{{ maskAddress(row.address) }}</td>
                        <td class="px-3 py-2 text-brand-600 dark:text-slate-300">{{ maskAddress(row.fundAddress) }}</td>
                      <td class="px-3 py-2">{{ row.balance === null ? "-" : row.balance.toFixed(2) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div class="rounded-2xl border border-brand-100 bg-slate-950 p-3 text-xs text-slate-200 shadow-soft dark:border-slate-800 h-[160px]">
                  <div class="mb-2 flex items-center justify-between text-slate-400">
                    <span>执行输出</span>
                    <button class="text-xs text-slate-400 hover:text-slate-200" @click="clearDepositLogs">清空</button>
                  </div>
                  <div class="max-h-[120px] space-y-1 overflow-auto font-mono">
                    <div v-if="depositLogs.length === 0" class="text-slate-500">暂无输出。</div>
                    <div v-for="(log, idx) in depositLogs" :key="`${log.ts}-${idx}`">
                      [{{ log.ts }}] {{ log.message }}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section
              v-show="currentPage === 'withdraw'"
              class="rounded-2xl border border-brand-100 bg-white p-3 shadow-card dark:border-slate-800 dark:bg-slate-900"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 class="font-display text-lg">提现</h2>
                  <p class="text-xs text-brand-500 dark:text-slate-400">从 Fund Address 批量转出到外部地址。</p>
                  <p v-if="withdrawStatus" class="mt-2 text-xs text-emerald-600 dark:text-emerald-300">{{ withdrawStatus }}</p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button
                    class="rounded-lg border border-brand-200 px-4 py-2 text-sm text-brand-700 dark:border-slate-700 dark:text-slate-200"
                    @click="refreshWithdrawBalances"
                  >
                    查询余额
                  </button>
                  <div class="flex flex-wrap items-center gap-2 rounded-lg border border-brand-200 px-3 py-2 text-xs text-brand-700 dark:border-slate-700 dark:text-slate-200">
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
                        class="w-20 rounded-md border border-brand-200 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        placeholder="批量金额"
                      />
                      <button
                        class="rounded-md border border-brand-200 px-2 py-1 text-[11px] dark:border-slate-700 dark:text-slate-200"
                        :disabled="withdrawMode !== 'partial'"
                        @click="applyWithdrawAmount"
                      >
                        应用到选中
                      </button>
                    </div>
                  </div>
                  <button class="rounded-lg border border-brand-200 px-4 py-2 text-sm text-brand-700 dark:border-slate-700 dark:text-slate-200" @click="showWithdrawConfig = true">
                    配置转入地址
                  </button>
                  <button class="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white" @click="bulkWithdraw">
                    批量提现
                  </button>
                </div>
              </div>


              <div class="mt-3 space-y-3">
                  <div class="max-h-[560px] overflow-auto rounded-xl border border-brand-100 dark:border-slate-800">
                    <table class="min-w-full text-sm">
                      <thead class="bg-brand-50 text-xs text-brand-500 dark:bg-slate-800 dark:text-slate-400">
                        <tr>
                          <th class="px-3 py-2 text-left">选择</th>
                          <th class="px-3 py-2 text-left">#</th>
                          <th class="px-3 py-2 text-left">钱包地址</th>
                          <th class="px-3 py-2 text-left">Fund Address</th>
                          <th class="px-3 py-2 text-left">转入地址</th>
                          <th v-if="withdrawMode === 'partial'" class="px-3 py-2 text-left">金额</th>
                          <th class="px-3 py-2 text-left">余额</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(row, idx) in withdrawRows" :key="row.id" class="border-t border-brand-100 dark:border-slate-800">
                          <td class="px-3 py-2">
                            <input type="checkbox" v-model="row.selected" />
                          </td>
                          <td class="px-3 py-2">{{ idx + 1 }}</td>
                          <td class="px-3 py-2 text-brand-600 dark:text-slate-300">{{ maskAddress(row.address) }}</td>
                          <td class="px-3 py-2 text-brand-600 dark:text-slate-300">{{ maskAddress(row.fundAddress) }}</td>
                          <td class="px-3 py-2 text-brand-600 dark:text-slate-300">{{ maskAddress(row.withdrawAddress) }}</td>
                          <td v-if="withdrawMode === 'partial'" class="px-3 py-2">
                            <input
                              v-model.number="row.amount"
                              type="number"
                              min="0"
                              class="w-20 rounded-md border border-brand-200 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                              placeholder="金额"
                            />
                          </td>
                          <td class="px-3 py-2">{{ row.balance === null ? "-" : row.balance.toFixed(2) }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div class="rounded-2xl border border-brand-100 bg-slate-950 p-3 text-xs text-slate-200 shadow-soft dark:border-slate-800 h-[160px]">
                    <div class="mb-2 flex items-center justify-between text-slate-400">
                      <span>执行输出</span>
                      <button class="text-xs text-slate-400 hover:text-slate-200" @click="clearWithdrawLogs">清空</button>
                    </div>
                    <div class="max-h-[120px] space-y-1 overflow-auto font-mono">
                      <div v-if="withdrawLogs.length === 0" class="text-slate-500">暂无输出。</div>
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
    <div class="w-full max-w-2xl rounded-2xl border border-brand-100 bg-white p-6 shadow-[0_24px_60px_rgba(7,20,60,0.35)] dark:border-slate-800 dark:bg-slate-900">
      <div class="flex items-center justify-between">
        <h2 class="font-display text-lg text-brand-900 dark:text-slate-100">导入账户</h2>
        <button class="text-sm text-brand-500 dark:text-slate-400" @click="showImport = false">关闭</button>
      </div>
      <p class="mt-2 text-sm text-brand-700 dark:text-slate-200">输入私钥（仅当前会话），支持多行导入或 CSV 文件导入。</p>
      <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-brand-500 dark:text-slate-400">
        <label class="rounded-lg border border-brand-200 px-3 py-2 text-xs text-brand-700 dark:border-slate-700 dark:text-slate-200">
          <input type="file" accept=".csv,text/csv" class="hidden" @change="handleCsvImport" />
          选择 CSV 文件
        </label>
        <span class="text-brand-700 dark:text-slate-200">CSV 格式：privateKey 或 index,privateKey（无需标题行）</span>
      </div>
      <div class="mt-4 relative">
        <div class="pointer-events-none absolute inset-y-2 left-2 w-10 overflow-hidden text-xs text-brand-500 dark:text-slate-400">
          <div v-for="(line, idx) in importLines" :key="`ln-${idx}`" class="h-5 leading-5">
            {{ idx + 1 }}
          </div>
        </div>
        <textarea
          v-model="importText"
          class="h-40 w-full rounded-xl border border-brand-200 p-3 pl-12 text-sm leading-5 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          placeholder="每行一个私钥，或 CSV：index,privateKey"
        ></textarea>
      </div>
      <div class="mt-4 flex justify-end gap-2">
        <button class="rounded-lg border border-brand-200 px-4 py-2 text-sm text-brand-700 dark:border-slate-700 dark:text-slate-200" @click="showImport = false">取消</button>
        <button class="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white" @click="confirmImport">导入</button>
      </div>
    </div>
  </div>

  <div v-if="showFlow" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" @click.self="showFlow = false">
    <div class="w-full max-w-3xl rounded-2xl border border-brand-100 bg-white p-6 shadow-[0_24px_60px_rgba(7,20,60,0.35)] dark:border-slate-800 dark:bg-slate-900">
      <div class="flex items-center justify-between">
        <h2 class="font-display text-lg text-brand-900 dark:text-slate-100">操作流程</h2>
        <button class="text-sm text-brand-500 dark:text-slate-400" @click="showFlow = false">关闭</button>
      </div>
      <div class="mt-6 rounded-2xl border border-brand-100 bg-brand-50 p-4 dark:border-slate-800 dark:bg-slate-800">
        <div class="grid gap-3 md:grid-cols-2">
          <div
            v-for="(step, idx) in flowSteps"
            :key="step.title"
            class="flex items-center gap-3 rounded-xl border border-brand-100 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
          >
            <div class="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
              {{ idx + 1 }}
            </div>
            <div>
              <div class="text-sm font-semibold text-brand-900 dark:text-slate-100">{{ step.title }}</div>
              <div class="text-xs text-brand-700 dark:text-slate-200">{{ step.desc }}</div>
            </div>
          </div>
        </div>
        <div class="mt-4 rounded-xl border border-brand-100 bg-white p-3 text-xs text-brand-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          注意事项：买一合计接近 1；差距过大可能产生磨损；提前卖出可能有 0.1% 磨损，建议等待 Redeem。
        </div>
      </div>
    </div>
  </div>

  <div v-if="showPairs" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" @click.self="showPairs = false">
    <div class="w-full max-w-3xl rounded-2xl border border-brand-100 bg-white p-6 shadow-[0_24px_60px_rgba(7,20,60,0.35)] dark:border-slate-800 dark:bg-slate-900">
      <div class="flex items-center justify-between">
        <h2 class="font-display text-lg text-brand-900 dark:text-slate-100">钱包对管理</h2>
        <button class="text-sm text-brand-500 dark:text-slate-400" @click="showPairs = false">关闭</button>
      </div>
      <p class="mt-2 text-xs text-brand-500 dark:text-slate-400">默认按导入顺序自动配对，可勾选参与并设置方向。</p>
      <div class="mt-4 max-h-96 space-y-2 overflow-auto">
        <div v-for="(p, idx) in pairs" :key="p.id" class="rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-800">
          <div class="flex items-center justify-between gap-3">
            <div class="text-xs font-semibold text-brand-700 dark:text-slate-200">Pair {{ idx + 1 }}</div>
            <div class="text-xs text-brand-500 dark:text-slate-300">
              {{ nameForWallet(p.a) }} ｜ {{ nameForWallet(p.b) }}
            </div>
            <label class="flex items-center gap-2 text-xs text-brand-600 dark:text-slate-300">
              <input type="checkbox" v-model="p.selected" /> 参与
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-if="showProxy" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" @click.self="showProxy = false">
    <div class="w-full max-w-3xl rounded-2xl border border-brand-100 bg-white p-6 shadow-[0_24px_60px_rgba(7,20,60,0.35)] dark:border-slate-800 dark:bg-slate-900">
      <div class="flex items-center justify-between">
        <h2 class="font-display text-lg text-brand-900 dark:text-slate-100">IP 代理配置</h2>
        <button class="text-sm text-brand-500 dark:text-slate-400" @click="showProxy = false">关闭</button>
      </div>
      <p class="mt-2 text-xs text-brand-500 dark:text-slate-400">为账户配置代理地址，选择后会关联到钱包。</p>
      <div class="mt-4 space-y-2">
        <div v-for="profile in ipProfiles" :key="profile.id" class="grid items-center gap-2 rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[140px_1fr_100px]">
          <input v-model="profile.name" class="rounded-lg border border-brand-200 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" placeholder="名称" />
          <input v-model="profile.endpoint" class="rounded-lg border border-brand-200 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" placeholder="http://user:pass@host:port" />
          <button class="rounded-lg border border-brand-200 px-2 py-1 text-xs text-brand-700 dark:border-slate-600 dark:text-slate-100" @click="copyEndpoint(profile.endpoint)">
            复制
          </button>
        </div>
      </div>
      <div class="mt-4 flex justify-between">
        <button class="rounded-lg border border-brand-200 px-4 py-2 text-sm text-brand-700 dark:border-slate-700 dark:text-slate-200" @click="addProxyProfile">
          新增配置
        </button>
        <button class="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white" @click="showProxy = false">完成</button>
      </div>
    </div>
  </div>

  <div v-if="showWithdrawConfig" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" @click.self="showWithdrawConfig = false">
    <div class="w-full max-w-2xl max-h-[80vh] overflow-auto rounded-2xl border border-brand-100 bg-white p-6 shadow-[0_24px_60px_rgba(7,20,60,0.35)] dark:border-slate-800 dark:bg-slate-900">
      <div class="flex items-center justify-between">
        <h2 class="font-display text-lg text-brand-900 dark:text-slate-100">转入地址配置</h2>
        <button class="text-sm text-brand-500 dark:text-slate-400" @click="showWithdrawConfig = false">关闭</button>
      </div>
      <div class="mt-3 rounded-2xl border border-brand-100 bg-brand-50 p-3 dark:border-slate-800 dark:bg-slate-800">
        <div class="text-xs font-semibold text-brand-800 dark:text-slate-100">模式选择</div>
        <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-brand-800 dark:text-slate-100">
          <label class="flex items-center gap-2 rounded-lg border border-brand-200 px-3 py-2 dark:border-slate-700">
            <input type="radio" value="many-to-many" v-model="transferMode" />
            多转多
          </label>
          <label class="flex items-center gap-2 rounded-lg border border-brand-200 px-3 py-2 dark:border-slate-700">
            <input type="radio" value="many-to-one" v-model="transferMode" />
            多转一
          </label>
        </div>
      </div>
      <div class="mt-4">
        <div v-if="transferMode === 'many-to-many'">
          <p class="text-xs text-brand-700 dark:text-slate-200">多转多：每行一个转入地址，或 index,address。</p>
          <textarea
            v-model="withdrawImportText"
            class="mt-3 h-48 w-full rounded-xl border border-brand-200 p-3 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            placeholder="0x...\n0x..."
          ></textarea>
        </div>
        <div v-else>
          <p class="text-xs text-brand-700 dark:text-slate-200">多转一：填写单一转入地址。</p>
          <input
            v-model="singleTargetAddress"
            class="mt-3 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            placeholder="目标地址"
          />
        </div>
      </div>
      <div class="mt-4 flex justify-end gap-2">
        <button class="rounded-lg border border-brand-200 px-4 py-2 text-sm text-brand-700 dark:border-slate-700 dark:text-slate-200" @click="showWithdrawConfig = false">
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
import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";
import type { ExecutionPlan, LogEntry, MarketInfo, PositionRow, Wallet, WalletPair } from "./types";
import { makeMockMarket, makeMockPositions, makeMockWallets } from "./data/mock";
import { maskAddress, parseSlug } from "./utils";

const wallets = reactive<Wallet[]>(makeMockWallets(20));
const pairs = reactive<WalletPair[]>([]);
const market = ref<MarketInfo | null>(null);
const marketInput = ref("");
const importText = ref("");
const showImport = ref(false);
const showPairs = ref(false);
const showFlow = ref(false);
const showProxy = ref(false);
const showWithdrawConfig = ref(false);
const autoRefresh = ref(true);
const useProxy = ref(true);
const currentPage = ref<"wallets" | "hedge" | "positions" | "deposit" | "withdraw">("wallets");

const ipProfiles = reactive([
  { id: "auto", name: "自动", endpoint: "" },
  { id: "proxy-01", name: "proxy-01", endpoint: "http://127.0.0.1:8080" },
  { id: "proxy-02", name: "proxy-02", endpoint: "http://127.0.0.1:8081" },
  { id: "proxy-03", name: "proxy-03", endpoint: "http://127.0.0.1:8082" },
]);

const marketSamples = [
  { slug: "nba-lal-bos-2026-01-08", title: "NBA 湖人 vs 凯尔特人" },
  { slug: "epl-ars-liv-2026-01-08", title: "英超 阿森纳 vs 利物浦" },
  { slug: "crypto-eth-2026-06-30", title: "ETH 价格预测" },
];

const flowSteps = [
  { title: "导入账户", desc: "保持双数钱包" },
  { title: "加载市场", desc: "确认状态与价格" },
  { title: "查看深度", desc: "买一合计接近 1" },
  { title: "设置参数", desc: "统一数量" },
  { title: "手动确认", desc: "执行操作" },
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
const depositDelaySec = ref(0);
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
const fundRows = ref(
  wallets.map((wallet, idx) => ({
    id: `fund-${idx + 1}`,
    address: wallet.address,
    fundAddress: `0xfund${wallet.address.slice(2, 6)}...${wallet.address.slice(-4)}`,
    balance: null as number | null,
    selected: idx % 2 === 0,
  }))
);
const withdrawRows = ref(
  wallets.map((wallet, idx) => ({
    id: `wd-${idx + 1}`,
    address: wallet.address,
    fundAddress: `0xfund${wallet.address.slice(2, 6)}...${wallet.address.slice(-4)}`,
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

const importLines = computed(() => {
  const lines = importText.value.split(/\r?\n/);
  return lines.length ? lines : [""];
});

const totalWalletPages = computed(() => Math.max(1, Math.ceil(filteredWallets.value.length / walletPageSize.value)));
const walletOffset = computed(() => (walletPage.value - 1) * walletPageSize.value);
const visibleWallets = computed(() => filteredWallets.value.slice(walletOffset.value, walletOffset.value + walletPageSize.value));

watch([walletSearch, walletPageSize], () => {
  walletPage.value = 1;
});

watch(totalWalletPages, (value) => {
  if (walletPage.value > value) walletPage.value = value;
});

const selectedPairs = computed(() => pairs.filter((p) => p.selected));

const pairNameForWallet = (walletId: string) => {
  const match = pairs.find((p) => p.a === walletId || p.b === walletId);
  return match ? match.name : "未配对";
};

const sumBid = computed(() => {
  if (!market.value) return 0;
  return Number(market.value.book.yesBids[0].price) + Number(market.value.book.noBids[0].price);
});

const sumHint = computed(() => {
  if (!market.value) return "请先加载市场";
  if (sumBid.value > 1) return "买一合计高于 1，可能存在磨损偏差";
  if (sumBid.value < 1) return "买一合计低于 1，可能存在磨损偏差";
  return "买一合计接近 1，请关注深度";
});

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
    });
  }
};

const rebuildFundRows = () => {
  fundRows.value = wallets.map((wallet, idx) => ({
    id: `fund-${idx + 1}`,
    address: wallet.address,
    fundAddress: `0xfund${wallet.address.slice(2, 6)}...${wallet.address.slice(-4)}`,
    balance: null,
    selected: idx % 2 === 0,
  }));
  withdrawRows.value = wallets.map((wallet, idx) => ({
    id: `wd-${idx + 1}`,
    address: wallet.address,
    fundAddress: `0xfund${wallet.address.slice(2, 6)}...${wallet.address.slice(-4)}`,
    withdrawAddress: `0xwd${wallet.address.slice(2, 6)}...${wallet.address.slice(-4)}`,
    amount: null,
    balance: null,
    selected: idx % 2 === 0,
  }));
};

const nameForWallet = (id: string) => wallets.find((w) => w.id === id)?.nickname || "-";

const confirmImport = () => {
  const lines = importText.value
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  wallets.splice(0, wallets.length);
  lines.forEach((line, idx) => {
    wallets.push({
      id: `w-${idx + 1}`,
      nickname: `Wallet ${idx + 1}`,
      address: `0x${line.slice(0, 4)}...${line.slice(-4)}`,
      privateKey: line,
      balance: null,
      enabled: true,
      profileId: ipProfiles[idx % ipProfiles.length].id,
      volume: Number((Math.random() * 5200).toFixed(2)),
      selected: true,
    });
  });
  rebuildPairs();
  rebuildFundRows();
  showImport.value = false;
};

const handleCsvImport = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  const text = await file.text();
  const rows = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (rows.length === 0) return;
  const dataRows = rows;
  importText.value = dataRows
    .map((row) => {
      const parts = row.split(",");
      const key = (parts.length === 1 ? parts[0] : parts[1])?.trim();
      return key || "";
    })
    .filter(Boolean)
    .join("\n");
  target.value = "";
};

const clearWallets = () => {
  wallets.splice(0, wallets.length);
  pairs.splice(0, pairs.length);
  fundRows.value = [];
};

const seedWallets = (count = 20) => {
  wallets.splice(0, wallets.length, ...makeMockWallets(count));
  wallets.forEach((wallet, idx) => {
    wallet.profileId = ipProfiles[idx % ipProfiles.length].id;
  });
  rebuildPairs();
  rebuildFundRows();
};

const refreshBalances = () => {
  wallets.forEach((wallet) => {
    wallet.balance = Number((Math.random() * 220 + 20).toFixed(2));
  });
  pushLog(`已更新 ${wallets.length} 个钱包余额`);
};

const refreshFundBalances = () => {
  fundRows.value.forEach((row) => {
    row.balance = Number((Math.random() * 600 + 50).toFixed(2));
  });
  depositStatus.value = `已更新 ${fundRows.value.length} 个 Fund 地址余额`;
  depositLogs.value.push({ ts: new Date().toLocaleTimeString(), message: depositStatus.value });
};

const refreshWithdrawBalances = () => {
  withdrawRows.value.forEach((row) => {
    row.balance = Number((Math.random() * 600 + 50).toFixed(2));
  });
  withdrawStatus.value = `已更新 ${withdrawRows.value.length} 个 Fund Address 余额`;
  withdrawLogs.value.push({ ts: new Date().toLocaleTimeString(), message: withdrawStatus.value });
};

const confirmDeposit = () => {
  const targets = fundRows.value.filter((row) => row.selected);
  if (targets.length === 0) {
    depositStatus.value = "未选择 Fund 地址，无法开始。";
    depositLogs.value.push({ ts: new Date().toLocaleTimeString(), message: "未选择 Fund 地址，无法开始。" });
    return;
  }
  depositStatus.value = `开始执行交易所提现：${targets.length} 个地址，延迟 ${depositDelaySec.value}s`;
  depositLogs.value.push({ ts: new Date().toLocaleTimeString(), message: `开始执行：${targets.length} 个地址，延迟 ${depositDelaySec.value}s` });
  targets.forEach((row, idx) => {
    depositLogs.value.push({
      ts: new Date().toLocaleTimeString(),
      message: `#${idx + 1} ${maskAddress(row.address)} -> ${maskAddress(row.fundAddress)} 已提交`,
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
  withdrawStatus.value = `批量转出已提交：${targets.length} 个 Fund Address，${withdrawMode.value === "partial" ? "部分金额" : "清空"}，${transferMode.value === "many-to-one" ? "多转一" : "多转多"}`;
  withdrawLogs.value.push({ ts: new Date().toLocaleTimeString(), message: withdrawStatus.value });
  targets.forEach((row, idx) => {
    withdrawLogs.value.push({
      ts: new Date().toLocaleTimeString(),
      message: `#${idx + 1} ${maskAddress(row.fundAddress)} -> ${maskAddress(transferMode.value === "many-to-one" ? singleTargetAddress.value : row.withdrawAddress)} ${withdrawMode.value === "partial" ? `金额 ${row.amount}` : "清空"} 已提交`,
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

const exportKeys = () => {
  if (wallets.length === 0) {
    pushLog("无可导出的钱包。");
    return;
  }
  const rows = wallets.map((wallet, idx) => {
    const key = wallet.privateKey || "";
    return `${idx + 1},${key}`;
  });
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "polymarket-wallets.csv";
  link.click();
  URL.revokeObjectURL(url);
  pushLog("已导出私钥 CSV。");
};

const loadMarket = () => {
  const slug = parseSlug(marketInput.value);
  const selected = marketSamples.find((item) => item.slug === slug);
  market.value = makeMockMarket(slug || "demo");
  if (market.value && selected) {
    market.value.title = selected.title;
  }
  if (autoRefresh.value) refreshMarket();
};

const loadSampleMarket = (slug: string) => {
  marketInput.value = slug;
  loadMarket();
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const jitter = (value: number, range: number) => value + (Math.random() - 0.5) * range;

const refreshMarket = () => {
  if (!market.value) return;
  const yesBid = clamp(jitter(market.value.book.yesBids[0].price, 0.04), 0.05, 0.95);
  const noBid = clamp(jitter(1 - yesBid, 0.06), 0.05, 0.95);
  const yesAsk = clamp(yesBid + 0.02 + Math.random() * 0.01, yesBid + 0.01, 0.99);
  const noAsk = clamp(noBid + 0.02 + Math.random() * 0.01, noBid + 0.01, 0.99);

  market.value = {
    ...market.value,
    yesPrice: Number(yesBid.toFixed(3)),
    noPrice: Number(noBid.toFixed(3)),
    updatedAt: new Date().toLocaleTimeString(),
    book: {
      yesBids: [{ price: Number(yesBid.toFixed(3)), size: Number((900 + Math.random() * 2200).toFixed(0)) }],
      yesAsks: [{ price: Number(yesAsk.toFixed(3)), size: Number((700 + Math.random() * 1600).toFixed(0)) }],
      noBids: [{ price: Number(noBid.toFixed(3)), size: Number((900 + Math.random() * 2200).toFixed(0)) }],
      noAsks: [{ price: Number(noAsk.toFixed(3)), size: Number((700 + Math.random() * 1600).toFixed(0)) }],
    },
  };
};

let refreshTimer: number | undefined;
const startRefreshTimer = () => {
  if (refreshTimer) return;
  refreshTimer = window.setInterval(() => {
    if (autoRefresh.value) refreshMarket();
  }, 5000);
};

const toggleRefresh = () => {
  autoRefresh.value = !autoRefresh.value;
  if (autoRefresh.value) refreshMarket();
};

const pushLog = (message: string) => {
  logs.value.push({ ts: new Date().toLocaleTimeString(), message });
  if (logs.value.length > 60) logs.value.shift();
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
  pushLog(`开始执行 ${selectedPairs.value.length} 个钱包对，模式对冲单次执行，数量 ${execution.size}`);
  selectedPairs.value.forEach((pair) => {
    pushLog(`${pair.name}：${nameForWallet(pair.a)} / ${nameForWallet(pair.b)} 执行成功`);
  });
  pushLog("执行完成。");
};

const clearLogs = () => {
  logs.value = [];
};

const loadPositions = () => {
  if (positionsLoading.value) return;
  positionsLoading.value = true;
  setTimeout(() => {
    positions.value = makeMockPositions(wallets);
    positionsLoading.value = false;
  }, 800);
};

const clearPositions = () => {
  positions.value = [];
};

const redeemAll = () => {};

const addProxyProfile = () => {
  const nextId = `proxy-${String(ipProfiles.length + 1).padStart(2, "0")}`;
  ipProfiles.push({ id: nextId, name: nextId, endpoint: "" });
};

const copyEndpoint = async (endpoint: string) => {
  if (!endpoint) return;
  try {
    await navigator.clipboard.writeText(endpoint);
    pushLog(`已复制代理地址：${endpoint}`);
  } catch {
    pushLog("复制失败，请手动复制代理地址。");
  }
};

rebuildPairs();
startRefreshTimer();

onBeforeUnmount(() => {
  if (refreshTimer) window.clearInterval(refreshTimer);
});
</script>
