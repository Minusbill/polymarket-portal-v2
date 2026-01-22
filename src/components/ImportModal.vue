<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" @click.self="emit('close')">
    <div class="w-full max-w-2xl rounded-2xl border border-brand-100 bg-white p-6 shadow-[0_24px_60px_rgba(7,20,60,0.35)]">
      <div class="flex items-center justify-between">
        <h2 class="font-display text-lg text-brand-900">导入账户</h2>
        <button class="text-sm text-brand-500" @click="emit('close')">关闭</button>
      </div>
      <p class="mt-2 text-sm text-brand-700">输入私钥（仅当前会话），支持多行导入或 CSV 文件导入。</p>
      <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-brand-500">
        <label class="rounded-lg border border-brand-200 px-3 py-2 text-xs text-brand-700">
          <input type="file" accept=".csv,text/csv" class="hidden" @change="emit('csv-import', $event)" />
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
          :value="importText"
          class="h-40 w-full rounded-xl border border-brand-200 p-3 pl-12 text-sm leading-5"
          placeholder="每行一个私钥，或 CSV：index,privateKey,ipName,ipEndpoint"
          @input="emit('update:importText', ($event.target as HTMLTextAreaElement).value)"
        ></textarea>
      </div>
      <div class="mt-4 flex justify-end gap-2">
        <button class="rounded-lg border border-brand-200 px-4 py-2 text-sm text-brand-700" @click="emit('close')">取消</button>
        <button class="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white" @click="emit('confirm')">导入</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

type Emits = {
  (e: "close"): void;
  (e: "confirm"): void;
  (e: "csv-import", value: Event): void;
  (e: "update:importText", value: string): void;
};

const props = defineProps<{ open: boolean; importText: string }>();
const emit = defineEmits<Emits>();

const importLines = computed(() => {
  const lines = props.importText.split(/\r?\n/);
  return lines.length ? lines : [""];
});
</script>
