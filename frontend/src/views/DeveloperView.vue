<script setup lang="ts">
import { ref, watch } from "vue";
import AppIcon from "@/components/ui/AppIcon.vue";
import BaseButton from "@/components/ui/BaseButton.vue";
import { notify } from "@/composables/toast";

type PermissionEntry = { name: string; records: string; inventory: string; reports: string; level: string };

const initialPermissions: PermissionEntry[] = [
  { name: "Clinic administrator", records: "Full access", inventory: "Full access", reports: "Full access", level: "Administrator" },
  { name: "Physician", records: "Assigned records", inventory: "View only", reports: "Clinical only", level: "Clinical" },
  { name: "Nurse", records: "Assigned records", inventory: "Issue medicine", reports: "Clinical only", level: "Clinical" },
  { name: "Inventory custodian", records: "No access", inventory: "Full access", reports: "Inventory only", level: "Operations" },
  { name: "Kitt Dumas", records: "Full access", inventory: "Full access", reports: "Full access", level: "Developer" },
  { name: "Dannah Mikayla Sanchez", records: "Full access", inventory: "Full access", reports: "Full access", level: "Developer" },
  { name: "Justine Larioza", records: "Full access", inventory: "Full access", reports: "Full access", level: "Developer" },
  { name: "Prince Laxamana", records: "Full access", inventory: "Full access", reports: "Full access", level: "Developer" },
];

const ACCESS_BY_LEVEL: Record<string, Pick<PermissionEntry, "records" | "inventory" | "reports">> = {
  Administrator: { records: "Full access", inventory: "Full access", reports: "Full access" },
  Clinical: { records: "Assigned records", inventory: "View only", reports: "Clinical only" },
  Operations: { records: "No access", inventory: "Full access", reports: "Inventory only" },
  Developer: { records: "Full access", inventory: "Full access", reports: "Full access" },
  "No access": { records: "No access", inventory: "No access", reports: "No access" },
};

// Design-time permission matrix (kept in this browser). Real access control is enforced by the API roles.
const STORAGE_KEY = "angelitecare-permissions";
function loadPermissions(): PermissionEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PermissionEntry[]) : initialPermissions;
  } catch {
    return initialPermissions;
  }
}
const permissions = ref<PermissionEntry[]>(loadPermissions());
watch(permissions, (value) => {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* ignore */ }
}, { deep: true });

function changePermission(name: string, level: string) {
  permissions.value = permissions.value.map((p) => (p.name === name ? { ...p, ...ACCESS_BY_LEVEL[level], level } : p));
}

const docs = ["Introduction", "Design system", "Components", "Site map", "API & integrations", "Permission management", "Changelog"];
const docId = (item: string) => item.toLowerCase().split(" ").join("-").replace("&", "and");
const outline = [
  ["Color tokens", "color-tokens"],
  ["Typography", "typography"],
  ["Components", "components"],
  ["Site map", "site-map"],
  ["API notes", "api-and-integrations"],
  ["Permissions", "permission-management"],
];
const activeDoc = ref("design-system");
const isDocActive = (id: string) => activeDoc.value === id || (id === "design-system" && ["color-tokens", "typography"].includes(activeDoc.value));

const endpoints = [
  ["POST", "/api/auth/login", "Staff login (returns JWT)"],
  ["POST", "/api/kiosk/requests", "Student submits a request → queue number"],
  ["GET", "/api/kiosk/requests/:id", "Ticket status and place in line"],
  ["GET", "/api/queue", "Today's live queue"],
  ["POST", "/api/queue/next", "Call the next student"],
  ["POST", "/api/visits/:id/complete", "Save consultation + dispense stock"],
  ["GET", "/api/patients/:studentNumber/visits", "Patient consultation history"],
  ["GET", "/api/inventory/alerts", "Low stock and expiring batches"],
  ["GET", "/api/dashboard/summary", "Dashboard numbers"],
];

const miniToast = ref(false);
function showMiniToast() {
  miniToast.value = true;
  window.setTimeout(() => { miniToast.value = false; }, 2500);
}
</script>

