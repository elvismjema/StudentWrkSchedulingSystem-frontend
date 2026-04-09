<template>
  <div class="user-management-container">
    <v-card class="management-card" elevation="2">
      <v-card-title class="text-h4 mb-4">
        <v-icon left>mdi-account-multiple</v-icon>
        Student Workers
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

        <!-- Search and Filter -->
        <v-row class="mb-4">
          <v-col cols="12" md="12">
            <v-text-field
              v-model="searchQuery"
              label="Search"
              prepend-inner-icon="mdi-magnify"
              outlined
              dense
              clearable
            ></v-text-field>
          </v-col>
        </v-row>

        <!-- Users Table -->
        <v-data-table
          :headers="headers"
          :items="filteredUsers"
          :search="searchQuery"
          class="elevation-1"
          :loading="loading"
        >
          <!-- User Name Column -->
          <template v-slot:item.name="{ item }">
            <div class="font-weight-medium">
              {{ item.fName }} {{ item.lName }}
            </div>
            <div class="text-caption text-grey">{{ item.email }}</div>
          </template>

          <!-- Roles Column -->
          <template v-slot:item.roles="{ item }">
            <v-chip
              v-for="ud in item.userDepartments"
              :key="ud.ud_id"
              :color="getRoleColor(ud.role?.permission_level)"
              size="small"
              class="ma-1"
            >
              {{ ud.department?.department_name }}: {{ ud.role?.role_name || 'No Role' }}
            </v-chip>
            <v-chip v-if="!item.userDepartments || item.userDepartments.length === 0" size="small" color="grey">
              No Roles Assigned
            </v-chip>
          </template>

          <template v-slot:item.accountStatus="{ item }">
            <v-chip
              size="small"
              :color="item.is_active === false ? 'error' : 'success'"
              variant="tonal"
            >
              {{ item.is_active === false ? 'Inactive' : 'Active' }}
            </v-chip>
          </template>

          <!-- Actions Column -->
          <template v-slot:item.actions="{ item }">
            <div class="d-flex align-center ga-2 justify-center">
              <v-btn
                icon
                size="small"
                @click="openWorkerDetailsDialog(item)"
                color="secondary"
              >
                <v-icon>mdi-card-account-details-outline</v-icon>
              </v-btn>

              <v-btn
                icon
                size="small"
                @click="openAssignRoleDialog(item)"
                color="primary"
              >
                <v-icon>mdi-account-edit</v-icon>
              </v-btn>

              <v-btn
                v-if="canDeactivateUser(item)"
                icon
                size="small"
                color="error"
                :loading="deactivating && selectedDeactivationUser?.id === item.id"
                @click="openDeactivateDialog(item)"
              >
                <v-icon>mdi-account-off</v-icon>
              </v-btn>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <v-dialog v-model="workerDetailsDialog" max-width="1100px">
      <v-card>
        <v-card-text class="pa-8">
          <div class="worker-dialog-header">
            <v-avatar size="72" color="#8B1538">
              <span class="text-h5 text-white">{{ selectedWorkerInitials }}</span>
            </v-avatar>
            <div>
              <div class="worker-dialog-name">
                {{ selectedWorker?.fName }} {{ selectedWorker?.lName }}
              </div>
              <div class="worker-dialog-email">{{ selectedWorker?.email }}</div>
            </div>
          </div>

          <v-tabs v-model="workerDetailsTab" color="#111827" class="mt-6">
            <v-tab value="details">Worker Details</v-tab>
            <v-tab value="class">Class Schedule</v-tab>
          </v-tabs>

          <v-window v-model="workerDetailsTab" class="mt-5">
            <v-window-item value="details">
              <v-divider class="mb-5" />
              <h3 class="text-h5 font-weight-bold mb-4">Weekly Availability</h3>

              <v-progress-linear v-if="loadingWorkerAvailability" indeterminate color="#8B1538" class="mb-4" />

              <div v-else class="weekly-lines">
                <div
                  v-for="day in weekDays"
                  :key="`day-${day.value}`"
                  class="weekly-line-item"
                >
                  <span class="weekly-line-day">{{ day.label }}:</span>
                  <span class="weekly-line-value">{{ dailyAvailabilityLines[day.value] || "—" }}</span>
                </div>
              </div>
            </v-window-item>

            <v-window-item value="class">
              <v-divider class="mb-5" />
              <div class="text-body-1 text-medium-emphasis">
                Class schedule is not configured yet for this worker.
              </div>
            </v-window-item>
          </v-window>
        </v-card-text>

        <v-card-actions class="pa-6 pt-0 justify-end">
          <v-btn variant="text" @click="closeWorkerDetailsDialog">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Assign Role Dialog -->
    <v-dialog v-model="assignRoleDialog" max-width="600px">
      <v-card>
        <v-card-title class="text-h5">
          Assign Role to {{ selectedUser?.fName }} {{ selectedUser?.lName }}
        </v-card-title>

        <v-card-text>
          <v-form ref="roleForm" v-model="formValid">
            <!-- Department Selection -->
            <v-select
              v-model="roleFormData.department_id"
              :items="departments"
              item-title="department_name"
              item-value="department_id"
              label="Department"
              outlined
              dense
              :rules="[rules.required]"
              @update:modelValue="loadDepartmentRoles"
              class="mb-3"
            ></v-select>

            <!-- Role Selection -->
            <v-select
              v-model="roleFormData.role_id"
              :items="availableRoles"
              item-title="role_name"
              item-value="role_id"
              label="Role"
              outlined
              dense
              :rules="[rules.required]"
              :disabled="!roleFormData.department_id"
              class="mb-3"
            >
              <template v-slot:item="{ props, item }">
                <v-list-item v-bind="props">
                  <template v-slot:title>
                    {{ item.raw.role_name }}
                  </template>
                  <template v-slot:subtitle>
                    Permission Level: {{ item.raw.permission_level }}
                  </template>
                </v-list-item>
              </template>
            </v-select>

            <!-- Position Selection (Optional) -->
            <v-select
              v-model="roleFormData.position_id"
              :items="availablePositions"
              item-title="position_name"
              item-value="position_id"
              label="Position (Optional)"
              outlined
              dense
              :disabled="!roleFormData.department_id"
              class="mb-3"
            ></v-select>

            <!-- Current Assignments -->
            <v-divider class="my-4"></v-divider>
            <h4 class="mb-2">Current Role Assignments</h4>
            <v-list density="compact">
              <v-list-item
                v-for="ud in selectedUser?.userDepartments"
                :key="ud.ud_id"
              >
                <template v-slot:prepend>
                  <v-icon>mdi-office-building</v-icon>
                </template>
                <v-list-item-title>
                  {{ ud.department?.department_name }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ ud.role?.role_name || 'No Role' }}
                  <span v-if="ud.position"> - {{ ud.position.position_name }}</span>
                </v-list-item-subtitle>
                <template v-slot:append>
                  <v-btn
                    icon
                    size="small"
                    color="error"
                    @click="removeRole(ud.ud_id)"
                  >
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </template>
              </v-list-item>
              <v-list-item v-if="!selectedUser?.userDepartments || selectedUser.userDepartments.length === 0">
                <v-list-item-title class="text-grey">No current assignments</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" text @click="closeAssignRoleDialog">
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            :loading="saving"
            :disabled="!formValid"
            @click="assignRole"
          >
            Assign Role
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deactivateDialog" max-width="520">
      <v-card>
        <v-card-title class="text-h6">Deactivate Student</v-card-title>
        <v-card-text>
          Are you sure you want to deactivate
          <strong>{{ selectedDeactivationUser?.fName }} {{ selectedDeactivationUser?.lName }}</strong>?
          They will no longer appear in available scheduling workers.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="closeDeactivateDialog">Cancel</v-btn>
          <v-btn color="error" :loading="deactivating" @click="confirmDeactivate(false)">
            Deactivate
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="futureShiftDialog" max-width="640">
      <v-card>
        <v-card-title class="text-h6">Future Shifts Found</v-card-title>
        <v-card-text>
          <div class="mb-2">
            This student has <strong>{{ futureShiftData?.future_shift_count || 0 }}</strong> future shift(s).
            You can remove those shifts and continue deactivation.
          </div>
          <div v-if="futureShiftData?.future_shifts?.length" class="text-caption text-medium-emphasis">
            Example: {{ futureShiftData.future_shifts[0].shift_date }} {{ futureShiftData.future_shifts[0].start_time }}-{{ futureShiftData.future_shifts[0].end_time }}
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="futureShiftDialog = false">Cancel</v-btn>
          <v-btn color="error" :loading="deactivating" @click="confirmDeactivate(true)">
            Deactivate & Remove Future Shifts
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import UserRoleServices from '../services/userRoleServices.js';
import DepartmentServices from '../services/departmentServices.js';
import apiClient from '../services/services.js';
import availabilityService from '../services/availabilityService.js';

