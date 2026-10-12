<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { api, fmtTime, patientName, REQUEST_TYPE_LABELS, type RequestType, type Visit } from "@/api";
import AppIcon from "@/components/ui/AppIcon.vue";
import BaseButton from "@/components/ui/BaseButton.vue";
import type { IconName } from "@/components/ui/icons";
import LoadRow from "@/components/ui/LoadRow.vue";
import StatusChip from "@/components/ui/StatusChip.vue";
import { useApi } from "@/composables/useApi";
import { staffUi } from "@/stores/staffUi";

const router = useRouter();
const WEEKDAY = ["S", "M", "T", "W", "T", "F", "S"];
const TYPE_COLORS = ["var(--sangria)", "var(--cornflower)", "#c99a5b", "var(--sangria-soft)", "#9fb3cf"];

const days: string[] = [];
for (let i = 6; i >= 0; i -= 1) {
  const d = new Date();
  d.setDate(d.getDate() - i);
  days.push(d.toLocaleDateString("en-CA"));
}

const refreshKey = () => staffUi.refreshKey;
const summary = useApi(() => api.summary(), [refreshKey], { pollMs: 30000 });
const queue = useApi(() => api.queue(), [refreshKey], { pollMs: 15000 });
const alerts = useApi(() => api.inventoryAlerts(), [refreshKey]);
const week = useApi(() => api.reports({ from: days[0], to: days[6] }), [refreshKey]);
const month = useApi(() => api.reports(), [refreshKey]);

const s = computed(() => summary.data.value);
const perDay = computed(() => new Map((week.data.value?.visitsPerDay ?? []).map((d) => [d.date, d.count])));
const maxDay = computed(() => Math.max(1, ...days.map((d) => perDay.value.get(d) ?? 0)));
const bars = computed(() => days.map((day) => {
  const count = perDay.value.get(day) ?? 0;
  return { day, count, height: Math.max(3, (count / maxDay.value) * 100), label: WEEKDAY[new Date(`${day}T12:00:00`).getDay()] };
}));

const byType = computed(() => Object.entries(month.data.value?.visitsByType ?? {}) as [RequestType, number][]);
const total = computed(() => byType.value.reduce((sum, [, n]) => sum + n, 0));
const donut = computed(() => {
  if (!byType.value.length) return "conic-gradient(var(--sangria-soft) 0 100%)";
  let acc = 0;
  const parts = byType.value.map(([, n], i) => {
    const start = (acc / total.value) * 100;
    acc += n;
    return `${TYPE_COLORS[i % TYPE_COLORS.length]} ${start}% ${(acc / total.value) * 100}%`;
  });
  return `conic-gradient(${parts.join(", ")})`;
});

const queueRows = computed(() => [...(queue.data.value?.inProgress ?? []), ...(queue.data.value?.waiting ?? [])].slice(0, 6));
const alertRows = computed(() => {
  const a = alerts.data.value;
  if (!a) return [];
  return [
    ...a.lowStock.map((x) => ({ id: x._id, name: x.name, note: x.outOfStock ? "Out of stock" : `${x.availableQuantity} ${x.unit} left · reorder at ${x.reorderLevel}`, critical: x.outOfStock })),
    ...a.expired.map((x) => ({ id: x.itemId, name: x.name, note: `${x.quantity} ${x.unit} expired · lot ${x.lotNumber ?? "—"}`, critical: true })),
    ...a.expiringSoon.map((x) => ({ id: x.itemId, name: x.name, note: `${x.quantity} ${x.unit} expire in ${x.daysLeft} days`, critical: false })),
  ];
});

const stats = computed<[IconName, string, string, string][]>(() => {
  const x = s.value;
  return [
    ["calendar", "Waiting now", String(x?.today.byStatus.waiting ?? 0).padStart(2, "0"), `${x?.today.byStatus.in_progress ?? 0} being attended`],
    ["file", "Visits today", String(x?.today.total ?? 0).padStart(2, "0"), `${x?.today.byStatus.completed ?? 0} completed`],
    ["heart", "Avg. wait", x?.today.avgWaitMinutes != null ? `${x.today.avgWaitMinutes}m` : "—", x?.today.avgConsultMinutes != null ? `${x.today.avgConsultMinutes} min per consultation` : "No consultations yet"],
    ["box", "Inventory alerts", String((x?.inventory.lowStock ?? 0) + (x?.inventory.expiringSoon ?? 0) + (x?.inventory.itemsWithExpiredStock ?? 0)).padStart(2, "0"), `${x?.inventory.lowStock ?? 0} low · ${x?.inventory.expiringSoon ?? 0} expiring`],
  ];
});

function openRow(visit: Visit) {
  if (visit.status === "in_progress") staffUi.visitId = visit._id;
  else router.push({ name: "queue" });
}
</script>

