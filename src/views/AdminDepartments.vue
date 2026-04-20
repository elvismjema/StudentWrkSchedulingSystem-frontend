<template>
  <div class="admin-departments-container">
    <!-- Page Header -->
    <div class="admin-page-header mb-6">
      <div class="d-flex align-center justify-space-between flex-wrap gap-3">
        <div>
          <h1 class="text-h4 font-weight-bold">Manage Departments</h1>
          <p class="text-body-2 text-grey mt-1">
            Create, edit, and delete departments. View and manage member assignments.
          </p>
        </div>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">
          Add Department
        </v-btn>
      </div>
    </div>

    <!-- Alerts -->
    <v-alert v-if="error" type="error" dismissible @click:close="error = null" class="mb-4">
      {{ error }}
    </v-alert>
    <v-alert v-if="successMessage" type="success" dismissible @click:close="successMessage = null" class="mb-4">
      {{ successMessage }}
    </v-alert>

    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

    <!-- Two-panel layout: department list + member detail -->
    <div class="dept-layout">
      <!-- ─── Left: Department List ────────────────────────────────────────── -->
      <div class="dept-list-panel">
        <v-card
          v-for="dept in departments"
          :key="dept.department_id"
          class="dept-card mb-3"
          :class="{ 'dept-card--active': activeDept?.department_id === dept.department_id }"
          elevation="1"
          @click="selectDepartment(dept)"
        >
          <v-card-text class="pa-4">
            <div class="d-flex align-center justify-space-between">
              <div class="flex-1 min-w-0">
                <div class="font-weight-semibold text-body-1 dept-name">
                  {{ dept.department_name }}
                </div>
                <div v-if="dept.description" class="text-caption text-medium-emphasis mt-1 dept-desc">
                  {{ dept.description }}
                </div>
                <v-chip size="x-small" color="primary" variant="tonal" class="mt-2">
                  {{ dept._memberCount ?? '…' }} members
                </v-chip>
              </div>

              <div class="d-flex flex-column gap-1 ml-3" @click.stop>
                <v-btn
                  icon
                  size="x-small"
                  variant="text"
                  color="primary"
                  @click="openEditDialog(dept)"
                >
                  <v-icon size="16">mdi-pencil</v-icon>
                </v-btn>
                <v-btn
                  icon
                  size="x-small"
                  variant="text"
                  color="error"
                  @click="openDeleteDialog(dept)"
                >
                  <v-icon size="16">mdi-delete</v-icon>
                </v-btn>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <div v-if="!loading && departments.length === 0" class="text-center text-medium-emphasis py-8">
          <v-icon size="48" color="grey">mdi-office-building-outline</v-icon>
          <p class="mt-2">No departments yet.</p>
        </div>
      </div>

      <!-- ─── Right: Member Detail Panel ───────────────────────────────────── -->
      <div class="dept-detail-panel">
        <v-card class="h-100" elevation="2" style="border-radius: 14px;">
          <!-- No dept selected -->
          <div v-if="!activeDept" class="d-flex flex-column align-center justify-center" style="height: 400px;">
            <v-icon size="64" color="grey-lighten-1">mdi-cursor-default-click</v-icon>
            <p class="text-medium-emphasis mt-4">Select a department to view its members.</p>
          </div>

          <template v-else>
            <v-card-title class="d-flex align-center pa-5 pb-2">
              <div>
                <div class="text-h6 font-weight-bold">{{ activeDept.department_name }}</div>
                <div v-if="activeDept.description" class="text-caption text-medium-emphasis">
                  {{ activeDept.description }}
                </div>
              </div>
              <v-spacer />
              <v-btn
                color="primary"
                size="small"
                prepend-icon="mdi-account-plus"
                @click="openAddMemberDialog"
              >
                Add Member
              </v-btn>
            </v-card-title>

            <v-divider class="mx-5" />

            <v-card-text class="pa-5">
              <v-progress-linear v-if="loadingMembers" indeterminate color="primary" class="mb-3" />

              <v-data-table
                :headers="memberHeaders"
                :items="members"
                :loading="loadingMembers"
                class="elevation-0"
                density="comfortable"
                :no-data-text="'No members in this department'"
              >
                <template #item.name="{ item }">
                  <div>
                    <div class="font-weight-medium">{{ item.user?.fName }} {{ item.user?.lName }}</div>
                    <div class="text-caption text-medium-emphasis">{{ item.user?.email }}</div>
                  </div>
                </template>

                <template #item.role="{ item }">
                  <v-chip
                    size="small"
                    :color="getRoleColor(item.role?.permission_level)"
                    variant="tonal"
                  >
                    {{ item.role?.role_name || 'No Role' }}
                  </v-chip>
                </template>

                <template #item.position="{ item }">
                  {{ item.position?.position_name || '—' }}
                </template>

                <template #item.actions="{ item }">
                  <div class="d-flex justify-center gap-1">
                    <v-tooltip text="Edit Role" location="top">
                      <template #activator="{ props }">
                        <v-btn v-bind="props" icon size="small" color="primary" variant="text"
                          @click="openEditMemberDialog(item)">
                          <v-icon size="18">mdi-account-edit</v-icon>
                        </v-btn>
                      </template>
                    </v-tooltip>
                    <v-tooltip text="Remove from Department" location="top">
                      <template #activator="{ props }">
                        <v-btn v-bind="props" icon size="small" color="error" variant="text"
                          @click="removeMember(item.ud_id)">
                          <v-icon size="18">mdi-account-remove</v-icon>
                        </v-btn>
                      </template>
                    </v-tooltip>
                  </div>
                </template>
              </v-data-table>
            </v-card-text>
          </template>
        </v-card>
      </div>
    </div>

    <!-- ═══ CREATE DEPARTMENT DIALOG ════════════════════════════════════════ -->
    <v-dialog v-model="createDialog" max-width="520px">
      <v-card>
        <v-card-title class="pa-5 pb-2">Add Department</v-card-title>
        <v-card-text class="px-5">
          <v-form ref="createForm" v-model="createFormValid">
            <v-text-field
              v-model="deptFormData.department_name"
              label="Department Name"
              variant="outlined"
              density="comfortable"
              :rules="[rules.required]"
              class="mb-3"
            />
            <v-textarea
              v-model="deptFormData.description"
              label="Description (Optional)"
              variant="outlined"
              density="comfortable"
              rows="3"
              auto-grow
            />
          </v-form>
        </v-card-text>
        <v-card-actions class="px-5 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="createDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="savingDept" :disabled="!createFormValid" @click="createDepartment">
            Create
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ═══ EDIT DEPARTMENT DIALOG ═══════════════════════════════════════════ -->
    <v-dialog v-model="editDialog" max-width="520px">
      <v-card>
        <v-card-title class="pa-5 pb-2">Edit Department</v-card-title>
        <v-card-text class="px-5">
          <v-form ref="editForm" v-model="editFormValid">
            <v-text-field
              v-model="deptFormData.department_name"
              label="Department Name"
              variant="outlined"
              density="comfortable"
              :rules="[rules.required]"
              class="mb-3"
            />
            <v-textarea
              v-model="deptFormData.description"
              label="Description"
              variant="outlined"
              density="comfortable"
              rows="3"
              auto-grow
            />
          </v-form>
        </v-card-text>
        <v-card-actions class="px-5 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="editDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="savingDept" :disabled="!editFormValid" @click="updateDepartment">
            Save Changes
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ═══ DELETE DEPARTMENT DIALOG ════════════════════════════════════════ -->
    <v-dialog v-model="deleteDeptDialog" max-width="480px">
      <v-card>
        <v-card-title class="pa-5 text-error">
          <v-icon color="error" start>mdi-alert</v-icon>
          Delete Department
        </v-card-title>
        <v-card-text class="px-5">
          Delete <strong>{{ selectedDept?.department_name }}</strong>?
          All associated roles, shifts, and memberships may also be removed.
          <strong>This cannot be undone.</strong>
        </v-card-text>
        <v-card-actions class="px-5 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="deleteDeptDialog = false">Cancel</v-btn>
          <v-btn color="error" :loading="deletingDept" @click="deleteDepartment">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ═══ ADD MEMBER DIALOG ════════════════════════════════════════════════ -->
    <v-dialog v-model="addMemberDialog" max-width="540px">
      <v-card>
        <v-card-title class="pa-5 pb-2">
          Add Member to {{ activeDept?.department_name }}
        </v-card-title>
        <v-card-text class="px-5">
          <v-form ref="addMemberForm" v-model="addMemberFormValid">
            <v-autocomplete
              v-model="memberFormData.user_id"
              :items="allUsers"
              :item-title="(u) => `${u.fName} ${u.lName} (${u.email})`"
              item-value="id"
              label="Select User"
              variant="outlined"
              density="comfortable"
              :rules="[rules.required]"
              class="mb-3"
              clearable
            />

            <v-select
              v-model="memberFormData.role_id"
              :items="deptRoles"
              item-title="role_name"
              item-value="role_id"
              label="Role"
              variant="outlined"
              density="comfortable"
              :rules="[rules.required]"
              class="mb-3"
            />

            <v-select
              v-model="memberFormData.position_id"
              :items="deptPositions"
              item-title="position_name"
              item-value="position_id"
              label="Position (Optional)"
              variant="outlined"
              density="comfortable"
              clearable
            />
          </v-form>
        </v-card-text>
        <v-card-actions class="px-5 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="addMemberDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="savingMember" :disabled="!addMemberFormValid" @click="addMember">
            Add Member
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ═══ EDIT MEMBER ROLE DIALOG ══════════════════════════════════════════ -->
    <v-dialog v-model="editMemberDialog" max-width="480px">
      <v-card>
        <v-card-title class="pa-5 pb-2">Edit Member Role</v-card-title>
        <v-card-subtitle class="px-5 pb-3 text-medium-emphasis">
          {{ selectedMember?.user?.fName }} {{ selectedMember?.user?.lName }}
          · {{ activeDept?.department_name }}
        </v-card-subtitle>
        <v-card-text class="px-5">
          <v-form ref="editMemberForm" v-model="editMemberFormValid">
            <v-select
              v-model="memberFormData.role_id"
              :items="deptRoles"
              item-title="role_name"
              item-value="role_id"
              label="Role"
              variant="outlined"
              density="comfortable"
              :rules="[rules.required]"
              class="mb-3"
            />
            <v-select
              v-model="memberFormData.position_id"
              :items="deptPositions"
              item-title="position_name"
              item-value="position_id"
              label="Position (Optional)"
              variant="outlined"
              density="comfortable"
              clearable
            />
          </v-form>
        </v-card-text>
        <v-card-actions class="px-5 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="editMemberDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="savingMember" :disabled="!editMemberFormValid" @click="updateMemberRole">
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import AdminServices from '../services/adminServices.js';
import DepartmentServices from '../services/departmentServices.js';
import UserRoleServices from '../services/userRoleServices.js';
import apiClient from '../services/services.js';

