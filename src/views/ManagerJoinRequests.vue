<template>
  <div class="join-requests-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Join Requests</h1>
        <p class="page-subtitle">Review and manage student requests to join your departments</p>
      </div>
      <v-btn variant="outlined" prepend-icon="mdi-refresh" :loading="loading" @click="fetchPending">
        Refresh
      </v-btn>
    </div>

    <v-progress-linear v-if="loading" indeterminate color="#8B1538" class="mb-4" />

    <!-- Empty State -->
    <div v-if="!loading && requests.length === 0" class="empty-state">
      <v-icon size="64" color="grey-lighten-1">mdi-checkbox-marked-circle-outline</v-icon>
      <h3 class="mt-4">No Pending Requests</h3>
      <p class="text-grey">All department join requests have been handled.</p>
    </div>

    <!-- Requests List -->
    <div v-else class="requests-list">
      <v-card
        v-for="req in requests"
        :key="req.ud_id"
        class="request-card"
        elevation="0"
      >
        <div class="request-content">
          <div class="request-info">
            <v-avatar size="40" class="user-avatar">
              <span>{{ getInitials(req.user) }}</span>
            </v-avatar>
            <div class="request-details">
              <h3 class="request-name">{{ req.user?.fName }} {{ req.user?.lName }}</h3>
              <p class="request-email">{{ req.user?.email }}</p>
              <div class="request-meta">
                <v-chip size="x-small" color="primary" variant="tonal" class="mr-2">
                  <v-icon start size="12">mdi-domain</v-icon>
                  {{ req.department?.department_name || "Unknown" }}
                </v-chip>
                <span class="request-date">Requested {{ formatDate(req.assigned_at) }}</span>
              </div>
            </div>
          </div>
          <div class="request-actions">
            <v-btn
              color="success"
              variant="flat"
              size="small"
              prepend-icon="mdi-check"
              :loading="processingId === req.ud_id && processingAction === 'approve'"
              :disabled="processingId === req.ud_id"
              @click="handleApprove(req)"
            >
              Approve
            </v-btn>
            <v-btn
              color="error"
              variant="outlined"
              size="small"
              prepend-icon="mdi-close"
              :loading="processingId === req.ud_id && processingAction === 'reject'"
              :disabled="processingId === req.ud_id"
              @click="handleReject(req)"
            >
              Deny
            </v-btn>
          </div>
        </div>
      </v-card>
    </div>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import apiClient from "../services/services.js";
import { TZ } from "../utils/tz.js";

const loading = ref(false);
const requests = ref([]);
const processingId = ref(null);
const processingAction = ref(null);
const snackbar = ref({ show: false, text: "", color: "success" });

const notify = (text, color = "success") => {
  snackbar.value = { show: true, text, color };
};

const getInitials = (user) => {
  if (!user) return "?";
  return `${(user.fName || "")[0] || ""}${(user.lName || "")[0] || ""}`.toUpperCase();
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { timeZone: TZ, month: "short", day: "numeric", year: "numeric" });
};

const fetchPending = async () => {
  loading.value = true;
  try {
    const response = await apiClient.get("/user-departments/pending");
    requests.value = Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    console.error("Failed to fetch pending requests:", err);
    notify("Failed to load pending requests.", "error");
  } finally {
    loading.value = false;
  }
};

const handleApprove = async (req) => {
  processingId.value = req.ud_id;
  processingAction.value = "approve";
  try {
    await apiClient.put(`/user-departments/approve/${req.ud_id}`, {});
    notify(`${req.user?.fName} ${req.user?.lName} approved for ${req.department?.department_name}.`);
    await fetchPending();
  } catch (err) {
    notify(err?.response?.data?.message || "Failed to approve request.", "error");
  } finally {
    processingId.value = null;
    processingAction.value = null;
  }
};

const handleReject = async (req) => {
  processingId.value = req.ud_id;
  processingAction.value = "reject";
  try {
    await apiClient.put(`/user-departments/reject/${req.ud_id}`, {});
    notify(`${req.user?.fName} ${req.user?.lName} denied from ${req.department?.department_name}.`);
    await fetchPending();
  } catch (err) {
    notify(err?.response?.data?.message || "Failed to reject request.", "error");
  } finally {
    processingId.value = null;
    processingAction.value = null;
  }
};

onMounted(fetchPending);
</script>

<style scoped>
.join-requests-page {
  padding: 28px 36px 36px;
  min-height: calc(100vh - 76px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #1f2328;
  margin: 0;
}

.page-subtitle {
  margin: 6px 0 0;
  font-size: 14px;
  color: #667085;
}

.empty-state {
  text-align: center;
  padding: 64px 20px;
  color: #9ca3af;
}

.empty-state h3 {
  color: #667085;
  font-weight: 600;
}

.requests-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.request-card {
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 20px;
  background: #fff;
}

.request-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.request-info {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
}

.user-avatar {
  background: #f0e6ea;
  color: #930033;
  font-weight: 700;
  font-size: 14px;
}

.request-details {
  flex: 1;
}

.request-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2328;
  margin: 0;
}

.request-email {
  font-size: 13px;
  color: #667085;
  margin: 2px 0 6px;
}

.request-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.request-date {
  font-size: 12px;
  color: #9ca3af;
}

.request-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .join-requests-page {
    padding: 18px;
  }

  .request-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .request-actions {
    width: 100%;
    margin-top: 12px;
  }

  .request-actions .v-btn {
    flex: 1;
  }
}
</style>
