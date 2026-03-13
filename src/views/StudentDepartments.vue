<template>
  <div class="student-departments">
    <div class="page-header">
      <div>
        <h1 class="page-title">Departments</h1>
        <p class="page-subtitle">Browse available departments and request to join</p>
      </div>
    </div>

    <v-text-field
      v-model="search"
      placeholder="Search departments..."
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      density="comfortable"
      hide-details
      class="search-field mb-6"
    />

    <!-- My Departments -->
    <div v-if="myDepartments.length > 0" class="section">
      <h2 class="section-title">My Departments</h2>
      <div class="dept-grid">
        <v-card
          v-for="dept in myDepartments"
          :key="'my-' + dept.ud_id"
          class="dept-card"
          :class="dept.request_status === 'approved' ? 'joined-card' : 'pending-card'"
          elevation="0"
        >
          <div class="dept-card-header">
            <div class="dept-icon" :class="dept.request_status === 'approved' ? 'joined-icon' : 'pending-icon'">
              <v-icon size="28">mdi-domain</v-icon>
            </div>
            <v-chip
              size="small"
              :color="dept.request_status === 'approved' ? 'success' : 'warning'"
              variant="flat"
              class="joined-chip"
            >
              {{ dept.request_status === 'approved' ? 'Joined' : 'Waiting for Approval' }}
            </v-chip>
          </div>
          <h3 class="dept-name">{{ dept.department?.department_name || "Department" }}</h3>
          <p class="dept-desc">{{ dept.department?.description || "No description" }}</p>
        </v-card>
      </div>
    </div>

    <!-- Available Departments -->
    <div class="section">
      <h2 class="section-title">Available Departments</h2>

      <div v-if="loadingDepts" class="text-center pa-8">
        <v-progress-circular indeterminate color="primary" />
      </div>

      <div v-else-if="filteredDepartments.length === 0" class="empty-state">
        <v-icon size="48" color="grey-lighten-1">mdi-magnify</v-icon>
        <p>No departments found</p>
      </div>

      <div v-else class="dept-grid">
        <v-card
          v-for="dept in filteredDepartments"
          :key="dept.department_id"
          class="dept-card"
          elevation="0"
        >
          <div class="dept-card-header">
            <div class="dept-icon">
              <v-icon size="28">mdi-domain</v-icon>
            </div>
          </div>
          <h3 class="dept-name">{{ dept.department_name }}</h3>
          <p class="dept-desc">{{ dept.description || "No description available" }}</p>
          <v-btn
            class="join-btn"
            :class="{ 'pending-btn': getMembershipStatus(dept.department_id) === 'pending' }"
            variant="flat"
            block
            :loading="joiningId === dept.department_id"
            :disabled="getMembershipStatus(dept.department_id) !== null"
            @click="joinDepartment(dept)"
          >
            {{ getJoinButtonLabel(dept.department_id) }}
          </v-btn>
        </v-card>
      </div>
    </div>

    <!-- Confirmation Dialog -->
    <v-dialog v-model="showConfirmation" max-width="440">
      <v-card class="confirm-card">
        <div class="confirm-icon-wrap">
          <v-icon size="48" color="success">mdi-check-circle</v-icon>
        </div>
        <v-card-title class="confirm-title">Request Submitted!</v-card-title>
        <v-card-text class="confirm-text">
          You have successfully requested to join
          <strong>{{ confirmedDeptName }}</strong>.
        </v-card-text>
        <v-card-actions class="confirm-actions">
          <v-btn variant="flat" color="primary" block @click="showConfirmation = false">OK</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import apiClient from "../services/services.js";
import Utils from "../config/utils.js";

const search = ref("");
const departments = ref([]);
const myDepartments = ref([]);
const loadingDepts = ref(false);
const joiningId = ref(null);
const showConfirmation = ref(false);
const confirmedDeptName = ref("");
const snackbar = ref({ show: false, text: "", color: "success" });

const user = Utils.getStore("user") || {};

const filteredDepartments = computed(() => {
  if (!search.value) return departments.value;
  const q = search.value.toLowerCase();
  return departments.value.filter(
    (d) =>
      (d.department_name || "").toLowerCase().includes(q) ||
      (d.description || "").toLowerCase().includes(q)
  );
});