<template>
  <main class="developer-layout">
    <aside class="docs-sidebar">
      <div class="docs-search"><AppIcon name="search" /><input aria-label="Search documentation" placeholder="Search docs..." /></div>
      <nav>
        <a v-for="(item, index) in docs" :key="item" :class="{ active: isDocActive(docId(item)) }" :href="`#${docId(item)}`" @click="activeDoc = docId(item)"><span>0{{ index + 1 }}</span>{{ item }}</a>
      </nav>
      <div class="docs-version"><span class="status-dot" /><span><strong>v2.0.0</strong><small>MEVN stack</small></span></div>
    </aside>

    <article class="docs-content">
      <div id="introduction" class="docs-intro">
        <span class="eyebrow">AngeliteCare · Developer guide</span>
        <h1>Built for care.<br />Designed to scale.</h1>
        <p>Everything you need to build consistent, accessible experiences for the AngeliteCare platform — MongoDB, Express, Vue 3 and Node.js.</p>
        <div class="meta-row"><span>Last updated October 12, 2026</span><span>6 min read</span></div>
      </div>

      <section id="design-system">
        <span class="doc-number">01</span><h2>Design system</h2>
        <p>Our visual language is warm, reassuring, and unmistakably AngeliteCare. These foundational tokens keep every surface consistent.</p>
        <h3 id="color-tokens">Color tokens</h3>
        <div class="token-grid">
          <div class="token sangria"><span /><strong>Warm Garnet</strong><code>#8B2E3A</code></div>
          <div class="token cornflower"><span /><strong>Deep Blue</strong><code>#3F659A</code></div>
          <div class="token latte"><span /><strong>White</strong><code>#FFFFFF</code></div>
          <div class="token ink"><span /><strong>Ink</strong><code>#2F1719</code></div>
        </div>
        <div class="docs-callout"><AppIcon name="info" /><div><strong>Accessibility first</strong><p>All foreground and background combinations are tested to meet WCAG 2.1 AA contrast requirements.</p></div></div>
        <h3 id="typography">Typography</h3>
        <div class="type-specimens">
          <div><span>DISPLAY / LIBRE BASKERVILLE</span><strong>Aa</strong><p>Care that keeps you moving forward.</p></div>
          <div><span>BODY / SOURCE SANS 3</span><strong>Aa</strong><p>Clear, friendly, and comfortable to read at every size.</p></div>
        </div>
      </section>

      <section id="components">
        <span class="doc-number">02</span><h2>Components</h2>
        <p>Reusable Vue components (<code>BaseButton</code>, <code>BaseModal</code>, <code>StatusChip</code>…) with consistent states, interactions, and accessibility built in.</p>
        <div class="component-preview">
          <div><small>BUTTONS</small><span class="preview-row"><BaseButton>Primary</BaseButton><BaseButton variant="secondary">Secondary</BaseButton><BaseButton variant="ghost">Ghost</BaseButton></span></div>
          <div><small>STATUS CHIPS</small><span class="preview-row"><span class="chip chip-confirmed">Confirmed</span><span class="chip chip-urgent">Urgent</span><span class="chip chip-waiting">Waiting</span></span></div>
          <div><small>INPUTS</small><span class="preview-row"><input aria-label="Sample email" placeholder="student@hau.edu.ph" /><BaseButton @click="showMiniToast">Show toast</BaseButton></span></div>
          <div v-if="miniToast" class="mini-toast"><AppIcon name="check" /> Changes saved successfully.</div>
        </div>
      </section>

      <section id="site-map">
        <span class="doc-number">03</span><h2>Site map</h2>
        <div class="site-map">
          <strong>/</strong>
          <div><span>/ (public)</span><span>/staff/*</span><span>/developer</span></div>
          <div><small>services · visit-guide · request a visit</small><small>dashboard · queue · patients · inventory · reports</small><small>design-system · api · changelog</small></div>
        </div>
      </section>

      <section id="api-and-integrations">
        <span class="doc-number">04</span><h2>API & integrations</h2>
        <p>Node.js + Express REST API backed by MongoDB. Staff routes need an <code>Authorization: Bearer &lt;token&gt;</code> header from <code>POST /api/auth/login</code>. Kiosk routes are public and only need a student number.</p>
        <div v-for="[method, path, note] in endpoints" :key="method + path" class="endpoint"><span>{{ method }}</span><code>{{ path }}</code><small>{{ note }}</small></div>
      </section>

      <section id="permission-management">
        <span class="doc-number">05</span><h2>Permission management</h2>
        <p>Design-time permission matrix for planning roles. The live system enforces the <strong>admin</strong> and <strong>nurse</strong> roles on the server — manage real accounts in Privacy &amp; Access.</p>
        <div class="permission-manager">
          <div class="permission-head"><span>User or role</span><span>Current access</span><span>Permission level</span></div>
          <div v-for="permission in permissions" :key="permission.name" class="permission-row">
            <div><strong>{{ permission.name }}</strong><small>{{ permission.records }} · {{ permission.inventory }}</small></div>
            <span :class="['permission-badge', `permission-${permission.level.toLowerCase().split(' ').join('-')}`]">{{ permission.level }}</span>
            <select :aria-label="`Permission level for ${permission.name}`" :value="permission.level" @change="changePermission(permission.name, ($event.target as HTMLSelectElement).value)">
              <option>Administrator</option><option>Clinical</option><option>Operations</option><option>Developer</option><option>No access</option>
            </select>
          </div>
          <div class="permission-actions"><span><AppIcon name="info" /> Saved in this browser</span><BaseButton @click="notify({ title: 'Permissions saved', detail: 'The planning matrix was updated.' })">Save permissions</BaseButton></div>
        </div>
      </section>

      <section id="changelog">
        <span class="doc-number">06</span><h2>Changelog</h2>
        <div class="change"><span>v2.0.0</span><div><strong>MEVN rebuild</strong><p>Frontend moved to Vue 3 + Vue Router and connected to the Express/MongoDB API: live queue, patient history, inventory.</p></div><time>Oct 12</time></div>
        <div class="change"><span>v1.4.0</span><div><strong>Digital consultations</strong><p>Added consultation records, privacy controls, and expanded inventory monitoring.</p></div><time>Jun 12</time></div>
      </section>
    </article>

    <aside class="page-outline">
      <strong>ON THIS PAGE</strong>
      <a v-for="[item, id] in outline" :key="item" :class="{ active: activeDoc === id }" :href="`#${id}`" @click="activeDoc = id">{{ item }}</a>
    </aside>
  </main>
</template>
