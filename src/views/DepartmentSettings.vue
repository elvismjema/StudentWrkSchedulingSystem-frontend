<template>
  <div class="department-hours-container">
    <v-card class="hours-card" elevation="2">
      <v-card-title class="text-h4 mb-2">
        <v-icon left>mdi-clock-outline</v-icon>
        Department Hours
      </v-card-title>

      <v-card-text>
        <!-- Loading -->
        <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4"></v-progress-linear>

        <!-- No department warning -->
        <v-alert v-if="!loading && !selectedDepartmentId" type="warning" class="mb-4">
          No department found. Make sure you are assigned to a department as a manager.
        </v-alert>

        <!-- Department name header -->
        <div v-if="selectedDepartmentId && departmentName" class="mb-4 d-flex align-center">
          <v-icon class="mr-2" color="primary">mdi-office-building-outline</v-icon>
          <span class="text-h6 font-weight-medium">{{ departmentName }}</span>
        </div>

        <!-- Success Alert -->
        <v-alert v-if="successMessage" type="success" closable @click:close="successMessage = null" class="mb-4">
          {{ successMessage }}
        </v-alert>

        <!-- Error Alert -->
        <v-alert v-if="error" type="error" closable @click:close="error = null" class="mb-4">
          {{ error }}
        </v-alert>

        <!-- Department Hours -->
        <div v-if="selectedDepartmentId && !loading">
          <p class="text-body-2 text-medium-emphasis mb-4">
            Set the open and close hours for each day of the week. The Schedule and Calendar views will
            display only the range from the earliest open time to the latest close time across all open days.
            Default hours are 6:00 AM – 7:00 PM.
          </p>

          <v-expansion-panels v-model="hoursPanel" class="mb-4">
            <v-expansion-panel
              v-for="(dayHours, index) in departmentHours"
              :key="index"
            >
              <v-expansion-panel-title>
                <div class="d-flex align-center justify-space-between w-100">
                  <div class="d-flex align-center">
                    <v-chip
                      v-if="dayHours.is_closed"
                      color="error"
                      size="x-small"
                      variant="tonal"
                      class="mr-2"
                    >Closed</v-chip>
                    <span :class="{ 'text-medium-emphasis': dayHours.is_closed }">
                      {{ getDayName(dayHours.day_of_week) }}
                    </span>
                  </div>
                  <span class="text-caption mr-4" v-if="!dayHours.is_closed">
                    {{ formatTimeDisplay(dayHours.open_time) }} – {{ formatTimeDisplay(dayHours.close_time) }}
                  </span>
                  <span class="text-caption mr-4 text-medium-emphasis" v-else>Closed all day</span>
                </div>
              </v-expansion-panel-title>

              <v-expansion-panel-text>
                <!-- Closed toggle -->
                <v-switch
                  v-model="dayHours.is_closed"
                  label="Mark as Closed (department is not open this day)"
                  color="error"
                  density="compact"
                  class="mb-3"
                ></v-switch>

                <!-- Open/Close times (hidden when closed) -->
                <v-row v-if="!dayHours.is_closed">
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="dayHours.open_time"
                      label="Open Time"
                      type="time"
                      variant="outlined"
                      density="compact"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="dayHours.close_time"
                      label="Close Time"
                      type="time"
                      variant="outlined"
                      density="compact"
                    ></v-text-field>
                  </v-col>
                </v-row>

                <v-btn
                  color="primary"
                  size="small"
                  @click="saveDepartmentHours(dayHours)"
                  :loading="dayHours._saving"
                  class="mt-2"
                >
                  <v-icon start>mdi-content-save</v-icon>
                  Save
                </v-btn>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import DepartmentServices from '../services/departmentServices.js';
import UserRoleServices from '../services/userRoleServices.js';
import Utils from '../config/utils.js';

// ── State ──────────────────────────────────────────────────────────────────────
const loading = ref(false);
const error = ref(null);
const successMessage = ref(null);
const hoursPanel = ref(null);

const selectedDepartmentId = ref(null);
const departmentName = ref('');
const departmentHours = ref([]);

// ── Constants ──────────────────────────────────────────────────────────────────
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DEFAULT_OPEN  = '06:00';
const DEFAULT_CLOSE = '19:00';

// ── Helpers ────────────────────────────────────────────────────────────────────
const getDayName = (dayNumber) => DAYS[dayNumber] || 'Unknown';

const formatTimeDisplay = (timeStr) => {
  if (!timeStr) return 'Not Set';
  const [h, m] = timeStr.split(':').map(Number);
  if (Number.isNaN(h)) return 'Not Set';
  const period = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
};

// Build the 7-day skeleton with defaults
const buildDefaultHours = () =>
  DAYS.map((_, index) => ({
    day_of_week: index,
    open_time: DEFAULT_OPEN,
    close_time: DEFAULT_CLOSE,
    department_id: selectedDepartmentId.value,
    is_default: true,
    is_closed: false,
    hours_id: null,
    _saving: false,
  }));

