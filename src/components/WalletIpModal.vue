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
        <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
          <div>
            <label class="text-[10px] text-brand-500 uppercase tracking-wider">类型</label>
            <select
              v-model="protocol"
              class="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
              @change="updateEndpoint"
            >
              <option value="http">http</option>
              <option value="https">https</option>
              <option value="socks5">socks5</option>
            </select>
          </div>
          <div>
            <label class="text-[10px] text-brand-500 uppercase tracking-wider">Host</label>
            <input
              v-model="host"
              class="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
              placeholder="1.2.3.4"
              @input="updateEndpoint"
            />
          </div>
          <div>
            <label class="text-[10px] text-brand-500 uppercase tracking-wider">Port</label>
            <input
              v-model="port"
              class="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
              placeholder="8080"
              @input="updateEndpoint"
            />
          </div>
          <div>
            <label class="text-[10px] text-brand-500 uppercase tracking-wider">用户名</label>
            <input
              v-model="username"
              class="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
              placeholder="user"
              @input="updateEndpoint"
            />
          </div>
          <div class="md:col-span-2">
            <label class="text-[10px] text-brand-500 uppercase tracking-wider">密码</label>
            <input
              v-model="password"
              class="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
              placeholder="pass"
              @input="updateEndpoint"
            />
          </div>
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
        <div class="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand-600">
          地址：{{ ipEndpoint || "-" }}
        </div>
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
import { ref, watch, watchEffect } from "vue";

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

const protocol = ref("http");
const host = ref("");
const port = ref("");
const username = ref("");
const password = ref("");

const parseEndpoint = (value: string) => {
  const raw = (value || "").trim();
  if (!raw) {
    protocol.value = "http";
    host.value = "";
    port.value = "";
    username.value = "";
    password.value = "";
    return;
  }
  const match =
    /^(?<protocol>[^:\/]+):\/\/(?:(?<username>[^:@]*)(?::(?<password>[^@]*))?@)?(?<host>[^:\/]+)(?::(?<port>\d+))?/i.exec(
      raw
    );
  if (match?.groups) {
    protocol.value = match.groups.protocol || "http";
    host.value = match.groups.host || "";
    port.value = match.groups.port || "";
    username.value = match.groups.username || "";
    password.value = match.groups.password || "";
    return;
  }
  // fallback: try URL for edge cases
  let urlValue = raw;
  if (!/^[a-z]+:\/\//i.test(urlValue)) {
    urlValue = `http://${urlValue}`;
  }
  try {
    const url = new URL(urlValue);
    protocol.value = url.protocol.replace(":", "") || "http";
    host.value = url.hostname || "";
    port.value = url.port || "";
    username.value = url.username || "";
    password.value = url.password || "";
  } catch {
    protocol.value = "http";
    host.value = raw;
    port.value = "";
    username.value = "";
    password.value = "";
  }
};

const buildEndpoint = () => {
  if (!host.value) return "";
  const auth = username.value || password.value ? `${encodeURIComponent(username.value)}:${encodeURIComponent(password.value)}@` : "";
  const portPart = port.value ? `:${port.value}` : "";
  return `${protocol.value}://${auth}${host.value}${portPart}`;
};

const updateEndpoint = () => {
  emit("update:ipEndpoint", buildEndpoint());
};

const handleEndpointInput = (value: string) => {
  emit("update:ipEndpoint", value);
  parseEndpoint(value);
};

watch(
  () => props.ipEndpoint,
  (value) => {
    parseEndpoint(value || "");
  },
  { immediate: true }
);

watch(
  () => props.open,
  (value) => {
    if (value) parseEndpoint(props.ipEndpoint || "");
  }
);

watchEffect(() => {
  if (props.open) parseEndpoint(props.ipEndpoint || "");
});
</script>
