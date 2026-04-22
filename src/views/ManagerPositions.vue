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
    <v-dialog v-model="editPositionModal.open" max-width="720px" scrollable>
      <v-card class="edit-modal">
        <!-- Header -->
        <div class="edit-modal__header">
          <div class="edit-modal__header-left">
            <span
              class="edit-modal__swatch"
              :style="{ backgroundColor: editPositionModal.form.color || DEFAULT_POSITION_COLOR }"
            />
            <div>
              <div class="edit-modal__title">Edit Position</div>
              <div class="edit-modal__subtitle">
                {{ assignedWorkersForEdit.length }} worker{{ assignedWorkersForEdit.length === 1 ? '' : 's' }} assigned
              </div>
            </div>
          </div>
          <v-btn icon="mdi-close" variant="text" size="small" @click="editPositionModal.open = false" />
        </div>

        <div class="edit-modal__body">
          <v-alert v-if="editPositionModal.error" type="error" variant="tonal" density="compact" class="mb-3">
            {{ editPositionModal.error }}
          </v-alert>

          <!-- Details — fields stand on their own; the modal header already
               tells the user what they're editing, so no extra section title. -->
          <section class="pm-card pm-card--tight">
            <v-text-field
              v-model="editPositionModal.form.position_name"
              label="Position name"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
              :rules="[v => !!v?.trim() || 'Position name is required']"
            />
            <v-textarea
              v-model="editPositionModal.form.description"
              label="Description"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
              rows="2"
              auto-grow
            />
            <div class="color-row">
              <span class="color-row__label">Schedule color</span>
              <div class="color-row__controls">
                <input
                  type="color"
                  class="color-input"
                  :value="editPositionModal.form.color || DEFAULT_POSITION_COLOR"
                  @input="editPositionModal.form.color = $event.target.value"
                />
                <span class="color-hex-label">{{ editPositionModal.form.color || DEFAULT_POSITION_COLOR }}</span>
                <v-btn size="x-small" variant="text" @click="editPositionModal.form.color = null">Reset</v-btn>
              </div>
            </div>
          </section>

          <!-- Workers card -->
          <section class="pm-card">
            <div class="pm-card__head">
              <div>
                <div class="pm-card__title">Assigned Workers</div>
                <div class="pm-card__sub">
                  {{ assignedWorkersForEdit.length }} currently on this position · students can hold more than one
                </div>
              </div>
              <v-btn
                variant="tonal"
                color="primary"
                size="small"
                prepend-icon="mdi-plus"
                :disabled="editPositionModal.assignmentBusy || !availableWorkersForEdit.length"
                @click="assignMenuOpen = !assignMenuOpen"
              >
                Add Worker
              </v-btn>
            </div>

            <!-- Inline add-worker picker (auto-commits on select) -->
            <div v-if="assignMenuOpen" class="inline-picker">
              <v-autocomplete
                v-model="inlinePickerValue"
                :items="availableWorkersForEdit"
                item-title="label"
                item-value="value"
                variant="outlined"
                density="comfortable"
                placeholder="Search by name…"
                hide-details
                autofocus
                :disabled="editPositionModal.assignmentBusy"
                :no-data-text="availableWorkersForEdit.length ? 'No match' : 'All department workers already on this position'"
                @update:model-value="onInlinePick"
              />
              <div class="inline-picker__hint">Select a worker to add them — changes save instantly.</div>
            </div>

            <div v-if="assignedWorkersForEdit.length" class="worker-rows">
              <div
                v-for="worker in assignedWorkersForEdit"
                :key="worker.userId"
                class="worker-row"
              >
                <span class="worker-avatar">{{ initialsFor(worker.name) }}</span>
                <div class="worker-info">
                  <span class="worker-name">{{ worker.name }}</span>
                  <span class="worker-email">{{ worker.email }}</span>
                </div>
                <div class="worker-other-positions">
                  <span
                    v-for="pid in otherPositionsFor(worker)"
                    :key="pid"
                    class="pos-chip"
                    :style="chipStyleFor(pid)"
                  >{{ positionNameFor(pid) }}</span>
                </div>
                <v-btn
                  variant="text"
                  size="small"
                  color="error"
                  :loading="editPositionModal.assignmentBusy"
                  @click="removeWorkerFromPosition(worker.userId)"
                >
                  Remove
                </v-btn>
              </div>
            </div>
            <div v-else class="worker-empty">
              <v-icon size="28" color="text-2">mdi-account-group-outline</v-icon>
              <div>No workers on this position yet.</div>
              <div class="worker-empty__hint">Click “Add Worker” above to assign someone.</div>
            </div>
          </section>
        </div>

        <!-- Single, clear primary action -->
        <div class="edit-modal__footer">
          <v-btn variant="text" @click="editPositionModal.open = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            :loading="editPositionModal.saving"
            @click="saveEditPosition"
          >
            Done
          </v-btn>
        </div>
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

