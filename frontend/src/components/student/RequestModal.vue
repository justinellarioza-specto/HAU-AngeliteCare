<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { api, REQUEST_TYPE_LABELS, type KioskItem, type RequestType, type Ticket } from "@/api";
import AppIcon from "@/components/ui/AppIcon.vue";
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseModal from "@/components/ui/BaseModal.vue";
import { formData, text, textOrUndefined } from "@/composables/forms";

const emit = defineEmits<{ close: []; ticket: [ticket: Ticket, studentNumber: string] }>();

const REQUEST_HINTS: Record<RequestType, string> = {
  checkup: "Feeling unwell, injuries, or a general check-up",
  medicine: "Request medicine for a minor concern",
  medical_supply: "Bandages, cold packs, and other supplies",
  certificate: "Medical clearance or certificate",
  other: "Anything else you need help with",
};
const requestTypes = Object.keys(REQUEST_TYPE_LABELS) as RequestType[];

// Step 1: student number → Step 2: choose request → submit → queue ticket
const step = ref<"id" | "form">("id");
const studentNumber = ref("");
const displayName = ref<string | null>(null);
const registered = ref(true);
const requestType = ref<RequestType>("checkup");
const items = ref<KioskItem[]>([]);
const picked = reactive<Record<string, number>>({});
const busy = ref(false);
const error = ref<string | null>(null);

onMounted(() => {
  api.kioskOptions().then((r) => { items.value = r.items; }).catch(() => { items.value = []; });
});

const visibleItems = computed(() => {
  const categories = requestType.value === "medicine" ? ["medicine"] : requestType.value === "medical_supply" ? ["supply", "equipment"] : [];
  return items.value.filter((i) => categories.includes(i.category));
});
const reasonRequired = computed(() => requestType.value === "checkup" || requestType.value === "other");
const title = computed(() => (step.value === "id" ? "Request a clinic visit" : displayName.value ? `Hi, ${displayName.value}` : "First clinic visit"));

function chooseType(type: RequestType) {
  requestType.value = type;
  Object.keys(picked).forEach((key) => delete picked[key]);
}

function toggleItem(id: string, checked: boolean) {
  if (checked) picked[id] = 1;
  else delete picked[id];
}

async function lookup() {
  busy.value = true;
  error.value = null;
  try {
    const result = await api.kioskLookup(studentNumber.value.trim());
    if (result.activeRequest) {
      emit("ticket", result.activeRequest, studentNumber.value.trim().toUpperCase());
      return;
    }
    registered.value = result.registered;
    displayName.value = result.displayName ?? null;
    step.value = "form";
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    busy.value = false;
  }
}

async function submit(event: Event) {
  const fd = formData(event);
  const requestedItems: { item?: string; name?: string; quantity: number }[] = Object.entries(picked)
    .filter(([, q]) => q > 0)
    .map(([item, quantity]) => ({ item, quantity: Number(quantity) }));
  const other = text(fd, "otherItem");
  if (other) requestedItems.push({ name: other, quantity: 1 });

  busy.value = true;
  error.value = null;
  try {
    const result = await api.kioskSubmit({
      studentNumber: studentNumber.value.trim(),
      requestType: requestType.value,
      reason: textOrUndefined(fd, "reason"),
      requestedItems: requestedItems.length ? requestedItems : undefined,
      patient: registered.value
        ? undefined
        : {
          firstName: text(fd, "firstName"),
          lastName: text(fd, "lastName"),
          program: textOrUndefined(fd, "program"),
          section: textOrUndefined(fd, "section"),
        },
    });
    emit("ticket", result.ticket, studentNumber.value.trim().toUpperCase());
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <BaseModal eyebrow="Clinic request" modal-class="booking-modal request-modal" :title="title" @close="emit('close')">
    <form v-if="step === 'id'" @submit.prevent="lookup">
      <p class="login-copy">Enter your student or employee number. You'll get a queue number and can watch your place in line — no account needed.</p>
      <label>Student number<input v-model="studentNumber" autofocus pattern="[A-Za-z0-9\-]{4,20}" placeholder="e.g. 20230001" required /></label>
      <p v-if="error" class="login-error" role="alert">{{ error }}</p>
      <div class="modal-actions">
        <BaseButton variant="ghost" @click="emit('close')">Cancel</BaseButton>
        <BaseButton :disabled="busy" icon="arrow" type="submit">{{ busy ? "Checking…" : "Continue" }}</BaseButton>
      </div>
    </form>

    <form v-else @submit.prevent="submit">
      <template v-if="!registered">
        <p class="login-copy">We don't have a clinic record for <strong>{{ studentNumber.toUpperCase() }}</strong> yet. Tell us who you are — the clinic will complete your record during your visit.</p>
        <div class="form-row">
          <label>First name<input name="firstName" required /></label>
          <label>Last name<input name="lastName" required /></label>
        </div>
        <div class="form-row">
          <label>Program<input name="program" placeholder="BSIT" /></label>
          <label>Section<input name="section" placeholder="WD-301" /></label>
        </div>
      </template>

      <fieldset class="request-types">
        <legend>What do you need?</legend>
        <label v-for="type in requestTypes" :key="type" :class="{ selected: requestType === type }">
          <input :checked="requestType === type" name="requestType" type="radio" :value="type" @change="chooseType(type)" />
          <strong>{{ REQUEST_TYPE_LABELS[type] }}</strong>
          <small>{{ REQUEST_HINTS[type] }}</small>
        </label>
      </fieldset>

      <fieldset v-if="visibleItems.length" class="item-picker">
        <legend>Select items <small>(optional — the nurse will confirm)</small></legend>
        <label v-for="item in visibleItems" :key="item._id" :class="{ disabled: !item.inStock }">
          <input :checked="!!picked[item._id]" :disabled="!item.inStock" type="checkbox" @change="toggleItem(item._id, ($event.target as HTMLInputElement).checked)" />
          <span>{{ item.name }}<small v-if="!item.inStock"> · out of stock</small></span>
          <input v-if="picked[item._id]" v-model.number="picked[item._id]" :aria-label="`Quantity of ${item.name}`" class="qty-input" max="10" min="1" type="number" />
        </label>
        <input name="otherItem" placeholder="Something else? Type it here" />
      </fieldset>

      <label>{{ reasonRequired ? "Describe your concern or symptoms" : "Notes for the clinic (optional)" }}
        <textarea name="reason" :placeholder="reasonRequired ? 'e.g. Headache and fever since this morning' : 'Anything the nurse should know'" :required="reasonRequired" rows="2" />
      </label>
      <p class="field-hint"><AppIcon name="info" :size="14" /> For emergencies, go to the clinic immediately or alert the nearest staff member.</p>
      <p v-if="error" class="login-error" role="alert">{{ error }}</p>
      <div class="modal-actions">
        <BaseButton variant="ghost" @click="step = 'id'">Back</BaseButton>
        <BaseButton :disabled="busy" icon="check" type="submit">{{ busy ? "Submitting…" : "Get queue number" }}</BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
