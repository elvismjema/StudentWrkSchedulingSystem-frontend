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
    style="z-index: 9999;"
  >
    <div class="d-flex align-center ga-3">
      <v-icon color="#8B1538" size="22">mdi-bell-ring-outline</v-icon>
      <span class="text-body-2">Enable push notifications to stay updated on your shifts.</span>
    </div>
    <template #actions>
      <v-btn
        color="#8B1538"
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
    if (success) {
      show.value = false;
    }
    // If denied → the browser won't ask again; just hide
    if (!success) show.value = false;
  } finally {
    subscribing.value = false;
  }
}

function snooze() {
  const until = Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000;
  localStorage.setItem(SNOOZE_KEY, String(until));
  show.value = false;
}
</script>
