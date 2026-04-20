<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import PushNotificationPrompt from './components/PushNotificationPrompt.vue';
import Utils from './config/utils.js';

// Re-evaluate auth on every route change so the push prompt hides after
// logout and appears after login without requiring a page reload. Reading
// localStorage directly in a computed is not reactive on its own, but the
// route dependency ensures it is recomputed as the user navigates.
const route = useRoute();

const showPushPrompt = computed(() => {
  // Touch the route so Vue tracks it as a dependency of this computed.
  void route.fullPath;
  const user = Utils.getStore('user');
  const role = (user?.role || '').toLowerCase();
  // Only students see the push prompt today — admin/manager dashboards
  // have their own notification surface and we don't want a snackbar
  // covering their tools at the bottom of the screen.
  return role === 'student';
});
</script>

<template>
  <v-app>
    <v-main>
      <router-view />
    </v-main>
    <PushNotificationPrompt v-if="showPushPrompt" />
  </v-app>
</template>
