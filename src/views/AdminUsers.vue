<template>
  <div class="admin-users-container">
    <!-- Page Header -->
    <div class="admin-page-header mb-6">
      <div class="d-flex align-center justify-space-between flex-wrap gap-3">
        <div>
          <h1 class="text-h4 font-weight-bold">Manage Users</h1>
          <p class="text-body-2 text-grey mt-1">
            View and manage all user accounts, roles, and permissions across all departments.
          </p>
        </div>
        <v-btn
          color="primary"
          prepend-icon="mdi-account-plus"
          @click="openInviteDialog"
        >
          Invite / Pre-Provision User
        </v-btn>
      </div>
    </div>

    <!-- Status Alerts -->
    <v-alert v-if="error" type="error" dismissible @click:close="error = null" class="mb-4">
      {{ error }}
    </v-alert>
    <v-alert v-if="successMessage" type="success" dismissible @click:close="successMessage = null" class="mb-4">
      {{ successMessage }}
    </v-alert>

    <!-- ═══ ACTIVE USERS TABLE ═══════════════════════════════════════════════ -->
    <v-card class="admin-card mb-6" elevation="2">
      <v-card-title class="d-flex align-center gap-2 pa-5 pb-0">
        <v-icon color="primary">mdi-account-multiple</v-icon>
        <span>All Users</span>
        <v-chip class="ml-2" size="small" color="primary" variant="tonal">
          {{ users.length }}
        </v-chip>
        <v-spacer />
        <!-- Search -->
        <v-text-field
          v-model="searchQuery"
          label="Search users..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          clearable
          hide-details
          style="max-width: 280px"
        />
        <!-- Department filter -->
        <v-select
          v-model="filterDepartment"
          :items="[{ department_id: null, department_name: 'All Departments' }, ...departments]"
          item-title="department_name"
          item-value="department_id"
          label="Filter Department"
          variant="outlined"
          density="compact"
          hide-details
          style="max-width: 220px"
        />
      </v-card-title>

      <v-card-text class="pa-5">
        <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />
        <v-data-table
          :headers="userHeaders"
          :items="filteredUsers"
          :search="searchQuery"
          :loading="loading"
          class="elevation-0"
          item-value="id"
        >
          <!-- Name column -->
          <template #item.name="{ item }">
            <div>
              <div class="font-weight-medium">{{ item.fName }} {{ item.lName }}</div>
              <div class="text-caption text-medium-emphasis">{{ item.email }}</div>
            </div>
          </template>

          <!-- Account status -->
          <template #item.account_status="{ item }">
            <v-chip
              size="small"
              :color="item.is_active === false ? 'error' : 'success'"
              variant="tonal"
            >
              {{ item.is_active === false ? 'Inactive' : 'Active' }}
            </v-chip>
          </template>

          <!-- Highest role badge -->
          <template #item.highest_role="{ item }">
            <v-chip
              size="small"
              :color="getHighestRoleColor(item)"
              variant="tonal"
              class="font-weight-medium"
            >
              <v-icon start size="14">{{ getHighestRoleIcon(item) }}</v-icon>
              {{ getHighestRole(item) }}
            </v-chip>
          </template>

          <!-- Department roles -->
          <template #item.roles="{ item }">
            <div class="d-flex flex-wrap gap-1">
              <v-chip
                v-for="ud in item.userDepartments"
                :key="ud.ud_id"
                size="x-small"
                :color="getRoleColor(ud.role?.permission_level)"
                variant="tonal"
              >
                {{ ud.department?.department_name }}: {{ ud.role?.role_name || 'No Role' }}
              </v-chip>
              <v-chip
                v-if="!item.userDepartments || item.userDepartments.length === 0"
                size="x-small"
                color="grey"
                variant="tonal"
              >
                No Roles
              </v-chip>
            </div>
          </template>

          <!-- Actions -->
          <template #item.actions="{ item }">
            <div class="d-flex align-center justify-center gap-1">
              <v-tooltip text="Assign / Edit Role" location="top">
                <template #activator="{ props }">
                  <v-btn v-bind="props" icon size="small" color="primary" variant="text"
                    @click="openAssignRoleDialog(item)">
                    <v-icon>mdi-account-edit</v-icon>
                  </v-btn>
                </template>
              </v-tooltip>

              <v-tooltip v-if="item.is_active !== false" text="Deactivate Account" location="top">
                <template #activator="{ props }">
                  <v-btn v-bind="props" icon size="small" color="warning" variant="text"
                    @click="openDeactivateDialog(item)">
                    <v-icon>mdi-account-off</v-icon>
                  </v-btn>
                </template>
              </v-tooltip>

              <v-tooltip text="Remove User Permanently" location="top">
                <template #activator="{ props }">
                  <v-btn v-bind="props" icon size="small" color="error" variant="text"
                    @click="openDeleteDialog(item)">
                    <v-icon>mdi-delete-forever</v-icon>
                  </v-btn>
                </template>
              </v-tooltip>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- ═══ PENDING ASSIGNMENTS TABLE ════════════════════════════════════════ -->
    <v-card class="admin-card" elevation="2">
      <v-card-title class="d-flex align-center gap-2 pa-5 pb-0">
        <v-icon color="warning">mdi-clock-outline</v-icon>
        <span>Pending Invitations</span>
        <v-chip class="ml-2" size="small" color="warning" variant="tonal">
          {{ pendingAssignments.length }}
        </v-chip>
        <v-spacer />
        <v-btn variant="outlined" size="small" prepend-icon="mdi-refresh" @click="loadPendingAssignments">
          Refresh
        </v-btn>
      </v-card-title>
      <v-card-subtitle class="px-5 pb-2 pt-1 text-medium-emphasis">
        Role assignments awaiting first login. They activate automatically when the user signs in with Google.
      </v-card-subtitle>

      <v-card-text class="pa-5">
        <v-progress-linear v-if="loadingPending" indeterminate color="warning" class="mb-4" />
        <v-data-table
          :headers="pendingHeaders"
          :items="pendingAssignments"
          :loading="loadingPending"
          class="elevation-0"
          :no-data-text="'No pending invitations'"
        >
          <template #item.email="{ item }">
            <span class="font-weight-medium">{{ item.email }}</span>
          </template>
          <template #item.department="{ item }">
            {{ item.department?.department_name || '—' }}
          </template>
          <template #item.role="{ item }">
            <v-chip size="small" :color="getRoleColor(item.role?.permission_level)" variant="tonal">
              {{ item.role?.role_name || '—' }}
            </v-chip>
          </template>
          <template #item.created_at="{ item }">
            {{ formatDate(item.created_at) }}
          </template>
          <template #item.created_by="{ item }">
            {{ item.creator ? `${item.creator.fName} ${item.creator.lName}` : '—' }}
          </template>
          <template #item.actions="{ item }">
            <v-tooltip text="Cancel Invitation" location="top">
              <template #activator="{ props }">
                <v-btn v-bind="props" icon size="small" color="error" variant="text"
                  @click="cancelPending(item.id)">
                  <v-icon>mdi-close-circle-outline</v-icon>
                </v-btn>
              </template>
            </v-tooltip>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- ═══ INVITE / PRE-PROVISION DIALOG ════════════════════════════════════ -->
    <v-dialog v-model="inviteDialog" max-width="560px">
      <v-card>
        <v-card-title class="d-flex align-center gap-2 pa-5 pb-2">
          <v-icon color="primary">mdi-account-plus</v-icon>
          Invite / Pre-Provision User
        </v-card-title>
        <v-card-subtitle class="px-5 pb-4 text-medium-emphasis">
          Enter an email address and assign a department and role. If the user already exists they
          are assigned immediately; otherwise the role activates when they first log in via Google.
        </v-card-subtitle>

        <v-card-text class="px-5">
          <v-form ref="inviteForm" v-model="inviteFormValid">
            <v-text-field
              v-model="inviteData.email"
              label="Email Address"
              prepend-inner-icon="mdi-email"
              variant="outlined"
              density="comfortable"
              :rules="[rules.required, rules.email]"
              class="mb-3"
            />

            <v-select
              v-model="inviteData.department_id"
              :items="departments"
              item-title="department_name"
              item-value="department_id"
              label="Department"
              prepend-inner-icon="mdi-office-building"
              variant="outlined"
              density="comfortable"
              :rules="[rules.required]"
              @update:modelValue="loadInviteRoles"
              class="mb-3"
            />

            <v-select
              v-model="inviteData.role_id"
              :items="inviteRoles"
              item-title="role_name"
              item-value="role_id"
              label="Role"
              prepend-inner-icon="mdi-shield-account"
              variant="outlined"
              density="comfortable"
              :rules="[rules.required]"
              :disabled="!inviteData.department_id"
              class="mb-3"
            >
              <template #item="{ props, item }">
                <v-list-item v-bind="props">
                  <template #subtitle>
                    Permission Level: {{ item.raw.permission_level }}
                  </template>
                </v-list-item>
              </template>
            </v-select>

            <v-select
              v-model="inviteData.position_id"
              :items="invitePositions"
              item-title="position_name"
              item-value="position_id"
              label="Position (Optional)"
              prepend-inner-icon="mdi-briefcase"
              variant="outlined"
              density="comfortable"
              clearable
              :disabled="!inviteData.department_id"
            />
          </v-form>
        </v-card-text>

        <v-card-actions class="px-5 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="closeInviteDialog">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="savingInvite"
            :disabled="!inviteFormValid"
            @click="submitInvite"
          >
            Send Invitation
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ═══ ASSIGN ROLE DIALOG ════════════════════════════════════════════════ -->
    <v-dialog v-model="assignRoleDialog" max-width="600px">
      <v-card>
        <v-card-title class="pa-5 pb-2">
          Manage Roles — {{ selectedUser?.fName }} {{ selectedUser?.lName }}
        </v-card-title>
        <v-card-subtitle class="px-5 pb-4 text-medium-emphasis">
          {{ selectedUser?.email }}
        </v-card-subtitle>

        <v-card-text class="px-5">
          <!-- Current assignments -->
          <h4 class="mb-2">Current Assignments</h4>
          <v-list density="compact" class="mb-4 rounded border">
            <v-list-item
              v-for="ud in selectedUser?.userDepartments"
              :key="ud.ud_id"
            >
              <template #prepend>
                <v-icon size="20">mdi-office-building-outline</v-icon>
              </template>
              <v-list-item-title>{{ ud.department?.department_name }}</v-list-item-title>
              <v-list-item-subtitle>
                {{ ud.role?.role_name || 'No Role' }}
                <span v-if="ud.position"> · {{ ud.position.position_name }}</span>
              </v-list-item-subtitle>
              <template #append>
                <v-btn icon size="x-small" color="error" variant="text"
                  @click="removeRole(ud.ud_id)">
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </template>
            </v-list-item>
            <v-list-item v-if="!selectedUser?.userDepartments?.length">
              <v-list-item-title class="text-medium-emphasis text-caption">
                No role assignments yet.
              </v-list-item-title>
            </v-list-item>
          </v-list>

          <!-- Add new assignment -->
          <v-divider class="mb-4" />
          <h4 class="mb-3">Add / Update Role</h4>
          <v-form ref="roleForm" v-model="roleFormValid">
            <v-select
              v-model="roleFormData.department_id"
              :items="departments"
              item-title="department_name"
              item-value="department_id"
              label="Department"
              variant="outlined"
              density="comfortable"
              :rules="[rules.required]"
              @update:modelValue="loadDepartmentRoles"
              class="mb-3"
            />
            <v-select
              v-model="roleFormData.role_id"
              :items="availableRoles"
              item-title="role_name"
              item-value="role_id"
              label="Role"
              variant="outlined"
              density="comfortable"
              :rules="[rules.required]"
              :disabled="!roleFormData.department_id"
              class="mb-3"
            />
            <v-select
              v-model="roleFormData.position_id"
              :items="availablePositions"
              item-title="position_name"
              item-value="position_id"
              label="Position (Optional)"
              variant="outlined"
              density="comfortable"
              clearable
              :disabled="!roleFormData.department_id"
            />
          </v-form>
        </v-card-text>

        <v-card-actions class="px-5 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="closeAssignRoleDialog">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="saving"
            :disabled="!roleFormValid"
            @click="assignRole"
          >
            Assign Role
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ═══ DEACTIVATE DIALOG ════════════════════════════════════════════════ -->
    <v-dialog v-model="deactivateDialog" max-width="500px">
      <v-card>
        <v-card-title class="pa-5">Deactivate Account</v-card-title>
        <v-card-text class="px-5">
          Deactivate <strong>{{ selectedDeactivationUser?.fName }} {{ selectedDeactivationUser?.lName }}</strong>
          ({{ selectedDeactivationUser?.email }})?
          <br /><br />
          Their account will be marked inactive. They will no longer be able to log in or appear in
          scheduling. This action can be reversed by assigning a new role.
        </v-card-text>
        <v-card-actions class="px-5 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="deactivateDialog = false">Cancel</v-btn>
          <v-btn color="warning" :loading="deactivating" @click="confirmDeactivate(false)">
            Deactivate
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ═══ DELETE DIALOG ════════════════════════════════════════════════════ -->
    <v-dialog v-model="deleteDialog" max-width="500px">
      <v-card>
        <v-card-title class="pa-5 text-error">
          <v-icon color="error" start>mdi-alert</v-icon>
          Permanently Remove User
        </v-card-title>
        <v-card-text class="px-5">
          <p>
            You are about to <strong>permanently delete</strong>
            <strong>{{ selectedDeleteUser?.fName }} {{ selectedDeleteUser?.lName }}</strong>
            (<em>{{ selectedDeleteUser?.email }}</em>) from the system.
          </p>
          <p class="mt-3">
            This will remove all their data including shifts, schedules, and role assignments.
            <strong>This cannot be undone.</strong>
          </p>
          <v-alert type="warning" variant="tonal" density="compact" class="mt-3">
            If the user logs in again they will be re-created with no roles.
          </v-alert>
        </v-card-text>
        <v-card-actions class="px-5 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="error" :loading="deleting" @click="confirmDelete">
            Remove Permanently
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Future shifts deactivation override -->
    <v-dialog v-model="futureShiftDialog" max-width="640">
      <v-card>
        <v-card-title class="pa-5">Future Shifts Found</v-card-title>
        <v-card-text class="px-5">
          <div class="mb-2">
            This user has <strong>{{ futureShiftData?.future_shift_count || 0 }}</strong> upcoming
            shift(s). Remove those shifts to proceed with deactivation.
          </div>
        </v-card-text>
        <v-card-actions class="px-5 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="futureShiftDialog = false">Cancel</v-btn>
          <v-btn color="error" :loading="deactivating" @click="confirmDeactivate(true)">
            Deactivate &amp; Remove Shifts
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import AdminServices from '../services/adminServices.js';
import UserRoleServices from '../services/userRoleServices.js';
import DepartmentServices from '../services/departmentServices.js';
import apiClient from '../services/services.js';

