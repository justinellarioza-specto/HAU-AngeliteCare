import { createRouter, createWebHistory } from "vue-router";
import { auth, restoreSession } from "@/stores/auth";
import HomeView from "@/views/HomeView.vue";

// Staff portal modules — label, icon and page heading for each route
export const STAFF_MODULES = [
  { name: "dashboard", path: "dashboard", label: "Dashboard", icon: "menu", title: "Operations dashboard", copy: "Real-time clinic requests, queue status, inventory alerts, and system notices." },
  { name: "queue", path: "queue", label: "Consultation Queue", icon: "calendar", title: "Consultation queue", copy: "Call students in order, attend consultations, and complete digital records." },
  { name: "health-metrics", path: "health-metrics", label: "Health Metrics", icon: "heart", title: "Health metrics tracker", copy: "Vital signs recorded during consultations, flagged for review when out of range." },
  { name: "patients", path: "patients", label: "Patient Records", icon: "file", title: "Centralized patient records", copy: "Search privacy-protected consultation histories without paper files." },
  { name: "inventory", path: "inventory", label: "Medicine Inventory", icon: "box", title: "Medicine inventory", copy: "Monitor available quantities, reorder points, batches, and the stock ledger." },
  { name: "expiration", path: "expiration", label: "Expiration Monitoring", icon: "clock", title: "Expiration monitoring", copy: "Identify expiring medicine early and record disposal or replacement by batch." },
  { name: "reports", path: "reports", label: "Individual Reports", icon: "file", title: "Individual request reports", copy: "Every clinic request in one place — filter by date, type or status and export to CSV." },
  { name: "access", path: "access", label: "Privacy & Access", icon: "info", title: "Privacy and role-based access", copy: "Staff accounts, permissions, and the access audit log in support of RA 10173." },
  { name: "profile", path: "profile", label: "Profile & Account", icon: "user", title: "Profile and account", copy: "Verify your account details and manage your password." },
] as const;

export type StaffModuleName = (typeof STAFF_MODULES)[number]["name"];

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: HomeView },
    {
      path: "/staff",
      component: () => import("@/views/staff/StaffLayout.vue"),
      meta: { requiresAuth: true },
      children: [
        { path: "", redirect: { name: "dashboard" } },
        { path: "dashboard", name: "dashboard", component: () => import("@/views/staff/DashboardView.vue") },
        { path: "queue", name: "queue", component: () => import("@/views/staff/QueueView.vue") },
        { path: "health-metrics", name: "health-metrics", component: () => import("@/views/staff/HealthMetricsView.vue") },
        { path: "patients", name: "patients", component: () => import("@/views/staff/PatientsView.vue") },
        { path: "inventory", name: "inventory", component: () => import("@/views/staff/InventoryView.vue") },
        { path: "expiration", name: "expiration", component: () => import("@/views/staff/ExpirationView.vue") },
        { path: "reports", name: "reports", component: () => import("@/views/staff/ReportsView.vue") },
        { path: "access", name: "access", component: () => import("@/views/staff/AccessView.vue") },
        { path: "profile", name: "profile", component: () => import("@/views/staff/ProfileView.vue") },
      ],
    },
    {
      path: "/developer",
      name: "developer",
      component: () => import("@/views/DeveloperView.vue"),
      meta: { requiresAuth: true, adminOnly: true },
    },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
  scrollBehavior(to, _from, saved) {
    if (saved) return saved;
    if (to.hash) return { el: to.hash, behavior: "smooth" };
    return { top: 0 };
  },
});

// Protect staff and developer pages. Not logged in → back to the public site with the login dialog open.
router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true;
  await restoreSession();
  if (!auth.user) return { name: "home", query: { login: to.meta.adminOnly ? "developer" : "staff", redirect: to.fullPath } };
  if (to.meta.adminOnly && auth.user.role !== "admin") return { name: "dashboard" };
  return true;
});

export default router;
