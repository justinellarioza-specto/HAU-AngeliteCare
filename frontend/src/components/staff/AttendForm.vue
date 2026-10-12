<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { api, type InventoryItem, type Visit, type Vitals } from "@/api";
import AppIcon from "@/components/ui/AppIcon.vue";
import BaseButton from "@/components/ui/BaseButton.vue";
import { notify } from "@/composables/toast";

const props = defineProps<{ visit: Visit; items: InventoryItem[] }>();
const emit = defineEmits<{ close: []; changed: []; saved: [visit: Visit] }>();

type DispenseLine = { item: string; quantity: number; instructions: string };

// Pre-fill the dispense lines with what the student asked for
const lines = ref<DispenseLine[]>(
  props.visit.requestedItems.filter((r) => r.item).map((r) => ({ item: String(r.item), quantity: r.quantity, instructions: "" })),
);
const busy = ref(false);
const formError = ref<string | null>(null);

// Form state (v-model) — starts from whatever was already saved for this visit
const saved = props.visit.vitals ?? {};
const vitalsForm = reactive({
  bloodPressure: saved.bloodPressure ?? "",
  temperature: saved.temperature ?? ("" as number | ""),
  pulseRate: saved.pulseRate ?? ("" as number | ""),
  respiratoryRate: saved.respiratoryRate ?? ("" as number | ""),
  oxygenSaturation: saved.oxygenSaturation ?? ("" as number | ""),
  weight: saved.weight ?? ("" as number | ""),
  height: saved.height ?? ("" as number | ""),
});
const notes = reactive({
  assessment: props.visit.assessment ?? "",
  treatment: props.visit.treatment ?? "",
  referral: props.visit.referral ?? "",
  remarks: props.visit.remarks ?? "",
});
const available = computed(() => props.items.filter((i) => i.isActive && i.availableQuantity > 0));

function readForm() {
  const vitals: Vitals = {};
  if (vitalsForm.bloodPressure.trim()) vitals.bloodPressure = vitalsForm.bloodPressure.trim();
  (["temperature", "pulseRate", "respiratoryRate", "oxygenSaturation", "weight", "height"] as const).forEach((key) => {
    const value = vitalsForm[key];
    if (value !== "" && Number.isFinite(Number(value))) vitals[key] = Number(value);
  });
  return {
    vitals: Object.keys(vitals).length ? vitals : undefined,
    assessment: notes.assessment.trim(),
    treatment: notes.treatment.trim(),
    referral: notes.referral.trim(),
    remarks: notes.remarks.trim(),
  };
}

async function saveDraft() {
  busy.value = true;
  formError.value = null;
  try {
    const { data } = await api.updateVisit(props.visit._id, readForm());
    emit("saved", { ...props.visit, ...data, patient: props.visit.patient });
    notify({ title: "Progress saved", detail: `Notes for ${props.visit.queueNumber} were saved.` });
  } catch (err) {
    formError.value = (err as Error).message;
  } finally {
    busy.value = false;
  }
}

async function complete() {
  const body = readForm();
  if (!body.assessment) {
    formError.value = "Please write an assessment before completing the visit.";
    return;
  }
  const dispensed = lines.value
    .filter((l) => l.item && Number(l.quantity) > 0)
    .map((l) => ({ item: l.item, quantity: Number(l.quantity), instructions: l.instructions.trim() || undefined }));
  busy.value = true;
  formError.value = null;
  try {
    await api.completeVisit(props.visit._id, { ...body, dispensed });
    notify({ title: "Consultation completed", detail: `${props.visit.queueNumber} was saved to the patient's history.` });
    emit("changed");
    emit("close");
  } catch (err) {
    formError.value = (err as Error).message;
  } finally {
    busy.value = false;
  }
}

async function quickAction(action: "requeue" | "noShow") {
  busy.value = true;
  try {
    if (action === "requeue") await api.requeueVisit(props.visit._id);
    else await api.noShow(props.visit._id);
    notify({ title: action === "requeue" ? "Returned to queue" : "Marked as no-show", detail: props.visit.queueNumber });
    emit("changed");
    emit("close");
  } catch (err) {
    formError.value = (err as Error).message;
    busy.value = false;
  }
}

