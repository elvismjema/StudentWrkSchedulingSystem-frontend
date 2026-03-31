<template>
  <div class="department-settings-page">
    <section class="page-header">
      <div class="header-title-row">
        <v-icon size="24" class="header-icon">mdi-office-building-cog-outline</v-icon>
        <h1 class="page-title">Department Settings</h1>
      </div>
    </section>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" dismissible @click:close="error = ''">
      {{ error }}
    </v-alert>
    <v-alert
      v-if="successMessage"
      type="success"
      variant="tonal"
      class="mb-4"
      dismissible
      @click:close="successMessage = ''"
    >
      {{ successMessage }}
    </v-alert>

    <v-card class="selector-card mb-5" elevation="0">
      <v-card-text class="pa-5">
        <v-row align="end">
          <v-col cols="12" md="10">
            <v-select
              v-model="selectedDepartmentId"
              label="Select Department"
              :items="departments"
              item-title="department_name"
              item-value="department_id"
              variant="outlined"
              density="comfortable"
              hide-details
              @update:modelValue="loadDepartmentDetails"
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-btn block prepend-icon="mdi-plus" variant="outlined" @click="newDepartmentDialog = true">
              New
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card v-if="selectedDepartment" class="settings-card" elevation="0">
      <v-card-text class="pa-6">
        <section class="settings-section">
          <div class="section-title-row">
            <h2 class="section-title">General Settings</h2>
            <v-btn
              icon
              variant="text"
              size="small"
              color="grey-darken-1"
              @click="deleteDepartmentDialog = true"
            >
              <v-icon size="22">mdi-trash-can-outline</v-icon>
            </v-btn>
          </div>

          <v-text-field
            :model-value="selectedDepartment.department_name"
            label="Department Name"
            variant="outlined"
            density="comfortable"
            readonly
            hide-details
            class="mt-4"
          />
        </section>

        <section class="settings-section">
          <h2 class="section-title">Positions</h2>

          <div v-if="positions.length" class="chips-wrap">
            <v-chip
              v-for="position in positions"
              :key="position.position_id"
              variant="outlined"
              class="mr-2 mb-2"
              closable
              @click:close="removePosition(position)"
            >
              {{ position.position_name }}
            </v-chip>
          </div>
          <p v-else class="muted-text">No positions yet</p>

          <v-row class="mt-1" align="center">
            <v-col cols="12" md="7">
              <v-text-field
                v-model="newPositionName"
                label="New position name"
                variant="outlined"
                density="comfortable"
                hide-details
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-btn
                block
                prepend-icon="mdi-plus"
                variant="outlined"
                :disabled="!newPositionName.trim()"
                :loading="savingPosition"
                @click="addPosition"
              >
                Add
              </v-btn>
            </v-col>
          </v-row>
        </section>

        <section class="settings-section">
          <div class="section-title-with-icon">
            <v-icon size="22">mdi-account-group-outline</v-icon>
            <h2 class="section-title mb-0">Assigned Managers</h2>
          </div>

          <div v-if="assignedManagers.length" class="chips-wrap mt-3">
            <v-chip
              v-for="manager in assignedManagers"
              :key="manager.ud_id"
              variant="tonal"
              color="grey-darken-1"
              class="mr-2 mb-2"
            >
              {{ manager.user?.fName }} {{ manager.user?.lName }}
            </v-chip>
          </div>
          <p v-else class="muted-text mt-3">No managers assigned</p>

          <v-row class="mt-1" align="center">
            <v-col cols="12" md="7">
              <v-select
                v-model="managerToAssignUserId"
                :items="availableManagersToAssign"
                :item-title="(item) => `${item.fName} ${item.lName}`"
                item-value="id"
                label="Select manager"
                variant="outlined"
                density="comfortable"
                hide-details
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-btn
                block
                :disabled="!managerToAssignUserId"
                :loading="assigningManager"
                @click="assignManager"
              >
                Assign
              </v-btn>
            </v-col>
          </v-row>
        </section>
      </v-card-text>
    </v-card>

    <v-dialog v-model="newDepartmentDialog" max-width="460">
      <v-card>
        <v-card-title class="pa-5 pb-2">New Department</v-card-title>
        <v-card-text class="px-5">
          <v-text-field
            v-model="newDepartmentName"
            label="Department Name"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </v-card-text>
        <v-card-actions class="px-5 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="newDepartmentDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="creatingDepartment"
            :disabled="!newDepartmentName.trim()"
            @click="createDepartment"
          >
            Create
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDepartmentDialog" max-width="520">
      <v-card>
        <v-card-title class="pa-5 text-error">
          <v-icon start color="error">mdi-alert-outline</v-icon>
          Delete Department
        </v-card-title>
        <v-card-text class="px-5">
          <p>
            Are you sure you want to delete <strong>{{ selectedDepartment?.department_name }}</strong>?
          </p>
          <p class="text-medium-emphasis mt-3">
            This removes the department and may also remove related positions and manager assignments.
          </p>
        </v-card-text>
        <v-card-actions class="px-5 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="deleteDepartmentDialog = false">Cancel</v-btn>
          <v-btn color="error" :loading="deletingDepartment" @click="deleteDepartment">
            Yes, delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import AdminServices from "../services/adminServices.js";
