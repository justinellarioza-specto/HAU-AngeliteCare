<script setup lang="ts">
import { computed } from "vue";
import { fmtDate, fmtDateTime, staffName, type Visit } from "@/api";
import AppIcon from "@/components/ui/AppIcon.vue";

const props = defineProps<{ visit: Visit }>();

const rows = computed(() => {
  const v = props.visit;
  const vit = v.vitals ?? {};
  const all: [string, string | undefined][] = [
    ["Date", fmtDateTime(v.createdAt)],
    ["Completed", v.completedAt ? fmtDateTime(v.completedAt) : undefined],
    ["Handled by", staffName(v.handledBy)],
    ["Blood pressure", vit.bloodPressure],
    ["Temperature", vit.temperature ? `${vit.temperature} °C` : undefined],
    ["Pulse", vit.pulseRate ? `${vit.pulseRate} bpm` : undefined],
    ["Respiratory rate", vit.respiratoryRate ? `${vit.respiratoryRate} /min` : undefined],
    ["SpO₂", vit.oxygenSaturation ? `${vit.oxygenSaturation}%` : undefined],
    ["Weight / height", vit.weight || vit.height ? `${vit.weight ?? "—"} kg / ${vit.height ?? "—"} cm` : undefined],
    ["Assessment", v.assessment],
    ["Treatment", v.treatment],
    ["Referral", v.referral],
    ["Remarks", v.remarks],
    ["Follow-up", v.followUpDate ? fmtDate(v.followUpDate) : undefined],
    ["Cancel reason", v.cancelReason],
  ];
  return all.filter(([, value]) => value);
});
</script>

<template>
  <div class="record-details">
    <div v-for="[label, value] in rows" :key="label"><span>{{ label }}</span><strong>{{ value }}</strong></div>
  </div>
  <div v-if="visit.dispensed.length" class="dispensed-list">
    <span>Dispensed</span>
    <div v-for="d in visit.dispensed" :key="d.item + d.name">
      <strong>{{ d.quantity }} {{ d.unit }} · {{ d.name }}</strong>
      <small>{{ d.instructions || "No instructions" }} · Lot {{ d.batches.map((b) => b.lotNumber || "—").join(", ") }}</small>
    </div>
  </div>
  <div class="privacy-note"><AppIcon name="info" /><p>Restricted health record. Access is logged under RA 10173 (Data Privacy Act of 2012).</p></div>
</template>
