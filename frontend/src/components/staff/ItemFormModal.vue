<script setup lang="ts">
import { reactive, ref } from "vue";
import { api, type InventoryItem } from "@/api";
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseModal from "@/components/ui/BaseModal.vue";
import { notify } from "@/composables/toast";

const props = defineProps<{ existing?: InventoryItem }>();
const emit = defineEmits<{ close: []; saved: [] }>();

const e = props.existing;
const form = reactive({
  name: e?.name ?? "",
  genericName: e?.genericName ?? "",
  brandName: e?.brandName ?? "",
  category: e?.category ?? "medicine",
  dosageForm: e?.dosageForm ?? "",
  strength: e?.strength ?? "",
  unit: e?.unit ?? "pc",
  reorderLevel: e?.reorderLevel ?? 10,
  isRequestable: e?.isRequestable ?? true,
  // initial stock (new items only)
  quantity: "" as number | "",
  lotNumber: "",
  expirationDate: "",
});

const busy = ref(false);
const formError = ref<string | null>(null);

async function submit() {
  const body: Record<string, unknown> = {
    name: form.name.trim(),
    genericName: form.genericName.trim(),
    brandName: form.brandName.trim(),
    category: form.category,
    dosageForm: form.dosageForm.trim(),
    strength: form.strength.trim(),
    unit: form.unit.trim(),
    reorderLevel: Number(form.reorderLevel),
    isRequestable: form.isRequestable,
  };
  if (!props.existing && form.quantity !== "" && Number(form.quantity) > 0) {
    body.initialStock = {
      quantity: Number(form.quantity),
      lotNumber: form.lotNumber.trim() || undefined,
      expirationDate: form.expirationDate || undefined,
    };
  }
  busy.value = true;
  formError.value = null;
  try {
    if (props.existing) await api.updateItem(props.existing._id, body);
    else await api.createItem(body);
    notify({ title: props.existing ? "Item updated" : "Item added", detail: form.name });
    emit("saved");
  } catch (err) {
    formError.value = (err as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <BaseModal eyebrow="Medicine inventory" modal-class="consultation-modal" :title="existing ? 'Edit item' : 'Add item'" @close="emit('close')">
    <form @submit.prevent="submit">
      <label>Item name<input v-model="form.name" placeholder="Paracetamol 500 mg" required /></label>
      <div class="form-row">
        <label>Generic name<input v-model="form.genericName" /></label>
        <label>Brand name<input v-model="form.brandName" /></label>
      </div>
      <div class="form-row three">
        <label>Category
          <select v-model="form.category"><option value="medicine">Medicine</option><option value="supply">Supply</option><option value="equipment">Equipment</option></select>
        </label>
        <label>Dosage form<input v-model="form.dosageForm" placeholder="tablet" /></label>
        <label>Strength<input v-model="form.strength" placeholder="500 mg" /></label>
      </div>
      <div class="form-row">
        <label>Unit<input v-model="form.unit" placeholder="tablet, pc, bottle" required /></label>
        <label>Reorder level<input v-model.number="form.reorderLevel" min="0" required type="number" /></label>
      </div>
      <div v-if="!existing" class="form-row three">
        <label>Initial quantity<input v-model="form.quantity" min="1" placeholder="Optional" type="number" /></label>
        <label>Lot number<input v-model="form.lotNumber" /></label>
        <label>Expiration<input v-model="form.expirationDate" type="date" /></label>
      </div>
      <div class="checkbox-row"><label><input v-model="form.isRequestable" type="checkbox" /> Students can request this item online</label></div>
      <p v-if="formError" class="login-error" role="alert">{{ formError }}</p>
      <div class="modal-actions">
        <BaseButton variant="ghost" @click="emit('close')">Cancel</BaseButton>
        <BaseButton :disabled="busy" type="submit">{{ busy ? "Saving…" : existing ? "Save changes" : "Add item" }}</BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
