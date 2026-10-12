<script setup lang="ts">
import AppIcon from "./AppIcon.vue";

defineProps<{ placeholder: string }>();
const model = defineModel<string>({ required: true });
</script>

<template>
  <div class="module-search">
    <AppIcon name="search" />
    <input v-model="model" :aria-label="placeholder" :placeholder="placeholder" />
  </div>
</template>
