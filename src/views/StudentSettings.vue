<template>
  <div class="student-settings pa-6">
    <h1 class="text-h4 font-weight-bold mb-2">Settings</h1>
    <p class="text-body-1 text-medium-emphasis mb-6">Your profile, preferences, and account settings.</p>

    <!-- Profile Section -->
    <v-card elevation="0" rounded="lg" border class="mb-6">
      <v-card-text class="pa-5">
        <div class="d-flex align-center mb-4">
          <v-avatar size="56" color="#8B1538" class="mr-4">
            <span class="text-h6 text-white">{{ initials }}</span>
          </v-avatar>
          <div>
            <h2 class="text-h6 font-weight-bold">{{ profile.fName }} {{ profile.lName }}</h2>
            <p class="text-body-2 text-medium-emphasis ma-0">{{ profile.email }}</p>
            <p v-if="departmentName" class="text-caption text-medium-emphasis ma-0">{{ departmentName }}</p>
          </div>
        </div>

        <v-expand-transition>
          <div v-if="editingProfile">
            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="profile.fName"
                  label="First Name"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="profile.lName"
                  label="Last Name"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="profile.email"
                  label="Email"
                  type="email"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="profile.phone"
                  label="Phone"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="profile.preferredHours"
                  label="Preferred Hours/Week"
                  type="number"
                  min="0"
                  max="40"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
            </v-row>

            <div class="d-flex justify-end ga-2 mt-2">
              <v-btn variant="text" @click="cancelProfileEdit">Cancel</v-btn>
              <v-btn color="#8B1538" variant="flat" :loading="savingProfile" @click="saveProfile">
                Save
              </v-btn>
            </div>
          </div>
        </v-expand-transition>

        <v-btn
          v-if="!editingProfile"
          variant="text"
          color="#8B1538"
          size="small"
          @click="editingProfile = true"
        >
          <v-icon start size="16">mdi-pencil</v-icon>
          Edit Profile
        </v-btn>
      </v-card-text>
    </v-card>

    <!-- Notification Preferences -->
    <v-card elevation="0" rounded="lg" border class="mb-6">
      <v-card-text class="pa-5">
        <h3 class="text-subtitle-1 font-weight-bold mb-3">
          <v-icon class="mr-1" size="20">mdi-bell-cog-outline</v-icon>
          Notification Preferences
        </h3>

        <v-switch
          v-model="notifPrefs.shiftReminders"
          label="Shift reminders"
          color="#8B1538"
          density="comfortable"
          hide-details
          class="mb-1"
        />
        <v-switch
          v-model="notifPrefs.scheduleChanges"
          label="Schedule changes"
          color="#8B1538"
          density="comfortable"
          hide-details
          class="mb-1"
        />
        <v-switch
          v-model="notifPrefs.swapRequests"
          label="Swap/cover requests"
          color="#8B1538"
          density="comfortable"
          hide-details
          class="mb-1"
        />
        <v-switch
          v-model="notifPrefs.openShifts"
          label="New open shifts"
          color="#8B1538"
          density="comfortable"
          hide-details
          class="mb-1"
        />
        <v-switch
          v-model="notifPrefs.timeOff"
          label="Time-off updates"
          color="#8B1538"
          density="comfortable"
          hide-details
        />

        <v-divider class="my-3" />

        <!-- Push Notification device toggle -->
        <div v-if="pushSupported">
          <v-switch
            :model-value="pushEnabled"
            label="Push notifications (this device)"
            color="#8B1538"
            density="comfortable"
            hide-details
            :loading="togglingPush"
            @update:model-value="togglePushNotifications"
          />
          <p class="text-caption text-medium-emphasis mt-1 mb-0">
            Receive instant alerts even when the app is closed.
          </p>
        </div>

        <v-btn
          color="#8B1538"
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
          <v-icon class="mr-1" size="20">mdi-account-cog-outline</v-icon>
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

    <!-- Sign Out -->
    <v-card elevation="0" rounded="lg" border>
      <v-card-text class="pa-5 text-center">
        <v-btn
          color="error"
          variant="outlined"
          prepend-icon="mdi-logout"
          @click="confirmSignOut"
        >
          Sign Out
        </v-btn>
      </v-card-text>
    </v-card>

    <!-- Sign Out Confirmation -->
    <v-dialog v-model="signOutDialog" max-width="360">
      <v-card rounded="lg">
        <v-card-title class="pa-4">Sign Out</v-card-title>
        <v-card-text class="pa-4 pt-0">
          Are you sure you want to sign out?
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="signOutDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="doSignOut">Sign Out</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="bottom">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Utils from '../config/utils.js';
import studentService from '../services/studentService.js';
import {
  isPushSupported,
  getCurrentSubscription,
  subscribeToPush,
  unsubscribeFromPush,
} from '../services/pushNotificationService.js';

