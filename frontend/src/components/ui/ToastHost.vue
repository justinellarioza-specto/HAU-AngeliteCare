<script setup lang="ts">
import { toast } from "@/composables/toast";
import AppIcon from "./AppIcon.vue";
</script>

<template>
  <div v-if="toast" :class="['toast', { 'toast-error': toast.error }]" :role="toast.error ? 'alert' : 'status'">
    <span><AppIcon :name="toast.error ? 'info' : 'check'" /></span>
    <div><strong>{{ toast.title }}</strong><small v-if="toast.detail">{{ toast.detail }}</small></div>
  </div>
</template>
