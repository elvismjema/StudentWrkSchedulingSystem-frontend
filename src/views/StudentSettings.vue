<template>
  <div class="student-settings pa-6">
    <h1 class="text-h4 font-weight-bold mb-2">Settings</h1>
    <p class="text-body-1 text-medium-emphasis mb-6">
      Notifications and account preferences. Personal info lives in
      <router-link
        :to="{ name: 'student-profile' }"
        class="settings-link"
      >Profile</router-link>.
    </p>

    <!-- Notification Preferences -->
    <v-card elevation="0" rounded="lg" border class="mb-6">
      <v-card-text class="pa-5">
        <h3 class="text-subtitle-1 font-weight-bold mb-3">
          <v-icon class="mr-1" size="20" color="#811429">mdi-bell-cog-outline</v-icon>
          Notification Preferences
        </h3>

        <v-switch
          v-model="notifPrefs.shiftReminders"
          label="Shift reminders"
          color="#811429"
          density="comfortable"
          hide-details
          class="mb-1"
        />
        <v-switch
          v-model="notifPrefs.scheduleChanges"
          label="Schedule changes"
          color="#811429"
          density="comfortable"
          hide-details
          class="mb-1"
        />
        <v-switch
          v-model="notifPrefs.swapRequests"
          label="Swap/cover requests"
          color="#811429"
          density="comfortable"
          hide-details
          class="mb-1"
        />
        <v-switch
          v-model="notifPrefs.openShifts"
          label="New open shifts"
          color="#811429"
          density="comfortable"
          hide-details
          class="mb-1"
        />
        <v-switch
          v-model="notifPrefs.timeOff"
          label="Time-off updates"
          color="#811429"
          density="comfortable"
          hide-details
        />

        <v-divider class="my-3" />

        <!-- Push Notification device toggle -->
        <div v-if="pushSupported">
          <v-switch
            :model-value="pushEnabled"
            label="Push notifications (this device)"
            color="#811429"
            density="comfortable"
            hide-details
            :loading="togglingPush"
            @update:model-value="togglePushNotifications"
          />
          <p class="text-caption text-medium-emphasis mt-1 mb-2">
            Receive instant alerts even when the app is closed.
          </p>

          <!-- Send a canned test push to every device this user has subscribed.
               Only surfaced when push is enabled on *this* device — otherwise
               the button would fire a push the user can't actually receive. -->
          <v-btn
            v-if="pushEnabled"
            variant="outlined"
            size="small"
            color="#811429"
            :loading="sendingTestPush"
            prepend-icon="mdi-send-outline"
            @click="handleSendTestPush"
          >
            Send test notification
          </v-btn>

          <!-- Temporary diagnostics panel — shows OneSignal debug log stored in localStorage -->
          <v-expansion-panels v-if="pushEnabled" class="mt-3" variant="accordion">
            <v-expansion-panel title="Push diagnostics">
              <v-expansion-panel-text>
                <div class="text-caption font-weight-bold mb-1">APP_ID in build: {{ oneSignalAppId || 'MISSING' }}</div>
                <div v-if="oneSignalDebugLog.length === 0" class="text-caption text-medium-emphasis">No debug entries yet. Try re-opening the app then click "Send test notification".</div>
                <div v-for="(entry, i) in oneSignalDebugLog" :key="i" class="text-caption mb-1">
                  <span :style="{ color: entry.ok ? 'green' : 'red' }">{{ entry.ok ? '✓' : '✗' }}</span>
                  {{ entry.ts?.slice(11, 19) }} {{ entry.step }} {{ entry.userId ? `uid=${entry.userId}` : '' }}
                  <span v-if="!entry.ok" class="text-red-darken-2"> {{ entry.error }}</span>
                </div>
                <v-btn size="x-small" variant="text" class="mt-1" @click="clearOneSignalDebug">Clear log</v-btn>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </div>

        <v-btn
          color="#811429"
          variant="flat"
          size="small"
          class="mt-3"
          :loading="savingNotifPrefs"
          @click="saveNotifPrefs"
        >
          Save Preferences
        </v-btn>
      </v-card-text>
    </v-card>

    <!-- Account Section -->
    <v-card elevation="0" rounded="lg" border class="mb-6">
      <v-card-text class="pa-5">
        <h3 class="text-subtitle-1 font-weight-bold mb-3">
          <v-icon class="mr-1" size="20" color="#811429">mdi-account-cog-outline</v-icon>
          Account
        </h3>
        <!-- TODO: Implement change password when backend endpoint is available -->
        <v-btn variant="outlined" color="grey-darken-1" disabled>
          <v-icon start>mdi-lock-reset</v-icon>
          Change Password
        </v-btn>
        <p class="text-caption text-medium-emphasis mt-1">Password change coming soon.</p>
      </v-card-text>
    </v-card>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="bottom">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import Utils from '../config/utils.js';
