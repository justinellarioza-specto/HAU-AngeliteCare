<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import type { Ticket } from "@/api";
import bloodDriveEvent from "@/assets/images/blood-drive-event.jpg";
import bloodDriveGuidelines from "@/assets/images/blood-drive-guidelines.jpg";
import clinicSlide1 from "@/assets/images/clinic-slide-1.jpg";
import clinicSlide2 from "@/assets/images/clinic-slide-2.jpg";
import clinicSlide3 from "@/assets/images/clinic-slide-3.jpg";
import clinicSlide4 from "@/assets/images/clinic-slide-4.jpg";
import clinicSlide5 from "@/assets/images/clinic-slide-5.jpg";
import hauCampusMap from "@/assets/images/hau-campus-map.jpg";
import RequestModal from "@/components/student/RequestModal.vue";
import TicketModal from "@/components/student/TicketModal.vue";
import AppIcon from "@/components/ui/AppIcon.vue";
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseModal from "@/components/ui/BaseModal.vue";
import type { IconName } from "@/components/ui/icons";
import SectionTitle from "@/components/ui/SectionTitle.vue";
import { loadSavedTicket, saveTicket, type SavedTicket } from "@/composables/ticket";
import { publicUi } from "@/stores/publicUi";

const clinicSlides = [
  { src: clinicSlide1, alt: "AngeliteCare nursing students providing care in the campus clinic" },
  { src: clinicSlide2, alt: "AngeliteCare healthcare staff member in a learning space" },
  { src: clinicSlide3, alt: "AngeliteCare healthcare educator smiling in a classroom" },
  { src: clinicSlide4, alt: "AngeliteCare medical educator with healthcare students" },
  { src: clinicSlide5, alt: "AngeliteCare student examining a hand X-ray" },
];

const clinicServices: { icon: IconName; title: string; text: string; detail: string }[] = [
  { icon: "heart", title: "Medical Consultation", text: "Walk-in care, immediate treatment, and referrals when further examination is needed.", detail: "Visit the clinic for assessment of common illnesses, minor injuries, first aid, treatment recommendations, and referrals when additional care is required." },
  { icon: "calendar", title: "Annual Physical Exam", text: "Health assessments for Basic Education students, college freshmen, and scholarship applicants.", detail: "Physical examinations include a health history review, basic vital signs, and the required assessment documentation for eligible students." },
  { icon: "user", title: "Online Consultation", text: "Remote clinic support for university students and employees, Monday through Friday.", detail: "Online consultation provides initial guidance for non-emergency concerns and helps determine whether an in-person clinic assessment is needed." },
  { icon: "file", title: "Dental Services", text: "Dental checkups, oral health education, emergency extraction, and oral prophylaxis.", detail: "Dental care includes oral assessment, preventive education, emergency extraction when indicated, and scheduled oral prophylaxis services." },
];

type QuickAction = { title: string; copy: string; details: string[] };
const quickActions: Record<string, QuickAction> = {
  certificate: {
    title: "Medical certificate",
    copy: "Medical certificates are issued after an appropriate clinic assessment and review.",
    details: ["Bring your valid university ID.", "Visit the clinic during operating hours.", "Clinic staff will review your request and required documentation."],
  },
  emergency: {
    title: "Emergency information",
    copy: "For serious or life-threatening concerns, seek immediate emergency assistance.",
    details: ["Alert the nearest university staff member or campus security.", "Go to the nearest emergency facility when immediate care is required.", "Do not use online consultation for emergency concerns."],
  },
  online: {
    title: "Online consultation",
    copy: "Remote clinic guidance is available for non-emergency concerns from students and employees.",
    details: ["Available Monday–Friday during clinic hours.", "Prepare your university ID and a short description of your concern.", "Clinic staff may advise an in-person assessment when needed."],
  },
};

const visitSteps = [
  ["1", "Arrive", "Visit the clinic during operating hours."],
  ["2", "Get a queue number", "Request a visit online or at the counter using your student number."],
  ["3", "Get care", "Meet privately with our clinic team."],
  ["4", "Follow up", "Receive your care notes and next steps."],
];

const faqs = [
  ["Are clinic visits free?", "Basic consultations and first aid are available to currently enrolled students at no cost."],
  ["Can I walk in without an appointment?", "Yes. Walk-ins are welcome. Request a visit with your student number to get a queue number and see your place in line; urgent cases are always seen first."],
  ["Is my health information private?", "Absolutely. Your health information is handled confidentially by authorized clinic staff."],
];

