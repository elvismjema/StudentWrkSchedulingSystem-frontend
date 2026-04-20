<template>
  <div class="profile-page pa-4">
    <h1 class="page-title">Profile</h1>
    <p class="page-subtitle">Your account at a glance.</p>

    <!-- Identity card (read-only header + inline edit for personal info) -->
    <v-card elevation="0" rounded="lg" border class="profile-card mt-4">
      <div class="identity-row">
        <v-avatar size="72" class="identity-avatar">
          <span class="identity-initials">{{ displayInitials }}</span>
        </v-avatar>
        <div class="identity-text">
          <div class="identity-name">{{ displayName }}</div>
          <div v-if="form.email" class="identity-email">{{ form.email }}</div>
          <div v-if="roleLabel" class="identity-role">{{ roleLabel }}</div>
        </div>
      </div>

      <v-divider class="my-4" />

      <div class="card-label-row">
        <span class="card-label">Personal info</span>
        <v-btn
          v-if="!editing"
          variant="text"
          color="#811429"
          size="small"
          density="comfortable"
          @click="startEdit"
        >
          <v-icon start size="16">mdi-pencil</v-icon>
          Edit
        </v-btn>
      </div>

      <!-- Read-only display -->
      <div v-if="!editing" class="info-grid mt-3">
        <div class="info-row">
          <span class="info-label">Name</span>
          <span class="info-value">{{ displayName || "—" }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Email</span>
          <span class="info-value">{{ form.email || "—" }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Phone</span>
          <span class="info-value">{{ form.phone || "—" }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Preferred hours / week</span>
          <span class="info-value">{{ form.preferredHours || 0 }}</span>
        </div>
      </div>

      <!-- Inline edit form -->
      <div v-else class="mt-3">
        <v-row dense>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="form.fName"
              label="First name"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="form.lName"
              label="Last name"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
            />
          </v-col>
          <v-col cols="12">
            <v-text-field
              v-model="form.email"
              label="Email"
              type="email"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="form.phone"
              label="Phone"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model.number="form.preferredHours"
              label="Preferred hours / week"
              type="number"
              min="0"
              max="40"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
            />
          </v-col>
        </v-row>

        <div class="d-flex justify-end ga-2 mt-3">
          <v-btn variant="text" :disabled="saving" @click="cancelEdit">
            Cancel
          </v-btn>
          <v-btn
            color="#811429"
            variant="flat"
            :loading="saving"
            @click="saveProfile"
          >
            Save
          </v-btn>
        </div>
      </div>
    </v-card>

    <!-- Work assignment -->
    <v-card elevation="0" rounded="lg" border class="profile-card mt-3">
      <div class="card-label">Work assignment</div>

      <v-progress-linear
        v-if="loadingDepts"
        indeterminate
        color="#811429"
        class="mt-3"
        height="2"
      />

      <template v-else-if="primaryAssignment">
        <div class="assignment-row mt-3">
          <v-icon size="20" color="#811429" class="assignment-icon">mdi-office-building-outline</v-icon>
          <span class="assignment-value">{{ primaryAssignment.department }}</span>
        </div>
        <div v-if="primaryAssignment.position" class="assignment-row mt-2">
          <v-icon size="20" color="#811429" class="assignment-icon">mdi-briefcase-outline</v-icon>
          <span class="assignment-value">{{ primaryAssignment.position }}</span>
        </div>
      </template>

      <div v-else class="assignment-empty mt-3">
        Not assigned yet — contact your manager.
      </div>
    </v-card>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="bottom">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted } from "vue";
import Utils from "../config/utils";
import apiClient from "../services/services.js";
import studentService from "../services/studentService.js";

const storedUser = Utils.getStore("user") || {};

// Editable form state — initialized from the locally cached user, then
// re-synced after every successful save. The save endpoint is the same
// one Settings used to call, so behavior is identical to what the user
// already trusted.
const form = reactive({
  fName: storedUser.fName || "",
  lName: storedUser.lName || "",
  email: storedUser.email || "",
  phone: storedUser.phone || "",
  preferredHours: storedUser.preferredHours || 20,
});

const editing = ref(false);
const saving = ref(false);
const snackbar = ref({ show: false, text: "", color: "success" });

const displayName = computed(() => {
  const full = `${form.fName || ""} ${form.lName || ""}`.trim();
  return full || form.email || "Student";
});

const roleLabel = computed(() => {
  const r = storedUser.role || storedUser.userRole;
  if (!r) return "";
  const s = String(r).toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
});

const displayInitials = computed(() => {
  const parts = displayName.value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
});

const loadingDepts = ref(false);
const memberships = ref([]);

// One department for now (per product decision). Pick the active assignment
// if present, otherwise the first row, so we always show something stable.
const primaryAssignment = computed(() => {
  if (!memberships.value.length) return null;
  const active = memberships.value.find(
    (m) => (m.request_status || "").toLowerCase() === "approved"
  );
  const m = active || memberships.value[0];
  return {
    department: m.department?.department_name || "Department",
    position: m.position?.position_name || "",
  };
});

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

const startEdit = () => {
  // Re-seed from the latest cached user in case another tab updated it.
  const u = Utils.getStore("user") || {};
  form.fName = u.fName || "";
  form.lName = u.lName || "";
  form.email = u.email || "";
  form.phone = u.phone || "";
  form.preferredHours = u.preferredHours || 20;
  editing.value = true;
};

const cancelEdit = () => {
  const u = Utils.getStore("user") || {};
  form.fName = u.fName || "";
  form.lName = u.lName || "";
  form.email = u.email || "";
  form.phone = u.phone || "";
  form.preferredHours = u.preferredHours || 20;
  editing.value = false;
};

const showSnackbar = (text, color = "success") => {
  snackbar.value = { show: true, text, color };
};

const saveProfile = async () => {
  saving.value = true;
  try {
    await studentService.updateProfile({
      fName: form.fName,
      lName: form.lName,
      email: form.email,
      phone: form.phone,
      preferredHours: form.preferredHours,
    });

    // Mirror the change into the locally cached user so the avatar menu,
    // header initials, and any other component reading from localStorage
    // see the new values without requiring a reload.
    const u = Utils.getStore("user") || {};
    u.fName = form.fName;
    u.lName = form.lName;
    u.email = form.email;
    u.phone = form.phone;
    u.preferredHours = form.preferredHours;
    Utils.setStore("user", u);

    editing.value = false;
    showSnackbar("Profile updated.", "success");
  } catch (err) {
    showSnackbar(
      err?.response?.data?.message || "Failed to update profile.",
      "error"
    );
  } finally {
    saving.value = false;
  }
};

onMounted(fetchMemberships);
</script>

<style scoped>
.profile-page {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #24242b;
  line-height: 1.2;
}

.page-subtitle {
  margin-top: 4px;
  font-size: 0.9rem;
  color: #6d7586;
}

.profile-card {
  background: #ffffff;
  border-color: #e5e7eb !important;
  padding: 18px 18px;
}

.identity-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.identity-avatar {
  background: #811429;
  flex-shrink: 0;
}

.identity-initials {
  color: #ffffff;
  font-size: 1.6rem;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.identity-text {
  min-width: 0;
}

.identity-name {
  font-size: 1.05rem;
  font-weight: 700;
  color: #24242b;
  line-height: 1.25;
  word-break: break-word;
}

.identity-email {
  margin-top: 2px;
  font-size: 0.85rem;
  color: #6d7586;
  word-break: break-word;
}

.identity-role {
  margin-top: 4px;
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: #811429;
}

.card-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: #6d7586;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.92rem;
}

.info-label {
  color: #6d7586;
  flex-shrink: 0;
}

.info-value {
  color: #24242b;
  font-weight: 500;
  text-align: right;
  word-break: break-word;
}

.assignment-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.assignment-icon {
  flex-shrink: 0;
}

.assignment-value {
  font-size: 0.95rem;
  color: #24242b;
  font-weight: 500;
}

.assignment-empty {
  font-size: 0.9rem;
  color: #6d7586;
}
</style>
