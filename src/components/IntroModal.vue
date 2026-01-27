<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4" @click.self="emit('close')">
    <div class="w-full max-w-4xl overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-[0_28px_80px_rgba(7,20,60,0.35)]">
      <div class="intro-modal-hero relative overflow-hidden p-6">
        <div class="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-200/40 blur-2xl"></div>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-xs uppercase tracking-[0.3em] text-brand-500">新手引导</div>
            <h2 class="font-display text-2xl text-brand-900 md:text-3xl">Polymarket 刷交互门户</h2>
            <p class="mt-2 text-sm text-brand-600">
              用于多账户联动、刷交易量与交互记录的工作台。
            </p>
          </div>
          <button class="text-sm text-brand-500" @click="emit('close')">关闭</button>
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
          <button class="text-xs text-brand-500" @click="emit('hide-today')">今天内不再显示</button>
          <button class="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-soft hover:bg-brand-700" @click="emit('close')">
            开始使用
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: "close"): void; (e: "hide-today"): void }>();
</script>
