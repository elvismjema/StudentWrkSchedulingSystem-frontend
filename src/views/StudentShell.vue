<script setup>
/**
 * StudentShell.vue
 *
 * Single unified student layout. Always renders StudentMobile, regardless
 * of viewport. On wide browsers we center the mobile UI in a phone-width
 * column so the experience is identical everywhere — one codepath, one
 * design system, no dual maintenance.
 *
 * The old desktop sidebar shell (Student.vue) was removed in favor of
 * this single source of truth. If a true desktop layout is ever needed
 * it should be designed deliberately, not as drift from the mobile UI.
 */
import StudentMobile from './StudentMobile.vue';
</script>

<template>
  <div class="student-shell">
    <div class="student-shell__column">
      <StudentMobile />
    </div>
  </div>
</template>

<style scoped>
.student-shell {
  /* Page background visible on either side of the centered phone column.
     Slightly darker than the app canvas so the column reads as a frame. */
  min-height: 100vh;
  min-height: 100dvh;
  background: #eef0f3;
  display: flex;
  justify-content: center;
}

.student-shell__column {
  width: 100%;
  max-width: 480px;
  background: #fafafa;
  position: relative;
  /* Cast a soft shadow on desktop so the column floats over the page bg.
     On phone (max-width = viewport) the shadow is invisible — no cost. */
  box-shadow: 0 0 24px rgba(0, 0, 0, 0.06);
}
</style>
