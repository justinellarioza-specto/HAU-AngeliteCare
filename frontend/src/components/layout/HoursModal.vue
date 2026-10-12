<script setup lang="ts">
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseModal from "@/components/ui/BaseModal.vue";

const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <BaseModal eyebrow="Plan your visit" modal-class="hours-modal" title="Clinic hours" @close="emit('close')">
    <div class="hours-list">
      <div><strong>Monday–Friday</strong><span>8:00 AM–5:00 PM</span></div>
      <div><strong>Saturday</strong><span>8:00 AM–5:00 PM when classes are held</span></div>
      <p>For urgent concerns outside clinic hours, contact campus security or your nearest emergency facility.</p>
    </div>
    <div class="modal-actions"><BaseButton @click="emit('close')">Got it</BaseButton></div>
  </BaseModal>
</template>
