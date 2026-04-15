<script setup>
/**
 * StudentShell.vue
 *
 * Wrapper that decides which student layout to render:
 *   - Student.vue       → existing desktop layout (default, always safe)
 *   - StudentMobile.vue → new mobile layout (only when mobile + flag enabled)
 *
 * Feature flag: VITE_MOBILE_SHELL_ENABLED=true in .env to turn on globally.
 * Manual override: append ?mobileShell=1 to any URL to force mobile view.
 * Manual disable: append ?mobileShell=0 to force desktop view on mobile.
 */
import { computed } from 'vue';
import { useDisplay } from 'vuetify';
import { useRoute } from 'vue-router';
import Student from './Student.vue';
import StudentMobile from './StudentMobile.vue';

const { mobile } = useDisplay();
const route = useRoute();

// Feature flag from env (default: off)
const featureFlagEnabled = import.meta.env.VITE_MOBILE_SHELL_ENABLED === 'true';

// Query param override for testing: ?mobileShell=1 or ?mobileShell=0
const queryOverride = computed(() => {
  const param = route.query.mobileShell;
  if (param === '1' || param === 'true') return true;
  if (param === '0' || param === 'false') return false;
  return null; // no override
});

const useMobileLayout = computed(() => {
  // Explicit override wins
  if (queryOverride.value !== null) return queryOverride.value;
  // Otherwise: must be mobile device AND feature flag on
  return mobile.value && featureFlagEnabled;
});
</script>

<template>
  <StudentMobile v-if="useMobileLayout" />
  <Student v-else />
</template>
