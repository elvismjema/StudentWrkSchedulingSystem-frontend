<template>
  <div class="student-more pa-4" role="main" aria-label="Settings">
    <h1 class="text-h5 font-weight-bold mb-4">More</h1>

    <!-- Profile Section -->
    <v-card elevation="0" rounded="lg" class="mb-4" style="border: 1px solid #e0e0e0">
      <v-card-text class="pa-4">
        <div class="d-flex align-center mb-4">
          <v-avatar size="56" color="primary" class="mr-3">
            <span class="text-h6 text-white">{{ initials }}</span>
          </v-avatar>
          <div>
            <h2 class="text-subtitle-1 font-weight-bold">{{ profile.fName }} {{ profile.lName }}</h2>
            <p class="text-body-2 text-medium-emphasis ma-0">{{ profile.email }}</p>
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
                  aria-label="First name"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="profile.lName"
                  label="Last Name"
                  variant="outlined"
                  density="comfortable"
                  aria-label="Last name"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="profile.email"
                  label="Email"
                  type="email"
                  variant="outlined"
                  density="comfortable"
                  aria-label="Email address"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="profile.phone"
                  label="Phone"
                  variant="outlined"
                  density="comfortable"
                  aria-label="Phone number"
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
                  aria-label="Preferred hours per week"
                />
              </v-col>
            </v-row>

            <div class="d-flex justify-end gap-2 mt-2">
              <v-btn variant="text" @click="cancelProfileEdit">Cancel</v-btn>
              <v-btn color="primary" variant="flat" :loading="savingProfile" @click="saveProfile">
                Save
              </v-btn>
            </div>
          </div>
        </v-expand-transition>

        <v-btn
          v-if="!editingProfile"
          variant="text"
          color="primary"
          size="small"
          @click="editingProfile = true"
          aria-label="Edit profile"
        >
          <v-icon start size="16">mdi-pencil</v-icon>
          Edit Profile
        </v-btn>
      </v-card-text>
    </v-card>

    <!-- Availability Grid -->
    <v-card elevation="0" rounded="lg" class="mb-4" style="border: 1px solid #e0e0e0">
      <v-card-text class="pa-4">
        <AvailabilityGrid @saved="showSnackbar('Availability saved!', 'success')" />
      </v-card-text>
    </v-card>

    <!-- Time Off Requests -->
    <v-card elevation="0" rounded="lg" class="mb-4" style="border: 1px solid #e0e0e0">
      <v-card-text class="pa-4">
        <div class="d-flex align-center justify-space-between mb-3">
          <h3 class="text-subtitle-1 font-weight-bold">
            <v-icon class="mr-1" size="20">mdi-calendar-remove</v-icon>
            Time Off
          </h3>
          <v-btn
            size="small"
            variant="text"
            color="primary"
            @click="showTimeOffForm = !showTimeOffForm"
          >
            {{ showTimeOffForm ? 'Hide Form' : 'New Request' }}
          </v-btn>
        </div>

        <v-expand-transition>
          <TimeOffForm
            v-if="showTimeOffForm"
            class="mb-4"
            @submitted="onTimeOffSubmitted"
          />
        </v-expand-transition>

        <!-- Time Off History -->
        <div v-if="timeOffRequests.length">
          <div
            v-for="req in timeOffRequests"
            :key="req.id"
            class="d-flex align-center justify-space-between py-2"
            style="border-bottom: 1px solid #f0f0f0"
          >
            <div>
              <div class="text-body-2 font-weight-medium">
                {{ formatTimeOffType(req.type) }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ formatDate(req.startDate || req.start_date) }} – {{ formatDate(req.endDate || req.end_date) }}
              </div>
            </div>
            <v-chip
              size="x-small"
              :color="timeOffStatusColor(req.status)"
              variant="tonal"
            >
              {{ req.status }}
            </v-chip>
          </div>
        </div>
        <p v-else class="text-body-2 text-medium-emphasis text-center">
          No time-off requests yet.
        </p>
      </v-card-text>
    </v-card>

    <!-- Notification Preferences -->
    <v-card elevation="0" rounded="lg" class="mb-4" style="border: 1px solid #e0e0e0">
      <v-card-text class="pa-4">
        <h3 class="text-subtitle-1 font-weight-bold mb-3">
          <v-icon class="mr-1" size="20">mdi-bell-cog-outline</v-icon>
          Notification Preferences
        </h3>

        <v-switch
          v-model="notifPrefs.shiftReminders"
          label="Shift reminders"
          color="primary"
          density="comfortable"
          hide-details
          class="mb-1"
          aria-label="Shift reminders notifications"
        />
        <v-switch
          v-model="notifPrefs.scheduleChanges"
          label="Schedule changes"
          color="primary"
          density="comfortable"
          hide-details
          class="mb-1"
          aria-label="Schedule change notifications"
        />
        <v-switch
          v-model="notifPrefs.swapRequests"
          label="Swap/cover requests"
          color="primary"
          density="comfortable"
          hide-details
          class="mb-1"
          aria-label="Swap and cover request notifications"
        />
        <v-switch
          v-model="notifPrefs.openShifts"
          label="New open shifts"
          color="primary"
          density="comfortable"
          hide-details
          class="mb-1"
          aria-label="New open shift notifications"
        />
        <v-switch
          v-model="notifPrefs.timeOff"
          label="Time-off updates"
          color="primary"
          density="comfortable"
          hide-details
          aria-label="Time off update notifications"
        />

        <v-btn
          color="primary"
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

    <!-- Sign Out -->
    <v-card elevation="0" rounded="lg" class="mb-4" style="border: 1px solid #e0e0e0">
      <v-card-text class="pa-4 text-center">
        <v-btn
          color="error"
          variant="outlined"
          prepend-icon="mdi-logout"
          @click="confirmSignOut"
          aria-label="Sign out"
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
import AvailabilityGrid from '../components/student/AvailabilityGrid.vue';
import TimeOffForm from '../components/student/TimeOffForm.vue';