// State
const loading = ref(false);
const saving = ref(false);
const error = ref(null);
const successMessage = ref(null);
const formValid = ref(false);
const roleForm = ref(null);

const users = ref([]);
const departments = ref([]);
const availableRoles = ref([]);
const availablePositions = ref([]);

const searchQuery = ref('');

const assignRoleDialog = ref(false);
const selectedUser = ref(null);
const roleFormData = ref({
  department_id: null,
  role_id: null,
  position_id: null
});
const workerDetailsDialog = ref(false);
const workerDetailsTab = ref("details");
const selectedWorker = ref(null);
const loadingWorkerAvailability = ref(false);
const groupedAvailability = ref({});
const deactivating = ref(false);
const deactivateDialog = ref(false);
const futureShiftDialog = ref(false);
const selectedDeactivationUser = ref(null);
const futureShiftData = ref(null);

// Validation Rules
const rules = {
  required: (v) => !!v || 'This field is required'
};

// Table Headers
const headers = [
  { title: 'User', key: 'name', sortable: true },
  { title: 'Roles & Departments', key: 'roles', sortable: false },
  { title: 'Account Status', key: 'accountStatus', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center' }
];

const weekDays = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 0 },
];

// Computed
const filteredUsers = computed(() => {
  return users.value;
});