import DepartmentServices from "../services/departmentServices.js";
import UserRoleServices from "../services/userRoleServices.js";
import apiClient from "../services/services.js";

const loading = ref(false);
const error = ref("");
const successMessage = ref("");

const creatingDepartment = ref(false);
const deletingDepartment = ref(false);
const savingPosition = ref(false);
const assigningManager = ref(false);

const departments = ref([]);
const selectedDepartmentId = ref(null);
const selectedDepartment = ref(null);
const positions = ref([]);
const departmentMembers = ref([]);
const allUsers = ref([]);
const departmentRoles = ref([]);

const newDepartmentDialog = ref(false);
const deleteDepartmentDialog = ref(false);
const newDepartmentName = ref("");
const newPositionName = ref("");
const managerToAssignUserId = ref(null);

const normalizeUsersPayload = (payload) => {
  const list = payload?.data || payload;
  if (!Array.isArray(list)) return [];
  return list.map((user) => ({
    ...user,
    userDepartments: Array.isArray(user.userDepartments) ? user.userDepartments : [],
  }));
};

const isManagerRole = (role) => {
  const level = Number(role?.permission_level || 0);
  const name = String(role?.role_name || "").toLowerCase();
  return (level >= 50 && level < 90) || name.includes("manager");
};

const assignedManagers = computed(() =>
  departmentMembers.value.filter((membership) => isManagerRole(membership.role)),
);

const assignableManagers = computed(() =>
  allUsers.value.filter((user) =>
    (user.userDepartments || []).some((membership) => isManagerRole(membership.role)),
  ),
);

const availableManagersToAssign = computed(() => {
  const assignedIds = new Set(assignedManagers.value.map((manager) => manager.user_id));
  return assignableManagers.value.filter((user) => !assignedIds.has(user.id));
});

const managerRoleForDepartment = computed(() => {
  const exactManager = departmentRoles.value.find((role) =>
    String(role.role_name || "").toLowerCase().includes("manager"),
  );
  if (exactManager) return exactManager;

  return departmentRoles.value.find((role) => {
    const permission = Number(role.permission_level || 0);
    return permission >= 50 && permission < 90;
  });
});

const loadDepartments = async () => {
  const response = await DepartmentServices.getDepartments();
  const list = response?.data?.data || response?.data || [];
  departments.value = Array.isArray(list) ? list : [];
};

const loadAllUsers = async () => {
  try {
    const response = await AdminServices.getAllUsers();
    allUsers.value = normalizeUsersPayload(response.data);
    return;
  } catch (primaryErr) {
    if (primaryErr?.response?.status !== 404) {
      throw primaryErr;
    }
  }

  const fallback = await UserRoleServices.getAllUsersWithRoles();
  allUsers.value = normalizeUsersPayload(fallback.data);
};

const loadDepartmentDetails = async () => {
  if (!selectedDepartmentId.value) return;

  loading.value = true;
  error.value = "";
  try {
    const [departmentRes, positionsRes, membersRes, rolesRes] = await Promise.all([
      DepartmentServices.getDepartment(selectedDepartmentId.value),
      apiClient.get(`/positions?department_id=${selectedDepartmentId.value}`),
      AdminServices.getDepartmentMembers(selectedDepartmentId.value),
      UserRoleServices.getAllRoles(selectedDepartmentId.value),
    ]);

    selectedDepartment.value = departmentRes?.data?.data || departmentRes?.data || null;
    positions.value = positionsRes?.data?.data || [];
    departmentMembers.value = membersRes?.data?.data || [];
    departmentRoles.value = rolesRes?.data?.data || [];
    managerToAssignUserId.value = null;
  } catch (err) {
    error.value = err?.response?.data?.message || "Failed to load department details.";
  } finally {
    loading.value = false;
  }
};

