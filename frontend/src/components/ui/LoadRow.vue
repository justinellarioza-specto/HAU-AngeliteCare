<script setup lang="ts">
// Table row shown while loading, on error, or when there are no rows
defineProps<{ loading: boolean; error: string | null; empty: boolean; colspan: number; emptyText?: string }>();
</script>

<template>
  <tr v-if="error || loading || empty">
    <td :class="['empty-table', { 'error-text': error }]" :colspan="colspan">
      {{ error ? error : loading ? "Loading…" : emptyText ?? "Nothing here yet." }}
    </td>
  </tr>
</template>
