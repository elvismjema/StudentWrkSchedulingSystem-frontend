<script setup>
import { onMounted, ref } from "vue";
import Utils from "../config/utils.js";
import ManagerServices from "../services/managerServices.js";

const user = ref(Utils.getStore("user") || {});
const loading = ref(true);
const error = ref("");

const overview = ref({
  departments: [],
  summary: {
    shifts: {
      draft: 0,
      published: 0,
      changed: 0,
      cancelled: 0,
    },
    open_gap_alerts: 0,
    unresolved_attendance_issues: 0,
    unacknowledged_shift_assignments: 0,
    pending_availability_requests: 0,
  },
});

const loadOverview = async () => {
  loading.value = true;
  error.value = "";

  await ManagerServices.getOverview()
    .then((response) => {
      overview.value = response.data;
    })
    .catch((err) => {
      error.value =
        err?.response?.data?.message || "Failed to load manager overview.";
    })
    .finally(() => {
      loading.value = false;
    });
};

onMounted(() => {
  loadOverview();
});
</script>

<template>
  <v-container>
    <v-row class="mb-4" align="center" justify="space-between">
      <v-col cols="12" md="8">
        <h2 class="text-h5">Manager Dashboard</h2>
        <p class="text-medium-emphasis mb-0">
          {{ user.fName }} {{ user.lName }} ({{ user.role || "manager" }})
        </p>
      </v-col>
      <v-col cols="12" md="4" class="text-md-right">
        <v-btn color="primary" variant="elevated" @click="loadOverview" :loading="loading">
          Refresh
        </v-btn>
      </v-col>
    </v-row>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>

    <v-row>
      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-title class="text-subtitle-1">Draft Shifts</v-card-title>
          <v-card-text class="text-h5">{{ overview.summary.shifts.draft }}</v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-title class="text-subtitle-1">Published Shifts</v-card-title>
          <v-card-text class="text-h5">{{ overview.summary.shifts.published }}</v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-title class="text-subtitle-1">Changed Shifts</v-card-title>
          <v-card-text class="text-h5">{{ overview.summary.shifts.changed }}</v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-title class="text-subtitle-1">Cancelled Shifts</v-card-title>
          <v-card-text class="text-h5">{{ overview.summary.shifts.cancelled }}</v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-1">
      <v-col cols="12" sm="6" md="4">
        <v-card>
          <v-card-title class="text-subtitle-1">Open Coverage Gaps</v-card-title>
          <v-card-text class="text-h5">{{ overview.summary.open_gap_alerts }}</v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="4">
        <v-card>
          <v-card-title class="text-subtitle-1">Attendance Issues</v-card-title>
          <v-card-text class="text-h5">{{ overview.summary.unresolved_attendance_issues }}</v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="4">
        <v-card>
          <v-card-title class="text-subtitle-1">Unacknowledged Shifts</v-card-title>
          <v-card-text class="text-h5">{{ overview.summary.unacknowledged_shift_assignments }}</v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-1">
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="text-subtitle-1">Pending Availability Requests</v-card-title>
          <v-card-text class="text-h5">{{ overview.summary.pending_availability_requests }}</v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="text-subtitle-1">Managed Departments</v-card-title>
          <v-card-text>
            <div v-if="overview.departments.length === 0" class="text-medium-emphasis">
              No managed departments found.
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
  </v-container>
</template>