// ─── State ─────────────────────────────────────────────────────────────────
const loading = ref(false);
const loadingPending = ref(false);
const saving = ref(false);
const savingInvite = ref(false);
const deactivating = ref(false);
const deleting = ref(false);
const error = ref(null);
const successMessage = ref(null);

const users = ref([]);
const pendingAssignments = ref([]);
const departments = ref([]);
const availableRoles = ref([]);
const availablePositions = ref([]);
const inviteRoles = ref([]);
const invitePositions = ref([]);

const searchQuery = ref('');
const filterDepartment = ref(null);

// Dialogs
const inviteDialog = ref(false);
const inviteFormValid = ref(false);
const inviteForm = ref(null);
const inviteData = ref({ email: '', department_id: null, role_id: null, position_id: null });

const assignRoleDialog = ref(false);
const roleFormValid = ref(false);
const roleForm = ref(null);
const selectedUser = ref(null);
const roleFormData = ref({ department_id: null, role_id: null, position_id: null });

const deactivateDialog = ref(false);
const futureShiftDialog = ref(false);
const selectedDeactivationUser = ref(null);
const futureShiftData = ref(null);

const deleteDialog = ref(false);
const selectedDeleteUser = ref(null);

// ─── Validation ─────────────────────────────────────────────────────────────
const rules = {
  required: (v) => !!v || 'This field is required',
  email: (v) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '') || 'Enter a valid email address',
};

