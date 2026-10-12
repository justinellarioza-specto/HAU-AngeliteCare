<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import BaseButton from "@/components/ui/BaseButton.vue";
import AppIcon from "@/components/ui/AppIcon.vue";
import BrandMark from "@/components/ui/BrandMark.vue";
import { auth, logout } from "@/stores/auth";
import { publicUi } from "@/stores/publicUi";

const route = useRoute();
const router = useRouter();
const isPublic = computed(() => route.name === "home");

function signOut() {
  logout();
  router.push({ name: "home" });
}
</script>

<template>
  <header class="topbar">
    <div class="header-main">
      <RouterLink to="/" class="brand-link"><BrandMark /></RouterLink>
      <div class="header-actions">
        <BaseButton v-if="!isPublic" variant="ghost" @click="router.push('/')">Public website</BaseButton>
        <button class="hours" type="button" @click="publicUi.hoursOpen = true"><AppIcon name="clock" :size="17" /> Clinic Hours</button>
        <BaseButton v-if="!isPublic" icon="user" variant="ghost" @click="publicUi.accessOpen = true">Switch portal</BaseButton>
        <BaseButton v-if="!isPublic && auth.user" icon="logout" variant="ghost" @click="signOut">Sign out</BaseButton>
        <span v-if="isPublic" class="book-visit-action">
          <BaseButton icon="calendar" @click="publicUi.requestSignal++">Request a Visit</BaseButton>
        </span>
      </div>
    </div>
    <nav v-if="isPublic" class="clinic-nav" aria-label="Clinic navigation">
      <a href="#student-top">Home</a>
      <a href="#services">Services</a>
      <a href="#visit-guide">Visit Guide</a>
      <a href="#updates">Health Updates</a>
      <a href="#contact">Contact</a>
    </nav>
  </header>
</template>
