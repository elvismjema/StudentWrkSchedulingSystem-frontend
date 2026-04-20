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

        <!-- Error Alert -->
        <v-alert v-if="error" type="error" dismissible @click:close="error = null" class="mb-4">
          {{ error }}
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

        <v-divider class="mb-6"></v-divider>

        <!-- Department Settings Form -->
        <v-form v-if="selectedDepartmentId" ref="settingsForm" v-model="formValid">
          <h3 class="text-h5 mb-4">General Settings</h3>

          <!-- Department Name -->
          <v-text-field
            v-model="departmentSettings.department_name"
            label="Department Name"
            outlined
            dense
            :rules="[rules.required]"
            class="mb-3"
          ></v-text-field>

          <!-- Description -->
          <v-textarea
            v-model="departmentSettings.description"
            label="Description"
            outlined
            dense
            rows="3"
            class="mb-3"
          ></v-textarea>

          <h3 class="text-h5 mb-4 mt-6">Scheduling Policies</h3>

          <!-- Buffer Time Between Classes -->
          <v-text-field
            v-model.number="departmentSettings.buffer_time_minutes"
            label="Buffer Time Between Classes (minutes)"
            outlined
            dense
            type="number"
            min="0"
            :rules="[rules.required, rules.nonNegative]"
            hint="Minimum time gap required between scheduled shifts/classes"
            persistent-hint
            class="mb-4"
          ></v-text-field>

          <!-- Break Hours Required -->
          <v-text-field
            v-model.number="departmentSettings.break_hours_required"
            label="Break Hours Required"
            outlined
            dense
            type="number"
            min="0"
            :rules="[rules.nonNegative]"
            hint="Minimum break hours required for employees"
            persistent-hint
            class="mb-4"
          ></v-text-field>

          <!-- Open During Breaks -->
          <v-switch
            v-model="departmentSettings.open_during_breaks"
            label="Open During Academic Breaks"
            color="primary"
            class="mb-4"
          ></v-switch>

          <h3 class="text-h5 mb-4 mt-6">Staffing Requirements</h3>

          <!-- Minimum Staff Required -->
          <v-text-field
            v-model.number="departmentSettings.min_staff_required"
            label="Minimum Staff Required"
            outlined
            dense
            type="number"
            min="1"
            :rules="[rules.required, rules.positive]"
            class="mb-4"
          ></v-text-field>

          <h3 class="text-h5 mb-4 mt-6">Time Tracking Settings</h3>

          <!-- Late Threshold -->
          <v-text-field
            v-model.number="departmentSettings.late_threshold_minutes"
            label="Late Threshold (minutes)"
            outlined
            dense
            type="number"
            min="0"
            :rules="[rules.nonNegative]"
            hint="Grace period before marking an employee as late"
            persistent-hint
            class="mb-4"
          ></v-text-field>

          <!-- Early Threshold -->
          <v-text-field
            v-model.number="departmentSettings.early_threshold_minutes"
            label="Early Clock-Out Threshold (minutes)"
            outlined
            dense
            type="number"
            min="0"
            :rules="[rules.nonNegative]"
            hint="Grace period for early clock-outs"
            persistent-hint
            class="mb-4"
          ></v-text-field>

          <!-- Notify on Time Discrepancy -->
          <v-switch
            v-model="departmentSettings.notify_on_time_discrepancy"
            label="Notify on Time Discrepancy"
            color="primary"
            class="mb-4"
          ></v-switch>

          <!-- Save Button -->
          <v-btn
            color="primary"
            size="large"
            @click="saveDepartmentSettings"
            :loading="saving"
            :disabled="!formValid"
            class="mt-4"
          >
            <v-icon left>mdi-content-save</v-icon>
            Save Settings
          </v-btn>
        </v-form>

        <!-- Department Hours Section -->
        <div v-if="selectedDepartmentId" class="mt-8">
          <v-divider class="mb-6"></v-divider>
          <h3 class="text-h5 mb-2">Department Hours</h3>
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
                  <div class="d-flex align-center gap-2">
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
const departmentSettings = ref({
  department_name: '',
  description: '',
  buffer_time_minutes: 0,
  break_hours_required: 0,
  open_during_breaks: false,
  min_staff_required: 1,
  late_threshold_minutes: 5,
  early_threshold_minutes: 5,
  notify_on_time_discrepancy: true
});

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

// Format HH:MM time string to 12-hour display (e.g. "06:00" -> "6:00 AM")
const formatTimeDisplay = (timeStr) => {
  if (!timeStr) return 'Not Set';
  const [h, m] = timeStr.split(':').map(Number);
  if (Number.isNaN(h)) return 'Not Set';
  const period = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
};

