<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { api, fmtDateTime, setToken } from "@/api";
import AppIcon from "@/components/ui/AppIcon.vue";
import BaseButton from "@/components/ui/BaseButton.vue";
import { notify } from "@/composables/toast";
import { auth, logout, setUser } from "@/stores/auth";

const router = useRouter();
const profileError = ref<string | null>(null);
const passwordError = ref<string | null>(null);
const profile = reactive({ fullName: auth.user?.fullName ?? "", position: auth.user?.position ?? "", email: auth.user?.email ?? "" });

async function saveProfile() {
  profileError.value = null;
  try {
    const { user } = await api.updateMe({ fullName: profile.fullName.trim(), email: profile.email.trim() || undefined, position: profile.position.trim() });
    setUser(user);
    notify({ title: "Profile updated", detail: "Account details were saved." });
  } catch (err) {
    profileError.value = (err as Error).message;
  }
}

async function savePassword(event: Event) {
  const form = event.target as HTMLFormElement;
  const fd = new FormData(form);
  if (fd.get("newPassword") !== fd.get("confirmPassword")) {
    passwordError.value = "New passwords do not match.";
    return;
  }
  passwordError.value = null;
  try {
    const { token } = await api.changePassword(String(fd.get("currentPassword")), String(fd.get("newPassword")));
    setToken(token);
    form.reset();
    notify({ title: "Password updated", detail: "Other sessions were signed out." });
  } catch (err) {
    passwordError.value = (err as Error).message;
  }
}

function signOut() {
  logout();
  router.push({ name: "home" });
}
</script>

<template>
  <div v-if="auth.user" class="account-grid">
    <section class="panel credentials-card">
      <span class="role-badge">{{ auth.user.role === "admin" ? "Administrator" : "Clinic Staff" }}</span>
      <div class="profile-avatar"><AppIcon name="user" :size="28" /></div>
      <h2>{{ auth.user.fullName }}</h2>
      <p>Authorized AngeliteCare operations account</p>
      <dl>
        <div><dt>Username</dt><dd>{{ auth.user.username }}</dd></div>
        <div><dt>Position</dt><dd>{{ auth.user.position || "—" }}</dd></div>
        <div><dt>Contact</dt><dd>{{ auth.user.email || "—" }}</dd></div>
        <div><dt>Last login</dt><dd>{{ fmtDateTime(auth.user.lastLoginAt) }}</dd></div>
      </dl>
    </section>
    <section class="panel account-form">
      <div class="panel-head"><div><h2>Personal information</h2><p>Verify account and contact credentials</p></div></div>
      <form @submit.prevent="saveProfile">
        <label>Full name<input v-model="profile.fullName" minlength="2" required /></label>
        <label>Position<input v-model="profile.position" placeholder="School Nurse" /></label>
        <label>Institutional email<input v-model="profile.email" type="email" /></label>
        <p v-if="profileError" class="login-error" role="alert">{{ profileError }}</p>
        <div class="modal-actions"><BaseButton type="submit">Save profile</BaseButton></div>
      </form>
    </section>
    <section class="panel security-form">
      <div class="panel-head"><div><h2>Password and session security</h2><p>Changing your password signs out every other session</p></div></div>
      <form @submit.prevent="savePassword">
        <label>Current password<input autocomplete="current-password" name="currentPassword" required type="password" /></label>
        <div class="form-row">
          <label>New password<input autocomplete="new-password" minlength="8" name="newPassword" required type="password" /></label>
          <label>Confirm password<input autocomplete="new-password" minlength="8" name="confirmPassword" required type="password" /></label>
        </div>
        <p v-if="passwordError" class="login-error" role="alert">{{ passwordError }}</p>
        <div class="session-row"><div><strong>Current session</strong><small>Active now · This browser</small></div><span class="chip chip-approved">Secure</span></div>
        <div class="modal-actions"><BaseButton variant="ghost" @click="signOut">Sign out</BaseButton><BaseButton type="submit">Update password</BaseButton></div>
      </form>
    </section>
  </div>
</template>
