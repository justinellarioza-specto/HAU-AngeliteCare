<script setup lang="ts">
import { ref, watch } from "vue";
import { api, fmtDate } from "@/api";
import AppIcon from "@/components/ui/AppIcon.vue";
import LoadRow from "@/components/ui/LoadRow.vue";
import PagerBar from "@/components/ui/PagerBar.vue";
import SearchBox from "@/components/ui/SearchBox.vue";
import { capitalize } from "@/composables/forms";
import { useApi, useDebounced } from "@/composables/useApi";
import { staffUi } from "@/stores/staffUi";

const search = ref("");
const incomplete = ref(false);
const page = ref(1);
const q = useDebounced(search);
watch([q, incomplete], () => { page.value = 1; });

const { data, error, loading } = useApi(
  () => api.patients({ search: q.value, incomplete: incomplete.value || undefined, page: page.value, limit: 20 }),
  [q, incomplete, page, () => staffUi.refreshKey],
);
</script>

<template>
  <section class="panel module-panel">
    <div class="module-toolbar">
      <SearchBox v-model="search" placeholder="Search name, student number, program, section…" />
      <label class="toggle-label"><input v-model="incomplete" type="checkbox" /> Incomplete profiles only</label>
      <span>{{ data?.pagination.total ?? 0 }} patients</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Student no.</th><th>Name</th><th>Program / section</th><th>Sex</th><th>Last visit</th><th>Profile</th><th /></tr></thead>
        <tbody>
          <tr v-for="p in data?.data ?? []" :key="p._id">
            <td>{{ p.studentNumber }}</td>
            <td>{{ p.lastName }}, {{ p.firstName }}</td>
            <td>{{ [p.program, p.yearLevel, p.section].filter(Boolean).join(" · ") || "—" }}</td>
            <td>{{ capitalize(p.sex) || "—" }}</td>
            <td>{{ fmtDate(p.lastVisitAt) }}</td>
            <td>
              <span v-if="p.isProfileComplete" class="status-indicator status-sufficient">Complete</span>
              <span v-else class="status-indicator status-low">Incomplete</span>
            </td>
            <td><button type="button" @click="staffUi.patientNumber = p.studentNumber">View</button></td>
          </tr>
          <LoadRow :colspan="7" :empty="!data?.data.length" empty-text="No matching patients found." :error="error" :loading="loading" />
        </tbody>
      </table>
    </div>
    <PagerBar v-if="data" :page="data.pagination.page" :total="data.pagination.total" :total-pages="data.pagination.totalPages" @page="page = $event" />
    <div class="privacy-note"><AppIcon name="info" /><p>Patient records are restricted to authorized clinic personnel. Every view is recorded in the audit log.</p></div>
  </section>
</template>
