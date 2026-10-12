<script setup lang="ts">
defineProps<{ eyebrow: string; title: string; copy?: string }>();
</script>

<template>
  <div class="section-heading">
    <span class="eyebrow">{{ eyebrow }}</span>
    <h2>{{ title }}</h2>
    <p v-if="copy">{{ copy }}</p>
  </div>
</template>
