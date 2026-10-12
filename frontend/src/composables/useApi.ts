import { onMounted, onUnmounted, ref, watch, type Ref, type WatchSource } from "vue";

// Loads data from the API, re-runs when any `deps` change, and can poll.
// The loader can read reactive values directly — it's called fresh each time.
export function useApi<T>(loader: () => Promise<T>, deps: WatchSource[] = [], options: { pollMs?: number } = {}) {
  const data = ref(null) as Ref<T | null>;
  const error = ref<string | null>(null);
  const loading = ref(true);

  async function reload(silent = false) {
    if (!silent) loading.value = true;
    try {
      data.value = await loader();
      error.value = null;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Something went wrong";
    } finally {
      loading.value = false;
    }
  }

  if (deps.length) watch(deps, () => reload(), { immediate: true });
  else reload();

  let timer: number | undefined;
  onMounted(() => {
    if (options.pollMs) timer = window.setInterval(() => reload(true), options.pollMs);
  });
  onUnmounted(() => window.clearInterval(timer));

  return { data, error, loading, reload };
}

// Debounce a ref (for search boxes) before hitting the API
export function useDebounced<T>(source: Ref<T>, ms = 350) {
  const debounced = ref(source.value) as Ref<T>;
  let timer: number | undefined;
  watch(source, (value) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => { debounced.value = value; }, ms);
  });
  return debounced;
}
