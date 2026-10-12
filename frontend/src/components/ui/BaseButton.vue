<script setup lang="ts">
import AppIcon from "./AppIcon.vue";
import type { IconName } from "./icons";

withDefaults(
  defineProps<{ variant?: "primary" | "secondary" | "ghost"; icon?: IconName; type?: "button" | "submit"; disabled?: boolean }>(),
  { variant: "primary", type: "button" },
);
</script>

<template>
  <button :class="['button', `button-${variant}`]" :disabled="disabled" :type="type">
    <AppIcon v-if="icon" :name="icon" :size="18" />
    <slot />
  </button>
</template>
