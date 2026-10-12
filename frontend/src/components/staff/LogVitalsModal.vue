<script setup lang="ts">
import { ref } from "vue";
import { api, needsReview, type Vitals } from "@/api";
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseModal from "@/components/ui/BaseModal.vue";
import { formData, numberOrUndefined, text, textOrUndefined } from "@/composables/forms";
import { notify } from "@/composables/toast";

// Quick vital-signs check: creates a walk-in check-up and completes it with the readings
const emit = defineEmits<{ close: []; saved: [] }>();
const busy = ref(false);
const formError = ref<string | null>(null);

async function submit(event: Event) {
  const fd = formData(event);
  const vitals: Vitals = {
    bloodPressure: textOrUndefined(fd, "bloodPressure"),
    temperature: numberOrUndefined(fd, "temperature"),
    pulseRate: numberOrUndefined(fd, "pulseRate"),
    oxygenSaturation: numberOrUndefined(fd, "oxygenSaturation"),
  };
  busy.value = true;
  formError.value = null;
  try {
    const { data } = await api.createWalkIn({
      studentNumber: text(fd, "studentNumber"),
      requestType: "checkup",
      reason: textOrUndefined(fd, "reason") ?? "Vital signs check",
      addToQueue: false,
    });
    await api.completeVisit(data._id, {
      vitals,
      assessment: needsReview(vitals) ? "Vital signs outside normal range — for review" : "Vital signs within normal range",
      dispensed: [],
    });
    notify({ title: "Health metrics recorded", detail: "The reading is now in the patient's history." });
    emit("saved");
  } catch (err) {
    formError.value = (err as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <BaseModal eyebrow="Clinical health log" modal-class="health-metric-modal" title="Record vital signs" @close="emit('close')">
    <form @submit.prevent="submit">
      <label>Student number<input autofocus name="studentNumber" placeholder="Must already have a patient record" required /></label>
      <div class="vitals-form">
        <label>Blood pressure<input name="bloodPressure" pattern="[0-9]{2,3}/[0-9]{2,3}" placeholder="120/80" required /></label>
        <label>Temperature °C<input max="45" min="30" name="temperature" placeholder="36.7" required step="0.1" type="number" /></label>
        <label>Pulse BPM<input max="220" min="30" name="pulseRate" placeholder="72" required type="number" /></label>
      </div>
      <div class="form-row">
        <label>SpO₂ %<input max="100" min="50" name="oxygenSaturation" placeholder="98" type="number" /></label>
        <label>Purpose<input name="reason" placeholder="Vital signs check" /></label>
      </div>
      <p v-if="formError" class="login-error" role="alert">{{ formError }}</p>
      <div class="modal-actions">
        <BaseButton variant="ghost" @click="emit('close')">Cancel</BaseButton>
        <BaseButton :disabled="busy" icon="plus" type="submit">{{ busy ? "Saving…" : "Save health log" }}</BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
