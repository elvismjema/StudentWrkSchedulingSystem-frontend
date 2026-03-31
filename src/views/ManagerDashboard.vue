<template>
  <div class="dashboard-page">
    <section class="page-header">
      <div class="header-text">
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">{{ todayLabel }}</p>
      </div>
      <div class="header-actions">
        <v-btn color="#8B1538" prepend-icon="mdi-plus" @click="router.push('/manager/create-shift')">
          Create Shift
        </v-btn>
        <v-btn variant="outlined" prepend-icon="mdi-calendar-month-outline" @click="router.push('/manager/schedule')">
          View Schedule
        </v-btn>
      </div>
    </section>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>

    <v-card elevation="0" class="overview-card">
      <v-card-title class="overview-title">Who's Working Now &amp; Coming Up</v-card-title>
      <v-card-subtitle class="overview-subtitle">Quick operational snapshot for your departments.</v-card-subtitle>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <div class="activity-block">
              <div class="activity-heading">Who's Working Now</div>
              <div class="activity-value">{{ overview.summary.shifts.published }}</div>
              <div class="activity-caption">Published shifts in progress today</div>
            </div>
          </v-col>
          <v-col cols="12" md="6">
            <div class="activity-block">
              <div class="activity-heading">Coming Up</div>
              <div class="activity-value">{{ overview.summary.shifts.draft }}</div>
              <div class="activity-caption">Draft shifts queued for review</div>
            </div>
          </v-col>
        </v-row>

        <div class="department-wrap mt-4">
          <div class="activity-heading mb-2">Managed Departments</div>
          <div v-if="overview.departments.length === 0" class="text-medium-emphasis">
            No departments in scope.
          </div>
          <v-chip
            v-for="department in overview.departments"
            :key="department.department_id"
            class="ma-1"
            color="#8B1538"
            variant="outlined"
          >
            {{ department.department_name }}
          </v-chip>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import apiClient from "../services/services.js";
const router = useRouter();

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

const todayLabel = computed(() =>
  new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }),
);

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
  gap: 16px;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.header-text {
  min-width: 260px;
}

.header-actions {
  margin-left: auto;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.page-title {
  margin: 0;
  font-size: 48px;
  line-height: 1.05;
}

.page-subtitle {
  margin: 6px 0 0;
  color: #667085;
  font-size: 17px;
}

.overview-card {
  border: 1px solid #e3e5e8;
  border-radius: 14px;
}

.overview-title {
  font-size: 36px;
  font-weight: 700;
}

.overview-subtitle {
  color: #667085;
}

.activity-block {
  border: 1px solid #e3e5e8;
  border-radius: 12px;
  padding: 16px;
}

.activity-heading {
  font-size: 15px;
  font-weight: 600;
  color: #101828;
}

.activity-value {
  font-size: 38px;
  line-height: 1.1;
  font-weight: 700;
  color: #101828;
  margin-top: 4px;
}

.activity-caption {
  margin-top: 4px;
  color: #667085;
  font-size: 13px;
}

@media (max-width: 960px) {
  .page-title {
    font-size: 38px;
  }
}
</style>
