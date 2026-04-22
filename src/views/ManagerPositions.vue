<template>
  <div class="positions-page">
    <div class="page-header">
      <h1 class="page-title">Department Positions</h1>
      <v-btn color="primary" variant="outlined" prepend-icon="mdi-plus" @click="createPositionModal.open = true">
        Create Position
      </v-btn>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>

    <div v-if="loading" class="loading-container">
      <v-progress-circular indeterminate color="primary" size="40" />
      <p class="loading-text">Loading positions...</p>
    </div>

    <div v-else-if="positions.length === 0" class="empty-state">
      <v-icon size="48" color="text-2">mdi-briefcase-outline</v-icon>
      <h3 class="empty-title">No positions yet</h3>
      <p class="empty-subtitle">Create your first position for this department.</p>
    </div>

    <div v-else class="positions-grid">
      <v-card v-for="position in positions" :key="position.position_id" class="position-card" elevation="0">
        <v-card-text class="position-card-content">
          <div class="position-header">
            <div class="position-name-row">
              <span
                v-if="position.color"
                class="position-color-swatch"
                :style="{ backgroundColor: position.color }"
              ></span>
              <h3 class="position-name">{{ position.position_name }}</h3>
            </div>
            <div class="position-actions">
              <v-btn size="small" variant="text" color="primary" @click="openEditPosition(position)">
                <v-icon>mdi-pencil</v-icon>
              </v-btn>
              <v-btn size="small" variant="text" color="error" :disabled="position.workerCount > 0" @click="confirmDeletePosition(position)">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </div>
          </div>
          <p class="position-description">{{ position.description || "No description available" }}</p>
          <div class="position-meta">
            <span class="worker-count">{{ position.workerCount || 0 }} workers assigned</span>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <CreatePositionModal
      v-model="createPositionModal.open"
      :department-id="deptContext.department_id"
      @position-created="onPositionCreated"
    />

    <!-- Edit Position Dialog -->
    <v-dialog v-model="editPositionModal.open" max-width="760px">
      <v-card>
        <v-card-title class="d-flex align-center gap-2 pa-5 pb-3">
          <v-icon color="primary" start>mdi-pencil</v-icon>
          Edit Position
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-alert v-if="editPositionModal.error" type="error" variant="tonal" density="compact" class="mb-3">
            {{ editPositionModal.error }}
          </v-alert>

          <v-text-field
            v-model="editPositionModal.form.position_name"
            label="Position Name *"
            variant="outlined"
            density="comfortable"
            :rules="[v => !!v?.trim() || 'Position name is required']"
            class="mb-3"
          />
          <v-textarea
            v-model="editPositionModal.form.description"
            label="Description"
            variant="outlined"
            density="comfortable"
            rows="3"
            class="mb-3"
          />

          <!-- Color Picker -->
          <div class="color-picker-section mb-4">
            <div class="color-picker-label">Schedule Color</div>
            <p class="color-picker-hint">This color will represent the position on the Manager Schedule.</p>
            <div class="color-picker-row">
              <input
                type="color"
                class="color-input"
                :value="editPositionModal.form.color || DEFAULT_POSITION_COLOR"
                @input="editPositionModal.form.color = $event.target.value"
              />
              <span class="color-preview-swatch" :style="{ backgroundColor: editPositionModal.form.color || DEFAULT_POSITION_COLOR }"></span>
              <span class="color-hex-label">{{ editPositionModal.form.color || DEFAULT_POSITION_COLOR }}</span>
              <v-btn size="small" variant="text" @click="editPositionModal.form.color = null">Reset</v-btn>
            </div>
          </div>

          <div class="assignment-section">
            <div class="assignment-header">
              <div class="assignment-title">Assigned Workers</div>
              <div class="assignment-subtitle">
                {{ assignedWorkersForEdit.length }} currently assigned to this position
              </div>
            </div>

            <div v-if="assignedWorkersForEdit.length" class="assigned-worker-list">
              <div v-for="worker in assignedWorkersForEdit" :key="worker.userId" class="assigned-worker-row">
                <div>
                  <div class="assigned-worker-name">{{ worker.name }}</div>
                  <div class="assigned-worker-email">{{ worker.email }}</div>
                </div>
                <v-btn
                  variant="text"
                  color="error"
                  size="small"
                  :loading="editPositionModal.assignmentBusy"
                  @click="removeWorkerFromPosition(worker.userId)"
                >
                  Remove
                </v-btn>
              </div>
            </div>
            <div v-else class="assignment-empty">
              No workers are currently assigned to this position.
            </div>

            <v-divider class="my-4" />

            <v-select
              v-model="editPositionModal.selectedWorkerIds"
              :items="availableWorkersForEdit"
              item-title="label"
              item-value="value"
              label="Assign workers from this department"
              variant="outlined"
              density="comfortable"
              multiple
              chips
              clearable
              :disabled="editPositionModal.assignmentBusy"
              :no-data-text="availableWorkersForEdit.length ? 'No workers available' : 'No additional workers to assign'"
            />
            <div class="assignment-actions">
              <v-btn
                color="primary"
                variant="tonal"
                :disabled="!editPositionModal.selectedWorkerIds.length"
                :loading="editPositionModal.assignmentBusy"
                @click="assignWorkersToPosition"
              >
                Assign Selected
              </v-btn>
            </div>
          </div>
        </v-card-text>
        <v-card-actions class="pa-5 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="editPositionModal.open = false">Cancel</v-btn>
          <v-btn color="primary" variant="elevated" :loading="editPositionModal.saving" @click="saveEditPosition">
            Save Changes
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deletePositionModal.open" max-width="400px">
      <v-card>
        <v-card-title class="text-h6 pa-4">
          <v-icon color="warning" class="mr-2">mdi-alert</v-icon>
          Delete Position?
        </v-card-title>
        <v-card-text class="pa-4">
          <p v-if="deletePositionModal.position?.workerCount > 0" class="text-body-2 mb-3">
            <strong>Cannot delete this position.</strong> It is currently assigned to
            {{ deletePositionModal.position.workerCount }} worker(s).
          </p>
          <p v-else class="text-body-2 mb-3">
            Are you sure you want to delete
            <strong>"{{ deletePositionModal.position?.position_name }}"</strong>?
            This action cannot be undone.
          </p>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="deletePositionModal.open = false">Cancel</v-btn>
          <v-btn v-if="deletePositionModal.position?.workerCount === 0" color="error" @click="deletePosition">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import apiClient from "../services/services.js";