// Hero slideshow
const activeSlide = ref(0);
const slideshowPaused = ref(false);
let slideTimer: number | undefined;
onMounted(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  slideTimer = window.setInterval(() => {
    if (!slideshowPaused.value) activeSlide.value = (activeSlide.value + 1) % clinicSlides.length;
  }, 5000);
});
onUnmounted(() => window.clearInterval(slideTimer));

const selectedService = ref<(typeof clinicServices)[number] | null>(null);
const selectedQuickAction = ref<QuickAction | null>(null);

// "Request a visit": student number → request type → live queue ticket (no bookings)
const requestOpen = ref(false);
const ticketOpen = ref(false);
const savedTicket = ref<SavedTicket | null>(loadSavedTicket());
const freshTicket = ref<Ticket | undefined>(undefined);

function openRequest() {
  if (savedTicket.value) ticketOpen.value = true;
  else requestOpen.value = true;
}

// The header's "Request a Visit" button
watch(() => publicUi.requestSignal, openRequest);

function handleTicket(ticket: Ticket, studentNumber: string) {
  const saved = { id: ticket.id, studentNumber };
  saveTicket(saved);
  savedTicket.value = saved;
  freshTicket.value = ticket;
  requestOpen.value = false;
  ticketOpen.value = true;
}

function clearTicket() {
  saveTicket(null);
  savedTicket.value = null;
  ticketOpen.value = false;
}

function scrollToServices() {
  document.querySelector("#services")?.scrollIntoView({ behavior: "smooth" });
}

function openImage(src: string) {
  window.open(src, "_blank", "noopener,noreferrer");
}
</script>

