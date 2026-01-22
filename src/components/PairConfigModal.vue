<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" @click.self="emit('close')">
    <div class="w-full max-w-md rounded-2xl border border-brand-100 bg-white p-6 shadow-[0_24px_60px_rgba(7,20,60,0.35)]">
      <div class="flex items-center justify-between">
        <h2 class="font-display text-lg text-brand-900">钱包对数量配置</h2>
        <button class="text-sm text-brand-500" @click="emit('close')">关闭</button>
      </div>
      <div class="mt-2 text-xs text-brand-500">
        {{ label }}
      </div>
      <div class="mt-4 space-y-2">
        <input
          :value="amount"
          type="number"
          min="0"
          class="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
          placeholder="单独数量（留空使用统一数量）"
          @input="emit('update:amount', ($event.target as HTMLInputElement).valueAsNumber)"
        />
      </div>
      <div class="mt-4 flex justify-end gap-2">
        <button class="rounded-lg border border-brand-200 px-4 py-2 text-sm text-brand-700" @click="emit('close')">
          取消
        </button>
        <button class="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white" @click="emit('save')">
          保存
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  open: boolean;
  amount: number | null;
  label: string;
}>();
const emit = defineEmits<{
  (e: "close"): void;
  (e: "save"): void;
  (e: "update:amount", value: number): void;
}>();
</script>