import NotificationService from '../services/notifications.js';
import { readOneSignalDebug } from '../config/oneSignal.js';
import {
  isPushSupported,
  getCurrentSubscription,
  subscribeToPush,
  unsubscribeFromPush,
  sendTestPush,
} from '../services/pushNotificationService.js';

const savingNotifPrefs = ref(false);
const pushSupported = ref(false);
const pushEnabled = ref(false);
const togglingPush = ref(false);
const sendingTestPush = ref(false);
const snackbar = ref({ show: false, text: '', color: 'success' });
const oneSignalDebugLog = ref([]);
const oneSignalAppId = import.meta.env.VITE_ONESIGNAL_APP_ID || '';

function refreshDebugLog() {
  oneSignalDebugLog.value = readOneSignalDebug();
}
function clearOneSignalDebug() {
  localStorage.removeItem('_onesignal_debug');
  oneSignalDebugLog.value = [];
}

const notifPrefs = reactive({
  shiftReminders: true,
  scheduleChanges: true,
  swapRequests: true,
  openShifts: true,
  timeOff: true,
});

// Persist toggles via the dedicated endpoint so the dispatcher actually
// honors them. Backend writes to users.notification_preferences — the
// exact column sendWebPushNotification reads to suppress per-category
// pushes. The localStorage write the old code did was a no-op for actual
// delivery, so we drop it entirely on success and only fall back to a
// local cache if the network/server is down (so the UI doesn't lose the
// pending toggle state across an offline reload).
const saveNotifPrefs = async () => {
  savingNotifPrefs.value = true;
  try {
    const saved = await NotificationService.updateMyNotificationPreferences({
      ...notifPrefs,
    });
    // Server returns the merged source of truth. Reflect any normalization
    // (e.g. unknown keys dropped) back into the UI state.
    Object.assign(notifPrefs, saved);
    Utils.removeItem?.('notificationPreferences');
    showSnackbar('Notification preferences saved.', 'success');
  } catch (err) {
    // Offline / server error — keep the user's intent in localStorage so a
    // reload doesn't wipe what they just toggled, and tell them honestly
    // that it didn't persist server-side.
    Utils.setStore('notificationPreferences', { ...notifPrefs });
    showSnackbar(
      err?.response?.data?.message ||
        'Could not reach the server. Changes saved locally and will not affect notifications until you save again.',
      'warning',
    );
  } finally {
    savingNotifPrefs.value = false;
  }
};

const showSnackbar = (text, color = 'success') => {
  snackbar.value = { show: true, text, color };
};

