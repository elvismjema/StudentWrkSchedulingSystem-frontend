<template>
  <div class="profile-page">
    <div class="profile-hero">
      <div>
        <h1 class="page-title">Profile</h1>
        <p class="page-subtitle">Manage your profile and preferences</p>
      </div>

      <v-btn
        class="save-button"
        color="#8B1538"
        size="large"
        prepend-icon="mdi-content-save-outline"
        @click="saveProfile"
      >
        Save Changes
      </v-btn>
    </div>

    <v-card class="profile-card" elevation="0">
      <div class="section-header">
        <h2>Profile</h2>
        <p>Your personal information</p>
      </div>

      <div class="avatar-row">
        <div class="avatar-shell">
          <v-avatar size="112" class="profile-avatar">
            <span class="profile-initials">{{ displayInitials }}</span>
          </v-avatar>
          <v-btn
            class="camera-button"
            icon="mdi-camera-outline"
            size="42"
            variant="flat"
            aria-label="Profile photo placeholder"
          />
        </div>
      </div>

      <v-divider class="section-divider" />

      <div class="form-grid">
        <div>
          <label class="field-label" for="full-name">Full Name</label>
          <v-text-field
            id="full-name"
            v-model="profile.fullName"
            variant="outlined"
            hide-details
            bg-color="white"
          />
        </div>

        <div>
          <label class="field-label" for="email">Email</label>
          <v-text-field
            id="email"
            v-model="profile.email"
            variant="outlined"
            hide-details
            bg-color="white"
          />
        </div>
      </div>

      <div class="single-field">
        <label class="field-label" for="phone">Phone Number</label>
        <v-text-field
          id="phone"
          v-model="profile.phone"
          variant="outlined"
          hide-details
          bg-color="white"
          placeholder="405-555-0123"
        />
      </div>
    </v-card>

    <v-card class="profile-card" elevation="0">
      <div class="section-header">
        <h2>Department & Positions</h2>
        <p>Your work assignments</p>
      </div>

      <div class="assignment-stack">
        <div>
          <div class="field-label">Departments</div>
          <div class="assignment-value">{{ departmentDisplay }}</div>
        </div>

        <div>
          <div class="field-label">Positions</div>
          <div class="assignment-value">{{ positionDisplay }}</div>
        </div>
      </div>

      <p class="assignment-note">
        Contact your manager to update your department or positions.
      </p>
    </v-card>

    <v-card class="profile-card" elevation="0">
      <div class="section-header">
        <h2>Notifications</h2>
        <p>How you want to be notified</p>
      </div>

      <div class="preference-row">
        <div>
          <div class="preference-title">Email Notifications</div>
          <div class="preference-subtitle">Receive schedule updates via email</div>
        </div>
        <v-switch
          v-model="preferences.emailNotifications"
          color="#8B1538"
          hide-details
          inset
        />
      </div>

      <v-divider />

      <div class="preference-row">
        <div>
          <div class="preference-title">SMS Text Messages</div>
          <div class="preference-subtitle">Get urgent reminders via text</div>
        </div>
        <v-switch
          v-model="preferences.smsNotifications"
          color="#8B1538"
          hide-details
          inset
        />
      </div>

      <v-divider />

      <div class="reminder-row">
        <div>
          <div class="preference-title">Shift Reminder Time</div>
          <div class="preference-subtitle">Get notified before your shift starts</div>
        </div>

        <div class="reminder-input">
          <v-text-field
            v-model="preferences.shiftReminderMinutes"
            variant="outlined"
            hide-details
            type="number"
            min="0"
            bg-color="white"
          />
          <span>minutes before</span>
        </div>
      </div>
    </v-card>

    <v-snackbar
      v-model="saveNoticeOpen"
      timeout="2200"
      color="#1f6f43"
    >
      Profile changes saved locally.
    </v-snackbar>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from "vue";
import Utils from "../config/utils";

const storedUser = Utils.getStore("user") || {};
const storedProfile = Utils.getStore("studentProfile") || {};
const storedPreferences = Utils.getStore("studentProfilePreferences") || {};

const buildFullName = (user) => `${user?.fName || ""} ${user?.lName || ""}`.trim();

const profile = reactive({
  fullName: storedProfile.fullName || buildFullName(storedUser) || "User",
  email: storedProfile.email || storedUser.email || "",
  phone: storedProfile.phone || "",
});

