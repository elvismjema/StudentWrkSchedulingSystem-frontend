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
        <v-chip
          v-if="usersDataSource"
          size="x-small"
          color="grey"
          variant="outlined"
        >
          Source: {{ usersDataSource }}
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
        <v-select
          v-model="filterRole"
          :items="roleFilterOptions"
          item-title="label"
          item-value="value"
          label="Filter Role"
          variant="outlined"
          density="compact"
          hide-details
          style="max-width: 220px"
        />
      </v-card-title>

      <v-card-text class="pa-5">
        <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />
        <v-table class="admin-table" density="comfortable">
          <thead>
            <tr>
              <th>User</th>
              <th>Status</th>
              <th>Highest Role</th>
              <th>Department Roles</th>
              <th class="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredUsers" :key="item.id">
              <td>
                <div class="font-weight-medium">{{ item.fName }} {{ item.lName }}</div>
                <div class="text-caption text-medium-emphasis">{{ item.email }}</div>
              </td>
              <td>
                <v-chip
                  size="small"
                  :color="item.is_active === false ? 'error' : 'success'"
                  variant="tonal"
                >
                  {{ item.is_active === false ? 'Inactive' : 'Active' }}
                </v-chip>
              </td>
              <td>
                <v-chip
                  size="small"
                  :color="getHighestRoleColor(item)"
                  variant="tonal"
                  class="font-weight-medium"
                >
                  <v-icon start size="14">{{ getHighestRoleIcon(item) }}</v-icon>
                  {{ getHighestRole(item) }}
                </v-chip>
              </td>
              <td>
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
              </td>
              <td>
                <div class="d-flex align-center justify-center gap-1">
                  <!-- Promote to Admin: only shown for non-admin users -->
                  <v-tooltip
                    v-if="getHighestRole(item) !== 'Admin'"
                    text="Promote to Admin"
                    location="top"
                  >
                    <template #activator="{ props }">
                      <v-btn v-bind="props" icon size="small" color="deep-purple" variant="text"
                        @click="openPromoteToAdminDialog(item)">
                        <v-icon>mdi-shield-crown</v-icon>
                      </v-btn>
                    </template>
                  </v-tooltip>

                  <!-- Assign / Manage Department: visible for all users (admins can manage anyone) -->
                  <v-tooltip
                    text="Manage Department Assignment"
                    location="top"
                  >
                    <template #activator="{ props }">
                      <v-btn v-bind="props" icon size="small" color="teal" variant="text"
                        @click="openAssignDeptDialog(item)">
                        <v-icon>mdi-office-building-marker</v-icon>
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
              </td>
            </tr>
            <tr v-if="!loading && filteredUsers.length === 0">
              <td colspan="5" class="text-center text-medium-emphasis py-6">No users found.</td>
            </tr>
          </tbody>
        </v-table>
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
        <v-chip
          v-if="pendingDataSource"
          size="x-small"
          color="grey"
          variant="outlined"
        >
          Source: {{ pendingDataSource }}
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
        <v-table class="admin-table" density="comfortable">
          <thead>
            <tr>
              <th>Email</th>
              <th>Department</th>
              <th>Role</th>
              <th>Created</th>
              <th>Created By</th>
              <th class="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in pendingAssignments" :key="item.id">
              <td><span class="font-weight-medium">{{ item.email }}</span></td>
              <td>{{ item.department?.department_name || '—' }}</td>
              <td>
                <v-chip size="small" :color="getRoleColor(item.role?.permission_level)" variant="tonal">
                  {{ item.role?.role_name || '—' }}
                </v-chip>
              </td>
              <td>{{ formatDate(item.created_at) }}</td>
              <td>{{ item.creator ? `${item.creator.fName} ${item.creator.lName}` : '—' }}</td>
              <td>
                <div class="d-flex justify-center">
                  <v-tooltip text="Cancel Invitation" location="top">
                    <template #activator="{ props }">
                      <v-btn v-bind="props" icon size="small" color="error" variant="text"
                        @click="cancelPending(item.id)">
                        <v-icon>mdi-close-circle-outline</v-icon>
                      </v-btn>
                    </template>
                  </v-tooltip>
                </div>
              </td>
            </tr>
            <tr v-if="!loadingPending && pendingAssignments.length === 0">
              <td colspan="6" class="text-center text-medium-emphasis py-6">No pending invitations.</td>
            </tr>
          </tbody>
        </v-table>
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

    <!-- ═══ PROMOTE TO ADMIN DIALOG ════════════════════════════════════════ -->
    <v-dialog v-model="promoteToAdminDialog" max-width="500px">
      <v-card>
        <v-card-title class="d-flex align-center gap-2 pa-5 pb-2">
          <v-icon color="deep-purple" start>mdi-shield-crown</v-icon>
          Promote to Admin
        </v-card-title>
        <v-card-text class="px-5">
          <p>
            You are about to grant <strong>site-wide admin access</strong> to
            <strong>{{ promoteToAdminUser?.fName }} {{ promoteToAdminUser?.lName }}</strong>
            ({{ promoteToAdminUser?.email }}).
          </p>
          <v-alert type="warning" variant="tonal" density="compact" class="mt-3">
            This will remove all their current department assignments and future shifts.
            Admins manage the entire site, not a specific department.
          </v-alert>
        </v-card-text>
        <v-card-actions class="px-5 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="promoteToAdminDialog = false">Cancel</v-btn>
          <v-btn color="deep-purple" :loading="promotingToAdmin" @click="confirmPromoteToAdmin">
            Make Admin
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

    <!-- ═══ ASSIGN TO DEPARTMENT DIALOG ════════════════════════════════════ -->
    <v-dialog v-model="assignDeptDialog" max-width="600px">
      <v-card>
        <v-card-title class="d-flex align-center gap-2 pa-5 pb-2">
          <v-icon color="teal">mdi-office-building-marker</v-icon>
          Manage Department — {{ assignDeptUser?.fName }} {{ assignDeptUser?.lName }}
        </v-card-title>
        <v-card-subtitle class="px-5 pb-4 text-medium-emphasis">
          {{ assignDeptUser?.email }}
        </v-card-subtitle>

        <v-card-text class="px-5">
          <!-- Current assignments with remove buttons -->
          <h4 class="mb-2">Current Assignments</h4>
          <v-list density="compact" class="mb-4 rounded border">
            <v-list-item
              v-for="ud in assignDeptUser?.userDepartments"
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
                  :loading="removingRoleId === ud.ud_id"
                  @click="removeRoleFromDeptDialog(ud.ud_id)">
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </template>
            </v-list-item>
            <v-list-item v-if="!assignDeptUser?.userDepartments?.length">
              <v-list-item-title class="text-medium-emphasis text-caption">
                No department assignments yet.
              </v-list-item-title>
            </v-list-item>
          </v-list>

          <v-divider class="mb-4" />
          <h4 class="mb-3">Assign to New Department</h4>

          <!-- Warning about existing assignments -->
          <v-alert
            v-if="assignDeptCurrentAssignments.length > 0"
            type="warning"
            variant="tonal"
            density="compact"
            class="mb-4"
          >
            <strong>Warning:</strong> This person is currently assigned to:
            <ul class="mt-1 ml-4">
              <li v-for="ud in assignDeptCurrentAssignments" :key="ud.ud_id">
                {{ ud.department?.department_name }}: {{ ud.role?.role_name || 'No Role' }}
              </li>
            </ul>
            Assigning them to a new department will <strong>remove all other assignments</strong>
            and <strong>unassign them from future shifts</strong> in those departments.
          </v-alert>

          <v-form ref="assignDeptForm" v-model="assignDeptFormValid">
            <v-select
              v-model="assignDeptData.department_id"
              :items="departments"
              item-title="department_name"
              item-value="department_id"
              label="Department"
              prepend-inner-icon="mdi-office-building"
              variant="outlined"
              density="comfortable"
              :rules="[rules.required]"
              @update:modelValue="loadAssignDeptRoles"
              class="mb-3"
            />
            <v-select
              v-model="assignDeptData.role_id"
              :items="assignDeptRoles"
              item-title="role_name"
              item-value="role_id"
              label="Role"
              prepend-inner-icon="mdi-shield-account"
              variant="outlined"
              density="comfortable"
              :rules="[rules.required]"
              :disabled="!assignDeptData.department_id"
              class="mb-3"
            >
              <template #item="{ props, item }">
                <v-list-item v-bind="props">
                  <template #subtitle>Permission Level: {{ item.raw.permission_level }}</template>
                </v-list-item>
              </template>
            </v-select>
            <v-select
              v-model="assignDeptData.position_id"
              :items="assignDeptPositions"
              item-title="position_name"
              item-value="position_id"
              label="Position (Optional)"
              prepend-inner-icon="mdi-briefcase"
              variant="outlined"
              density="comfortable"
              clearable
              :disabled="!assignDeptData.department_id"
            />
          </v-form>

          <!-- Confirmation checkbox when user already has assignments -->
          <v-checkbox
            v-if="assignDeptCurrentAssignments.length > 0"
            v-model="assignDeptConfirmed"
            label="I understand their current assignments and future shifts will be removed."
            color="teal"
            class="mt-2"
          />
        </v-card-text>

        <v-card-actions class="px-5 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="closeAssignDeptDialog">Cancel</v-btn>
          <v-btn
            color="teal"
            :loading="assigningDept"
            :disabled="
              !assignDeptFormValid ||
              !assignDeptData.department_id ||
              !assignDeptData.role_id ||
              (assignDeptCurrentAssignments.length > 0 && !assignDeptConfirmed)
            "
            @click="submitAssignDept"
          >
            Assign to Department
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
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import AdminServices from '../services/adminServices.js';
import UserRoleServices from '../services/userRoleServices.js';
import DepartmentServices from '../services/departmentServices.js';
import apiClient from '../services/services.js';
import { TZ } from '../utils/tz.js';