import Utils from "../config/utils.js";
import CreatePositionModal from "../components/CreatePositionModal.vue";
import UserRoleServices from "../services/userRoleServices.js";

// Default swatch for the position color picker. Mirrors --brand-primary from
// src/styles/tokens.css; the native <input type="color"> needs a literal hex
// string, so we cannot reference the CSS variable here.
// TODO: audit color intent — consider reading from getComputedStyle(:root)
// at mount so this stays in sync with the token if brand-primary changes.
const DEFAULT_POSITION_COLOR = "#80162B"; /* brand-primary */

const deptContext = Utils.getStore("currentDepartmentContext") || {};

const loading = ref(false);
const error = ref("");
const departmentWorkers = ref([]);
const positions = ref([]);

const createPositionModal = reactive({
  open: false,
});

const editPositionModal = reactive({
  open: false,
  saving: false,
  position: null,
  form: {
    position_name: '',
    description: '',
    color: null,
  },
  selectedWorkerIds: [],
  assignmentBusy: false,
  error: "",
});

const deletePositionModal = reactive({
  open: false,
  position: null,
});

const toItems = (response) => response?.data?.data || response?.data || [];

const isStudentMembership = (membership) => {
  const roleName = String(membership?.role?.role_name || "").toLowerCase();
  const permissionLevel = Number(membership?.role?.permission_level ?? 0);
  if (!roleName) return permissionLevel < 50;
  return roleName.includes("student") || roleName.includes("worker") || permissionLevel < 50;
};

// A worker appears under a position if ANY of their active memberships in this
// department points to that position. Students can hold multiple positions, so
// we aggregate all `positionIds` per worker instead of relying on a single one.
const assignedWorkersForEdit = computed(() => {
  const positionId = Number(editPositionModal.position?.position_id || 0);
  if (!positionId) return [];
  return departmentWorkers.value.filter((worker) =>
    (worker.positionIds || []).map(Number).includes(positionId),
  );
});

// All department workers EXCEPT those already in this position. Workers who
// already hold other positions remain selectable — assignment is additive.
const availableWorkersForEdit = computed(() => {
  const positionId = Number(editPositionModal.position?.position_id || 0);
  if (!positionId) return [];

  return departmentWorkers.value
    .filter((worker) => !(worker.positionIds || []).map(Number).includes(positionId))
    .map((worker) => {
      const otherPositionNames = (worker.positionIds || [])
        .map((pid) => positions.value.find((p) => Number(p.position_id) === Number(pid))?.position_name)
        .filter(Boolean);
      const suffix = otherPositionNames.length
        ? ` (also: ${otherPositionNames.join(", ")})`
        : "";

      return {
        value: worker.userId,
        label: `${worker.name}${suffix}`,
      };
    });
});

