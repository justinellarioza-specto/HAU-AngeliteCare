<script setup lang="ts">
import AppIcon from "@/components/ui/AppIcon.vue";
import BaseModal from "@/components/ui/BaseModal.vue";

const emit = defineEmits<{ close: []; choose: [portal: "staff" | "developer"] }>();
</script>

<template>
  <BaseModal eyebrow="AngeliteCare" modal-class="access-modal" title="Secure staff access" @close="emit('close')">
    <p class="login-copy">Choose the protected workspace you need to access.</p>
    <div class="access-options">
      <button type="button" @click="emit('choose', 'staff')">
        <span><AppIcon name="heart" /></span>
        <div><strong>Clinic operations</strong><small>Consultations, records, medicine inventory, reports, and privacy controls</small></div>
        <AppIcon name="arrow" />
      </button>
      <button type="button" @click="emit('choose', 'developer')">
        <span><AppIcon name="file" /></span>
        <div><strong>Developer resources</strong><small>System documentation, API references, components, and release notes</small></div>
        <AppIcon name="arrow" />
      </button>
    </div>
  </BaseModal>
</template>