const route = useRoute();

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

const inviteRoles = ref([]);
const invitePositions = ref([]);
const usersDataSource = ref('');
const pendingDataSource = ref('');

const searchQuery = ref('');
const filterDepartment = ref(null);
const filterRole = ref('all');

const roleFilterOptions = [
  { label: 'All Roles', value: 'all' },
  { label: 'Student Workers', value: 'student' },
  { label: 'Managers', value: 'manager' },
  { label: 'Admins', value: 'admin' },
];

// Dialogs
const inviteDialog = ref(false);
const inviteFormValid = ref(false);
const inviteForm = ref(null);
const inviteData = ref({ email: '', department_id: null, role_id: null, position_id: null });

const deactivateDialog = ref(false);
const futureShiftDialog = ref(false);
const selectedDeactivationUser = ref(null);
const futureShiftData = ref(null);

const deleteDialog = ref(false);
const selectedDeleteUser = ref(null);

// ─── Promote to Admin dialog ──────────────────────────────────────────────────
const promoteToAdminDialog = ref(false);
const promoteToAdminUser = ref(null);
const promotingToAdmin = ref(false);

// ─── Assign to Department dialog ─────────────────────────────────────────────
const assignDeptDialog = ref(false);
const assignDeptFormValid = ref(false);
const assignDeptForm = ref(null);
const assignDeptUser = ref(null);
const assignDeptRoles = ref([]);
const assignDeptPositions = ref([]);
const assigningDept = ref(false);
const assignDeptConfirmed = ref(false);
const assignDeptData = ref({ department_id: null, role_id: null, position_id: null });
const removingRoleId = ref(null);

