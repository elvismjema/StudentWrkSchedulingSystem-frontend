<template>
  <div class="user-management-container">
    <v-card class="management-card" elevation="2">
      <v-card-title class="text-h4 mb-4">
        <v-icon left>mdi-account-multiple</v-icon>
        User Management
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
          <v-col cols="12" md="6">
            <v-text-field
              v-model="searchQuery"
              label="Search users..."
              prepend-inner-icon="mdi-magnify"
              outlined
              dense
              clearable
            ></v-text-field>
          </v-col>
          <v-col cols="12" md="6">
            <v-select
              v-model="filterDepartment"
              :items="departments"
              item-title="department_name"
              item-value="department_id"
              label="Filter by Department"
              outlined
              dense
              clearable
            ></v-select>
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

          <!-- Actions Column -->
          <template v-slot:item.actions="{ item }">
            <v-btn
              icon
              size="small"
              @click="openAssignRoleDialog(item)"
              color="primary"
            >
              <v-icon>mdi-account-edit</v-icon>
            </v-btn>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import UserRoleServices from '../services/userRoleServices.js';
import DepartmentServices from '../services/departmentServices.js';

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
const filterDepartment = ref(null);

const assignRoleDialog = ref(false);
const selectedUser = ref(null);
const roleFormData = ref({
  department_id: null,
  role_id: null,
  position_id: null
});

// Validation Rules
const rules = {
  required: (v) => !!v || 'This field is required'
};

// Table Headers
const headers = [
  { title: 'User', key: 'name', sortable: true },
  { title: 'Roles & Departments', key: 'roles', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center' }
];

// Computed
const filteredUsers = computed(() => {
  let filtered = users.value;

  if (filterDepartment.value) {
    filtered = filtered.filter(user => 
      user.userDepartments?.some(ud => 
        ud.department_id === filterDepartment.value
      )
    );
  }

  return filtered;
});

// Methods
const getRoleColor = (permissionLevel) => {
  if (!permissionLevel) return 'grey';
  if (permissionLevel >= 90) return 'red';  // Admin
  if (permissionLevel >= 50) return 'orange';  // Manager
  return 'blue';  // Student/Worker
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
    const response = await UserRoleServices.getAllRoles(roleFormData.value.department_id);
    if (response.data.success) {
      availableRoles.value = response.data.data;
    }

    // Load positions for the department
    const dept = departments.value.find(d => d.department_id === roleFormData.value.department_id);
    availablePositions.value = dept?.positions || [];
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
</style>
