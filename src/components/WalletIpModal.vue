<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" @click.self="emit('close')">
    <div class="w-full max-w-lg rounded-2xl border border-brand-100 bg-white p-6 shadow-[0_24px_60px_rgba(7,20,60,0.35)]">
      <div class="flex items-center justify-between">
        <h2 class="font-display text-lg text-brand-900">钱包 IP 配置</h2>
        <button class="text-sm text-brand-500" @click="emit('close')">关闭</button>
      </div>
      <div class="mt-2 text-xs text-brand-500">
        地址：{{ addressLabel }}
      </div>
      <div class="mt-4 space-y-3">
        <div>
          <select
            :value="selectedPreset"
            class="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
            @change="emit('update:selectedPreset', ($event.target as HTMLSelectElement).value); emit('apply-preset')"
          >
            <option value="">选择已有配置</option>
            <option v-for="preset in ipConfigOptions" :key="preset.key" :value="preset.key">
              {{ preset.label }}
            </option>
          </select>
        </div>
        <div>
          <input
            :value="ipName"
            class="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
            placeholder="IP 名称"
            list="ipNameOptions"
            @input="emit('update:ipName', ($event.target as HTMLInputElement).value)"
          />
          <datalist id="ipNameOptions">
            <option v-for="name in ipNameOptions" :key="name" :value="name"></option>
          </datalist>
        </div>
        <input
          :value="ipEndpoint"
          class="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
          placeholder="http://user:pass@host:port"
          @input="emit('update:ipEndpoint', ($event.target as HTMLInputElement).value)"
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
  addressLabel: string;
  ipName: string;
  ipEndpoint: string;
  selectedPreset: string;
  ipNameOptions: string[];
  ipConfigOptions: Array<{ key: string; label: string }>;
}>();
const emit = defineEmits<{
  (e: "close"): void;
  (e: "save"): void;
  (e: "apply-preset"): void;
  (e: "update:ipName", value: string): void;
  (e: "update:ipEndpoint", value: string): void;
  (e: "update:selectedPreset", value: string): void;
}>();
</script>