// ─── Validation ─────────────────────────────────────────────────────────────
const rules = {
  required: (v) => !!v || 'This field is required',
  email: (v) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '') || 'Enter a valid email address',
};

// ─── Computed ────────────────────────────────────────────────────────────────
const filteredUsers = computed(() => {
  let filtered = users.value;

  if (filterDepartment.value) {
    filtered = filtered.filter((u) =>
      u.userDepartments?.some((ud) => ud.department_id === filterDepartment.value),
    );
  }

  if (filterRole.value !== 'all') {
    filtered = filtered.filter((u) => userMatchesRoleFilter(u, filterRole.value));
  }

  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return filtered;

  return filtered.filter((u) => {
    const fullName = `${u.fName || ''} ${u.lName || ''}`.trim().toLowerCase();
    const email = String(u.email || '').toLowerCase();
    const roleBlob = (u.userDepartments || [])
      .map((ud) => `${ud.department?.department_name || ''} ${ud.role?.role_name || ''}`)
      .join(' ')
      .toLowerCase();
    return fullName.includes(query) || email.includes(query) || roleBlob.includes(query);
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getRoleColor = (permissionLevel) => {
  if (!permissionLevel) return 'grey';
  if (permissionLevel >= 90) return 'red';
  if (permissionLevel >= 50) return 'deep-orange';
  return 'blue';
};

const userMatchesRoleFilter = (user, roleFilter) => {
  const memberships = user.userDepartments || [];

  return memberships.some((membership) => {
    const permission = Number(membership?.role?.permission_level || 0);
    const roleName = String(membership?.role?.role_name || '').toLowerCase();

    if (roleFilter === 'student') {
      return (permission > 0 && permission < 50) || roleName.includes('student');
    }

    if (roleFilter === 'manager') {
      return (permission >= 50 && permission < 90) || roleName.includes('manager');
    }

    if (roleFilter === 'admin') {
      return permission >= 90 || roleName.includes('admin');
    }

    return true;
  });
};

const applyRoleFilterFromRoute = () => {
  const role = String(route.query.role || '').toLowerCase();
  if (role === 'student' || role === 'manager' || role === 'admin') {
    filterRole.value = role;
    return;
  }
  filterRole.value = 'all';
};

const getHighestRole = (user) => {
  // Check global admin flag first (set by promoteToAdmin)
  if (user.role === 'admin') return 'Admin';
  const memberships = user.userDepartments || [];
  const levels = memberships.map((ud) => Number(ud.role?.permission_level || 0));
  const max = Math.max(0, ...levels);
  if (max >= 100) return 'Admin';
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
  return new Date(date).toLocaleDateString('en-US', { timeZone: TZ });
};

const normalizeUsersPayload = (payload) => {
  const list = payload?.data || payload;
  if (!Array.isArray(list)) return [];
  return list.map((user) => ({
    ...user,
    userDepartments: Array.isArray(user.userDepartments) ? user.userDepartments : [],
  }));
};

// ─── Data Loading ─────────────────────────────────────────────────────────────
const loadUsers = async () => {
  try {
    loading.value = true;
    error.value = null;
    usersDataSource.value = '';

    try {
      const response = await AdminServices.getAllUsers();
      users.value = normalizeUsersPayload(response.data);
      usersDataSource.value = 'admin/users';
      return;
    } catch (primaryErr) {
      if (primaryErr?.response?.status !== 404) {
        throw primaryErr;
      }
    }

    const fallbackResponse = await UserRoleServices.getAllUsersWithRoles();
    users.value = normalizeUsersPayload(fallbackResponse.data);
    usersDataSource.value = 'user-departments/admin/users-with-roles';
  } catch (err) {
    error.value = 'Failed to load users: ' + (err.response?.data?.message || err.message);
  } finally {
    loading.value = false;
  }
};

const loadPendingAssignments = async () => {
  try {
    loadingPending.value = true;
    pendingDataSource.value = '';
    try {
      const response = await AdminServices.getPendingAssignments();
      pendingAssignments.value = response.data?.data || [];
      pendingDataSource.value = 'admin/pending-assignments';
      return;
    } catch (primaryErr) {
      if (primaryErr?.response?.status !== 404) {
        throw primaryErr;
      }
      pendingAssignments.value = [];
      pendingDataSource.value = 'not available on deployed backend';
    }
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

// ─── Assign to Department ────────────────────────────────────────────────────
// Current non-admin department assignments for the user being assigned
const assignDeptCurrentAssignments = computed(() => {
  if (!assignDeptUser.value) return [];
  return (assignDeptUser.value.userDepartments || []).filter(
    (ud) => Number(ud.role?.permission_level || 0) < 100,
  );
});

const openAssignDeptDialog = (user) => {
  assignDeptUser.value = user;
  assignDeptData.value = { department_id: null, role_id: null, position_id: null };
  assignDeptRoles.value = [];
  assignDeptPositions.value = [];
  assignDeptConfirmed.value = false;
  assignDeptDialog.value = true;
};

const closeAssignDeptDialog = () => {
  assignDeptDialog.value = false;
  assignDeptUser.value = null;
};

// Remove a single department assignment directly from the Manage Department dialog
const removeRoleFromDeptDialog = async (udId) => {
  if (!confirm('Remove this department assignment?')) return;
  try {
    removingRoleId.value = udId;
    await UserRoleServices.removeUserRole(udId);
    successMessage.value = 'Department assignment removed.';
    await loadUsers();
    // Keep the dialog open and refresh the local user reference
    if (assignDeptUser.value) {
      const updated = users.value.find((u) => u.id === assignDeptUser.value.id);
      if (updated) assignDeptUser.value = updated;
    }
  } catch (err) {
    error.value = 'Failed to remove assignment: ' + (err.response?.data?.message || err.message);
  } finally {
    removingRoleId.value = null;
  }
};

const loadAssignDeptRoles = async () => {
  const departmentId = assignDeptData.value.department_id;
  assignDeptData.value.role_id = null;
  assignDeptData.value.position_id = null;
  if (!departmentId) {
    assignDeptRoles.value = [];
    assignDeptPositions.value = [];
    return;
  }
  try {
    const [rolesRes, posRes] = await Promise.all([
      AdminServices.getDepartmentRoles(departmentId),
      apiClient.get(`/positions?department_id=${departmentId}`),
    ]);
    // getDepartmentRoles already excludes admin-level (>= 100); filter again for safety
    const allRoles = rolesRes?.data?.data || [];
    assignDeptRoles.value = allRoles.filter((r) => Number(r.permission_level || 0) < 100);
    assignDeptPositions.value = posRes?.data?.data || [];
  } catch (err) {
    error.value = 'Failed to load roles: ' + (err.response?.data?.message || err.message);
  }
};

const submitAssignDept = async () => {
  if (!assignDeptUser.value) return;
  if (!assignDeptData.value.department_id || !assignDeptData.value.role_id) {
    error.value = 'Please select both a department and a role.';
    return;
  }
  try {
    assigningDept.value = true;
    error.value = null;
    const response = await AdminServices.assignDepartment({
      user_id: assignDeptUser.value.id,
      department_id: assignDeptData.value.department_id,
      role_id: assignDeptData.value.role_id,
      position_id: assignDeptData.value.position_id || null,
    });
    successMessage.value = response.data?.message || 'User assigned to department successfully.';
    closeAssignDeptDialog();
    await loadUsers();
  } catch (err) {
    error.value = 'Failed to assign department: ' + (err.response?.data?.message || err.message);
  } finally {
    assigningDept.value = false;
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

// ─── Promote to Admin ─────────────────────────────────────────────────────────
const openPromoteToAdminDialog = (user) => {
  promoteToAdminUser.value = user;
  promoteToAdminDialog.value = true;
};

const confirmPromoteToAdmin = async () => {
  if (!promoteToAdminUser.value) return;
  try {
    promotingToAdmin.value = true;
    error.value = null;
    const response = await AdminServices.promoteToAdmin(promoteToAdminUser.value.id);
    successMessage.value = response.data?.message || 'User promoted to admin successfully.';
    promoteToAdminDialog.value = false;
    promoteToAdminUser.value = null;
    await loadUsers();
  } catch (err) {
    error.value = 'Failed to promote user: ' + (err.response?.data?.message || err.message);
  } finally {
    promotingToAdmin.value = false;
  }
};

// ─── Lifecycle ───────────────────────────────────────────────────────────────
onMounted(() => {
  applyRoleFilterFromRoute();
  loadUsers();
  loadDepartments();
  loadPendingAssignments();
});

watch(
  () => route.query.role,
  () => {
    applyRoleFilterFromRoute();
  },
);
</script>

<style scoped>
.admin-users-container {
  padding: 28px 36px;
  min-height: calc(100vh - 76px);
  background: var(--surface-2);
}

.admin-page-header {
  border-bottom: 1px solid var(--border-1);
  padding-bottom: 1.25rem;
}

.admin-card {
  border-radius: 14px;
}
</style>