const createDepartment = async () => {
  if (!newDepartmentName.value.trim()) return;

  creatingDepartment.value = true;
  error.value = "";
  successMessage.value = "";
  try {
    await DepartmentServices.createDepartment({ department_name: newDepartmentName.value.trim() });
    successMessage.value = "Department created successfully.";
    newDepartmentDialog.value = false;
    const newName = newDepartmentName.value.trim();
    newDepartmentName.value = "";
    await loadDepartments();

    const created = departments.value.find((department) => department.department_name === newName);
    if (created) {
      selectedDepartmentId.value = created.department_id;
      await loadDepartmentDetails();
    }
  } catch (err) {
    error.value = err?.response?.data?.message || "Failed to create department.";
  } finally {
    creatingDepartment.value = false;
  }
};

const deleteDepartment = async () => {
  if (!selectedDepartment.value) return;

  deletingDepartment.value = true;
  error.value = "";
  successMessage.value = "";
  try {
    await DepartmentServices.deleteDepartment(selectedDepartment.value.department_id);
    successMessage.value = "Department deleted.";
    deleteDepartmentDialog.value = false;

    const deletedId = selectedDepartment.value.department_id;
    selectedDepartment.value = null;
    selectedDepartmentId.value = null;
    positions.value = [];
    departmentMembers.value = [];

    await loadDepartments();
    if (departments.value.length && departments.value[0].department_id !== deletedId) {
      selectedDepartmentId.value = departments.value[0].department_id;
      await loadDepartmentDetails();
    }
  } catch (err) {
    error.value = err?.response?.data?.message || "Failed to delete department.";
  } finally {
    deletingDepartment.value = false;
  }
};

const addPosition = async () => {
  if (!selectedDepartment.value || !newPositionName.value.trim()) return;

  savingPosition.value = true;
  error.value = "";
  successMessage.value = "";
  try {
    await apiClient.post("/positions", {
      department_id: selectedDepartment.value.department_id,
      position_name: newPositionName.value.trim(),
    });
    newPositionName.value = "";
    await loadDepartmentDetails();
    successMessage.value = "Position added.";
  } catch (err) {
    error.value = err?.response?.data?.message || "Failed to add position.";
  } finally {
    savingPosition.value = false;
  }
};

const removePosition = async (position) => {
  error.value = "";
  successMessage.value = "";
  try {
    await apiClient.delete(`/positions/${position.position_id}`);
    await loadDepartmentDetails();
    successMessage.value = "Position removed.";
  } catch (err) {
    error.value = err?.response?.data?.message || "Failed to remove position.";
  }
};

const assignManager = async () => {
  if (!selectedDepartment.value || !managerToAssignUserId.value) return;

  const managerRole = managerRoleForDepartment.value;
  if (!managerRole) {
    error.value = "No manager role is available for this department.";
    return;
  }

  assigningManager.value = true;
  error.value = "";
  successMessage.value = "";
  try {
    await UserRoleServices.assignUserRole({
      user_id: managerToAssignUserId.value,
      department_id: selectedDepartment.value.department_id,
      role_id: managerRole.role_id,
      position_id: null,
    });
    managerToAssignUserId.value = null;
    await loadDepartmentDetails();
    successMessage.value = "Manager assigned.";
  } catch (err) {
    error.value = err?.response?.data?.message || "Failed to assign manager.";
  } finally {
    assigningManager.value = false;
  }
};

onMounted(async () => {
  loading.value = true;
  error.value = "";
  try {
    await Promise.all([loadDepartments(), loadAllUsers()]);
    if (departments.value.length) {
      selectedDepartmentId.value = departments.value[0].department_id;
      await loadDepartmentDetails();
    }
  } catch (err) {
    error.value = err?.response?.data?.message || "Failed to load department settings.";
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.department-settings-page {
  padding: 24px;
}

.page-header {
  margin-bottom: 12px;
}

.header-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-title {
  margin: 0;
  color: #101828;
  font-size: 36px;
  line-height: 1.2;
  font-weight: 700;
}

.selector-card,
.settings-card {
  border: 1px solid #e4e7ec;
  border-radius: 14px;
}

.settings-section + .settings-section {
  margin-top: 28px;
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title-with-icon {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title {
  margin: 0;
  color: #101828;
  font-size: 22px;
  font-weight: 700;
}

.muted-text {
  margin: 8px 0 0;
  color: #667085;
}

.chips-wrap {
  margin-top: 12px;
}
</style>
