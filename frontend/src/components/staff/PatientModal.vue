<script setup lang="ts">
import { computed, ref } from "vue";
import { api, fmtDate, REQUEST_TYPE_LABELS, staffName, vitalsSummary } from "@/api";
import AppIcon from "@/components/ui/AppIcon.vue";
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseModal from "@/components/ui/BaseModal.vue";
import LoadRow from "@/components/ui/LoadRow.vue";
import PagerBar from "@/components/ui/PagerBar.vue";
import StatusChip from "@/components/ui/StatusChip.vue";
import { capitalize } from "@/composables/forms";
import { useApi } from "@/composables/useApi";
import PatientFormModal from "./PatientFormModal.vue";

const props = defineProps<{ studentNumber: string }>();
const emit = defineEmits<{ close: []; openVisit: [id: string]; saved: [] }>();

const editing = ref(false);
const page = ref(1);
const profile = useApi(() => api.patient(props.studentNumber), [() => props.studentNumber]);
const history = useApi(() => api.patientHistory(props.studentNumber, { all: true, page: page.value, limit: 10 }), [() => props.studentNumber, page]);
const p = computed(() => profile.data.value?.data ?? null);

const details = computed(() => {
  const x = p.value;
  if (!x) return [];
  const rows: [string, string | undefined][] = [
    ["Student no.", x.studentNumber],
    ["Type", capitalize(x.patientType)],
    ["Program", [x.program, x.yearLevel && `Year ${x.yearLevel}`, x.section].filter(Boolean).join(" · ")],
    ["Department", x.department],
    ["Sex / birth date", [capitalize(x.sex), x.birthDate && fmtDate(x.birthDate)].filter(Boolean).join(" · ")],
    ["Blood type", x.bloodType],
    ["Contact", [x.contactNumber, x.email].filter(Boolean).join(" · ")],
    ["Emergency contact", x.emergencyContact?.name ? `${x.emergencyContact.name} (${x.emergencyContact.relationship || "—"}) ${x.emergencyContact.contactNumber ?? ""}` : undefined],
    ["Allergies", x.allergies?.join(", ") || "None recorded"],
    ["Medical conditions", x.medicalConditions?.join(", ") || "None recorded"],
    ["Current medications", x.currentMedications?.join(", ")],
    ["Notes", x.notes],
  ];
  return rows.filter(([, v]) => v);
});

function onSaved() {
  editing.value = false;
  profile.reload();
  emit("saved");
}
</script>

<template>
  <PatientFormModal v-if="editing && p" :existing="p" @close="editing = false" @saved="onSaved" />
  <BaseModal v-else eyebrow="Protected clinic data" modal-class="patient-modal" :title="p ? (p.fullName ?? `${p.firstName} ${p.lastName}`) : 'Patient record'" @close="emit('close')">
    <p v-if="profile.loading.value && !p" class="load-state">Loading…</p>
    <p v-if="profile.error.value" class="load-state error-text">{{ profile.error.value }}</p>
    <template v-if="p">
      <div v-if="!p.isProfileComplete" class="allergy-alert"><AppIcon name="info" :size="18" /><p>This record was created from an online request. Please complete the student's profile.</p></div>
      <div class="record-details">
        <div v-for="[label, value] in details" :key="label"><span>{{ label }}</span><strong>{{ value }}</strong></div>
      </div>
      <div class="history-head">
        <h3>Consultation history</h3>
        <span>{{ profile.data.value?.summary.totalCompletedVisits ?? 0 }} completed visits</span>
      </div>
      <div class="table-wrap history-table">
        <table>
          <thead><tr><th>Date</th><th>Request</th><th>Assessment</th><th>Vitals</th><th>Dispensed</th><th>Status</th><th /></tr></thead>
          <tbody>
            <tr v-for="v in history.data.value?.data ?? []" :key="v._id">
              <td>{{ fmtDate(v.createdAt) }}<br /><small>{{ staffName(v.handledBy) }}</small></td>
              <td>{{ REQUEST_TYPE_LABELS[v.requestType] }}</td>
              <td class="clinical-notes">{{ v.assessment || v.reason || "—" }}</td>
              <td>{{ vitalsSummary(v.vitals) }}</td>
              <td class="clinical-notes">{{ v.dispensed.map((d) => `${d.quantity} ${d.name}`).join(", ") || "—" }}</td>
              <td><StatusChip :status="v.status" /></td>
              <td><button type="button" @click="emit('openVisit', v._id)">Open</button></td>
            </tr>
            <LoadRow :colspan="7" :empty="!history.data.value?.data.length" empty-text="No clinic visits recorded yet." :error="history.error.value" :loading="history.loading.value" />
          </tbody>
        </table>
      </div>
      <PagerBar v-if="history.data.value" :page="history.data.value.pagination.page" :total="history.data.value.pagination.total" :total-pages="history.data.value.pagination.totalPages" @page="page = $event" />
      <div class="modal-actions">
        <BaseButton variant="ghost" @click="editing = true">Edit profile</BaseButton>
        <BaseButton @click="emit('close')">Close record</BaseButton>
      </div>
    </template>
  </BaseModal>
</template>
