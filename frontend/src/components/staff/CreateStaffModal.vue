<script setup lang="ts">
import { ref } from "vue";
import { api, type Role } from "@/api";
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseModal from "@/components/ui/BaseModal.vue";
import { formData, text, textOrUndefined } from "@/composables/forms";
import { notify } from "@/composables/toast";

const emit = defineEmits<{ close: []; saved: [] }>();
const formError = ref<string | null>(null);

async function submit(event: Event) {
  const fd = formData(event);
  try {
    await api.createUser({
      fullName: text(fd, "fullName"),
      username: text(fd, "username"),
      password: String(fd.get("password")),
      role: fd.get("role") as Role,
      position: textOrUndefined(fd, "position"),
    });
    notify({ title: "Staff account created", detail: text(fd, "username") });
    emit("saved");
  } catch (err) {
    formError.value = (err as Error).message;
  }
}
</script>

<template>
  <BaseModal eyebrow="Privacy & access" modal-class="consultation-modal" title="Add staff account" @close="emit('close')">
    <form @submit.prevent="submit">
      <label>Full name<input name="fullName" required /></label>
      <div class="form-row">
        <label>Username<input name="username" pattern="[a-zA-Z0-9._\-]{3,40}" required /></label>
        <label>Role<select name="role"><option value="nurse">Nurse</option><option value="admin">Admin</option></select></label>
      </div>
      <div class="form-row">
        <label>Position<input name="position" placeholder="School Nurse" /></label>
        <label>Temporary password<input minlength="8" name="password" required type="password" /></label>
      </div>
      <p v-if="formError" class="login-error" role="alert">{{ formError }}</p>
      <div class="modal-actions"><BaseButton variant="ghost" @click="emit('close')">Cancel</BaseButton><BaseButton type="submit">Create account</BaseButton></div>
    </form>
  </BaseModal>
</template>