// UI state for the inline “Add Worker” picker inside the edit modal. Splitting
// this out from editPositionModal so it can be reset independently when the
// user re-opens the picker or finishes adding someone.
const assignMenuOpen = ref(false);
const inlinePickerValue = ref(null);

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
  assignMenuOpen.value = false;
  inlinePickerValue.value = null;
};

// Build initials (max 2 chars) from “First Last” for the avatar circle.
const initialsFor = (name) => {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// All OTHER position ids a worker holds (excluding the one being edited).
// Used to render small color-coded chips next to each assigned worker so
// managers can see at a glance that a student also covers X and Y.
const otherPositionsFor = (worker) => {
  const currentId = Number(editPositionModal.position?.position_id || 0);
  return (worker.positionIds || [])
    .map(Number)
    .filter((pid) => pid && pid !== currentId);
};

const positionNameFor = (positionId) => {
  const match = positions.value.find((p) => Number(p.position_id) === Number(positionId));
  return match?.position_name || "";
};

// Subtle tinted chip using the position's own schedule color. Falls back to a
// neutral surface tone when a position has no color configured.
const chipStyleFor = (positionId) => {
  const match = positions.value.find((p) => Number(p.position_id) === Number(positionId));
  const color = match?.color;
  if (!color) {
    return { background: "var(--surface-2)", color: "var(--text-2)", borderColor: "var(--border-1)" };
  }
  return {
    background: `${color}18`, // ~9% alpha
    color,
    borderColor: `${color}40`,
  };
};

// When the user picks someone in the inline autocomplete, assign immediately
// (no separate Assign button). Clears the field so they can add another.
const onInlinePick = async (userId) => {
  if (!userId) return;
  editPositionModal.assignmentBusy = true;
  editPositionModal.error = "";
  try {
    await apiClient.post("/user-departments/add-worker-position", {
      userId,
      departmentId: deptContext.department_id,
      positionId: editPositionModal.position.position_id,
    });
    inlinePickerValue.value = null;
    await refreshWorkersAndPositions();
  } catch (err) {
    editPositionModal.error = err?.response?.data?.message || "Failed to add worker to this position.";
  } finally {
    editPositionModal.assignmentBusy = false;
  }
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

/* ── Edit Position modal ─────────────────────────────────────────────── */
.edit-modal {
  background: var(--surface-0);
  border-radius: var(--radius-lg, 16px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.edit-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3, 12px);
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--border-1);
}

.edit-modal__header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.edit-modal__swatch {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.08);
}

.edit-modal__title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-1);
  line-height: 1.2;
}

.edit-modal__subtitle {
  font-size: 13px;
  color: var(--text-2);
  margin-top: 2px;
}

.edit-modal__body {
  padding: 16px 20px 8px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.edit-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid var(--border-1);
  background: var(--surface-0);
}

/* ── Section cards inside the modal (mirror dashboard .db-card) ──────── */
.pm-card {
  background: var(--surface-0);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-md, 12px);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Tighter variant when a card only holds form fields and doesn't need a head. */
.pm-card--tight {
  gap: 14px;
}

.pm-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.pm-card__title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-1);
}

.pm-card__sub {
  font-size: 12px;
  color: var(--text-2);
  margin-top: 2px;
}

/* ── Color row (compact one-liner) ───────────────────────────────────── */
.color-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.color-row__label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-1);
}

.color-row__controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-input {
  width: 36px;
  height: 28px;
  border: 1px solid var(--border-1);
  border-radius: 6px;
  padding: 2px;
  cursor: pointer;
  background: none;
}

.color-hex-label {
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--text-2);
}

/* ── Inline add-worker picker ────────────────────────────────────────── */
.inline-picker {
  background: var(--surface-1);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-sm, 8px);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.inline-picker__hint {
  font-size: 11px;
  color: var(--text-2);
}

/* ── Assigned workers list (dashboard-style rows) ────────────────────── */
.worker-rows {
  display: flex;
  flex-direction: column;
}

.worker-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-1);
}

.worker-row:last-child { border-bottom: none; }

.worker-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--brand-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.3px;
  flex-shrink: 0;
}

.worker-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.worker-info .worker-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.worker-info .worker-email {
  font-size: 12px;
  color: var(--text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.worker-other-positions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: flex-end;
  max-width: 40%;
}

.pos-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.worker-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 24px 0;
  color: var(--text-2);
  font-size: 13px;
  text-align: center;
}

.worker-empty__hint {
  font-size: 12px;
  color: var(--text-2);
  opacity: 0.85;
}

@media (max-width: 560px) {
  .worker-other-positions { display: none; }
  .color-row { flex-direction: column; align-items: flex-start; }
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
