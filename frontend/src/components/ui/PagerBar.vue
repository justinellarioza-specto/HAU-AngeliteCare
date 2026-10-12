<script setup lang="ts">
defineProps<{ page: number; totalPages: number; total: number }>();
const emit = defineEmits<{ page: [value: number] }>();
</script>

<template>
  <div v-if="totalPages > 1" class="pager">
    <span>Page {{ page }} of {{ totalPages }} · {{ total }} records</span>
    <div>
      <button :disabled="page <= 1" type="button" @click="emit('page', page - 1)">Previous</button>
      <button :disabled="page >= totalPages" type="button" @click="emit('page', page + 1)">Next</button>
    </div>
  </div>
</template>
