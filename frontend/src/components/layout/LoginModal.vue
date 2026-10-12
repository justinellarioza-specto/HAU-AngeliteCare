<script setup lang="ts">
import { ref } from "vue";
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseModal from "@/components/ui/BaseModal.vue";
import { login, logout } from "@/stores/auth";

const props = defineProps<{ portal: "staff" | "developer" }>();
const emit = defineEmits<{ close: []; success: [] }>();

const username = ref("");
const password = ref("");
const error = ref<string | null>(null);
const busy = ref(false);

async function submit() {
  busy.value = true;
  error.value = null;
  try {
    const user = await login(username.value.trim(), password.value);
    if (props.portal === "developer" && user.role !== "admin") {
      logout();
      error.value = "Developer resources are only available to administrator accounts.";
      return;
    }
    emit("success");
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <BaseModal eyebrow="Restricted portal" modal-class="login-modal" :title="portal === 'staff' ? 'Clinic staff login' : 'Developer login'" @close="emit('close')">
    <p class="login-copy">Sign in to continue to the {{ portal === "staff" ? "clinic operations" : "developer" }} portal.</p>
    <form @submit.prevent="submit">
      <label>Username<input v-model="username" autocomplete="username" autofocus required @input="error = null" /></label>
      <label>Password<input v-model="password" autocomplete="current-password" required type="password" @input="error = null" /></label>
      <p v-if="error" class="login-error" role="alert">{{ error }}</p>
      <div class="modal-actions">
        <BaseButton variant="ghost" @click="emit('close')">Cancel</BaseButton>
        <BaseButton :disabled="busy" type="submit">{{ busy ? "Signing in…" : "Sign in" }}</BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
