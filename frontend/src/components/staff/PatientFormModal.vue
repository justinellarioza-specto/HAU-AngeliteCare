<script setup lang="ts">
import { reactive, ref } from "vue";
import { api, type Patient } from "@/api";
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseModal from "@/components/ui/BaseModal.vue";
import { notify } from "@/composables/toast";

const props = defineProps<{ existing?: Patient }>();
const emit = defineEmits<{ close: []; saved: [patient: Patient] }>();

const e = props.existing;
const bloodTypes = ["unknown", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// Form state (v-model). Lists are edited as comma-separated text.
const form = reactive({
  studentNumber: e?.studentNumber ?? "",
  patientType: e?.patientType ?? "student",
  firstName: e?.firstName ?? "",
  middleName: e?.middleName ?? "",
  lastName: e?.lastName ?? "",
  sex: e?.sex ?? "",
  birthDate: e?.birthDate?.slice(0, 10) ?? "",
  bloodType: e?.bloodType ?? "unknown",
  department: e?.department ?? "",
  program: e?.program ?? "",
  yearLevel: e?.yearLevel ?? ("" as number | ""),
  section: e?.section ?? "",
  contactNumber: e?.contactNumber ?? "",
  email: e?.email ?? "",
  ecName: e?.emergencyContact?.name ?? "",
  ecRelationship: e?.emergencyContact?.relationship ?? "",
  ecContact: e?.emergencyContact?.contactNumber ?? "",
  allergies: e?.allergies?.join(", ") ?? "",
  medicalConditions: e?.medicalConditions?.join(", ") ?? "",
  currentMedications: e?.currentMedications?.join(", ") ?? "",
  notes: e?.notes ?? "",
});

const busy = ref(false);
const formError = ref<string | null>(null);
const toList = (value: string) => value.split(",").map((s) => s.trim()).filter(Boolean);

async function submit() {
  const body: Partial<Patient> = {
    patientType: form.patientType as Patient["patientType"],
    firstName: form.firstName.trim(),
    middleName: form.middleName.trim(),
    lastName: form.lastName.trim(),
    sex: (form.sex || undefined) as Patient["sex"],
    birthDate: form.birthDate || undefined,
    bloodType: form.bloodType,
    department: form.department.trim(),
    program: form.program.trim(),
    yearLevel: form.yearLevel === "" ? undefined : Number(form.yearLevel),
    section: form.section.trim(),
    contactNumber: form.contactNumber.trim(),
    email: form.email.trim(),
    emergencyContact: { name: form.ecName.trim(), relationship: form.ecRelationship.trim(), contactNumber: form.ecContact.trim() },
    allergies: toList(form.allergies),
    medicalConditions: toList(form.medicalConditions),
    currentMedications: toList(form.currentMedications),
    notes: form.notes.trim(),
  };
  busy.value = true;
  formError.value = null;
  try {
    const { data } = props.existing
      ? await api.updatePatient(props.existing.studentNumber, body)
      : await api.createPatient({ ...body, studentNumber: form.studentNumber.trim(), firstName: body.firstName!, lastName: body.lastName! });
    notify({ title: props.existing ? "Patient profile updated" : "Patient record created", detail: data.studentNumber });
    emit("saved", data);
  } catch (err) {
    formError.value = (err as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <BaseModal eyebrow="Centralized patient records" modal-class="patient-modal" :title="existing ? 'Edit patient profile' : 'Create patient record'" @close="emit('close')">
    <form @submit.prevent="submit">
      <div class="form-row">
        <label>Student / employee no.<input v-model="form.studentNumber" :disabled="!!existing" required /></label>
        <label>Patient type
          <select v-model="form.patientType"><option value="student">Student</option><option value="faculty">Faculty</option><option value="staff">Staff</option></select>
        </label>
      </div>
      <div class="form-row three">
        <label>First name<input v-model="form.firstName" required /></label>
        <label>Middle name<input v-model="form.middleName" /></label>
        <label>Last name<input v-model="form.lastName" required /></label>
      </div>
      <div class="form-row three">
        <label>Sex
          <select v-model="form.sex"><option value="">—</option><option value="female">Female</option><option value="male">Male</option></select>
        </label>
        <label>Birth date<input v-model="form.birthDate" type="date" /></label>
        <label>Blood type<select v-model="form.bloodType"><option v-for="b in bloodTypes" :key="b">{{ b }}</option></select></label>
      </div>
      <label>Department<input v-model="form.department" placeholder="School of Computing" /></label>
      <div class="form-row three">
        <label>Program<input v-model="form.program" placeholder="BSIT" /></label>
        <label>Year level<input v-model="form.yearLevel" max="6" min="1" type="number" /></label>
        <label>Section<input v-model="form.section" placeholder="WD-301" /></label>
      </div>
      <div class="form-row">
        <label>Contact number<input v-model="form.contactNumber" /></label>
        <label>Email<input v-model="form.email" type="email" /></label>
      </div>
      <div class="form-row three">
        <label>Emergency contact<input v-model="form.ecName" /></label>
        <label>Relationship<input v-model="form.ecRelationship" /></label>
        <label>Contact no.<input v-model="form.ecContact" /></label>
      </div>
      <label>Allergies <small>(comma-separated)</small><input v-model="form.allergies" placeholder="Penicillin, Seafood" /></label>
      <label>Medical conditions <small>(comma-separated)</small><input v-model="form.medicalConditions" placeholder="Asthma" /></label>
      <label>Current medications <small>(comma-separated)</small><input v-model="form.currentMedications" /></label>
      <label>Notes<textarea v-model="form.notes" rows="2" /></label>
      <p v-if="formError" class="login-error" role="alert">{{ formError }}</p>
      <div class="modal-actions">
        <BaseButton variant="ghost" @click="emit('close')">Cancel</BaseButton>
        <BaseButton :disabled="busy" type="submit">{{ busy ? "Saving…" : existing ? "Save changes" : "Create record" }}</BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