<template>
  <main class="student-page">
    <section id="student-top" class="student-hero">
      <div class="hero-copy">
        <div class="status-line"><span class="status-dot" /> Medical Clinic · Weekdays, 8:00 AM–5:00 PM</div>
        <h1>Care that keeps you moving forward.</h1>
        <p>Accessible medical and dental support for university students, employees, and campus visitors.</p>
        <div class="hero-buttons">
          <BaseButton icon="calendar" @click="requestOpen = true">Request a consultation</BaseButton>
          <BaseButton v-if="savedTicket" icon="clock" variant="secondary" @click="ticketOpen = true">Track my request</BaseButton>
          <BaseButton icon="arrow" variant="ghost" @click="scrollToServices">Explore services</BaseButton>
        </div>
      </div>
      <div class="hero-visual" @mouseenter="slideshowPaused = true" @mouseleave="slideshowPaused = false">
        <div class="hero-slides">
          <img
            v-for="(slide, index) in clinicSlides"
            :key="slide.src"
            :alt="slide.alt"
            :class="{ active: activeSlide === index }"
            :loading="index === 0 ? 'eager' : 'lazy'"
            :src="slide.src"
          />
        </div>
      </div>
    </section>

    <section aria-label="Quick actions" class="quick-actions">
      <button type="button" @click="selectedQuickAction = quickActions.certificate">
        <span class="quick-icon"><AppIcon name="file" /></span>
        <span><strong class="quick-title-latte">Medical Certificate</strong><small>Request or follow up</small></span>
        <AppIcon name="arrow" />
      </button>
      <button class="urgent-action" type="button" @click="selectedQuickAction = quickActions.emergency">
        <span class="quick-icon"><AppIcon name="heart" /></span>
        <span><strong class="quick-title-latte">Emergency Info</strong><small>Know what to do now</small></span>
        <AppIcon name="arrow" />
      </button>
      <button type="button" @click="selectedQuickAction = quickActions.online">
        <span class="quick-icon"><AppIcon name="user" /></span>
        <span><strong>Online Consultation</strong><small>For students and employees</small></span>
        <AppIcon name="arrow" />
      </button>
      <button type="button" @click="publicUi.hoursOpen = true">
        <span class="quick-icon"><AppIcon name="clock" /></span>
        <span><strong>Clinic Hours</strong><small>View today’s schedule</small></span>
        <AppIcon name="arrow" />
      </button>
    </section>

    <section id="services" class="story-section services-section">
      <SectionTitle copy="From a quick check-up to ongoing support, our team is here to help you feel your best." eyebrow="Here when you need us" title="Everyday care, made simple." />
      <div class="service-grid">
        <article v-for="(service, index) in clinicServices" :key="service.title" :class="['service-card', `service-${index + 1}`]">
          <span class="service-icon"><AppIcon :name="service.icon" /></span>
          <h3>{{ service.title }}</h3>
          <p>{{ service.text }}</p>
          <button class="text-link" type="button" @click="selectedService = service">Learn more <AppIcon name="arrow" :size="17" /></button>
        </article>
      </div>
    </section>

    <section id="visit-guide" class="visit-section">
      <SectionTitle copy="No guesswork. Just four clear steps from arrival to feeling better." eyebrow="Your visit" title="What to expect." />
      <div class="visit-flow">
        <div v-for="[number, title, text] in visitSteps" :key="number" class="visit-step">
          <span>{{ number }}</span><h3>{{ title }}</h3><p>{{ text }}</p>
        </div>
      </div>
    </section>

    <section id="updates" class="news-section">
      <SectionTitle copy="The university community is invited to take part in Dugong Alay, Dugtong Buhay, a two-day bloodletting activity on campus." eyebrow="Clinic news and advisories" title="Give blood. Give hope. Save lives." />
      <div class="news-feature">
        <div class="blood-drive-images">
          <img alt="Dugong Alay, Dugtong Buhay blood drive event poster" :src="bloodDriveEvent" />
          <img alt="Blood donor eligibility, preparation, and aftercare guidelines" :src="bloodDriveGuidelines" />
        </div>
        <span class="eyebrow">September 28–29, 2026 · 8:00 AM–4:00 PM</span>
        <h2>Dugong Alay, Dugtong Buhay</h2>
        <p>Visit the PGN 9th Floor at Holy Angel University. The activity is organized with AUF Medical Center and The Medical City Clark.</p>
        <BaseButton icon="arrow" variant="secondary" @click="openImage(bloodDriveGuidelines)">Review donor guidelines</BaseButton>
      </div>
      <div class="announcement-list">
        <h3>Before you donate</h3>
        <article><span>ELIGIBILITY</span><div><strong>Be in generally good health</strong><small>Donors should be 16–65 years old and at least 50 kg. Ages 16–17 require signed parent or guardian consent.</small></div></article>
        <article><span>PREPARE</span><div><strong>Rest, eat, and hydrate</strong><small>Sleep well, eat before donating, avoid fatty food, and drink plenty of water. Avoid medication, alcohol, and smoking for 24 hours prior.</small></div></article>
        <article><span>SCREENING</span><div><strong>Health checks are required</strong><small>Pulse, blood pressure, and hemoglobin will be checked. Final eligibility is subject to medical screening.</small></div></article>
        <article><span>AFTERCARE</span><div><strong>Drink more fluids afterward</strong><small>Increase fluid intake for the next 24 hours and eat after one hour. No special food is necessary.</small></div></article>
      </div>
    </section>

    <section id="contact" class="faq-contact">
      <div class="faq-block">
        <SectionTitle eyebrow="QUESTIONS?" title="Frequently asked." />
        <details v-for="[question, answer] in faqs" :key="question">
          <summary>{{ question }}<AppIcon name="plus" /></summary><p>{{ answer }}</p>
        </details>
      </div>
      <div class="contact-card">
        <span class="eyebrow">Find us on campus</span>
        <h2>Find the School Clinic.</h2>
        <p>The clinic is in the Peter G. Nepomuceno Building (PGN), marked as building 11 on the university campus map.</p>
        <img alt="Holy Angel University campus map showing the Peter G. Nepomuceno Building as number 11" class="campus-map" :src="hauCampusMap" />
        <BaseButton icon="arrow" variant="secondary" @click="openImage(hauCampusMap)">View full campus map</BaseButton>
      </div>
    </section>

    <BaseModal v-if="selectedService" eyebrow="Clinic service" modal-class="service-modal" :title="selectedService.title" @close="selectedService = null">
      <p class="service-detail">{{ selectedService.detail }}</p>
      <div class="service-availability"><AppIcon name="clock" /><div><strong>Available during clinic hours</strong><span>Monday–Friday, 8:00 AM–5:00 PM</span></div></div>
      <div class="modal-actions"><BaseButton @click="selectedService = null">Got it</BaseButton></div>
    </BaseModal>

    <BaseModal v-if="selectedQuickAction" eyebrow="AngeliteCare" modal-class="quick-action-modal" :title="selectedQuickAction.title" @close="selectedQuickAction = null">
      <p class="service-detail">{{ selectedQuickAction.copy }}</p>
      <ol class="quick-action-list">
        <li v-for="(detail, index) in selectedQuickAction.details" :key="detail"><span>{{ index + 1 }}</span><p>{{ detail }}</p></li>
      </ol>
      <div class="modal-actions"><BaseButton @click="selectedQuickAction = null">Got it</BaseButton></div>
    </BaseModal>

    <RequestModal v-if="requestOpen" @close="requestOpen = false" @ticket="handleTicket" />
    <TicketModal v-if="ticketOpen && savedTicket" :initial="freshTicket" :saved="savedTicket" @cleared="clearTicket" @close="ticketOpen = false; freshTicket = undefined" />
  </main>
</template>