// ─── State ──────────────────────────────────────────────────────────────────
const loading = ref(false);
const loadingMembers = ref(false);
const savingDept = ref(false);
const deletingDept = ref(false);
const savingMember = ref(false);
const error = ref(null);
const successMessage = ref(null);

const departments = ref([]);
const members = ref([]);
const allUsers = ref([]);
const deptRoles = ref([]);
const deptPositions = ref([]);
const activeDept = ref(null);

// Department dialogs
const createDialog = ref(false);
const createFormValid = ref(false);
const createForm = ref(null);
const editDialog = ref(false);
const editFormValid = ref(false);
const editForm = ref(null);
const deleteDeptDialog = ref(false);
const selectedDept = ref(null);
const deptFormData = ref({ department_name: '', description: '' });

// Member dialogs
const addMemberDialog = ref(false);
const addMemberFormValid = ref(false);
const addMemberForm = ref(null);
const editMemberDialog = ref(false);
const editMemberFormValid = ref(false);
const editMemberForm = ref(null);
const selectedMember = ref(null);
const memberFormData = ref({ user_id: null, role_id: null, position_id: null });

// ─── Validation ──────────────────────────────────────────────────────────────
const rules = {
  required: (v) => !!v || 'This field is required',
};

// ─── Table Headers ────────────────────────────────────────────────────────────
const memberHeaders = [
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Role', key: 'role', sortable: false },
  { title: 'Position', key: 'position', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getRoleColor = (permissionLevel) => {
  if (!permissionLevel) return 'grey';
  if (permissionLevel >= 90) return 'red';
  if (permissionLevel >= 50) return 'deep-orange';
  return 'blue';
};

// ─── Data Loading ─────────────────────────────────────────────────────────────
const loadDepartments = async () => {
  try {
    loading.value = true;
    const response = await DepartmentServices.getDepartments();
    const depts = response.data?.data || response.data || [];
    departments.value = depts;

    // Load member counts in background
    for (const dept of departments.value) {
      AdminServices.getDepartmentMembers(dept.department_id)
        .then((r) => {
          dept._memberCount = (r.data?.data || []).length;
        })
        .catch(() => {
          dept._memberCount = 0;
        });
    }
  } catch (err) {
    error.value = 'Failed to load departments: ' + (err.response?.data?.message || err.message);
  } finally {
    loading.value = false;
  }
};

const loadAllUsers = async () => {
  try {
    const response = await AdminServices.getAllUsers();
    allUsers.value = response.data?.data || response.data || [];
  } catch (err) {
    // Non-fatal; will be empty list
  }
};

const selectDepartment = async (dept) => {
  activeDept.value = dept;
  await loadDeptResources(dept.department_id);
  await loadMembers(dept.department_id);
};

const loadMembers = async (departmentId) => {
  try {
    loadingMembers.value = true;
    const response = await AdminServices.getDepartmentMembers(departmentId);
    members.value = response.data?.data || [];
    // Update cached count
    const dept = departments.value.find((d) => d.department_id === departmentId);
    if (dept) dept._memberCount = members.value.length;
  } catch (err) {
    error.value = 'Failed to load members: ' + (err.response?.data?.message || err.message);
  } finally {
    loadingMembers.value = false;
  }
};

const loadDeptResources = async (departmentId) => {
  try {
    const [rolesRes, posRes] = await Promise.all([
      UserRoleServices.getAllRoles(departmentId),
      apiClient.get(`/positions?department_id=${departmentId}`),
    ]);
    deptRoles.value = rolesRes?.data?.data || [];
    deptPositions.value = posRes?.data?.data || [];
  } catch (err) {
    // Non-fatal
  }
};

// ─── Department CRUD ──────────────────────────────────────────────────────────
const openCreateDialog = () => {
  deptFormData.value = { department_name: '', description: '' };
  createDialog.value = true;
};

const createDepartment = async () => {
  if (!createForm.value || !createFormValid.value) return;
  try {
    savingDept.value = true;
    await DepartmentServices.createDepartment(deptFormData.value);
    successMessage.value = 'Department created successfully.';
    createDialog.value = false;
    await loadDepartments();
  } catch (err) {
    error.value = 'Failed to create department: ' + (err.response?.data?.message || err.message);
  } finally {
    savingDept.value = false;
  }
};

const openEditDialog = (dept) => {
  selectedDept.value = dept;
  deptFormData.value = {
    department_name: dept.department_name,
    description: dept.description || '',
  };
  editDialog.value = true;
};

const updateDepartment = async () => {
  if (!editForm.value || !editFormValid.value) return;
  try {
    savingDept.value = true;
    await DepartmentServices.updateDepartment(selectedDept.value.department_id, deptFormData.value);
    successMessage.value = 'Department updated.';
    editDialog.value = false;
    // Update local copy
    const idx = departments.value.findIndex(
      (d) => d.department_id === selectedDept.value.department_id
    );
    if (idx >= 0) {
      departments.value[idx] = {
        ...departments.value[idx],
        ...deptFormData.value,
      };
    }
    if (activeDept.value?.department_id === selectedDept.value.department_id) {
      activeDept.value = { ...activeDept.value, ...deptFormData.value };
    }
  } catch (err) {
    error.value = 'Failed to update department: ' + (err.response?.data?.message || err.message);
  } finally {
    savingDept.value = false;
  }
};

const openDeleteDialog = (dept) => {
  selectedDept.value = dept;
  deleteDeptDialog.value = true;
};

const deleteDepartment = async () => {
  try {
    deletingDept.value = true;
    await DepartmentServices.deleteDepartment(selectedDept.value.department_id);
    successMessage.value = 'Department deleted.';
    deleteDeptDialog.value = false;
    if (activeDept.value?.department_id === selectedDept.value.department_id) {
      activeDept.value = null;
      members.value = [];
    }
    await loadDepartments();
  } catch (err) {
    error.value = 'Failed to delete department: ' + (err.response?.data?.message || err.message);
  } finally {
    deletingDept.value = false;
  }
};

// ─── Member Management ────────────────────────────────────────────────────────
const openAddMemberDialog = () => {
  memberFormData.value = { user_id: null, role_id: null, position_id: null };
  addMemberDialog.value = true;
};

const addMember = async () => {
  if (!addMemberForm.value || !addMemberFormValid.value) return;
  try {
    savingMember.value = true;
    await UserRoleServices.assignUserRole({
      user_id: memberFormData.value.user_id,
      department_id: activeDept.value.department_id,
      role_id: memberFormData.value.role_id,
      position_id: memberFormData.value.position_id,
    });
    successMessage.value = 'Member added successfully.';
    addMemberDialog.value = false;
    await loadMembers(activeDept.value.department_id);
  } catch (err) {
    error.value = 'Failed to add member: ' + (err.response?.data?.message || err.message);
  } finally {
    savingMember.value = false;
  }
};

const openEditMemberDialog = (membership) => {
  selectedMember.value = membership;
  memberFormData.value = {
    user_id: membership.user_id,
    role_id: membership.role?.role_id || null,
    position_id: membership.position?.position_id || null,
  };
  editMemberDialog.value = true;
};

const updateMemberRole = async () => {
  if (!editMemberForm.value || !editMemberFormValid.value) return;
  try {
    savingMember.value = true;
    await UserRoleServices.assignUserRole({
      user_id: selectedMember.value.user_id,
      department_id: activeDept.value.department_id,
      role_id: memberFormData.value.role_id,
      position_id: memberFormData.value.position_id,
    });
    successMessage.value = 'Role updated.';
    editMemberDialog.value = false;
    await loadMembers(activeDept.value.department_id);
  } catch (err) {
    error.value = 'Failed to update role: ' + (err.response?.data?.message || err.message);
  } finally {
    savingMember.value = false;
  }
};

const removeMember = async (udId) => {
  if (!confirm('Remove this member from the department?')) return;
  try {
    await UserRoleServices.removeUserRole(udId);
    successMessage.value = 'Member removed.';
    await loadMembers(activeDept.value.department_id);
  } catch (err) {
    error.value = 'Failed to remove member: ' + (err.response?.data?.message || err.message);
  }
};

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(() => {
  loadDepartments();
  loadAllUsers();
});
</script>

<style scoped>
.admin-departments-container {
  padding: 28px 36px;
  min-height: calc(100vh - 76px);
  background: var(--surface-2);
}

.admin-page-header {
  border-bottom: 1px solid var(--border-1);
  padding-bottom: 1.25rem;
}

.dept-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 20px;
  align-items: start;
}

@media (max-width: 960px) {
  .dept-layout {
    grid-template-columns: 1fr;
  }
}

.dept-list-panel {
  max-height: calc(100vh - 230px);
  overflow-y: auto;
}

.dept-detail-panel {
  min-height: 400px;
}

.dept-card {
  border-radius: 12px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.dept-card:hover {
  /* brand-primary-dk at ~12% alpha — no token with alpha exists today. */
  border-color: color-mix(in srgb, var(--brand-primary-dk) 12%, transparent);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
}

.dept-card--active {
  border-color: var(--brand-primary-dk) !important;
}

.dept-name {
  color: var(--text-1);
}

.dept-desc {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
