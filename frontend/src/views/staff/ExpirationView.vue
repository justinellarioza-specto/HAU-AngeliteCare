<script setup lang="ts">
import { computed } from "vue";
import { api, fmtDate } from "@/api";
import AppIcon from "@/components/ui/AppIcon.vue";
import LoadRow from "@/components/ui/LoadRow.vue";
import { notify, notifyError } from "@/composables/toast";
import { useApi } from "@/composables/useApi";
import { refresh, staffUi } from "@/stores/staffUi";

const { data, error, loading } = useApi(() => api.inventoryAlerts(), [() => staffUi.refreshKey]);

const rows = computed(() => [
  ...(data.value?.expired ?? []).map((a) => ({ ...a, state: "Expired" })),
  ...(data.value?.expiringSoon ?? []).map((a) => ({ ...a, state: a.daysLeft <= 14 ? "Expiring Soon" : "Monitor" })),
]);

async function dispose(itemId: string) {
  try {
    await api.disposeExpired(itemId);
    notify({ title: "Expired stock disposed", detail: "Removal recorded in the stock ledger." });
    refresh();
  } catch (err) {
    notifyError("Could not dispose", err);
  }
}
</script>

<template>
  <section class="panel module-panel">
    <div class="module-toolbar"><strong>Expired and expiring batches</strong><span>Warning window: {{ data?.expiryWarningDays ?? 30 }} days</span></div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Medicine</th><th>Batch</th><th>Quantity</th><th>Expiration</th><th>Time remaining</th><th>Status</th><th /></tr></thead>
        <tbody>
          <tr v-for="r in rows" :key="r.batchId">
            <td>{{ r.name }}</td>
            <td>{{ r.lotNumber || "—" }}</td>
            <td>{{ r.quantity }} {{ r.unit }}</td>
            <td>{{ fmtDate(r.expirationDate) }}</td>
            <td>{{ r.daysLeft <= 0 ? `${Math.abs(r.daysLeft)} days ago` : `${r.daysLeft} days` }}</td>
            <td><span :class="['status-indicator', r.state === 'Monitor' ? 'status-low' : 'status-critical']">{{ r.state }}</span></td>
            <td>
              <button v-if="r.state === 'Expired'" type="button" @click="dispose(r.itemId)">Dispose</button>
              <button v-else type="button" @click="staffUi.restockId = r.itemId">Replace</button>
            </td>
          </tr>
          <LoadRow :colspan="7" :empty="!rows.length" empty-text="No expired or expiring batches. 🎉" :error="error" :loading="loading" />
        </tbody>
      </table>
    </div>
  </section>
  <section class="panel module-panel">
    <div class="module-toolbar"><strong>Low stock</strong><span>{{ data?.lowStock.length ?? 0 }} items at or below reorder level</span></div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Item</th><th>Available</th><th>Reorder at</th><th>Status</th><th /></tr></thead>
        <tbody>
          <tr v-for="l in data?.lowStock ?? []" :key="l._id">
            <td>{{ l.name }}</td><td>{{ l.availableQuantity }} {{ l.unit }}</td><td>{{ l.reorderLevel }} {{ l.unit }}</td>
            <td><span :class="['status-indicator', l.outOfStock ? 'status-critical' : 'status-low']">{{ l.outOfStock ? "Out of stock" : "Low" }}</span></td>
            <td><button type="button" @click="staffUi.restockId = l._id">Restock</button></td>
          </tr>
          <LoadRow :colspan="5" :empty="!data?.lowStock.length" empty-text="All items are above their reorder level." :error="error" :loading="loading" />
        </tbody>
      </table>
    </div>
    <div class="privacy-note"><AppIcon name="info" /><p>Expired batches are never dispensed. Disposing removes them from stock and records the action in the ledger.</p></div>
  </section>
</template>
