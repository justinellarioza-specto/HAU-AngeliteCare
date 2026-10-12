<script setup lang="ts">
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseModal from "@/components/ui/BaseModal.vue";
import { notify } from "@/composables/toast";

const emit = defineEmits<{ close: [] }>();

function submit() {
  notify({ title: "Support request submitted", detail: "AngeliteCare support has received the issue details." });
  emit("close");
}
</script>

<template>
  <BaseModal eyebrow="Technical support" modal-class="support-modal" title="AngeliteCare support" @close="emit('close')">
    <p class="login-copy">Report access problems, record errors, or system issues to the university IT team.</p>
    <form @submit.prevent="submit">
      <div class="support-details"><div><span>Support team</span><strong>AngeliteCare technical support</strong></div><div><span>Request type</span><strong>Platform assistance</strong></div></div>
      <label>Describe the issue<textarea placeholder="Tell us what happened and which portal you were using." required rows="4" /></label>
      <div class="modal-actions">
        <BaseButton variant="ghost" @click="emit('close')">Cancel</BaseButton>
        <BaseButton type="submit">Submit request</BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
