<script setup lang="ts">
import { computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AccessModal from "@/components/layout/AccessModal.vue";
import AppFooter from "@/components/layout/AppFooter.vue";
import AppHeader from "@/components/layout/AppHeader.vue";
import HoursModal from "@/components/layout/HoursModal.vue";
import LoginModal from "@/components/layout/LoginModal.vue";
import ToastHost from "@/components/ui/ToastHost.vue";
import { notify } from "@/composables/toast";
import { auth, installUnauthorizedHandler, restoreSession } from "@/stores/auth";
import { publicUi } from "@/stores/publicUi";

const route = useRoute();
const router = useRouter();
const isPublic = computed(() => route.name === "home");

restoreSession();

// Session expired while working → back to the public site
installUnauthorizedHandler(() => {
  notify({ title: "Session expired", detail: "Please sign in again.", error: true });
  router.push({ name: "home" });
});

// The router guard sends logged-out visitors to /?login=staff — open the login dialog for them
watch(
  () => route.query.login,
  (portal) => {
    if (portal === "staff" || portal === "developer") {
      publicUi.loginPortal = portal;
      publicUi.loginRedirect = typeof route.query.redirect === "string" ? route.query.redirect : null;
      router.replace({ name: "home" });
    }
  },
  { immediate: true },
);

function choosePortal(portal: "staff" | "developer") {
  publicUi.accessOpen = false;
  if (auth.user && (portal === "staff" || auth.user.role === "admin")) {
    router.push(portal === "staff" ? "/staff/dashboard" : "/developer");
    return;
  }
  publicUi.loginPortal = portal;
  publicUi.loginRedirect = null;
}

function loggedIn() {
  const target = publicUi.loginRedirect || (publicUi.loginPortal === "developer" ? "/developer" : "/staff/dashboard");
  publicUi.loginPortal = null;
  publicUi.loginRedirect = null;
  router.push(target);
}
</script>

<template>
  <div class="app-shell">
    <AppHeader />
    <RouterView />
    <AppFooter v-if="isPublic" />

    <HoursModal v-if="publicUi.hoursOpen" @close="publicUi.hoursOpen = false" />
    <AccessModal v-if="publicUi.accessOpen" @choose="choosePortal" @close="publicUi.accessOpen = false" />
    <LoginModal v-if="publicUi.loginPortal" :portal="publicUi.loginPortal" @close="publicUi.loginPortal = null" @success="loggedIn" />
    <ToastHost />
  </div>
</template>