const router = useRouter();
const user = Utils.getStore('user');

const editingProfile = ref(false);
const savingProfile = ref(false);
const showTimeOffForm = ref(false);
const signOutDialog = ref(false);
const savingNotifPrefs = ref(false);
const timeOffRequests = ref([]);
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

const initials = computed(() => {
  return ((profile.fName?.[0] || '') + (profile.lName?.[0] || '')).toUpperCase() || '?';
});

const cancelProfileEdit = () => {
  // Reset to stored values
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

    // Update localStorage
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

const fetchTimeOffRequests = async () => {
  try {
    const res = await studentService.getTimeOffRequests();
    timeOffRequests.value = res?.data?.data || res?.data || [];
  } catch {
    timeOffRequests.value = [];
  }
};

const onTimeOffSubmitted = () => {
  showTimeOffForm.value = false;
  showSnackbar('Time off request submitted!', 'success');
  fetchTimeOffRequests();
};

const formatTimeOffType = (type) => {
  const types = {
    sick: 'Sick',
    personal: 'Personal',
    academic_conflict: 'Academic Conflict',
    vacation: 'Vacation',
    other: 'Other',
  };
  return types[type] || type;
};

const formatDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const timeOffStatusColor = (status) => {
  const colors = { pending: 'warning', approved: 'success', denied: 'error' };
  return colors[status] || 'default';
};

const saveNotifPrefs = async () => {
  savingNotifPrefs.value = true;
  try {
    await studentService.updateProfile({ notificationPreferences: { ...notifPrefs } });
    showSnackbar('Notification preferences saved!', 'success');
  } catch {
    showSnackbar('Failed to save preferences.', 'error');
  } finally {
    savingNotifPrefs.value = false;
  }
};

const confirmSignOut = () => {
  signOutDialog.value = true;
};

const doSignOut = () => {
  // Clear ALL localStorage — complete sign out
  localStorage.clear();
  sessionStorage.clear();
  router.push({ name: 'login' });
};

const showSnackbar = (text, color = 'success') => {
  snackbar.value = { show: true, text, color };
};

onMounted(() => {
  fetchTimeOffRequests();

  // Load notification preferences from profile
  const u = Utils.getStore('user');
  if (u?.notificationPreferences) {
    Object.assign(notifPrefs, u.notificationPreferences);
  }
});
</script>

<style scoped>
.student-more {
  max-width: 600px;
  margin: 0 auto;
}
.gap-2 { gap: 8px; }

@media (max-width: 600px) {
  .student-more {
    padding: 12px !important;
  }
}
</style>