// ── Data loading ───────────────────────────────────────────────────────────────
const loadDepartmentHours = async () => {
  if (!selectedDepartmentId.value) return;

  // Always start with defaults so the UI is usable even if the fetch fails
  departmentHours.value = buildDefaultHours();

  try {
    const res = await DepartmentServices.getDepartmentHours(selectedDepartmentId.value);
    const saved = res?.data?.data || [];

    // Merge saved rows into the default skeleton
    saved.forEach((row) => {
      const idx = departmentHours.value.findIndex((h) => h.day_of_week === row.day_of_week);
      if (idx !== -1) {
        departmentHours.value[idx] = {
          ...departmentHours.value[idx],
          ...row,
          open_time:  row.open_time  || (row.is_closed ? null : DEFAULT_OPEN),
          close_time: row.close_time || (row.is_closed ? null : DEFAULT_CLOSE),
          is_closed:  row.is_closed ?? false,
          _saving: false,
        };
      }
    });
  } catch {
    // Table may not exist yet or no rows saved — defaults are already in place,
    // so just silently continue. The manager can save hours normally.
  }
};

const loadDepartmentName = async () => {
  if (!selectedDepartmentId.value || departmentName.value) return;
  try {
    const res = await DepartmentServices.getDepartment(selectedDepartmentId.value);
    if (res?.data?.data?.department_name) {
      departmentName.value = res.data.data.department_name;
    }
  } catch {
    // Non-fatal
  }
};

const resolveAndLoad = async (deptId, deptNameValue) => {
  selectedDepartmentId.value = deptId;
  departmentName.value = deptNameValue || '';
  loading.value = true;
  try {
    await Promise.all([loadDepartmentHours(), loadDepartmentName()]);
  } finally {
    loading.value = false;
  }
};

// ── Save ───────────────────────────────────────────────────────────────────────
const saveDepartmentHours = async (dayHours) => {
  dayHours._saving = true;
  error.value = null;
  successMessage.value = null;

  const payload = {
    department_id: selectedDepartmentId.value,
    day_of_week:   dayHours.day_of_week,
    open_time:     dayHours.is_closed ? null : dayHours.open_time,
    close_time:    dayHours.is_closed ? null : dayHours.close_time,
    is_default:    true,
    is_closed:     dayHours.is_closed ?? false,
  };

  try {
    let res;
    if (dayHours.hours_id) {
      res = await DepartmentServices.updateDepartmentHours(dayHours.hours_id, payload);
    } else {
      res = await DepartmentServices.createDepartmentHours(payload);
    }

    if (res?.data?.success) {
      successMessage.value = `${getDayName(dayHours.day_of_week)} hours saved.`;
      if (!dayHours.hours_id && res.data.data?.hours_id) {
        dayHours.hours_id = res.data.data.hours_id;
      }
    }
  } catch (err) {
    error.value = 'Failed to save hours: ' + (err.response?.data?.message || err.message);
  } finally {
    dayHours._saving = false;
  }
};

// ── Department context resolution ──────────────────────────────────────────────
const onDeptContextReady = (e) => {
  const ctx = e.detail;
  if (ctx?.department_id && !selectedDepartmentId.value) {
    resolveAndLoad(ctx.department_id, ctx.department_name);
  }
};

onMounted(async () => {
  window.addEventListener('departmentContextReady', onDeptContextReady);

  // 1. Try localStorage context first (set by ManagerSidebar on every page load)
  const ctx = Utils.getStore('currentDepartmentContext');
  if (ctx?.department_id) {
    await resolveAndLoad(ctx.department_id, ctx.department_name);
    return;
  }

  // 2. Fall back to fetching memberships directly
  const user = Utils.getStore('user') || {};
  const userId = user.userId || user.id || user.user_id;
  if (!userId) return;

  loading.value = true;
  try {
    const res = await UserRoleServices.getUserDepartments(userId);
    const memberships = res?.data || [];
    const mgr = memberships.find((m) => m.is_active && (m.role?.permission_level || 0) >= 50);
    const membership = mgr || memberships.find((m) => m.is_active) || memberships[0];

    if (membership) {
      const deptId = membership.department_id;
      const name   = membership.department?.department_name || '';
      Utils.setStore('currentDepartmentContext', {
        department_id:   deptId,
        department_name: name,
        role_name:       membership.role?.role_name || 'Manager',
        role_id:         membership.role_id,
      });
      await resolveAndLoad(deptId, name);
    }
  } catch (err) {
    error.value = 'Failed to resolve your department: ' + (err.response?.data?.message || err.message);
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('departmentContextReady', onDeptContextReady);
});
</script>

<style scoped>
.department-hours-container {
  padding: 28px 36px;
  min-height: calc(100vh - 76px);
  background: var(--surface-2);
}

.hours-card {
  border-radius: 14px;
  padding: 24px;
}

.w-100 {
  width: 100%;
}
</style>
