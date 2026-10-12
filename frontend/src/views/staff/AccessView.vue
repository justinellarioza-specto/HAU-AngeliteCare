<script setup lang="ts">
import { computed, ref } from "vue";
import { api, fmtDateTime, type AuditEntry, type Role, type StaffUser } from "@/api";
import CreateStaffModal from "@/components/staff/CreateStaffModal.vue";
import ResetPasswordModal from "@/components/staff/ResetPasswordModal.vue";
import AppIcon from "@/components/ui/AppIcon.vue";
import BaseButton from "@/components/ui/BaseButton.vue";
import LoadRow from "@/components/ui/LoadRow.vue";
import PagerBar from "@/components/ui/PagerBar.vue";
import { notify, notifyError } from "@/composables/toast";
import { useApi } from "@/composables/useApi";
import { auth } from "@/stores/auth";

const ROLE_MATRIX = [
  ["Admin (clinic head)", "Full access", "Full access", "Full access + audit log", "Manage staff accounts"],
  ["Nurse (clinic staff)", "Full access", "Full access", "Clinical reports", "Own account only"],
  ["Student", "Own queue ticket only", "Request items only", "None", "No account — student number only"],
];
const AUDIT_ACTIONS = ["auth.login", "patient.view", "patient.view_history", "patient.update", "visit.view", "visit.complete", "inventory.restock", "inventory.adjust", "user.create", "user.update"];

const isAdmin = computed(() => auth.user?.role === "admin");

// Staff accounts (admin only)
const users = useApi(() => (isAdmin.value ? api.users().then((r) => r.data) : Promise.resolve([] as StaffUser[])), [isAdmin]);
const creating = ref(false);
const resetting = ref<StaffUser | null>(null);

async function update(u: StaffUser, body: Partial<StaffUser>, title: string) {
  try {
    await api.updateUser(u._id, body);
    notify({ title, detail: u.fullName });
  } catch (err) {
    notifyError("Update failed", err);
  } finally {
    users.reload(true);
  }
}

// Audit log (admin only)
const auditPage = ref(1);
const auditAction = ref("");
const audit = useApi(
  () => (isAdmin.value ? api.auditLogs({ page: auditPage.value, limit: 15, action: auditAction.value }) : Promise.resolve(null)),
  [isAdmin, auditPage, auditAction],
);

function auditRecord(entry: AuditEntry) {
  const details = entry.details as { studentNumber?: string } | undefined;
  return `${entry.entity ?? ""}${details?.studentNumber ? ` · ${details.studentNumber}` : ""}`;
}
</script>

<template>
  <section class="panel module-panel">
    <div class="module-toolbar"><strong>Role-based access</strong><span>Enforced by the server on every request</span></div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Role</th><th>Patient records</th><th>Inventory</th><th>Reports</th><th>Accounts</th></tr></thead>
        <tbody><tr v-for="row in ROLE_MATRIX" :key="row[0]"><td v-for="(cell, i) in row" :key="i">{{ cell }}</td></tr></tbody>
      </table>
    </div>
    <div v-if="!isAdmin" class="privacy-note"><AppIcon name="info" /><p>Staff accounts and the audit log are managed by the clinic administrator.</p></div>
  </section>

  <template v-if="isAdmin">
    <section class="panel module-panel">
      <div class="module-toolbar"><strong>Staff accounts</strong><BaseButton icon="plus" @click="creating = true">Add staff</BaseButton></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Username</th><th>Position</th><th>Role</th><th>Last login</th><th>Status</th><th /></tr></thead>
          <tbody>
            <tr v-for="u in users.data.value ?? []" :key="u._id">
              <td>{{ u.fullName }}<small v-if="u._id === auth.user?._id"> (you)</small></td>
              <td>{{ u.username }}</td>
              <td>{{ u.position || "—" }}</td>
              <td>
                <select :aria-label="`Role for ${u.fullName}`" class="status-select" :value="u.role" @change="update(u, { role: ($event.target as HTMLSelectElement).value as Role }, 'Role updated')">
                  <option value="admin">Admin</option><option value="nurse">Nurse</option>
                </select>
              </td>
              <td>{{ fmtDateTime(u.lastLoginAt) }}</td>
              <td><span :class="['status-indicator', u.isActive ? 'status-sufficient' : 'status-critical']">{{ u.isActive ? "Active" : "Deactivated" }}</span></td>
              <td>
                <div class="row-actions">
                  <button class="row-action" type="button" @click="resetting = u">Reset password</button>
                  <button v-if="u._id !== auth.user?._id" class="row-action muted" type="button" @click="update(u, { isActive: !u.isActive }, u.isActive ? 'Account deactivated' : 'Account reactivated')">{{ u.isActive ? "Deactivate" : "Reactivate" }}</button>
                </div>
              </td>
            </tr>
            <LoadRow :colspan="7" :empty="!users.data.value?.length" :error="users.error.value" :loading="users.loading.value" />
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel module-panel">
      <div class="module-toolbar">
        <strong>Audit log</strong>
        <select v-model="auditAction" aria-label="Filter audit actions" @change="auditPage = 1">
          <option value="">All actions</option>
          <option v-for="a in AUDIT_ACTIONS" :key="a">{{ a }}</option>
        </select>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Record</th><th>IP</th></tr></thead>
          <tbody>
            <tr v-for="entry in audit.data.value?.data ?? []" :key="entry._id">
              <td>{{ fmtDateTime(entry.createdAt) }}</td>
              <td>{{ entry.username || "—" }}</td>
              <td><code>{{ entry.action }}</code></td>
              <td class="clinical-notes">{{ auditRecord(entry) }}</td>
              <td>{{ entry.ip || "—" }}</td>
            </tr>
            <LoadRow :colspan="5" :empty="!audit.data.value?.data.length" :error="audit.error.value" :loading="audit.loading.value" />
          </tbody>
        </table>
      </div>
      <PagerBar v-if="audit.data.value" :page="audit.data.value.pagination.page" :total="audit.data.value.pagination.total" :total-pages="audit.data.value.pagination.totalPages" @page="auditPage = $event" />
    </section>
  </template>

  <CreateStaffModal v-if="creating" @close="creating = false" @saved="creating = false; users.reload(true)" />
  <ResetPasswordModal v-if="resetting" :user="resetting" @close="resetting = null" />
</template>