const loadWorkers = async () => {
  if (!deptContext.department_id) {
    departmentWorkers.value = [];
    return;
  }

  try {
    const response = await UserRoleServices.getAllUsersWithRoles(true);
    const users = toItems(response);
    const departmentId = Number(deptContext.department_id);

    // A single user can now have multiple active memberships in the same
    // department — one per position. Group them so each UI worker row carries
    // the FULL set of position ids they hold.
    const byUser = new Map();
    users.forEach((user) => {
      const memberships = (user.userDepartments || [])
        .filter((membership) => Number(membership.department_id) === departmentId)
        .filter((membership) => membership.is_active !== false)
        .filter((membership) => isStudentMembership(membership));

      if (!memberships.length) return;

      const userId = Number(user.id || user.userId);
      const existing = byUser.get(userId) || {
        userId,
        name: `${user.fName || ""} ${user.lName || ""}`.trim() || user.email || "Worker",
        email: user.email || "",
        positionIds: [],
      };

      memberships.forEach((membership) => {
        const pid = Number(membership.position_id || membership.position?.position_id || 0);
        if (pid && !existing.positionIds.includes(pid)) {
          existing.positionIds.push(pid);
        }
      });

      byUser.set(userId, existing);
    });

    departmentWorkers.value = Array.from(byUser.values());
  } catch {
    departmentWorkers.value = [];
  }
};

const loadPositions = async () => {
  if (!deptContext.department_id) {
    positions.value = [];
    return;
  }

  loading.value = true;
  error.value = "";
  try {
    const response = await apiClient.get(`/positions?department_id=${deptContext.department_id}`);
    const items = toItems(response);
    positions.value = items.map((position) => {
      const workerCount = departmentWorkers.value.filter((worker) =>
        (worker.positionIds || []).map(Number).includes(Number(position.position_id)),
      ).length;
      return { ...position, workerCount };
    });
  } catch (err) {
    error.value = err?.response?.data?.message || "Failed to load positions.";
    positions.value = [];
  } finally {
    loading.value = false;
  }
};

const onPositionCreated = () => {
  loadPositions();
};

const openEditPosition = (position) => {
  editPositionModal.position = position;
  editPositionModal.form.position_name = position.position_name || '';
  editPositionModal.form.description = position.description || '';
  editPositionModal.form.color = position.color || null;
  editPositionModal.selectedWorkerIds = [];
  editPositionModal.error = "";
  editPositionModal.open = true;
};

const refreshWorkersAndPositions = async () => {
  await loadWorkers();
  await loadPositions();

  if (editPositionModal.position) {
    const updated = positions.value.find(
      (position) => Number(position.position_id) === Number(editPositionModal.position.position_id),
    );
    if (updated) editPositionModal.position = updated;
  }
};

// Additive assign: hits the new /add-worker-position endpoint which inserts a
// new membership row for (user, dept, position) without touching the worker's
// other position memberships.
const assignWorkersToPosition = async () => {
  if (!editPositionModal.position || !editPositionModal.selectedWorkerIds.length) return;

  editPositionModal.assignmentBusy = true;
  editPositionModal.error = "";
  try {
    await Promise.all(
      editPositionModal.selectedWorkerIds.map((userId) =>
        apiClient.post("/user-departments/add-worker-position", {
          userId,
          departmentId: deptContext.department_id,
          positionId: editPositionModal.position.position_id,
        }),
      ),
    );

    editPositionModal.selectedWorkerIds = [];
    await refreshWorkersAndPositions();
  } catch (err) {
    editPositionModal.error = err?.response?.data?.message || "Failed to assign workers to this position.";
  } finally {
    editPositionModal.assignmentBusy = false;
  }
};

// Scoped remove: only deactivates the single (user, dept, position) row, so
// the worker keeps any other positions they hold in this department.
const removeWorkerFromPosition = async (userId) => {
  if (!editPositionModal.position) return;

  editPositionModal.assignmentBusy = true;
  editPositionModal.error = "";
  try {
    await apiClient.post("/user-departments/remove-worker-position", {
      userId,
      departmentId: deptContext.department_id,
      positionId: editPositionModal.position.position_id,
    });

    await refreshWorkersAndPositions();
  } catch (err) {
    editPositionModal.error = err?.response?.data?.message || "Failed to remove worker from this position.";
  } finally {
    editPositionModal.assignmentBusy = false;
  }
};