const router = useRouter();
const user = Utils.getStore('user');

const editingProfile = ref(false);
const savingProfile = ref(false);
const signOutDialog = ref(false);
const savingNotifPrefs = ref(false);
const pushSupported = ref(false);
const pushEnabled = ref(false);
const togglingPush = ref(false);
const snackbar = ref({ show: false, text: '', color: 'success' });

const profile = reactive({
  fName: user?.fName || '',
  lName: user?.lName || '',
  email: user?.email || '',
  phone: user?.phone || '',
  preferredHours: user?.preferredHours || 20,
});

const notifPrefs = reactive({
  shiftReminders: true,
  scheduleChanges: true,
  swapRequests: true,
  openShifts: true,
  timeOff: true,
});

const departmentName = computed(() => {
  const context = Utils.getStore('currentDepartmentContext');
  return context?.department_name || user?.department_name || '';
});

const initials = computed(() => {
  return ((profile.fName?.[0] || '') + (profile.lName?.[0] || '')).toUpperCase() || '?';
});

const cancelProfileEdit = () => {
  const u = Utils.getStore('user');
  profile.fName = u?.fName || '';
  profile.lName = u?.lName || '';
  profile.email = u?.email || '';
  profile.phone = u?.phone || '';
  profile.preferredHours = u?.preferredHours || 20;
  editingProfile.value = false;
};

const saveProfile = async () => {
  savingProfile.value = true;
  try {
    await studentService.updateProfile({
      fName: profile.fName,
      lName: profile.lName,
      email: profile.email,
      phone: profile.phone,
      preferredHours: profile.preferredHours,
    });

    const u = Utils.getStore('user');
    if (u) {
      u.fName = profile.fName;
      u.lName = profile.lName;
      u.email = profile.email;
      u.phone = profile.phone;
      u.preferredHours = profile.preferredHours;
      Utils.setStore('user', u);
    }

    editingProfile.value = false;
    showSnackbar('Profile updated!', 'success');
  } catch (err) {
    showSnackbar(err?.response?.data?.message || 'Failed to update profile.', 'error');
  } finally {
    savingProfile.value = false;
  }
};

const saveNotifPrefs = async () => {
  savingNotifPrefs.value = true;
  try {
    // TODO: Use PUT /api/students/:studentId/notification-preferences when available on backend
    // Falling back to updateProfile for now; also persist to localStorage as backup
    await studentService.updateProfile({ notificationPreferences: { ...notifPrefs } });
    Utils.setStore('notificationPreferences', { ...notifPrefs });
    showSnackbar('Notification preferences saved!', 'success');
  } catch {
    // Backend endpoint may not exist — save to localStorage as fallback
    Utils.setStore('notificationPreferences', { ...notifPrefs });
    showSnackbar('Preferences saved locally.', 'info');
  } finally {
    savingNotifPrefs.value = false;
  }
};

const confirmSignOut = () => {
  signOutDialog.value = true;
};

const doSignOut = () => {
  localStorage.clear();
  sessionStorage.clear();
  router.push({ name: 'login' });
};

const showSnackbar = (text, color = 'success') => {
  snackbar.value = { show: true, text, color };
};

onMounted(async () => {
  // Load notification preferences from profile or localStorage
  const u = Utils.getStore('user');
  const savedPrefs = u?.notificationPreferences || Utils.getStore('notificationPreferences');
  if (savedPrefs) {
    Object.assign(notifPrefs, savedPrefs);
  }

  // Check push subscription state
  pushSupported.value = isPushSupported();
  if (pushSupported.value) {
    const sub = await getCurrentSubscription();
    pushEnabled.value = !!sub;
  }
});

const togglePushNotifications = async (enabled) => {
  togglingPush.value = true;
  try {
    if (enabled) {
      const success = await subscribeToPush();
      pushEnabled.value = success;
      if (success) {
        showSnackbar('Push notifications enabled!', 'success');
      } else if (Notification.permission === 'denied') {
        showSnackbar('Permission denied. Enable notifications in browser settings.', 'warning');
        pushEnabled.value = false;
      }
    } else {
      await unsubscribeFromPush();
      pushEnabled.value = false;
      showSnackbar('Push notifications disabled.', 'info');
    }
  } catch {
    showSnackbar('Failed to update push notification setting.', 'error');
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
</style>