<template>
  <p v-if="summary.error.value" class="load-state error-text">{{ summary.error.value }}</p>
  <div class="stat-grid">
    <article v-for="[icon, label, number, note] in stats" :key="label">
      <span class="stat-icon"><AppIcon :name="icon" /></span><small>{{ label }}</small><strong>{{ number }}</strong><p>{{ note }}</p>
    </article>
  </div>
  <div class="dashboard-grid">
    <section class="panel appointments-panel">
      <div class="panel-head">
        <div><h2>Live consultation queue</h2><p>{{ queue.data.value?.waiting.length ?? 0 }} waiting · {{ queue.data.value?.inProgress.length ?? 0 }} in progress</p></div>
        <BaseButton variant="ghost" @click="router.push({ name: 'queue' })">Open queue</BaseButton>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>No.</th><th>Patient</th><th>Request</th><th>Status</th><th /></tr></thead>
          <tbody>
            <tr v-for="visit in queueRows" :key="visit._id">
              <td>{{ visit.queueNumber }}<br /><small>{{ fmtTime(visit.createdAt) }}</small></td>
              <td>{{ patientName(visit.patient) }}</td>
              <td>{{ REQUEST_TYPE_LABELS[visit.requestType] }}</td>
              <td><span v-if="visit.priority === 'urgent' && visit.status === 'waiting'" class="chip chip-urgent">Urgent</span><StatusChip v-else :status="visit.status" /></td>
              <td><button :aria-label="`Open ${visit.queueNumber}`" type="button" @click="openRow(visit)">•••</button></td>
            </tr>
            <LoadRow :colspan="5" :empty="!queueRows.length" empty-text="No students in the queue right now." :error="queue.error.value" :loading="queue.loading.value && !queue.data.value" />
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel stock-panel">
      <div class="panel-head"><div><h2>Inventory alerts</h2><p>Stock and expiration risks</p></div><span class="alert-count">{{ alertRows.length }}</span></div>
      <div v-for="(row, index) in alertRows.slice(0, 5)" :key="`${row.id}-${index}`" class="stock-row">
        <span :class="{ critical: row.critical }"><AppIcon name="info" /></span>
        <div><strong>{{ row.name }}</strong><small>{{ row.note }}</small></div>
        <button type="button" @click="staffUi.restockId = row.id">Restock</button>
      </div>
      <p v-if="!alertRows.length && !alerts.loading.value" class="load-state">All stock levels are healthy.</p>
      <button v-if="alertRows.length > 5" class="text-link panel-link" type="button" @click="router.push({ name: 'expiration' })">View all {{ alertRows.length }} alerts <AppIcon name="arrow" :size="16" /></button>
    </section>

    <section class="panel chart-panel">
      <div class="panel-head"><div><h2>Patient visits</h2><p>Last 7 days · {{ week.data.value?.totalVisits ?? 0 }} total</p></div><span class="chip chip-confirmed">This week</span></div>
      <div class="bar-chart">
        <div v-for="bar in bars" :key="bar.day" :title="`${bar.day}: ${bar.count} visits`">
          <span :style="{ height: `${bar.height}%` }" /><small>{{ bar.label }}</small>
        </div>
      </div>
    </section>

    <section class="panel breakdown-panel">
      <div><h2>Visit breakdown</h2><p>Last 30 days</p></div>
      <div class="donut" :style="{ background: donut }"><span>{{ total }}<small>visits</small></span></div>
      <ul>
        <li v-for="([type, count], i) in byType" :key="type"><span :style="{ background: TYPE_COLORS[i % TYPE_COLORS.length] }" />{{ REQUEST_TYPE_LABELS[type] }} <strong>{{ Math.round((count / total) * 100) }}%</strong></li>
        <li v-if="!byType.length"><span />No visits yet <strong>0%</strong></li>
      </ul>
    </section>

    <section class="panel privacy-panel">
      <span><AppIcon name="check" /></span>
      <div><h2>Privacy controls active</h2><p>Role-based permissions, restricted patient records, and audit logging support compliance with the Data Privacy Act of 2012.</p></div>
      <BaseButton variant="ghost" @click="router.push({ name: 'access' })">Review access</BaseButton>
    </section>

    <section class="panel quick-dispatcher">
      <div class="panel-head"><div><h2>Quick actions</h2><p>Start common clinic workflows</p></div></div>
      <div>
        <button type="button" @click="staffUi.walkInOpen = true"><AppIcon name="plus" /><span><strong>New walk-in</strong><small>Encode a student at the counter</small></span></button>
        <button type="button" @click="router.push({ name: 'patients' })"><AppIcon name="file" /><span><strong>Patient records</strong><small>Search consultation history</small></span></button>
        <button type="button" @click="router.push({ name: 'inventory' })"><AppIcon name="box" /><span><strong>Medicine inventory</strong><small>Restock and monitor</small></span></button>
      </div>
    </section>

    <section class="panel notification-feed">
      <div class="panel-head"><div><h2>System notifications</h2><p>Clinic operations</p></div><span class="alert-count">{{ 1 + (alertRows.length ? 1 : 0) + (s?.patients.incompleteProfiles ? 1 : 0) }}</span></div>
      <article><span class="status-dot" /><div><strong>Clinic open today</strong><p>{{ s?.today.total ?? 0 }} requests received so far today.</p></div><time>Now</time></article>
      <article v-if="alertRows.length"><span class="status-dot" /><div><strong>Inventory review required</strong><p>{{ alertRows.length }} stock items need clinic staff attention.</p></div><time>Today</time></article>
      <article v-if="s?.patients.incompleteProfiles"><span class="status-dot" /><div><strong>Incomplete patient profiles</strong><p>{{ s.patients.incompleteProfiles }} first-time students need their records completed.</p></div><time>Today</time></article>
    </section>
  </div>
</template>
