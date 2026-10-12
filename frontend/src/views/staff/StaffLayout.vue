<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import GlobalSearch from "@/components/staff/GlobalSearch.vue";
import ItemFormModal from "@/components/staff/ItemFormModal.vue";
import LogVitalsModal from "@/components/staff/LogVitalsModal.vue";
import PatientFormModal from "@/components/staff/PatientFormModal.vue";
import PatientModal from "@/components/staff/PatientModal.vue";
import RestockModal from "@/components/staff/RestockModal.vue";
import SupportModal from "@/components/staff/SupportModal.vue";
import VisitModal from "@/components/staff/VisitModal.vue";
import WalkInModal from "@/components/staff/WalkInModal.vue";
import AppIcon from "@/components/ui/AppIcon.vue";
import BaseButton from "@/components/ui/BaseButton.vue";
import type { Patient, Visit } from "@/api";
import { STAFF_MODULES } from "@/router";
import { auth, logout } from "@/stores/auth";
import { refresh, staffUi } from "@/stores/staffUi";

const route = useRoute();
const router = useRouter();
const current = computed(() => STAFF_MODULES.find((m) => m.name === route.name) ?? STAFF_MODULES[0]);

function signOut() {
  logout();
  router.push({ name: "home" });
}

function walkInCreated(visit: Visit, attendNow: boolean) {
  staffUi.walkInOpen = false;
  refresh();
  if (attendNow) staffUi.visitId = visit._id;
  else router.push({ name: "queue" });
}

function patientCreated(patient: Patient) {
  staffUi.createPatientOpen = false;
  refresh();
  staffUi.patientNumber = patient.studentNumber;
}

function openPatient(studentNumber: string) {
  staffUi.searchOpen = false;
  staffUi.patientNumber = studentNumber;
}

function openVisit(id: string) {
  staffUi.searchOpen = false;
  staffUi.visitId = id;
}
</script>

<template>
  <main v-if="auth.user" class="admin-layout">
    <aside class="admin-sidebar">
      <div class="sidebar-profile">
        <span><AppIcon name="user" /></span>
        <div><strong>{{ auth.user.fullName }}</strong><small>{{ auth.user.role === "admin" ? "Administrator" : auth.user.position || "Clinic staff" }}</small></div>
      </div>
      <nav>
        <RouterLink v-for="m in STAFF_MODULES" :key="m.name" v-slot="{ navigate, isActive }" custom :to="{ name: m.name }">
          <button :class="{ active: isActive }" type="button" @click="navigate"><AppIcon :name="m.icon" />{{ m.label }}</button>
        </RouterLink>
        <button type="button" @click="signOut"><AppIcon name="logout" />Sign out</button>
      </nav>
      <button class="sidebar-help" type="button" @click="staffUi.supportOpen = true">
        <span class="care-cross"><span /><span /></span><strong>Need support?</strong><small>Contact AngeliteCare support</small>
      </button>
    </aside>

    <section class="admin-main">
      <div class="admin-title-row">
        <div><span class="eyebrow">AngeliteCare · Secure clinic operations</span><h1>{{ current.title }}</h1><p>{{ current.copy }}</p></div>
        <div class="admin-tools">
          <button v-if="current.name !== 'profile'" class="admin-search-trigger" type="button" @click="staffUi.searchOpen = true"><AppIcon name="search" /><span>Search</span></button>
          <BaseButton v-if="current.name === 'dashboard' || current.name === 'queue'" icon="plus" @click="staffUi.walkInOpen = true">New walk-in</BaseButton>
          <BaseButton v-if="current.name === 'health-metrics'" icon="plus" @click="staffUi.vitalsOpen = true">Log health metrics</BaseButton>
          <BaseButton v-if="current.name === 'patients'" icon="plus" @click="staffUi.createPatientOpen = true">Create record</BaseButton>
          <BaseButton v-if="current.name === 'inventory'" icon="plus" @click="staffUi.createItemOpen = true">Add item</BaseButton>
        </div>
      </div>
      <RouterView />
    </section>

    <!-- Dialogs shared by several modules -->
    <VisitModal v-if="staffUi.visitId" :visit-id="staffUi.visitId" @changed="refresh" @close="staffUi.visitId = null" />
    <RestockModal v-if="staffUi.restockId" :item-id="staffUi.restockId" @close="staffUi.restockId = null" @saved="staffUi.restockId = null; refresh()" />
    <PatientModal v-if="staffUi.patientNumber" :student-number="staffUi.patientNumber" @close="staffUi.patientNumber = null" @open-visit="staffUi.visitId = $event" @saved="refresh" />
    <WalkInModal v-if="staffUi.walkInOpen" @close="staffUi.walkInOpen = false" @created="walkInCreated" />
    <LogVitalsModal v-if="staffUi.vitalsOpen" @close="staffUi.vitalsOpen = false" @saved="staffUi.vitalsOpen = false; refresh()" />
    <PatientFormModal v-if="staffUi.createPatientOpen" @close="staffUi.createPatientOpen = false" @saved="patientCreated" />
    <ItemFormModal v-if="staffUi.createItemOpen" @close="staffUi.createItemOpen = false" @saved="staffUi.createItemOpen = false; refresh()" />
    <GlobalSearch v-if="staffUi.searchOpen" @close="staffUi.searchOpen = false" @open-patient="openPatient" @open-visit="openVisit" />
    <SupportModal v-if="staffUi.supportOpen" @close="staffUi.supportOpen = false" />
  </main>
</template>