const selectedWorkerInitials = computed(() => {
  const first = selectedWorker.value?.fName?.[0] || "";
  const last = selectedWorker.value?.lName?.[0] || "";
  return `${first}${last}`.toUpperCase() || "SW";
});

const dailyAvailabilityLines = computed(() => {
  return weekDays.reduce((acc, day) => {
    const grouped = groupedAvailability.value?.[day.value] || { available: [], unavailable: [] };
    const parts = [];

    grouped.available.forEach((slot) => parts.push(`${slot} (Available)`));
    grouped.unavailable.forEach((slot) => parts.push(`${slot} (Unavailable)`));

    acc[day.value] = parts.length ? parts.join(", ") : "—";
    return acc;
  }, {});
});

// Methods
const getRoleColor = (permissionLevel) => {
  if (!permissionLevel) return 'grey';
  if (permissionLevel >= 90) return 'red';  // Admin
  if (permissionLevel >= 50) return 'orange';  // Manager
  return 'blue';  // Student/Worker
};

const isStudentUser = (user) => {
  const memberships = user.userDepartments || [];
  return memberships.some((membership) => {
    const roleName = String(membership?.role?.role_name || '').toLowerCase();
    const permissionLevel = Number(membership?.role?.permission_level || 0);
    return roleName.includes('student') || permissionLevel < 50;
  });
};

