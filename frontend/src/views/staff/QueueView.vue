<script setup lang="ts">
import { computed, ref } from "vue";
import { api, fmtTime, patientName, REQUEST_TYPE_LABELS, staffName, type Patient, type RequestType, type Visit } from "@/api";
import AppIcon from "@/components/ui/AppIcon.vue";
import BaseButton from "@/components/ui/BaseButton.vue";
import type { IconName } from "@/components/ui/icons";
import LoadRow from "@/components/ui/LoadRow.vue";
import StatusChip from "@/components/ui/StatusChip.vue";
import { notify, notifyError } from "@/composables/toast";
import { useApi } from "@/composables/useApi";
import { staffUi } from "@/stores/staffUi";

// Today's live queue: online requests + walk-ins. Refreshes every 15 seconds.
const { data, error, loading, reload } = useApi(() => api.queue(), [() => staffUi.refreshKey], { pollMs: 15000 });
const filter = ref<RequestType | "">("");
const busy = ref(false);

const waiting = computed(() => (data.value?.waiting ?? []).filter((v) => !filter.value || v.requestType === filter.value));
const stats = computed<[IconName, string, number, string][]>(() => {
  const c = data.value?.counts;
  return [
    ["clock", "Waiting", c?.waiting ?? 0, "In line now"],
    ["heart", "In progress", c?.in_progress ?? 0, "Being attended"],
    ["check", "Completed today", c?.completed ?? 0, "Saved to history"],
    ["info", "Cancelled / no-show", (c?.cancelled ?? 0) + (c?.no_show ?? 0), "Not attended"],
  ];
});

const patientOf = (v: Visit) => (typeof v.patient === "object" ? (v.patient as Patient) : null);

async function callNext() {
  busy.value = true;
  try {
    const result = await api.callNext(filter.value || undefined);
    if (!result.data) notify({ title: "Queue is empty", detail: result.message });
    else {
      notify({ title: `Now serving ${result.data.queueNumber}`, detail: patientName(result.data.patient) });
      staffUi.visitId = result.data._id;
    }
    reload(true);
  } catch (err) {
    notifyError("Could not call next", err);
  } finally {
    busy.value = false;
  }
}

async function act(visit: Visit, action: "call" | "cancel" | "noShow") {
  try {
    if (action === "call") {
      await api.callVisit(visit._id);
      staffUi.visitId = visit._id;
    } else if (action === "cancel") await api.cancelVisit(visit._id, "Cancelled by clinic staff");
    else await api.noShow(visit._id);
    const title = action === "call" ? `Now serving ${visit.queueNumber}` : action === "cancel" ? "Request cancelled" : "Marked as no-show";
    notify({ title, detail: visit.queueNumber });
  } catch (err) {
    notifyError("Action failed", err);
  } finally {
    reload(true);
  }
}
</script>

<template>
  <div class="queue-layout">
    <div class="stat-grid queue-stats">
      <article v-for="[icon, label, number, note] in stats" :key="label">
        <span class="stat-icon"><AppIcon :name="icon" /></span><small>{{ label }}</small><strong>{{ String(number).padStart(2, "0") }}</strong><p>{{ note }}</p>
      </article>
    </div>

    <section class="panel">
      <div class="panel-head">
        <div><h2>Now serving</h2><p>Open a ticket to record vitals, notes and dispensed items</p></div>
        <div class="queue-controls">
          <select v-model="filter" aria-label="Filter by request type">
            <option value="">All request types</option>
            <option v-for="(label, value) in REQUEST_TYPE_LABELS" :key="value" :value="value">{{ label }}</option>
          </select>
          <BaseButton :disabled="busy" icon="arrow" @click="callNext">Call next</BaseButton>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Queue no.</th><th>Patient</th><th>Request</th><th>Called</th><th>Handled by</th><th /></tr></thead>
          <tbody>
            <tr v-for="visit in data?.inProgress ?? []" :key="visit._id">
              <td><strong class="queue-number">{{ visit.queueNumber }}</strong></td>
              <td>{{ patientName(visit.patient) }}<br /><small>{{ visit.studentNumber }}</small></td>
              <td>{{ REQUEST_TYPE_LABELS[visit.requestType] }}</td>
              <td>{{ fmtTime(visit.calledAt) }}</td>
              <td>{{ staffName(visit.handledBy) }}</td>
              <td><div class="row-actions"><button class="row-action" type="button" @click="staffUi.visitId = visit._id">Attend</button></div></td>
            </tr>
            <LoadRow :colspan="6" :empty="!data?.inProgress.length" empty-text="No one is being attended right now." :error="error" :loading="loading && !data" />
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <div><h2>Waiting list</h2><p>{{ waiting.length }} in line · urgent cases first, then first come, first served · refreshes every 15 seconds</p></div>
        <button aria-label="Refresh queue" class="icon-button" type="button" @click="reload()"><AppIcon name="refresh" :size="18" /></button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Queue no.</th><th>Patient</th><th>Request</th><th>Concern</th><th>Submitted</th><th>Status</th><th /></tr></thead>
          <tbody>
            <tr v-for="(visit, index) in waiting" :key="visit._id">
              <td><strong class="queue-number">{{ visit.queueNumber }}</strong><small v-if="index === 0" class="next-tag">Next</small></td>
              <td>
                {{ patientName(visit.patient) }}
                <span v-if="patientOf(visit) && !patientOf(visit)!.isProfileComplete" class="chip chip-pending inline-chip">New</span>
                <br /><small>{{ visit.studentNumber }}{{ patientOf(visit)?.allergies?.length ? ` · ⚠ ${patientOf(visit)!.allergies!.join(", ")}` : "" }}</small>
              </td>
              <td>{{ REQUEST_TYPE_LABELS[visit.requestType] }}<br /><small>{{ visit.source === "kiosk" ? "Online request" : "Walk-in" }}</small></td>
              <td class="clinical-notes">{{ visit.reason || visit.requestedItems.map((r) => `${r.quantity} × ${r.name}`).join(", ") || "—" }}</td>
              <td>{{ fmtTime(visit.createdAt) }}</td>
              <td><span v-if="visit.priority === 'urgent'" class="chip chip-urgent">Urgent</span><StatusChip v-else :status="visit.status" /></td>
              <td>
                <div class="row-actions">
                  <button class="row-action" type="button" @click="act(visit, 'call')">Call</button>
                  <button class="row-action muted" type="button" @click="act(visit, 'noShow')">No-show</button>
                  <button class="row-action muted" type="button" @click="act(visit, 'cancel')">Cancel</button>
                </div>
              </td>
            </tr>
            <LoadRow :colspan="7" :empty="!waiting.length" empty-text="The waiting list is empty." :error="error" :loading="loading && !data" />
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
