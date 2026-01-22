<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4" @click.self="emit('close')">
    <div class="w-full max-w-4xl max-h-[80vh] overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-[0_28px_80px_rgba(7,20,60,0.35)]">
      <div class="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.14),transparent_55%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_45%),linear-gradient(120deg,#f8fafc,#ecfdf5)] px-6 py-4">
        <div class="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-emerald-200/40 blur-2xl"></div>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-[10px] uppercase tracking-[0.26em] text-brand-500">How It Works</div>
            <h2 class="font-display text-xl text-brand-900 md:text-2xl">操作说明</h2>
          </div>
          <button class="text-xs text-brand-500" @click="emit('close')">关闭</button>
        </div>
      </div>
      <div class="max-h-[calc(80vh-112px)] overflow-auto p-6">
        <div class="flex flex-col gap-3">
          <div v-for="(step, idx) in steps" :key="step.title" class="flex items-center gap-3">
            <div class="w-20 text-center text-xs font-semibold text-brand-500">Step {{ idx + 1 }}</div>
            <div class="flex-1 rounded-2xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-700 shadow-soft">
              <div class="flex flex-wrap items-center gap-2 text-xs text-brand-600">
                <span class="font-semibold text-brand-700">{{ step.title }}</span>
                <span class="text-brand-400">—</span>
                <span>{{ step.desc }}</span>
              </div>
            </div>
            <div v-if="idx < steps.length - 1" class="text-brand-400">
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
          <button class="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-soft hover:bg-brand-700" @click="emit('close')">
            我已了解
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ open: boolean; steps: Array<{ title: string; desc: string }> }>();
const emit = defineEmits<{ (e: "close"): void }>();
</script>
