<script setup lang="ts">
import AppIcon from "@/components/ui/AppIcon.vue";
import BrandMark from "@/components/ui/BrandMark.vue";
import { publicUi } from "@/stores/publicUi";
</script>

<template>
  <footer>
    <div class="footer-top">
      <div><BrandMark /><p>Campus healthcare for students, employees, and visitors.</p></div>
      <div><strong>VISIT</strong><span>#1 Holy Angel Avenue, Sto. Rosario<br />Angeles City, Philippines 2009</span></div>
      <div><strong>CLINIC HOURS</strong><span>Monday–Friday · 8:00 AM–5:00 PM<br />Saturday · 8:00 AM–5:00 PM when classes are held</span></div>
      <div><strong>CONTACT</strong><span>(045) 625-9620 / 625-9619 / 624-4688<br />Mobile · 0919 087 3328 / 0919 087 3329</span></div>
    </div>
    <div class="footer-bottom">
      <span>© 2026 AngeliteCare</span>
      <div>
        <a href="#privacy">Privacy</a><a href="#accessibility">Accessibility</a><a href="#facebook">Facebook</a><a href="#instagram">Instagram</a>
        <button class="footer-staff-access" type="button" @click="publicUi.accessOpen = true"><AppIcon name="user" :size="13" /> Staff access</button>
      </div>
    </div>
  </footer>
</template>
