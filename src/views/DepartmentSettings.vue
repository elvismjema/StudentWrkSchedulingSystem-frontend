<template>
  <div class="department-settings-container">
    <v-card class="settings-card" elevation="2">
      <v-card-title class="text-h4 mb-4">
        <v-icon left>mdi-cog</v-icon>
        Department Settings
      </v-card-title>

      <v-card-text>
        <!-- Loading State -->
        <v-progress-linear v-if="loading" indeterminate color="primary"></v-progress-linear>

        <!-- Error Alert -->
        <v-alert v-if="error" type="error" dismissible @click:close="error = null" class="mb-4">
          {{ error }}
        </v-alert>

        <!-- Success Alert -->
        <v-alert v-if="successMessage" type="success" dismissible @click:close="successMessage = null" class="mb-4">
          {{ successMessage }}
        </v-alert>

        <!-- Department Selection -->
        <v-select
          v-model="selectedDepartmentId"
          :items="departments"
          item-title="department_name"
          item-value="department_id"
          label="Select Department"
          outlined
          dense
          class="mb-6"
          @update:modelValue="loadDepartmentData"
        ></v-select>

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
                      outlined
                      dense
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="dayHours.close_time"
                      label="Close Time"
                      type="time"
                      outlined
                      dense
                    ></v-text-field>
                  </v-col>
                </v-row>

                <v-btn
                  color="primary"
                  size="small"
                  @click="saveDepartmentHours(dayHours)"
                  :loading="savingHours"
                  class="mt-2"
                >
                  <v-icon left>mdi-content-save</v-icon>
                  Save Hours
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
import { ref, onMounted, computed } from 'vue';
import DepartmentServices from '../services/departmentServices.js';
import Utils from '../config/utils.js';

// State
const loading = ref(false);
const saving = ref(false);
const savingHours = ref(false);
const error = ref(null);
const successMessage = ref(null);
const formValid = ref(false);
const settingsForm = ref(null);
const hoursPanel = ref(null);

const departments = ref([]);
const selectedDepartmentId = ref(null);
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

// Validation Rules
const rules = {
  required: (v) => !!v || v === 0 || 'This field is required',
  nonNegative: (v) => v >= 0 || 'Value must be non-negative',
  positive: (v) => v > 0 || 'Value must be positive'
};

// Days of the week
const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const getDayName = (dayNumber) => {
  return daysOfWeek[dayNumber] || 'Unknown';
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
};

// Load all departments
const loadDepartments = async () => {
  try {
    loading.value = true;
    error.value = null;
    const response = await DepartmentServices.getDepartments();
    if (response.data.success) {
      departments.value = response.data.data;
      
      // Auto-select first department or user's department
      const user = Utils.getStore('user');
      if (user && user.department_id) {
        selectedDepartmentId.value = user.department_id;
      } else if (departments.value.length > 0) {
        selectedDepartmentId.value = departments.value[0].department_id;
      }
      
      if (selectedDepartmentId.value) {
        await loadDepartmentData();
      }
    }
  } catch (err) {
    error.value = 'Failed to load departments: ' + (err.response?.data?.message || err.message);
  } finally {
    loading.value = false;
  }
};

// Load department data
const loadDepartmentData = async () => {
  if (!selectedDepartmentId.value) return;
  
  try {
    loading.value = true;
    error.value = null;
    
    // Load department settings
    const deptResponse = await DepartmentServices.getDepartment(selectedDepartmentId.value);
    if (deptResponse.data.success) {
      departmentSettings.value = { ...deptResponse.data.data };
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
  } catch (err) {
    error.value = 'Failed to load department data: ' + (err.response?.data?.message || err.message);
  } finally {
    loading.value = false;
  }
};

// Save department settings
const saveDepartmentSettings = async () => {
  if (!settingsForm.value || !formValid.value) return;
  
  try {
    saving.value = true;
    error.value = null;
    successMessage.value = null;
    
    const response = await DepartmentServices.updateDepartment(
      selectedDepartmentId.value,
      departmentSettings.value
    );
    
    if (response.data.success) {
      successMessage.value = 'Department settings saved successfully!';
      departmentSettings.value = { ...response.data.data };
    }
  } catch (err) {
    error.value = 'Failed to save department settings: ' + (err.response?.data?.message || err.message);
  } finally {
    saving.value = false;
  }
};

// Save department hours
const saveDepartmentHours = async (dayHours) => {
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
      // Update existing hours
      response = await DepartmentServices.updateDepartmentHours(dayHours.hours_id, hoursData);
    } else {
      // Create new hours
      response = await DepartmentServices.createDepartmentHours(hoursData);
    }
    
    if (response.data.success) {
      successMessage.value = `Hours for ${getDayName(dayHours.day_of_week)} saved successfully!`;
      // Update the hours_id if it was a new entry
      if (!dayHours.hours_id && response.data.data.hours_id) {
        dayHours.hours_id = response.data.data.hours_id;
      }
    }
  } catch (err) {
    error.value = 'Failed to save department hours: ' + (err.response?.data?.message || err.message);
  } finally {
    savingHours.value = false;
  }
};

// Lifecycle
onMounted(() => {
  loadDepartments();
});
</script>

<style scoped>
.department-settings-container {
  padding: 28px 36px;
  min-height: calc(100vh - 76px);
  background: var(--surface-2);
}

.settings-card {
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
