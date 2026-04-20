<template>
  <div class="profile-page">
    <div class="profile-hero">
      <div>
        <h1 class="page-title">Profile</h1>
        <p class="page-subtitle">Manage your profile and preferences</p>
      </div>

      <v-btn
        class="save-button"
        color="primary"
        size="large"
        prepend-icon="mdi-content-save-outline"
        @click="saveProfile"
      >
        Save Changes
      </v-btn>
    </div>

    <div class="profile-layout">
      <v-card class="profile-card primary-card" elevation="0">
        <div class="section-header">
          <h2>Profile</h2>
          <p>Your personal information</p>
        </div>

        <div class="avatar-row">
          <div class="avatar-shell">
            <v-avatar size="104" class="profile-avatar">
              <span class="profile-initials">{{ displayInitials }}</span>
            </v-avatar>
            <v-btn
              class="camera-button"
              icon="mdi-camera-outline"
              size="40"
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

      <div class="profile-side-column">
        <v-card class="profile-card compact-card" elevation="0">
          <div class="section-header">
          <h2>Department & Positions</h2>
          <p>Your work assignments</p>
          </div>

          <v-progress-linear v-if="loadingDepts" indeterminate color="primary" class="mb-4" />

          <div v-if="!loadingDepts && memberships.length" class="membership-list">
            <div
              v-for="m in memberships"
              :key="m.ud_id"
              class="membership-item"
            >
              <div class="membership-header">
                <span class="membership-dept">{{ m.department?.department_name || 'Department' }}</span>
                <v-chip
                  size="x-small"
                  :color="m.request_status === 'approved' ? 'success' : m.request_status === 'pending' ? 'warning' : 'error'"
                  variant="flat"
                >
                  {{ m.request_status === 'approved' ? 'Active' : m.request_status === 'pending' ? 'Pending' : 'Rejected' }}
                </v-chip>
              </div>
              <div class="membership-meta">
                <span v-if="m.role" class="membership-role">{{ m.role.role_name }}</span>
                <span v-else class="membership-role text-grey">No role assigned</span>
                <span v-if="m.position" class="membership-position"> · {{ m.position.position_name }}</span>
              </div>
            </div>
          </div>

          <div v-else-if="!loadingDepts" class="text-grey" style="font-size: 0.95rem;">
            Not assigned to any department yet.
          </div>

          <p class="assignment-note">Contact an admin to update your department or positions.</p>
        </v-card>

        <v-card class="profile-card compact-card" elevation="0">
          <div class="section-header">
            <h2>Documents</h2>
            <p>Upload a document for your manager profile</p>
          </div>

          <div class="upload-row">
            <v-file-input
              v-model="profileDocument"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-file-upload-outline"
              label="Select document"
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
              show-size
              hide-details
              bg-color="white"
            />
            <v-btn color="primary" variant="outlined" @click="uploadDocument" :disabled="!profileDocument">
              Upload
            </v-btn>
          </div>
          <p v-if="uploadedDocumentName" class="upload-note">
            Uploaded: {{ uploadedDocumentName }}
          </p>
        </v-card>

        <v-card class="profile-card compact-card" elevation="0">
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
              color="primary"
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
              color="primary"
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
      </div>
    </div>

    <v-snackbar
      v-model="saveNoticeOpen"
      timeout="2200"
      color="success"
    >
      Profile changes saved locally.
    </v-snackbar>
  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted } from "vue";
import Utils from "../config/utils";
import apiClient from "../services/services.js";

const storedUser = Utils.getStore("user") || {};
const storedProfile = Utils.getStore("managerProfile") || {};
const storedPreferences = Utils.getStore("managerProfilePreferences") || {};

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
const loadingDepts = ref(false);
const memberships = ref([]);
const profileDocument = ref(null);
const uploadedDocumentName = ref(storedProfile.uploadedDocumentName || "");

const fetchMemberships = async () => {
  const userId = storedUser?.id;
  if (!userId) return;
  loadingDepts.value = true;
  try {
    const res = await apiClient.get(`/user-departments/user/${userId}`);
    memberships.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("Failed to load department memberships:", err);
  } finally {
    loadingDepts.value = false;
  }
};

onMounted(fetchMemberships);

const displayInitials = computed(() => {
  const parts = profile.fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
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
  Utils.setStore("managerProfile", {
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    uploadedDocumentName: uploadedDocumentName.value || null,
    departments: storedProfile.departments || storedUser.departments || [],
    positions: storedProfile.positions || storedUser.positions || [],
  });
  Utils.setStore("managerProfilePreferences", {
    emailNotifications: preferences.emailNotifications,
    smsNotifications: preferences.smsNotifications,
    shiftReminderMinutes: Number(preferences.shiftReminderMinutes) || 0,
  });

  saveNoticeOpen.value = true;
};

const uploadDocument = () => {
  if (!profileDocument.value) return;
  const file = Array.isArray(profileDocument.value) ? profileDocument.value[0] : profileDocument.value;
  uploadedDocumentName.value = file?.name || "";
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
  height: 100%;
  overflow: auto;
}

.profile-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(340px, 0.92fr);
  gap: 20px;
  align-items: start;
}

.profile-side-column {
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
  color: var(--text-1);
}

.page-subtitle {
  margin-top: 6px;
  font-size: 1rem;
  color: var(--text-2);
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
  border: 1px solid var(--border-1);
  border-radius: 16px;
  background: #fff;
}

.primary-card {
  min-height: 100%;
}

.compact-card {
  padding: 26px 30px;
}

.section-header h2 {
  font-size: 1.22rem;
  font-weight: 700;
  color: var(--text-1);
}

.section-header p {
  margin-top: 8px;
  color: var(--text-2);
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
  background: var(--brand-primary);
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
  background: var(--surface-2);
  color: var(--text-1);
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
  color: var(--text-1);
}

.assignment-stack {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.assignment-value {
  min-height: 24px;
  color: var(--text-1);
  font-size: 0.98rem;
}

.membership-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 16px;
}

.membership-item {
  padding: 12px 14px;
  border: 1px solid var(--border-1);
  border-radius: 10px;
  background: var(--surface-1);
}

.membership-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.membership-dept {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text-1);
}

.membership-meta {
  margin-top: 4px;
  font-size: 0.85rem;
  color: var(--text-2);
}

.membership-role {
  font-weight: 500;
}

.assignment-note {
  margin-top: 28px;
  color: var(--text-2);
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
  color: var(--text-1);
}

.preference-subtitle {
  margin-top: 6px;
  color: var(--text-2);
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

.upload-row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 14px;
}

.upload-note {
  margin-top: 12px;
  color: var(--text-2);
  font-size: 0.9rem;
}

@media (max-width: 960px) {
  .profile-page {
    padding: 18px;
  }

  .profile-layout {
    grid-template-columns: 1fr;
  }

  .profile-side-column {
    gap: 18px;
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

  .upload-row {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
