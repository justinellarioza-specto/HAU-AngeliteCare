<script setup lang="ts">
import { ref } from "vue";
import { api, REQUEST_TYPE_LABELS, type RequestType, type Visit } from "@/api";
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseModal from "@/components/ui/BaseModal.vue";
import { formData, text, textOrUndefined } from "@/composables/forms";
import { notify } from "@/composables/toast";

const emit = defineEmits<{ close: []; created: [visit: Visit, attendNow: boolean] }>();

const busy = ref(false);
const formError = ref<string | null>(null);
const needsPatient = ref(false);
const requestType = ref<RequestType>("checkup");

async function submit(event: Event) {
  const fd = formData(event);
  const studentNumber = text(fd, "studentNumber");
  const attendNow = fd.get("attendNow") === "on";
  busy.value = true;
  formError.value = null;
  try {
    if (needsPatient.value) {
      await api.createPatient({ studentNumber, firstName: text(fd, "firstName"), lastName: text(fd, "lastName"), program: textOrUndefined(fd, "program") });
    }
    const { data } = await api.createWalkIn({
      studentNumber,
      requestType: requestType.value,
      reason: textOrUndefined(fd, "reason"),
      priority: fd.get("urgent") === "on" ? "urgent" : "normal",
      addToQueue: !attendNow,
    });
    notify({ title: "Walk-in recorded", detail: `Queue number ${data.queueNumber}` });
    emit("created", data, attendNow);
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes("No patient record")) {
      needsPatient.value = true;
      formError.value = "No record yet for this student number — enter the student's name to create one.";
    } else formError.value = message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <BaseModal eyebrow="Digital clinic record" modal-class="consultation-modal" title="New walk-in" @close="emit('close')">
    <form @submit.prevent="submit">
      <label>Student / employee number<input autofocus name="studentNumber" placeholder="e.g. 20230001" required /></label>
      <div v-if="needsPatient" class="form-row three">
        <label>First name<input name="firstName" required /></label>
        <label>Last name<input name="lastName" required /></label>
        <label>Program<input name="program" placeholder="BSIT" /></label>
      </div>
      <label>Request type
        <select v-model="requestType" name="requestType">
          <option v-for="(label, value) in REQUEST_TYPE_LABELS" :key="value" :value="value">{{ label }}</option>
        </select>
      </label>
      <label>Concern / reason<textarea name="reason" placeholder="Presenting concern" rows="3" /></label>
      <div class="checkbox-row">
        <label><input name="urgent" type="checkbox" /> Urgent — move to the front of the queue</label>
        <label><input checked name="attendNow" type="checkbox" /> Attend now (skip the waiting list)</label>
      </div>
      <p v-if="formError" class="login-error" role="alert">{{ formError }}</p>
      <div class="modal-actions">
        <BaseButton variant="ghost" @click="emit('close')">Cancel</BaseButton>
        <BaseButton :disabled="busy" icon="plus" type="submit">{{ busy ? "Saving…" : "Create record" }}</BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
