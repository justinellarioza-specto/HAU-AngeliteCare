<script setup lang="ts">
import { ICON_PATHS, type IconName } from "./icons";

withDefaults(defineProps<{ name: IconName; size?: number }>(), { size: 20 });
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- static, trusted icon markup -->
  <svg aria-hidden="true" class="icon" fill="none" :height="size" viewBox="0 0 24 24" :width="size" v-html="ICON_PATHS[name]" />
</template>