const getMembershipStatus = (deptId) => {
  const membership = myDepartments.value.find(
    (m) => m.department_id === deptId && (m.is_active || m.request_status === "pending")
  );
  if (!membership) return null;
  return membership.request_status || (membership.is_active ? "approved" : null);
};

const getJoinButtonLabel = (deptId) => {
  const status = getMembershipStatus(deptId);
  if (status === "pending") return "Request Sent";
  if (status === "approved") return "Already Joined";
  return "Join Department";
};

const fetchDepartments = async () => {
  loadingDepts.value = true;
  try {
    const response = await apiClient.get("/user-departments/departments");
    departments.value = Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    console.error("Failed to fetch departments:", err);
    snackbar.value = { show: true, text: "Failed to load departments", color: "error" };
  } finally {
    loadingDepts.value = false;
  }
};

const fetchMyDepartments = async () => {
  if (!user.userId) return;
  try {
    const response = await apiClient.get(`/user-departments/user/${user.userId}`);
    myDepartments.value = Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    console.error("Failed to fetch my departments:", err);
  }
};

const joinDepartment = async (dept) => {
  joiningId.value = dept.department_id;
  try {
    await apiClient.post("/user-departments", {
      user_id: user.userId,
      department_id: dept.department_id,
    });
    confirmedDeptName.value = dept.department_name;
    showConfirmation.value = true;
    await fetchMyDepartments();
  } catch (err) {
    const msg = err?.response?.data?.message || "Failed to join department";
    snackbar.value = { show: true, text: msg, color: "error" };
  } finally {
    joiningId.value = null;
  }
};

onMounted(() => {
  fetchDepartments();
  fetchMyDepartments();
});
</script>

<style scoped>
.student-departments {
  padding: 28px 36px 36px;
  min-height: calc(100vh - 76px);
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  color: #1f2328;
  margin: 0;
  line-height: 1;
}

.page-subtitle {
  margin: 8px 0 0;
  font-size: 15px;
  color: #667085;
}

.search-field {
  max-width: 400px;
}

.section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 20px;
  font-weight: 700;
  color: #1f2328;
  margin: 0 0 16px;
}

.dept-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.dept-card {
  border: 1px solid #d8dade;
  border-radius: 12px;
  padding: 20px;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.joined-card {
  border-color: #a7f3d0;
  background: #f0fdf4;
}

.dept-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.dept-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: #f0e6ea;
  color: #930033;
  display: grid;
  place-items: center;
}

.joined-icon {
  background: #dcfce7;
  color: #16a34a;
}

.joined-chip {
  font-weight: 600;
}

.dept-name {
  font-size: 18px;
  font-weight: 600;
  color: #1f2328;
  margin: 0 0 6px;
}

.dept-desc {
  font-size: 14px;
  color: #667085;
  margin: 0 0 16px;
  flex: 1;
}

.join-btn {
  background: #930033;
  color: #fff;
  text-transform: none;
  font-weight: 600;
  border-radius: 8px;
}

.join-btn:disabled {
  background: #e5e7eb !important;
  color: #9ca3af !important;
}

.join-btn.pending-btn:disabled {
  background: #fef3c7 !important;
  color: #92400e !important;
}

.pending-card {
  border-color: #fcd34d;
  background: #fffbeb;
}

.pending-icon {
  background: #fef3c7;
  color: #d97706;
}

.empty-state {
  text-align: center;
  padding: 48px 20px;
  color: #9ca3af;
  font-size: 16px;
}

.confirm-card {
  border-radius: 14px;
  text-align: center;
  padding: 24px;
}

.confirm-icon-wrap {
  margin-bottom: 8px;
}

.confirm-title {
  font-size: 22px;
  font-weight: 700;
  justify-content: center;
}

.confirm-text {
  font-size: 15px;
  color: #667085;
}

.confirm-actions {
  padding: 8px 24px 16px;
}

@media (max-width: 960px) {
  .student-departments {
    padding: 18px;
  }

  .page-title {
    font-size: 26px;
  }

  .dept-grid {
    grid-template-columns: 1fr;
  }
}
</style>
