<script setup lang="ts">
import { STATUS_LABELS, type VisitStatus } from "@/api";

defineProps<{ status: VisitStatus }>();

const CHIP: Record<VisitStatus, string> = {
  waiting: "chip-pending",
  in_progress: "chip-confirmed",
  completed: "chip-approved",
  cancelled: "chip-completed",
  no_show: "chip-waiting",
};
</script>

<template>
  <span :class="['chip', CHIP[status]]">{{ STATUS_LABELS[status] }}</span>
</template>
