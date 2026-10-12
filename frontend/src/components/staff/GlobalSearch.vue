<script setup lang="ts">
import { computed, ref } from "vue";
import { api, patientName, REQUEST_TYPE_LABELS, type Patient, type Visit } from "@/api";
import AppIcon from "@/components/ui/AppIcon.vue";
import BaseModal from "@/components/ui/BaseModal.vue";
import { useApi, useDebounced } from "@/composables/useApi";

const emit = defineEmits<{ close: []; openVisit: [id: string]; openPatient: [studentNumber: string] }>();

const query = ref("");
const debounced = useDebounced(query);
const q = computed(() => debounced.value.trim());
const visits = useApi(() => (q.value ? api.visits({ search: q.value, limit: 8 }).then((r) => r.data) : Promise.resolve([] as Visit[])), [q]);
const patients = useApi(() => (q.value ? api.patients({ search: q.value, limit: 4 }).then((r) => r.data) : Promise.resolve([] as Patient[])), [q]);
const nothing = computed(() => q.value && !visits.loading.value && !patients.loading.value && !visits.data.value?.length && !patients.data.value?.length);
</script>

<template>
  <BaseModal eyebrow="AngeliteCare records" modal-class="admin-search-modal" title="Search clinic data" @close="emit('close')">
    <div class="admin-search-field"><AppIcon name="search" /><input v-model="query" autofocus placeholder="Search name, student number, queue number, or concern…" /></div>
    <div class="search-results">
      <button v-for="p in patients.data.value ?? []" :key="p._id" type="button" @click="emit('openPatient', p.studentNumber)">
        <span>Patient</span><strong>{{ p.studentNumber }}</strong><small>{{ p.lastName }}, {{ p.firstName }}</small><AppIcon name="arrow" />
      </button>
      <button v-for="v in visits.data.value ?? []" :key="v._id" type="button" @click="emit('openVisit', v._id)">
        <span>{{ REQUEST_TYPE_LABELS[v.requestType] }}</span><strong>{{ v.queueNumber }}</strong><small>{{ patientName(v.patient) }} · {{ new Date(v.createdAt).toLocaleDateString() }}</small><AppIcon name="arrow" />
      </button>
      <p v-if="nothing">No matching clinic records found.</p>
      <p v-if="!q">Type at least one character to search.</p>
    </div>
  </BaseModal>
</template>