function itemName(id: string) {
  return props.items.find((i) => i._id === id);
}
</script>

<template>
  <form class="attend-form" @submit.prevent="complete">
    <fieldset>
      <legend>Vital signs</legend>
      <div class="vitals-form vitals-grid">
        <label>Blood pressure<input v-model="vitalsForm.bloodPressure" name="bloodPressure" pattern="[0-9]{2,3}/[0-9]{2,3}" placeholder="120/80" /></label>
        <label>Temperature °C<input v-model="vitalsForm.temperature" max="45" min="30" name="temperature" placeholder="36.7" step="0.1" type="number" /></label>
        <label>Pulse (bpm)<input v-model="vitalsForm.pulseRate" max="250" min="20" name="pulseRate" placeholder="72" type="number" /></label>
        <label>Resp. rate<input v-model="vitalsForm.respiratoryRate" max="80" min="5" name="respiratoryRate" placeholder="16" type="number" /></label>
        <label>SpO₂ %<input v-model="vitalsForm.oxygenSaturation" max="100" min="50" name="oxygenSaturation" placeholder="98" type="number" /></label>
        <label>Weight (kg)<input v-model="vitalsForm.weight" max="400" min="1" name="weight" step="0.1" type="number" /></label>
        <label>Height (cm)<input v-model="vitalsForm.height" max="250" min="30" name="height" step="0.1" type="number" /></label>
      </div>
    </fieldset>
    <label>Assessment / findings<textarea v-model="notes.assessment" name="assessment" placeholder="Impression or diagnosis" rows="2" /></label>
    <label>Treatment / intervention<textarea v-model="notes.treatment" name="treatment" placeholder="What was done for the patient" rows="2" /></label>
    <div class="form-row">
      <label>Referral<input v-model="notes.referral" name="referral" placeholder="e.g. Referred to hospital ER" /></label>
      <label>Remarks<input v-model="notes.remarks" name="remarks" placeholder="Advice, follow-up, clearance issued…" /></label>
    </div>

    <fieldset>
      <legend>Dispense medicine / supplies</legend>
      <p class="field-hint">Stock is deducted automatically (nearest expiry first). Expired batches are never dispensed.</p>
      <div v-for="(line, index) in lines" :key="index" class="dispense-line">
        <select v-model="line.item" aria-label="Item">
          <option value="">Select item</option>
          <option v-for="item in available" :key="item._id" :value="item._id">{{ item.name }} — {{ item.availableQuantity }} {{ item.unit }} left</option>
          <option v-if="itemName(line.item) && itemName(line.item)!.availableQuantity === 0" :value="line.item">{{ itemName(line.item)!.name }} — out of stock</option>
        </select>
        <input v-model.number="line.quantity" aria-label="Quantity" min="1" type="number" />
        <input v-model="line.instructions" aria-label="Instructions" placeholder="Instructions (e.g. 1 tab every 4 hrs)" />
        <button aria-label="Remove line" class="line-remove" type="button" @click="lines.splice(index, 1)">×</button>
      </div>
      <button class="text-link" type="button" @click="lines.push({ item: '', quantity: 1, instructions: '' })"><AppIcon name="plus" :size="16" /> Add item</button>
    </fieldset>

    <p v-if="formError" class="login-error" role="alert">{{ formError }}</p>
    <div class="modal-actions attend-actions">
      <span>
        <button class="link-button" :disabled="busy" type="button" @click="quickAction('requeue')">Return to queue</button>
        <button class="link-button danger" :disabled="busy" type="button" @click="quickAction('noShow')">No-show</button>
      </span>
      <BaseButton :disabled="busy" variant="ghost" @click="saveDraft">Save progress</BaseButton>
      <BaseButton :disabled="busy" icon="check" type="submit">{{ busy ? "Saving…" : "Complete visit" }}</BaseButton>
    </div>
  </form>
</template>
