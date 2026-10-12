<script setup lang="ts">
import { computed } from "vue";
import { api, REQUEST_TYPE_LABELS, type InventoryItem, type Patient } from "@/api";
import AppIcon from "@/components/ui/AppIcon.vue";
import BaseModal from "@/components/ui/BaseModal.vue";
import StatusChip from "@/components/ui/StatusChip.vue";
import { useApi } from "@/composables/useApi";
import AttendForm from "./AttendForm.vue";
import VisitRecord from "./VisitRecord.vue";

// Opens a visit. In progress → staff record vitals/notes, dispense, and complete it.
// Otherwise → the saved consultation record (read-only).
const props = defineProps<{ visitId: string }>();
const emit = defineEmits<{ close: []; changed: [] }>();

const { data: visit, error, loading } = useApi(() => api.visit(props.visitId).then((r) => r.data), [() => props.visitId]);
const editable = computed(() => visit.value?.status === "in_progress");
const { data: items } = useApi(
  () => (editable.value ? api.inventory({ limit: 100 }).then((r) => r.data) : Promise.resolve([] as InventoryItem[])),
  [editable],
);
const patient = computed(() => (visit.value && typeof visit.value.patient === "object" ? (visit.value.patient as Patient) : null));
const eyebrow = computed(() => (visit.value ? `Queue no. ${visit.value.queueNumber} · ${REQUEST_TYPE_LABELS[visit.value.requestType]}` : "Consultation record"));
</script>

<template>
  <BaseModal :eyebrow="eyebrow" modal-class="visit-modal" :title="editable ? 'Attend consultation' : 'Consultation record'" @close="emit('close')">
    <p v-if="loading && !visit" class="load-state">Loading record…</p>
    <p v-if="error" class="load-state error-text">{{ error }}</p>
    <template v-if="visit">
      <div v-if="patient" class="patient-strip">
        <div>
          <span>Patient</span>
          <strong>{{ patient.fullName || `${patient.firstName} ${patient.lastName}` }}</strong>
          <small>{{ patient.studentNumber }} · {{ [patient.program, patient.yearLevel && `Year ${patient.yearLevel}`, patient.section].filter(Boolean).join(" · ") || "Program not recorded" }}</small>
        </div>
        <div><StatusChip :status="visit.status" /><span v-if="visit.priority === 'urgent'" class="chip chip-urgent">Urgent</span></div>
        <div v-if="patient.allergies?.length || patient.medicalConditions?.length" class="allergy-alert">
          <AppIcon name="info" :size="18" />
          <p>
            <template v-if="patient.allergies?.length"><strong>Allergies:</strong> {{ patient.allergies.join(", ") }}. </template>
            <template v-if="patient.medicalConditions?.length"><strong>Conditions:</strong> {{ patient.medicalConditions.join(", ") }}.</template>
          </p>
        </div>
        <div class="strip-reason">
          <span>Reason for visit</span>
          <p>{{ visit.reason || "No description provided." }}</p>
          <small v-if="visit.requestedItems.length">Requested: {{ visit.requestedItems.map((r) => `${r.quantity} × ${r.name}`).join(", ") }}</small>
        </div>
      </div>
      <AttendForm v-if="editable" :items="items ?? []" :visit="visit" @changed="emit('changed')" @close="emit('close')" @saved="(v) => (visit = v)" />
      <VisitRecord v-else :visit="visit" />
    </template>
  </BaseModal>
</template>
