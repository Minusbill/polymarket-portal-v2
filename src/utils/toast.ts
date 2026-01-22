import type { Ref } from "vue";

export type ToastEntry = { id: number; message: string; tone: "info" | "error" };

export const createToastHelpers = (toasts: Ref<ToastEntry[]>) => {
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

  return { pushToast, copyText };
};
