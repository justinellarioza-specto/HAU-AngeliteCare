import { ref } from "vue";

export type ToastMessage = { title: string; detail?: string; error?: boolean };

// One global toast, rendered by App.vue
export const toast = ref<ToastMessage | null>(null);
let timer: number | undefined;

export function notify(message: ToastMessage) {
  window.clearTimeout(timer);
  toast.value = message;
  timer = window.setTimeout(() => { toast.value = null; }, message.error ? 5000 : 3200);
}

export function notifyError(title: string, err: unknown) {
  notify({ title, detail: err instanceof Error ? err.message : String(err), error: true });
}
