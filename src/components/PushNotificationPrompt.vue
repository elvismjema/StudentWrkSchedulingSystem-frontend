<template>
  <v-snackbar
    v-if="show"
    v-model="show"
    location="bottom"
    :timeout="-1"
    color="surface"
    elevation="4"
    rounded="lg"
    class="push-prompt"
  >
    <div class="d-flex align-center ga-3">
      <v-icon color="#811429" size="22">mdi-bell-ring-outline</v-icon>
      <span class="text-body-2">Enable push notifications to stay updated on your shifts.</span>
    </div>
    <template #actions>
      <v-btn
        color="#811429"
        variant="flat"
        size="small"
        :loading="subscribing"
        @click="enable"
      >
        Enable
      </v-btn>
      <v-btn
        variant="text"
        size="small"
        color="grey-darken-1"
        @click="snooze"
      >
        Not now
      </v-btn>
    </template>
  </v-snackbar>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import {
  isPushSupported,
  getCurrentSubscription,
  subscribeToPush,
} from '../services/pushNotificationService.js';

const SNOOZE_KEY = 'push_prompt_snoozed_until';
const SNOOZE_DAYS = 7;

const show = ref(false);
const subscribing = ref(false);

onMounted(async () => {
  if (!isPushSupported()) return;
  if (Notification.permission === 'denied') return;

  // Check snooze
  const snoozedUntil = Number(localStorage.getItem(SNOOZE_KEY) || 0);
  if (Date.now() < snoozedUntil) return;

  // Already subscribed?
  const existing = await getCurrentSubscription();
  if (existing) return;

  show.value = true;
});

async function enable() {
  subscribing.value = true;
  try {
    const success = await subscribeToPush();
    // Whether granted or denied, close the prompt — the browser won't
    // surface the native dialog again after a denial, so there's nothing
    // more to do here.
    show.value = false;
    if (!success) {
      // Snooze for 7 days on denial so we don't re-prompt immediately on
      // the next mount (the permission state blocks showing it again, but
      // this keeps the snooze UX consistent if permission is reset).
      snoozeUntil();
    }
  } finally {
    subscribing.value = false;
  }
}

function snoozeUntil() {
  const until = Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000;
  localStorage.setItem(SNOOZE_KEY, String(until));
}

function snooze() {
  snoozeUntil();
  show.value = false;
}
</script>

<style scoped>
/* Lift the snackbar above the student mobile bottom navigation (which
   sits at the bottom of the viewport on dashboard/schedule/clock/tasks).
   Without this offset the prompt floats on top of the tab bar and the
   Clock In action tile, which is exactly what we don't want while we're
   trying to make the dashboard home page feel polished. */
.push-prompt :deep(.v-snackbar__wrapper) {
  margin-bottom: 76px;
}

/* Keep the prompt visually subordinate to dialogs (v-dialog z-index is
   2400+ in Vuetify 3). 2000 sits above Vuetify app bars (1004) and
   bottom-sheets (1003) without stacking over modals. */
.push-prompt {
  z-index: 2000;
}
</style>
