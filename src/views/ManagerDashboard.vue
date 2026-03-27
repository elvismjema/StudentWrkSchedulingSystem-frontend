<template>
  <div class="dashboard-page">
    <section class="page-header">
      <h1 class="page-title">Manager Dashboard</h1>
      <p class="page-subtitle">Live operational overview for managed departments.</p>
      <v-btn variant="text" prepend-icon="mdi-refresh" :loading="loading" @click="loadOverview">
        Refresh
      </v-btn>
    </section>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>

    <v-row>
      <v-col cols="12" sm="6" md="3">
        <metric-card title="Draft Shifts" :value="overview.summary.shifts.draft" />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <metric-card title="Published Shifts" :value="overview.summary.shifts.published" />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <metric-card title="Changed Shifts" :value="overview.summary.shifts.changed" />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <metric-card title="Cancelled Shifts" :value="overview.summary.shifts.cancelled" />
      </v-col>
    </v-row>

    <v-row class="mt-1">
      <v-col cols="12" sm="6" md="4">
        <metric-card title="Coverage Gaps" :value="overview.summary.open_gap_alerts" />
      </v-col>
      <v-col cols="12" sm="6" md="4">
        <metric-card title="Attendance Issues" :value="overview.summary.unresolved_attendance_issues" />
      </v-col>
      <v-col cols="12" sm="6" md="4">
        <metric-card title="Unacknowledged Shifts" :value="overview.summary.unacknowledged_shift_assignments" />
      </v-col>
    </v-row>

    <v-row class="mt-1">
      <v-col cols="12" md="6">
        <metric-card title="Pending Availability Requests" :value="overview.summary.pending_availability_requests" />
      </v-col>
      <v-col cols="12" md="6">
        <v-card elevation="0" class="metric-card">
          <v-card-title class="text-subtitle-1">Managed Departments</v-card-title>
          <v-card-text>
            <div v-if="overview.departments.length === 0" class="text-medium-emphasis">
              No departments in scope.
            </div>
            <v-chip
              v-for="department in overview.departments"
              :key="department.department_id"
              class="ma-1"
              color="primary"
              variant="outlined"
            >
              {{ department.department_name }}
            </v-chip>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import apiClient from "../services/services.js";
import MetricCard from "../components/MetricCard.vue";

const loading = ref(false);
const error = ref("");
const overview = reactive({
  departments: [],
  summary: {
    shifts: { draft: 0, published: 0, changed: 0, cancelled: 0 },
    open_gap_alerts: 0,
    unresolved_attendance_issues: 0,
    unacknowledged_shift_assignments: 0,
    pending_availability_requests: 0,
  },
});

const loadOverview = async () => {
  loading.value = true;
  error.value = "";
  try {
    const response = await apiClient.get("/manager/overview");
    const payload = response?.data || {};
    overview.departments = payload.departments || [];
    overview.summary = {
      ...overview.summary,
      ...(payload.summary || {}),
      shifts: {
        ...overview.summary.shifts,
        ...((payload.summary || {}).shifts || {}),
      },
    };
  } catch (err) {
    error.value = err?.response?.data?.message || "Failed to load manager overview.";
  } finally {
    loading.value = false;
  }
};

onMounted(loadOverview);
</script>

<style scoped>
.dashboard-page {
  padding: 24px;
}

.page-header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.page-title {
  margin: 0;
}

.page-subtitle {
  margin: 0;
  color: #667085;
  flex: 1;
  min-width: 280px;
}

.metric-card {
  border: 1px solid #e3e5e8;
}
</style>

