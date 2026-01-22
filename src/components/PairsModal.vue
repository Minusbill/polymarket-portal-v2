<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" @click.self="emit('close')">
    <div class="w-full max-w-3xl rounded-2xl border border-brand-100 bg-white p-6 shadow-[0_24px_60px_rgba(7,20,60,0.35)]">
      <div class="flex items-center justify-between">
        <h2 class="font-display text-lg text-brand-900">钱包对管理</h2>
        <button class="text-sm text-brand-500" @click="emit('close')">关闭</button>
      </div>
      <p class="mt-2 text-xs text-brand-500">默认按导入顺序自动配对，可勾选参与并设置方向。</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <button class="rounded-lg border border-brand-200 px-3 py-1 text-xs text-brand-700" @click="emit('select-all', true)">全选</button>
        <button class="rounded-lg border border-brand-200 px-3 py-1 text-xs text-brand-700" @click="emit('select-all', false)">全不选</button>
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
        <button class="rounded-lg border border-brand-200 px-4 py-2 text-sm text-brand-700" @click="emit('close')">
          关闭
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WalletPair } from "../types";

const props = defineProps<{
  open: boolean;
  pairs: WalletPair[];
  nameForWallet: (id: string) => string;
}>();
const emit = defineEmits<{ (e: "close"): void; (e: "select-all", value: boolean): void }>();
</script>
