<script setup lang="ts">
import { computed } from "vue";
import { api, fmtDateTime, needsReview, patientName } from "@/api";
import LoadRow from "@/components/ui/LoadRow.vue";
import { useApi } from "@/composables/useApi";
import { staffUi } from "@/stores/staffUi";

// Vital signs come from completed consultations, so every reading is tied to a clinic visit
const { data, error, loading } = useApi(
  () => api.visits({ status: "completed", limit: 100 }).then((r) => r.data.filter((v) => v.vitals && Object.keys(v.vitals).length)),
  [() => staffUi.refreshKey],
);
const readings = computed(() => data.value ?? []);
const chart = computed(() => readings.value.slice(0, 7).reverse());
const normalCount = computed(() => readings.value.filter((r) => !needsReview(r.vitals)).length);
const clamp = (n: number) => Math.max(8, Math.min(100, n));
</script>

<template>
  <div class="health-metrics-layout">
    <section class="panel metrics-chart-panel">
      <div class="panel-head"><div><h2>Health progression</h2><p>Latest temperature and pulse readings</p></div><span class="chip chip-approved">{{ normalCount }} normal</span></div>
      <div class="metrics-charts">
        <div><span>Temperature °C</span><div><i v-for="v in chart" :key="v._id" :style="{ height: `${clamp(((v.vitals?.temperature ?? 35) - 35) * 35)}%` }" :title="`${v.vitals?.temperature ?? '—'} °C`" /></div></div>
        <div><span>Pulse BPM</span><div><i v-for="v in chart" :key="v._id" :style="{ height: `${clamp(v.vitals?.pulseRate ?? 0)}%` }" :title="`${v.vitals?.pulseRate ?? '—'} BPM`" /></div></div>
      </div>
    </section>
    <section class="panel metrics-history">
      <div class="panel-head"><div><h2>Historical health logs</h2><p>{{ readings.length }} recorded assessments · flagged when temp ≥ 37.5 °C, pulse &gt; 100, SpO₂ &lt; 95% or BP ≥ 140/90</p></div></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Student</th><th>Student no.</th><th>Blood pressure</th><th>Temperature</th><th>Pulse</th><th>SpO₂</th><th>Timestamp</th><th>Status</th><th /></tr></thead>
          <tbody>
            <tr v-for="v in readings" :key="v._id">
              <td>{{ patientName(v.patient) }}</td>
              <td>{{ v.studentNumber }}</td>
              <td>{{ v.vitals?.bloodPressure ?? "—" }}</td>
              <td>{{ v.vitals?.temperature ? `${v.vitals.temperature} °C` : "—" }}</td>
              <td>{{ v.vitals?.pulseRate ? `${v.vitals.pulseRate} BPM` : "—" }}</td>
              <td>{{ v.vitals?.oxygenSaturation ? `${v.vitals.oxygenSaturation}%` : "—" }}</td>
              <td>{{ fmtDateTime(v.completedAt ?? v.createdAt) }}</td>
              <td><span :class="['chip', needsReview(v.vitals) ? 'chip-pending' : 'chip-approved']">{{ needsReview(v.vitals) ? "Needs review" : "Normal" }}</span></td>
              <td><button type="button" @click="staffUi.visitId = v._id">Open</button></td>
            </tr>
            <LoadRow :colspan="9" :empty="!readings.length" empty-text="No vital signs recorded yet." :error="error" :loading="loading" />
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
