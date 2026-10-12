<script setup lang="ts">
import { ref } from "vue";
import { api } from "@/api";
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseModal from "@/components/ui/BaseModal.vue";
import { formData, text, textOrUndefined } from "@/composables/forms";
import { notify } from "@/composables/toast";
import { useApi } from "@/composables/useApi";

const props = defineProps<{ itemId: string }>();
const emit = defineEmits<{ close: []; saved: [] }>();

const { data: item } = useApi(() => api.item(props.itemId).then((r) => r.data), [() => props.itemId]);
const busy = ref(false);
const formError = ref<string | null>(null);

async function submit(event: Event) {
  const fd = formData(event);
  const quantity = Number(text(fd, "quantity"));
  busy.value = true;
  formError.value = null;
  try {
    await api.restock(props.itemId, {
      quantity,
      lotNumber: textOrUndefined(fd, "lotNumber"),
      expirationDate: textOrUndefined(fd, "expirationDate"),
      supplier: textOrUndefined(fd, "supplier"),
    });
    notify({ title: "Stock received", detail: `${quantity} ${item.value?.unit ?? "units"} added to ${item.value?.name ?? "inventory"}` });
    emit("saved");
  } catch (err) {
    formError.value = (err as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <BaseModal eyebrow="Medicine inventory" modal-class="restock-modal" title="Receive stock" @close="emit('close')">
    <form @submit.prevent="submit">
      <div class="record-preview"><span>Item</span><strong>{{ item ? `${item.availableQuantity} ${item.unit} on hand` : "…" }}</strong><small>{{ item?.name ?? "Loading…" }}</small></div>
      <div class="form-row">
        <label>Quantity<input min="1" name="quantity" required type="number" value="50" /></label>
        <label>Lot / batch number<input name="lotNumber" placeholder="e.g. PCM-2610" /></label>
      </div>
      <div class="form-row">
        <label>Expiration date<input name="expirationDate" type="date" /></label>
        <label>Supplier<input name="supplier" placeholder="Optional" /></label>
      </div>
      <p v-if="formError" class="login-error" role="alert">{{ formError }}</p>
      <div class="modal-actions">
        <BaseButton variant="ghost" @click="emit('close')">Cancel</BaseButton>
        <BaseButton :disabled="busy" type="submit">{{ busy ? "Saving…" : "Add to inventory" }}</BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