const saveEditPosition = async () => {
  if (!editPositionModal.position) return;
  if (!editPositionModal.form.position_name?.trim()) return;
  editPositionModal.saving = true;
  try {
    await apiClient.put(`/positions/${editPositionModal.position.position_id}`, {
      position_name: editPositionModal.form.position_name.trim(),
      description: editPositionModal.form.description?.trim() || null,
      color: editPositionModal.form.color || null,
    });
    editPositionModal.open = false;
    editPositionModal.position = null;
    editPositionModal.selectedWorkerIds = [];
    editPositionModal.error = "";
    await loadPositions();
  } catch (err) {
    error.value = err?.response?.data?.message || 'Failed to update position.';
  } finally {
    editPositionModal.saving = false;
  }
};

const confirmDeletePosition = (position) => {
  deletePositionModal.position = position;
  deletePositionModal.open = true;
};

const deletePosition = async () => {
  if (!deletePositionModal.position) return;
  try {
    await apiClient.delete(`/positions/${deletePositionModal.position.position_id}`);
    deletePositionModal.open = false;
    deletePositionModal.position = null;
    await loadPositions();
  } catch (err) {
    error.value = err?.response?.data?.message || "Failed to delete position.";
  }
};

onMounted(async () => {
  await loadWorkers();
  await loadPositions();
});
</script>

<style scoped>
.positions-page {
  padding: 24px;
  max-width: 1400px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 12px;
}

.page-title {
  margin: 0;
  font-size: 42px;
  font-weight: 700;
  color: var(--text-1);
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.loading-text {
  margin-top: 12px;
  color: var(--text-2);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-title {
  margin: 16px 0 8px;
  font-size: 20px;
  color: var(--text-1);
}

.empty-subtitle {
  margin: 0;
  color: var(--text-2);
}

.positions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
  gap: 20px;
}

.position-card {
  border: 1px solid var(--border-1);
  border-radius: 16px;
}

.position-card-content {
  padding: 28px;
}

.position-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 10px;
}

.position-name {
  margin: 0;
  font-size: 42px;
  line-height: 1;
  font-weight: 700;
  color: var(--text-1);
}

.position-description {
  margin: 0 0 14px;
  color: var(--text-2);
  font-size: 16px;
}

.position-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.worker-count {
  color: var(--text-2);
  font-size: 14px;
}

.position-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.position-name-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.position-color-swatch {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 4px;
  flex-shrink: 0;
  border: 1px solid rgba(0,0,0,0.1);
}

/* Color picker in edit dialog */
.color-picker-section {
  border: 1px solid var(--border-1);
  border-radius: 10px;
  padding: 14px 16px;
}

.color-picker-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-1);
  margin-bottom: 4px;
}

.color-picker-hint {
  font-size: 12px;
  color: var(--text-2);
  margin: 0 0 10px;
}

.color-picker-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.color-input {
  width: 44px;
  height: 36px;
  border: 1px solid var(--border-1);
  border-radius: 6px;
  padding: 2px;
  cursor: pointer;
  background: none;
}

.color-preview-swatch {
  display: inline-block;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid rgba(0,0,0,0.12);
}

.color-hex-label {
  font-size: 13px;
  font-family: monospace;
  color: var(--text-2);
}

.assignment-section {
  border: 1px solid var(--border-1);
  border-radius: 10px;
  padding: 14px 16px;
}

.assignment-header {
  margin-bottom: 10px;
}

.assignment-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-1);
}

.assignment-subtitle {
  font-size: 13px;
  color: var(--text-2);
}

.assigned-worker-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.assigned-worker-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid var(--border-1);
  border-radius: 8px;
  padding: 8px 10px;
}

.assigned-worker-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-1);
}

.assigned-worker-email {
  font-size: 12px;
  color: var(--text-2);
}

.assignment-empty {
  color: var(--text-2);
  font-size: 13px;
}

.assignment-actions {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .positions-page {
    padding: 16px;
  }

  .page-title {
    font-size: 32px;
  }

  .positions-grid {
    grid-template-columns: 1fr;
  }

  .position-name {
    font-size: 34px;
  }
}
</style>