// Default open/close times
const DEFAULT_OPEN  = '06:00';
const DEFAULT_CLOSE = '19:00';

// Initialize department hours for all days (defaults: 6 AM – 7 PM, open)
const initializeDepartmentHours = () => {
  departmentHours.value = daysOfWeek.map((day, index) => ({
    day_of_week: index,
    open_time: DEFAULT_OPEN,
    close_time: DEFAULT_CLOSE,
    department_id: selectedDepartmentId.value,
    is_default: true,
    is_closed: false,
    hours_id: null
  }));

// Resolve the manager's department and load data
const resolveAndLoad = async (deptId, deptNameValue) => {
  selectedDepartmentId.value = deptId;
  departmentName.value = deptNameValue || '';
  await loadDepartmentData();
};

const loadDepartmentName = async () => {
  if (!selectedDepartmentId.value || departmentName.value) return;
  try {
    loading.value = true;
    error.value = null;
    
    // Load department settings
    const deptResponse = await DepartmentServices.getDepartment(selectedDepartmentId.value);
    if (deptResponse.data.success) {
      departmentSettings.value = { ...deptResponse.data.data };
      // Keep departmentName in sync with the authoritative value from the DB
      if (deptResponse.data.data.department_name) {
        departmentName.value = deptResponse.data.data.department_name;
      }
    }
    
    // Load department hours
    const hoursResponse = await DepartmentServices.getDepartmentHours(selectedDepartmentId.value);
    initializeDepartmentHours();
    if (hoursResponse.data.success && hoursResponse.data.data.length > 0) {
      // Merge saved hours into the default structure
      hoursResponse.data.data.forEach(hours => {
        const index = departmentHours.value.findIndex(h => h.day_of_week === hours.day_of_week);
        if (index !== -1) {
          departmentHours.value[index] = {
            ...departmentHours.value[index],
            ...hours,
            // Restore default times if the day was previously saved as closed (nulls)
            open_time: hours.open_time || (hours.is_closed ? null : DEFAULT_OPEN),
            close_time: hours.close_time || (hours.is_closed ? null : DEFAULT_CLOSE),
            is_closed: hours.is_closed ?? false,
          };
        }
      });
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
    savingHours.value = true;
    error.value = null;
    successMessage.value = null;
    
    const hoursData = {
      department_id: selectedDepartmentId.value,
      day_of_week: dayHours.day_of_week,
      open_time: dayHours.is_closed ? null : dayHours.open_time,
      close_time: dayHours.is_closed ? null : dayHours.close_time,
      is_default: true,
      is_closed: dayHours.is_closed ?? false
    };
    
    let response;
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

// ── Department context resolution (same pattern as ScheduleTemplates) ─────────
// Listen for the event dispatched by ManagerSidebar when it finishes resolving
// the manager's department (handles the race where the sidebar resolves after mount).
const onDeptContextReady = (e) => {
  const ctx = e.detail;
  if (ctx?.department_id && !selectedDepartmentId.value) {
    resolveAndLoad(ctx.department_id, ctx.department_name);
  }
};

onMounted(async () => {
  window.addEventListener('departmentContextReady', onDeptContextReady);

  // 1. Try the stored context first (fastest, no network call needed).
  const ctx = Utils.getStore('currentDepartmentContext');
  if (ctx?.department_id) {
    await resolveAndLoad(ctx.department_id, ctx.department_name);
    return;
  }

  // 2. Fall back to fetching the user's department membership directly.
  const currentUser = Utils.getStore('user') || {};
  const userId = currentUser.userId || currentUser.id || currentUser.user_id;
  if (!userId) return;

  try {
    loading.value = true;
    const response = await UserRoleServices.getUserDepartments(userId);
    const memberships = response?.data || [];
    const managerMembership = memberships.find(
      (m) => m.is_active && (m.role?.permission_level || 0) >= 50
    );
    const membership =
      managerMembership ||
      memberships.find((m) => m.is_active) ||
      memberships[0];
    if (membership) {
      const deptId = membership.department_id;
      const deptNameValue = membership.department?.department_name || '';
      Utils.setStore('currentDepartmentContext', {
        department_id: deptId,
        department_name: deptNameValue,
        role_name: membership.role?.role_name || 'Manager',
        role_id: membership.role_id,
      });
      await resolveAndLoad(deptId, deptNameValue);
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

h3 {
  color: var(--text-1);
  font-weight: 600;
}

.w-100 {
  width: 100%;
}
</style>
