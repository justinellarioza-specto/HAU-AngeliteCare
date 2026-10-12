<script setup lang="ts">
import { ref } from "vue";
import { api, fmtDate, fmtDateTime } from "@/api";
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseModal from "@/components/ui/BaseModal.vue";
import LoadRow from "@/components/ui/LoadRow.vue";
import { notify, notifyError } from "@/composables/toast";
import { useApi } from "@/composables/useApi";
import ItemFormModal from "./ItemFormModal.vue";

const props = defineProps<{ itemId: string }>();
const emit = defineEmits<{ close: []; changed: [] }>();

const item = useApi(() => api.item(props.itemId).then((r) => r.data), [() => props.itemId]);
const movements = useApi(() => api.movements({ limit: 15 }, props.itemId), [() => props.itemId]);
const adjusting = ref<string | null>(null);
const adjustQty = ref(0);
const adjustReason = ref("");
const editing = ref(false);
const now = Date.now();

async function run(action: () => Promise<unknown>, title: string) {
  try {
    await action();
    notify({ title });
    item.reload(true);
    movements.reload(true);
    emit("changed");
  } catch (err) {
    notifyError("Action failed", err);
  }
}

function startAdjust(batchId: string, quantity: number) {
  adjusting.value = batchId;
  adjustQty.value = quantity;
  adjustReason.value = "";
}

async function submitAdjust(batchId: string) {
  await run(() => api.adjust(props.itemId, { batchId, newQuantity: Number(adjustQty.value), reason: adjustReason.value.trim() }), "Stock count adjusted");
  adjusting.value = null;
}

function isExpired(date?: string) {
  return !!date && new Date(date).getTime() <= now;
}

function onEdited() {
  editing.value = false;
  item.reload();
  emit("changed");
}
</script>

<template>
  <ItemFormModal v-if="editing && item.data.value" :existing="item.data.value" @close="editing = false" @saved="onEdited" />
  <BaseModal v-else eyebrow="Medicine inventory" modal-class="patient-modal" :title="item.data.value?.name ?? 'Item details'" @close="emit('close')">
    <p v-if="item.loading.value && !item.data.value" class="load-state">Loading…</p>
    <p v-if="item.error.value" class="load-state error-text">{{ item.error.value }}</p>
    <template v-if="item.data.value">
      <div class="record-details">
        <div><span>Available</span><strong>{{ item.data.value.availableQuantity }} {{ item.data.value.unit }}</strong></div>
        <div><span>Reorder level</span><strong>{{ item.data.value.reorderLevel }} {{ item.data.value.unit }}</strong></div>
        <div><span>Category</span><strong class="capitalize">{{ [item.data.value.category, item.data.value.dosageForm, item.data.value.strength].filter(Boolean).join(" · ") }}</strong></div>
        <div><span>Shown to students</span><strong>{{ item.data.value.isRequestable ? "Yes — can be requested online" : "No" }}</strong></div>
      </div>

      <div class="history-head"><h3>Batches</h3><span>First expiry, first out</span></div>
      <div class="table-wrap history-table">
        <table>
          <thead><tr><th>Lot</th><th>Quantity</th><th>Expires</th><th>Received</th><th /></tr></thead>
          <tbody>
            <template v-for="b in item.data.value.batches" :key="b._id">
              <tr v-if="adjusting === b._id">
                <td colspan="5">
                  <form class="inline-form" @submit.prevent="submitAdjust(b._id)">
                    <input v-model.number="adjustQty" aria-label="Counted quantity" min="0" required type="number" />
                    <input v-model="adjustReason" aria-label="Reason" minlength="3" placeholder="Reason (e.g. physical count)" required />
                    <BaseButton type="submit">Save</BaseButton>
                    <BaseButton variant="ghost" @click="adjusting = null">Cancel</BaseButton>
                  </form>
                </td>
              </tr>
              <tr v-else>
                <td>{{ b.lotNumber || "—" }}</td>
                <td>{{ b.quantity }} {{ item.data.value.unit }}</td>
                <td :class="{ 'error-text': isExpired(b.expirationDate) }">{{ fmtDate(b.expirationDate) }}{{ isExpired(b.expirationDate) ? " · expired" : "" }}</td>
                <td>{{ fmtDate(b.receivedAt) }}</td>
                <td><button type="button" @click="startAdjust(b._id, b.quantity)">Adjust</button></td>
              </tr>
            </template>
            <tr v-if="!item.data.value.batches.length"><td class="empty-table" colspan="5">No stock on hand.</td></tr>
          </tbody>
        </table>
      </div>

      <div class="history-head"><h3>Stock ledger</h3><span>Latest movements</span></div>
      <div class="table-wrap history-table">
        <table>
          <thead><tr><th>Date</th><th>Type</th><th>Qty</th><th>Lot</th><th>Balance</th><th>Details</th></tr></thead>
          <tbody>
            <tr v-for="m in movements.data.value?.data ?? []" :key="m._id">
              <td>{{ fmtDateTime(m.createdAt) }}</td>
              <td class="capitalize">{{ m.type }}</td>
              <td :class="m.quantity < 0 ? 'error-text' : 'ok-text'">{{ m.quantity > 0 ? `+${m.quantity}` : m.quantity }}</td>
              <td>{{ m.lotNumber || "—" }}</td>
              <td>{{ m.balanceAfter ?? "—" }}</td>
              <td class="clinical-notes">{{ m.reason }}{{ m.performedBy ? ` · ${m.performedBy.fullName}` : "" }}</td>
            </tr>
            <LoadRow :colspan="6" :empty="!movements.data.value?.data.length" empty-text="No movements yet." :error="movements.error.value" :loading="movements.loading.value" />
          </tbody>
        </table>
      </div>

      <div class="modal-actions">
        <BaseButton v-if="item.data.value.expiredQuantity > 0" variant="ghost" @click="run(() => api.disposeExpired(props.itemId), 'Expired stock disposed')">Dispose expired ({{ item.data.value.expiredQuantity }})</BaseButton>
        <BaseButton v-if="item.data.value.isActive" variant="ghost" @click="run(() => api.archiveItem(props.itemId), 'Item archived')">Archive item</BaseButton>
        <BaseButton v-else variant="ghost" @click="run(() => api.updateItem(props.itemId, { isActive: true }), 'Item restored')">Restore item</BaseButton>
        <BaseButton variant="ghost" @click="editing = true">Edit details</BaseButton>
        <BaseButton @click="emit('close')">Close</BaseButton>
      </div>
    </template>
  </BaseModal>
</template>
