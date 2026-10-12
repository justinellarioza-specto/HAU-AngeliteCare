<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { api, type Ticket } from "@/api";
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseModal from "@/components/ui/BaseModal.vue";
import type { SavedTicket } from "@/composables/ticket";

const props = defineProps<{ saved: SavedTicket; initial?: Ticket }>();
const emit = defineEmits<{ close: []; cleared: [] }>();

const ticket = ref<Ticket | null>(props.initial ?? null);
const error = ref<string | null>(null);
const busy = ref(false);
let timer: number | undefined;

async function load() {
  try {
    ticket.value = (await api.kioskTicket(props.saved.id)).ticket;
    error.value = null;
  } catch (err) {
    error.value = (err as Error).message;
  }
}

onMounted(() => {
  load();
  timer = window.setInterval(load, 10000); // live position updates
});
onUnmounted(() => window.clearInterval(timer));

async function cancel() {
  busy.value = true;
  try {
    ticket.value = (await api.kioskCancel(props.saved.id, props.saved.studentNumber)).ticket;
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    busy.value = false;
  }
}

const finished = computed(() => !!ticket.value && !["waiting", "in_progress"].includes(ticket.value.status));
const statusText = computed(() => {
  const t = ticket.value;
  if (!t) return "Loading your ticket…";
  if (t.status === "waiting") {
    if (t.position === 1) return "You're next! Please stay near the clinic.";
    const ahead = t.position - 1;
    return `${ahead} ${ahead === 1 ? "person" : "people"} ahead of you`;
  }
  if (t.status === "in_progress") return "It's your turn — please proceed to the clinic counter.";
  if (t.status === "completed") return "Your visit is complete. Get well soon!";
  if (t.status === "cancelled") return "This request was cancelled.";
  return "This ticket was marked as no-show. You can submit a new request.";
});
const submittedAt = computed(() =>
  ticket.value ? new Date(ticket.value.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "—",
);
</script>

<template>
  <BaseModal eyebrow="Your queue ticket" modal-class="booking-modal ticket-modal" :title="ticket?.requestTypeLabel ?? 'Clinic request'" @close="emit('close')">
    <div :class="['ticket-card', `status-${ticket?.status ?? 'waiting'}`]">
      <span>Queue number</span>
      <strong>{{ ticket?.queueNumber ?? "—" }}</strong>
      <p>{{ statusText }}</p>
      <small v-if="ticket?.status === 'waiting'">Updates automatically every 10 seconds</small>
    </div>
    <div class="record-details">
      <div><span>Student number</span><strong>{{ saved.studentNumber }}</strong></div>
      <div><span>Submitted</span><strong>{{ submittedAt }}</strong></div>
    </div>
    <p v-if="error" class="login-error" role="alert">{{ error }}</p>
    <div class="modal-actions">
      <BaseButton v-if="ticket?.status === 'waiting'" :disabled="busy" variant="ghost" @click="cancel">Cancel request</BaseButton>
      <BaseButton v-if="finished" variant="ghost" @click="emit('cleared')">Clear ticket</BaseButton>
      <BaseButton @click="emit('close')">{{ finished ? "Done" : "Keep waiting" }}</BaseButton>
    </div>
  </BaseModal>
</template>