const preferences = reactive({
  emailNotifications: storedPreferences.emailNotifications ?? true,
  smsNotifications: storedPreferences.smsNotifications ?? false,
  shiftReminderMinutes: storedPreferences.shiftReminderMinutes ?? 30,
});

const saveNoticeOpen = ref(false);

const displayInitials = computed(() => {
  const parts = profile.fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
});

const departmentDisplay = computed(() => {
  const departments = storedUser.departments || storedProfile.departments;
  if (Array.isArray(departments) && departments.length) {
    return departments.join(", ");
  }
  return "Not assigned";
});

const positionDisplay = computed(() => {
  const positions = storedUser.positions || storedProfile.positions;
  if (Array.isArray(positions) && positions.length) {
    return positions.join(", ");
  }
  return "Not assigned";
});

const saveProfile = () => {
  const nameParts = profile.fullName.trim().split(/\s+/).filter(Boolean);
  const nextUser = {
    ...storedUser,
    fName: nameParts[0] || storedUser.fName || "",
    lName: nameParts.slice(1).join(" ") || storedUser.lName || "",
    email: profile.email,
  };

  Utils.setStore("user", nextUser);
  Utils.setStore("studentProfile", {
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    departments: storedProfile.departments || storedUser.departments || [],
    positions: storedProfile.positions || storedUser.positions || [],
  });
  Utils.setStore("studentProfilePreferences", {
    emailNotifications: preferences.emailNotifications,
    smsNotifications: preferences.smsNotifications,
    shiftReminderMinutes: Number(preferences.shiftReminderMinutes) || 0,
  });

  saveNoticeOpen.value = true;
};
</script>

<style scoped>
.profile-page {
  max-width: 1240px;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.profile-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-title {
  font-size: 2.35rem;
  line-height: 1.08;
  font-weight: 700;
  color: #24242b;
}

.page-subtitle {
  margin-top: 6px;
  font-size: 1rem;
  color: #6d7586;
}

.save-button {
  border-radius: 12px;
  min-width: 188px;
  height: 60px;
  font-size: 0.95rem;
  font-weight: 600;
  text-transform: none;
  box-shadow: none;
}

.profile-card {
  padding: 32px 36px;
  border: 1px solid #d9dce4;
  border-radius: 16px;
  background: #ffffff;
}

.section-header h2 {
  font-size: 1.22rem;
  font-weight: 700;
  color: #24242b;
}

.section-header p {
  margin-top: 8px;
  color: #6d7586;
  font-size: 0.95rem;
}

.avatar-row {
  padding: 28px 0 20px;
}

.avatar-shell {
  position: relative;
  width: fit-content;
}

.profile-avatar {
  background: #8b1538;
}

.profile-initials {
  color: #fff;
  font-size: 2.5rem;
  font-weight: 500;
}

.camera-button {
  position: absolute;
  right: -8px;
  bottom: -8px;
  background: #f2f2f4;
  color: #2d2d35;
  box-shadow: none;
}

.section-divider {
  margin-bottom: 24px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

.single-field {
  margin-top: 22px;
}

.field-label {
  display: block;
  margin-bottom: 10px;
  font-size: 0.95rem;
  font-weight: 700;
  color: #24242b;
}

.assignment-stack {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.assignment-value {
  min-height: 24px;
  color: #2d2d35;
  font-size: 0.98rem;
}

.assignment-note {
  margin-top: 28px;
  color: #6d7586;
  font-size: 0.95rem;
}

.preference-row,
.reminder-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 24px 0;
}

.preference-title {
  font-size: 0.98rem;
  font-weight: 700;
  color: #24242b;
}

.preference-subtitle {
  margin-top: 6px;
  color: #6d7586;
  font-size: 0.95rem;
}

.reminder-row {
  align-items: flex-start;
}

.reminder-input {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 240px;
}

.reminder-input :deep(.v-input) {
  max-width: 96px;
}

.profile-page :deep(.v-field) {
  min-height: 50px;
  border-radius: 12px;
}

.profile-page :deep(.v-field__input) {
  font-size: 0.95rem;
  padding-top: 12px;
  padding-bottom: 12px;
}

@media (max-width: 960px) {
  .profile-page {
    padding: 18px;
  }

  .profile-hero,
  .preference-row,
  .reminder-row {
    flex-direction: column;
    align-items: stretch;
  }

  .save-button {
    width: 100%;
    min-width: 0;
    height: 54px;
  }

  .profile-card {
    padding: 24px 18px;
  }

  .form-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .reminder-input {
    min-width: 0;
  }
}
</style>
