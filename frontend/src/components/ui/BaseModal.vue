<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";

const props = defineProps<{ eyebrow: string; title: string; modalClass?: string }>();
const emit = defineEmits<{ close: [] }>();

const titleId = computed(() => `modal-${props.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`);

function onKey(event: KeyboardEvent) {
  if (event.key === "Escape") emit("close");
}

let previousOverflow = "";
onMounted(() => {
  previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  window.addEventListener("keydown", onKey);
});
onUnmounted(() => {
  document.body.style.overflow = previousOverflow;
  window.removeEventListener("keydown", onKey);
});
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop" role="presentation" @mousedown.self="emit('close')">
      <div :aria-labelledby="titleId" aria-modal="true" :class="['modal', modalClass]" role="dialog">
        <div class="modal-head">
          <div><span class="eyebrow">{{ eyebrow }}</span><h2 :id="titleId">{{ title }}</h2></div>
          <button :aria-label="`Close ${title}`" type="button" @click="emit('close')">×</button>
        </div>
        <slot />
      </div>
    </div>
  </Teleport>
</template>
