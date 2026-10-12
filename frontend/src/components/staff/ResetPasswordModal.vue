<script setup lang="ts">
import { ref } from "vue";
import { api, type StaffUser } from "@/api";
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseModal from "@/components/ui/BaseModal.vue";
import { formData } from "@/composables/forms";
import { notify } from "@/composables/toast";

const props = defineProps<{ user: StaffUser }>();
const emit = defineEmits<{ close: [] }>();
const formError = ref<string | null>(null);

async function submit(event: Event) {
  const fd = formData(event);
  try {
    await api.resetUserPassword(props.user._id, String(fd.get("password")));
    notify({ title: "Password reset", detail: `${props.user.username} must use the new password` });
    emit("close");
  } catch (err) {
    formError.value = (err as Error).message;
  }
}
</script>

<template>
  <BaseModal eyebrow="Privacy & access" modal-class="consultation-modal" title="Reset password" @close="emit('close')">
    <form @submit.prevent="submit">
      <div class="record-preview"><span>Account</span><strong>{{ user.username }}</strong><small>{{ user.fullName }}</small></div>
      <label>New password<input autofocus minlength="8" name="password" required type="password" /></label>
      <p v-if="formError" class="login-error" role="alert">{{ formError }}</p>
      <div class="modal-actions"><BaseButton variant="ghost" @click="emit('close')">Cancel</BaseButton><BaseButton type="submit">Reset password</BaseButton></div>
    </form>
  </BaseModal>
</template>
