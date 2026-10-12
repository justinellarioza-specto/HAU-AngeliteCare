<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { api, fmtDateTime, patientName, REQUEST_TYPE_LABELS, staffName, STATUS_LABELS, type Patient, type RequestType, type Visit } from "@/api";
import BaseButton from "@/components/ui/BaseButton.vue";
import LoadRow from "@/components/ui/LoadRow.vue";
import PagerBar from "@/components/ui/PagerBar.vue";
import SearchBox from "@/components/ui/SearchBox.vue";
import StatusChip from "@/components/ui/StatusChip.vue";
import { notify, notifyError } from "@/composables/toast";
import { useApi, useDebounced } from "@/composables/useApi";
import { staffUi } from "@/stores/staffUi";

const search = ref("");
const status = ref("");
const requestType = ref("");
const from = ref("");
const to = ref("");
const page = ref(1);
const exporting = ref(false);
const q = useDebounced(search);
watch([q, status, requestType, from, to], () => { page.value = 1; });

const filters = () => ({ search: q.value, status: status.value, requestType: requestType.value, from: from.value, to: to.value });
const list = useApi(() => api.visits({ ...filters(), page: page.value, limit: 20 }), [q, status, requestType, from, to, page, () => staffUi.refreshKey]);
const summary = useApi(() => api.reports({ from: from.value, to: to.value }), [from, to, () => staffUi.refreshKey]);
const s = computed(() => summary.data.value);
const topRequest = computed(() => {
  const entries = Object.entries(s.value?.visitsByType ?? {}).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  return entries.length ? REQUEST_TYPE_LABELS[entries[0][0] as RequestType] : "—";
});
const patientOf = (v: Visit) => (typeof v.patient === "object" ? (v.patient as Patient) : null);

function csvCell(value: unknown) {
  const str = String(value ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

// Downloads every matching request as a CSV file (opens in Excel)
async function exportCsv() {
  exporting.value = true;
  try {
    const rows: Visit[] = [];
    for (let p = 1; p <= 50; p += 1) {
      const res = await api.visits({ ...filters(), page: p, limit: 100 });
      rows.push(...res.data);
      if (p >= res.pagination.totalPages) break;
    }
    const header = ["Queue no.", "Date", "Student number", "Name", "Program", "Section", "Request", "Reason", "Status", "Assessment", "Treatment", "Dispensed", "Handled by"];
    const lines = rows.map((v) => {
      const p = patientOf(v);
      return [
        v.queueNumber, fmtDateTime(v.createdAt), v.studentNumber, patientName(v.patient), p?.program, p?.section,
        REQUEST_TYPE_LABELS[v.requestType], v.reason, STATUS_LABELS[v.status], v.assessment, v.treatment,
        v.dispensed.map((d) => `${d.quantity} ${d.unit} ${d.name}`).join("; "), staffName(v.handledBy),
      ].map(csvCell).join(",");
    });
    const blob = new Blob(["﻿" + [header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `angelitecare-requests-${new Date().toLocaleDateString("en-CA")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify({ title: "Export ready", detail: `${rows.length} records downloaded as CSV` });
  } catch (err) {
    notifyError("Export failed", err);
  } finally {
    exporting.value = false;
  }
}
</script>

<template>
  <div class="stat-grid">
    <article><span class="stat-icon">Σ</span><small>Requests in range</small><strong>{{ s?.totalVisits ?? 0 }}</strong><p>{{ s ? `${s.range.from} → ${s.range.to}` : "—" }}</p></article>
    <article><span class="stat-icon">✓</span><small>Completed</small><strong>{{ s?.visitsByStatus.completed ?? 0 }}</strong><p>Saved to patient history</p></article>
    <article><span class="stat-icon">!</span><small>Top request</small><strong class="stat-text">{{ topRequest }}</strong><p>Most common reason for visit</p></article>
    <article><span class="stat-icon">℞</span><small>Most dispensed</small><strong class="stat-text">{{ s?.topDispensedItems[0]?.name ?? "—" }}</strong><p>{{ s?.topDispensedItems[0] ? `${s.topDispensedItems[0].quantity} units` : "No items dispensed" }}</p></article>
  </div>
  <section class="panel module-panel">
    <div class="module-toolbar report-toolbar">
      <SearchBox v-model="search" placeholder="Search name, student no., queue no., concern…" />
      <div class="toolbar-filters">
        <select v-model="requestType" aria-label="Request type">
          <option value="">All requests</option>
          <option v-for="(label, value) in REQUEST_TYPE_LABELS" :key="value" :value="value">{{ label }}</option>
        </select>
        <select v-model="status" aria-label="Status">
          <option value="">All statuses</option>
          <option v-for="(label, value) in STATUS_LABELS" :key="value" :value="value">{{ label }}</option>
        </select>
        <input v-model="from" aria-label="From date" type="date" />
        <input v-model="to" aria-label="To date" type="date" />
        <BaseButton :disabled="exporting" variant="secondary" @click="exportCsv">{{ exporting ? "Exporting…" : "Export CSV" }}</BaseButton>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Queue no.</th><th>Name</th><th>Student no.</th><th>Program</th><th>Request</th><th>Date</th><th>Status</th><th /></tr></thead>
        <tbody>
          <tr v-for="v in list.data.value?.data ?? []" :key="v._id">
            <td>{{ v.queueNumber }}</td>
            <td>{{ patientName(v.patient) }}</td>
            <td>{{ v.studentNumber }}</td>
            <td>{{ [patientOf(v)?.program, patientOf(v)?.section].filter(Boolean).join(" · ") || "—" }}</td>
            <td>{{ REQUEST_TYPE_LABELS[v.requestType] }}</td>
            <td>{{ fmtDateTime(v.createdAt) }}</td>
            <td><StatusChip :status="v.status" /></td>
            <td><button type="button" @click="staffUi.visitId = v._id">View</button></td>
          </tr>
          <LoadRow :colspan="8" :empty="!list.data.value?.data.length" empty-text="No matching requests." :error="list.error.value" :loading="list.loading.value" />
        </tbody>
      </table>
    </div>
    <PagerBar v-if="list.data.value" :page="list.data.value.pagination.page" :total="list.data.value.pagination.total" :total-pages="list.data.value.pagination.totalPages" @page="page = $event" />
  </section>
  <section v-if="s?.topDispensedItems.length" class="panel module-panel">
    <div class="module-toolbar"><strong>Medicine usage</strong><span>Most dispensed items in range</span></div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>#</th><th>Item</th><th>Quantity dispensed</th></tr></thead>
        <tbody><tr v-for="(d, i) in s.topDispensedItems" :key="d.item"><td>{{ i + 1 }}</td><td>{{ d.name }}</td><td>{{ d.quantity }}</td></tr></tbody>
      </table>
    </div>
  </section>
</template>