const canDeactivateUser = (user) => {
  return user?.is_active !== false && isStudentUser(user);
};

const formatTime = (value) => {
  if (!value) return "";
  const [hStr, mStr] = String(value).split(":");
  const hour = Number(hStr || 0);
  const minute = String(mStr || "00").padStart(2, "0");
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${period}`;
};

const toDayAvailabilityMap = (records) => {
  const base = weekDays.reduce((acc, day) => {
    acc[day.value] = { available: [], unavailable: [] };
    return acc;
  }, {});

  (records || [])
    .filter((entry) => entry?.isRecurring && entry?.dayOfWeek !== null && entry?.dayOfWeek !== undefined)
    .forEach((entry) => {
      const day = Number(entry.dayOfWeek);
      if (!base[day]) return;
      const range = `${formatTime(entry.startTime)} - ${formatTime(entry.endTime)}`;
      const type = String(entry.availabilityType || "").toLowerCase();
      if (type === "unavailable" || type === "time_off") {
        base[day].unavailable.push(range);
      } else {
        base[day].available.push(range);
      }
    });

  Object.keys(base).forEach((day) => {
    base[day].available.sort();
    base[day].unavailable.sort();
  });

  return base;
};

const loadUsers = async () => {
  try {
    loading.value = true;
    error.value = null;

    const response = await UserRoleServices.getAllUsersWithRoles();
    users.value = response.data;
  } catch (err) {
    error.value = 'Failed to load users: ' + (err.response?.data?.message || err.message);
  } finally {
    loading.value = false;
  }
};

const loadDepartments = async () => {
  try {
    const response = await DepartmentServices.getDepartments();
    if (response.data.success) {
      departments.value = response.data.data;
    }
  } catch (err) {
    error.value = 'Failed to load departments: ' + (err.response?.data?.message || err.message);
  }
};

const loadDepartmentRoles = async () => {
  if (!roleFormData.value.department_id) return;

  try {
    const [rolesResponse, positionsResponse] = await Promise.all([
      UserRoleServices.getAllRoles(roleFormData.value.department_id),
      apiClient.get(`/positions?department_id=${roleFormData.value.department_id}`),
    ]);

    availableRoles.value = rolesResponse?.data?.data || [];
    availablePositions.value = positionsResponse?.data?.data || [];
  } catch (err) {
    error.value = 'Failed to load roles: ' + (err.response?.data?.message || err.message);
  }
};

const openAssignRoleDialog = (user) => {
  selectedUser.value = user;
  roleFormData.value = {
    department_id: null,
    role_id: null,
    position_id: null
  };
  assignRoleDialog.value = true;
};

const openWorkerDetailsDialog = async (user) => {
  selectedWorker.value = user;
  workerDetailsTab.value = "details";
  groupedAvailability.value = toDayAvailabilityMap([]);
  workerDetailsDialog.value = true;
  loadingWorkerAvailability.value = true;

  try {
    const response = await availabilityService.listForUser(user.id);
    groupedAvailability.value = toDayAvailabilityMap(response?.data || []);
  } catch (err) {
    groupedAvailability.value = toDayAvailabilityMap([]);
    error.value = 'Failed to load worker availability: ' + (err.response?.data?.message || err.message);
  } finally {
    loadingWorkerAvailability.value = false;
  }
};

const closeWorkerDetailsDialog = () => {
  workerDetailsDialog.value = false;
  selectedWorker.value = null;
  groupedAvailability.value = {};
};

const closeAssignRoleDialog = () => {
  assignRoleDialog.value = false;
  selectedUser.value = null;
  roleFormData.value = {
    department_id: null,
    role_id: null,
    position_id: null
  };
};

const assignRole = async () => {
  if (!roleForm.value || !formValid.value) return;

  try {
    saving.value = true;
    error.value = null;
    successMessage.value = null;

    const data = {
      user_id: selectedUser.value.id,
      department_id: roleFormData.value.department_id,
      role_id: roleFormData.value.role_id,
      position_id: roleFormData.value.position_id
    };

    const response = await UserRoleServices.assignUserRole(data);

    successMessage.value = response.data.message || 'Role assigned successfully!';
    
    // Reload users to reflect changes
    await loadUsers();
    
    closeAssignRoleDialog();
  } catch (err) {
    error.value = 'Failed to assign role: ' + (err.response?.data?.message || err.message);
  } finally {
    saving.value = false;
  }
};

const removeRole = async (udId) => {
  if (!confirm('Are you sure you want to remove this role assignment?')) return;

  try {
    saving.value = true;
    error.value = null;
    successMessage.value = null;

    await UserRoleServices.removeUserRole(udId);

    successMessage.value = 'Role removed successfully!';
    
    // Reload users to reflect changes
    await loadUsers();
  } catch (err) {
    error.value = 'Failed to remove role: ' + (err.response?.data?.message || err.message);
  } finally {
    saving.value = false;
  }
};

const openDeactivateDialog = (user) => {
  selectedDeactivationUser.value = user;
  futureShiftData.value = null;
  deactivateDialog.value = true;
};

const closeDeactivateDialog = () => {
  deactivateDialog.value = false;
  selectedDeactivationUser.value = null;
};

const confirmDeactivate = async (removeFutureShifts) => {
  if (!selectedDeactivationUser.value) return;

  try {
    deactivating.value = true;
    error.value = null;
    successMessage.value = null;

    const response = await UserRoleServices.deactivateUser(
      selectedDeactivationUser.value.id,
      removeFutureShifts,
    );

    const removedCount = response?.data?.data?.removed_future_shifts || 0;
    successMessage.value = removedCount > 0
      ? `User deactivated successfully and ${removedCount} future shift(s) were removed.`
      : 'User deactivated successfully.';

    deactivateDialog.value = false;
    futureShiftDialog.value = false;
    selectedDeactivationUser.value = null;
    futureShiftData.value = null;

    await loadUsers();
  } catch (err) {
    const payload = err?.response?.data;
    if (err?.response?.status === 409 && payload?.requires_shift_removal) {
      deactivateDialog.value = false;
      futureShiftData.value = payload;
      futureShiftDialog.value = true;
      return;
    }

    error.value = 'Failed to deactivate user: ' + (payload?.message || err.message);
  } finally {
    deactivating.value = false;
  }
};

// Lifecycle
onMounted(() => {
  loadUsers();
  loadDepartments();
});
</script>

<style scoped>
.user-management-container {
  padding: 28px 36px;
  min-height: calc(100vh - 76px);
  background: #f4f5f7;
}

.management-card {
  border-radius: 14px;
  padding: 24px;
}

.worker-dialog-header {
  display: flex;
  align-items: center;
  gap: 18px;
}

.worker-dialog-name {
  font-size: 48px;
  line-height: 1.05;
  font-weight: 700;
  color: #101828;
}

.worker-dialog-email {
  margin-top: 6px;
  font-size: 20px;
  color: #667085;
  font-weight: 500;
}

.weekly-lines {
  border: 1px solid #eaecf0;
  border-radius: 12px;
  overflow: hidden;
}

.weekly-line-item {
  display: flex;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid #eaecf0;
  background: #fff;
}

.weekly-line-item:last-child {
  border-bottom: 0;
}

.weekly-line-day {
  min-width: 58px;
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
}

.weekly-line-value {
  font-size: 14px;
  color: #475467;
}

@media (max-width: 1280px) {
  .weekly-line-item {
    flex-direction: column;
    gap: 2px;
  }
}

@media (max-width: 840px) {
  .worker-dialog-name {
    font-size: 32px;
  }

  .worker-dialog-email {
    font-size: 16px;
  }

  .weekly-line-day {
    min-width: 0;
  }
}
</style>