// ─── Table Headers ───────────────────────────────────────────────────────────
const userHeaders = [
  { title: 'User', key: 'name', sortable: true },
  { title: 'Status', key: 'account_status', sortable: false },
  { title: 'Highest Role', key: 'highest_role', sortable: false },
  { title: 'Department Roles', key: 'roles', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center' },
];

const pendingHeaders = [
  { title: 'Email', key: 'email', sortable: true },
  { title: 'Department', key: 'department', sortable: false },
  { title: 'Role', key: 'role', sortable: false },
  { title: 'Created', key: 'created_at', sortable: true },
  { title: 'Created By', key: 'created_by', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center' },
];

// ─── Computed ────────────────────────────────────────────────────────────────
const filteredUsers = computed(() => {
  if (!filterDepartment.value) return users.value;
  return users.value.filter((u) =>
    u.userDepartments?.some((ud) => ud.department_id === filterDepartment.value)
  );
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getRoleColor = (permissionLevel) => {
  if (!permissionLevel) return 'grey';
  if (permissionLevel >= 90) return 'red';
  if (permissionLevel >= 50) return 'deep-orange';
  return 'blue';
};

const getHighestRole = (user) => {
  const memberships = user.userDepartments || [];
  const levels = memberships.map((ud) => Number(ud.role?.permission_level || 0));
  const max = Math.max(0, ...levels);
  if (max >= 90) return 'Admin';
  if (max >= 50) return 'Manager';
  if (max > 0) return 'Student / Worker';
  return 'No Role';
};

const getHighestRoleColor = (user) => {
  const role = getHighestRole(user);
  if (role === 'Admin') return 'red';
  if (role === 'Manager') return 'deep-orange';
  if (role === 'Student / Worker') return 'blue';
  return 'grey';
};

const getHighestRoleIcon = (user) => {
  const role = getHighestRole(user);
  if (role === 'Admin') return 'mdi-shield-crown';
  if (role === 'Manager') return 'mdi-shield-account';
  if (role === 'Student / Worker') return 'mdi-account';
  return 'mdi-account-question';
};

const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString();
};

// ─── Data Loading ─────────────────────────────────────────────────────────────
const loadUsers = async () => {
  try {
    loading.value = true;
    error.value = null;
    const response = await AdminServices.getAllUsers();
    users.value = response.data?.data || response.data || [];
  } catch (err) {
    error.value = 'Failed to load users: ' + (err.response?.data?.message || err.message);
  } finally {
    loading.value = false;
  }
};

const loadPendingAssignments = async () => {
  try {
    loadingPending.value = true;
    const response = await AdminServices.getPendingAssignments();
    pendingAssignments.value = response.data?.data || [];
  } catch (err) {
    error.value = 'Failed to load pending assignments: ' + (err.response?.data?.message || err.message);
  } finally {
    loadingPending.value = false;
  }
};

const loadDepartments = async () => {
  try {
    const response = await DepartmentServices.getDepartments();
    departments.value = response.data?.data || response.data || [];
  } catch (err) {
    error.value = 'Failed to load departments: ' + (err.response?.data?.message || err.message);
  }
};

const loadDepartmentRoles = async () => {
  if (!roleFormData.value.department_id) return;
  try {
    const [rolesRes, posRes] = await Promise.all([
      UserRoleServices.getAllRoles(roleFormData.value.department_id),
      apiClient.get(`/positions?department_id=${roleFormData.value.department_id}`),
    ]);
    availableRoles.value = rolesRes?.data?.data || [];
    availablePositions.value = posRes?.data?.data || [];
  } catch (err) {
    error.value = 'Failed to load roles: ' + (err.response?.data?.message || err.message);
  }
};

const loadInviteRoles = async () => {
  if (!inviteData.value.department_id) return;
  inviteData.value.role_id = null;
  inviteData.value.position_id = null;
  try {
    const [rolesRes, posRes] = await Promise.all([
      UserRoleServices.getAllRoles(inviteData.value.department_id),
      apiClient.get(`/positions?department_id=${inviteData.value.department_id}`),
    ]);
    inviteRoles.value = rolesRes?.data?.data || [];
    invitePositions.value = posRes?.data?.data || [];
  } catch (err) {
    error.value = 'Failed to load roles: ' + (err.response?.data?.message || err.message);
  }
};

// ─── Invite / Pre-Provision ───────────────────────────────────────────────────
const openInviteDialog = () => {
  inviteData.value = { email: '', department_id: null, role_id: null, position_id: null };
  inviteRoles.value = [];
  invitePositions.value = [];
  inviteDialog.value = true;
};

const closeInviteDialog = () => {
  inviteDialog.value = false;
};

const submitInvite = async () => {
  if (!inviteForm.value || !inviteFormValid.value) return;
  try {
    savingInvite.value = true;
    error.value = null;
    const response = await AdminServices.createPendingAssignment(inviteData.value);
    successMessage.value = response.data?.message || 'Invitation sent successfully.';
    closeInviteDialog();
    await Promise.all([loadUsers(), loadPendingAssignments()]);
  } catch (err) {
    error.value = 'Failed to send invitation: ' + (err.response?.data?.message || err.message);
  } finally {
    savingInvite.value = false;
  }
};

const cancelPending = async (id) => {
  if (!confirm('Cancel this pending invitation?')) return;
  try {
    await AdminServices.deletePendingAssignment(id);
    successMessage.value = 'Pending invitation cancelled.';
    await loadPendingAssignments();
  } catch (err) {
    error.value = 'Failed to cancel: ' + (err.response?.data?.message || err.message);
  }
};

// ─── Assign Role ──────────────────────────────────────────────────────────────
const openAssignRoleDialog = (user) => {
  selectedUser.value = user;
  roleFormData.value = { department_id: null, role_id: null, position_id: null };
  availableRoles.value = [];
  availablePositions.value = [];
  assignRoleDialog.value = true;
};

const closeAssignRoleDialog = () => {
  assignRoleDialog.value = false;
  selectedUser.value = null;
};

const assignRole = async () => {
  if (!roleForm.value || !roleFormValid.value) return;
  try {
    saving.value = true;
    error.value = null;
    await UserRoleServices.assignUserRole({
      user_id: selectedUser.value.id,
      ...roleFormData.value,
    });
    successMessage.value = 'Role assigned successfully!';
    await loadUsers();
    closeAssignRoleDialog();
  } catch (err) {
    error.value = 'Failed to assign role: ' + (err.response?.data?.message || err.message);
  } finally {
    saving.value = false;
  }
};

const removeRole = async (udId) => {
  if (!confirm('Remove this role assignment?')) return;
  try {
    saving.value = true;
    await UserRoleServices.removeUserRole(udId);
    successMessage.value = 'Role removed.';
    await loadUsers();
    // Refresh selected user data
    if (selectedUser.value) {
      const updated = users.value.find((u) => u.id === selectedUser.value.id);
      if (updated) selectedUser.value = updated;
    }
  } catch (err) {
    error.value = 'Failed to remove role: ' + (err.response?.data?.message || err.message);
  } finally {
    saving.value = false;
  }
};

// ─── Deactivate ───────────────────────────────────────────────────────────────
const openDeactivateDialog = (user) => {
  selectedDeactivationUser.value = user;
  futureShiftData.value = null;
  deactivateDialog.value = true;
};

const confirmDeactivate = async (removeFutureShifts) => {
  if (!selectedDeactivationUser.value) return;
  try {
    deactivating.value = true;
    const response = await UserRoleServices.deactivateUser(
      selectedDeactivationUser.value.id,
      removeFutureShifts
    );
    const removed = response?.data?.data?.removed_future_shifts || 0;
    successMessage.value = removed
      ? `User deactivated and ${removed} future shift(s) removed.`
      : 'User deactivated successfully.';
    deactivateDialog.value = false;
    futureShiftDialog.value = false;
    selectedDeactivationUser.value = null;
    await loadUsers();
  } catch (err) {
    const payload = err?.response?.data;
    if (err?.response?.status === 409 && payload?.requires_shift_removal) {
      deactivateDialog.value = false;
      futureShiftData.value = payload;
      futureShiftDialog.value = true;
      return;
    }
    error.value = 'Failed to deactivate: ' + (payload?.message || err.message);
  } finally {
    deactivating.value = false;
  }
};

// ─── Delete ───────────────────────────────────────────────────────────────────
const openDeleteDialog = (user) => {
  selectedDeleteUser.value = user;
  deleteDialog.value = true;
};

const confirmDelete = async () => {
  if (!selectedDeleteUser.value) return;
  try {
    deleting.value = true;
    error.value = null;
    const response = await AdminServices.deleteUser(selectedDeleteUser.value.id);
    successMessage.value = response.data?.message || 'User removed successfully.';
    deleteDialog.value = false;
    selectedDeleteUser.value = null;
    await loadUsers();
  } catch (err) {
    error.value = 'Failed to remove user: ' + (err.response?.data?.message || err.message);
  } finally {
    deleting.value = false;
  }
};

// ─── Lifecycle ───────────────────────────────────────────────────────────────
onMounted(() => {
  loadUsers();
  loadDepartments();
  loadPendingAssignments();
});
</script>

<style scoped>
.admin-users-container {
  padding: 28px 36px;
  min-height: calc(100vh - 76px);
  background: #f4f5f7;
}

.admin-page-header {
  border-bottom: 1px solid #e3e5e8;
  padding-bottom: 1.25rem;
}

.admin-card {
  border-radius: 14px;
}
</style>