onMounted(async () => {
  // Load notification preferences from the server — this is the source of
  // truth that sendWebPushNotification consults. Fall back to a local
  // cache only if the request fails (e.g. user is offline) so the UI
  // still reflects the last-known intent instead of resetting to all-true.
  try {
    const serverPrefs = await NotificationService.getMyNotificationPreferences();
    if (serverPrefs && Object.keys(serverPrefs).length > 0) {
      Object.assign(notifPrefs, serverPrefs);
    }
  } catch {
    const u = Utils.getStore('user');
    const cached = u?.notificationPreferences || Utils.getStore('notificationPreferences');
    if (cached) Object.assign(notifPrefs, cached);
  }

  // Check push subscription state
  pushSupported.value = isPushSupported();
  if (pushSupported.value) {
    const sub = await getCurrentSubscription();
    pushEnabled.value = !!sub;
  }

  // Load debug log
  refreshDebugLog();
});

// Fires the self-serve test endpoint (POST /push-subscriptions/me/test).
// The backend returns a structured summary: { sent, failed, pruned, failures, skippedReason? }.
// We show a human-friendly message for every outcome, appending the first
// underlying push-service error when delivery fails so the user can see
// whether the problem is their subscription, permissions, or the server.
const handleSendTestPush = async () => {
  sendingTestPush.value = true;
  // Refresh debug log before so timing is visible
  refreshDebugLog();
  try {
    const result = await sendTestPush();
    const color =
      result?.sent > 0
        ? 'success'
        : result?.skippedReason === 'push-not-configured' ||
            result?.skippedReason === 'onesignal-not-configured' ||
            result?.skippedReason === 'vapid-not-configured'
          ? 'error'
          : 'warning';
    let text = result?.message || 'Test push attempted.';
    // Surface the first real push-service error (e.g. 403 Forbidden, 400 Bad Request)
    // so the user can tell us / self-diagnose instead of seeing only "no deliveries succeeded".
    if (result?.sent === 0 && Array.isArray(result?.failures) && result.failures.length > 0) {
      const f = result.failures[0];
      text += ` (${f.statusCode ?? 'err'}: ${f.message})`;
    }
    // If the server pruned subscriptions, tell the user to re-enable — that's the fix.
    if (result?.sent === 0 && result?.pruned > 0) {
      text += ' Turn push off then back on to re-subscribe.';
    }
    showSnackbar(text, color);
  } catch (err) {
    showSnackbar(
      err?.response?.data?.message || 'Could not send test notification.',
      'error',
    );
  } finally {
    sendingTestPush.value = false;
    refreshDebugLog();
  }
};

const togglePushNotifications = async (enabled) => {
  togglingPush.value = true;
  try {
    if (enabled) {
      // subscribeToPush now throws on real failures — only returns false for
      // the two benign cases (no browser support, user denied the prompt).
      const success = await subscribeToPush();
      pushEnabled.value = success;
      if (success) {
        showSnackbar('Push notifications enabled.', 'success');
      } else if (Notification.permission === 'denied') {
        showSnackbar(
          'Permission denied. Enable notifications in browser/system settings.',
          'warning',
        );
      } else if (Notification.permission === 'default') {
        // User dismissed the prompt without picking Allow or Deny.
        showSnackbar(
          'You need to tap "Allow" when the browser asks for permission.',
          'warning',
        );
      } else {
        showSnackbar('Push is not supported on this device.', 'warning');
      }
    } else {
      await unsubscribeFromPush();
      pushEnabled.value = false;
      showSnackbar('Push notifications disabled.', 'info');
    }
  } catch (err) {
    // Log full error for debugging; show the clean message in the snackbar.
    console.error('[StudentSettings] Push toggle failed:', err);
    showSnackbar(
      err?.message
        ? `Couldn't enable push: ${err.message}`
        : 'Failed to update push notification setting.',
      'error',
    );
    // Revert toggle
    pushEnabled.value = !enabled;
  } finally {
    togglingPush.value = false;
  }
};
</script>

<style scoped>
.student-settings {
  width: 100%;
}

.settings-link {
  color: #811429;
  text-decoration: none;
  font-weight: 600;
}

.settings-link:hover {
  text-decoration: underline;
}
</style>
