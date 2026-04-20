<template>
  <div class="profile-page pa-4">
    <h1 class="page-title">Profile</h1>
    <p class="page-subtitle">Your account at a glance.</p>

    <!-- Identity card -->
    <v-card elevation="0" rounded="lg" border class="profile-card mt-4">
      <div class="identity-row">
        <v-avatar size="72" class="identity-avatar">
          <span class="identity-initials">{{ displayInitials }}</span>
        </v-avatar>
        <div class="identity-text">
          <div class="identity-name">{{ displayName }}</div>
          <div v-if="email" class="identity-email">{{ email }}</div>
          <div v-if="roleLabel" class="identity-role">{{ roleLabel }}</div>
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

    <!-- Quick links -->
    <v-card elevation="0" rounded="lg" border class="profile-card mt-3 pa-0">
      <v-list class="profile-links" density="comfortable">
        <v-list-item
          link
          @click="$router.push({ name: 'student-settings' })"
        >
          <template #prepend>
            <v-icon size="22" color="#811429">mdi-bell-cog-outline</v-icon>
          </template>
          <v-list-item-title class="link-title">Notifications & preferences</v-list-item-title>
          <template #append>
            <v-icon size="18" color="grey">mdi-chevron-right</v-icon>
          </template>
        </v-list-item>

        <v-divider />

        <v-list-item link class="signout-row" @click="handleSignOut">
          <template #prepend>
            <v-icon size="22" color="error">mdi-logout</v-icon>
          </template>
          <v-list-item-title class="link-title signout-text">Sign out</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-card>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils";
import apiClient from "../services/services.js";
import AuthServices from "../services/authServices.js";

const router = useRouter();
const storedUser = Utils.getStore("user") || {};

const displayName = computed(() => {
  const full = `${storedUser.fName || ""} ${storedUser.lName || ""}`.trim();
  return full || storedUser.email || "Student";
});

const email = computed(() => storedUser.email || "");

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

const handleSignOut = async () => {
  try {
    await AuthServices.logoutUser(storedUser);
  } catch (_) {
    // best-effort — local cleanup runs regardless
  }
  Utils.removeItem("currentDepartmentContext");
  Utils.removeItem("user");
  router.push("/login");
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

.card-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: #6d7586;
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

.profile-links :deep(.v-list-item) {
  min-height: 52px;
  padding-inline: 18px;
}

.link-title {
  font-size: 0.95rem;
  font-weight: 500;
  color: #24242b;
}

.signout-text {
  color: #b3261e;
}
</style>
