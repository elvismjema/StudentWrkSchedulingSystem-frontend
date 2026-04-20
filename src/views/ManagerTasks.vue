<template>
  <div class="manager-tasks pa-6">
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">Tasks</h1>
        <p class="text-medium-emphasis mt-1">Assign and monitor worker tasks</p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">
        New Task
      </v-btn>
    </div>

    <!-- Filters -->
    <v-card elevation="0" class="mb-4 pa-4" rounded="lg">
      <v-row dense>
        <v-col cols="12" sm="6" md="3">
          <v-select
            v-model="filterStatus"
            :items="statusOptions"
            label="Status"
            density="compact"
            variant="outlined"
            clearable
            hide-details
          />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-select
            v-model="filterPriority"
            :items="priorityOptions"
            label="Priority"
            density="compact"
            variant="outlined"
            clearable
            hide-details
          />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-select
            v-model="filterType"
            :items="typeOptions"
            label="Type"
            density="compact"
            variant="outlined"
            clearable
            hide-details
          />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-select
            v-model="filterAssignee"
            :items="workerItems"
            label="Assigned To"
            density="compact"
            variant="outlined"
            clearable
            hide-details
          />
        </v-col>
      </v-row>
    </v-card>

    <!-- Loading -->
    <div v-if="loading" class="mt-4">
      <v-skeleton-loader v-for="n in 4" :key="n" type="list-item-two-line" class="mb-2" />
    </div>

    <!-- Error -->
    <v-alert v-else-if="error" type="error" variant="tonal" closable class="mb-4" @click:close="error = null">
      {{ error }}
      <template #append>
        <v-btn variant="text" size="small" @click="loadTasks">Retry</v-btn>
      </template>
    </v-alert>

    <!-- Empty -->
    <v-card v-else-if="filteredTasks.length === 0" elevation="0" class="text-center pa-12" rounded="lg">
      <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-clipboard-check-outline</v-icon>
      <h3 class="text-h6 mb-2">No tasks found</h3>
      <p class="text-medium-emphasis">
        {{ hasFilters ? 'Try adjusting your filters.' : 'Create a task to get started.' }}
      </p>
    </v-card>

    <!-- Task list -->
    <div v-else>
      <v-card v-for="task in filteredTasks" :key="task.id" elevation="0" class="mb-3 pa-4" rounded="lg">
        <div class="d-flex align-start">
          <!-- Left: task info -->
          <div class="flex-grow-1">
            <div class="d-flex align-center mb-1">
              <span class="text-subtitle-1 font-weight-medium">{{ task.taskName }}</span>
              <v-chip
                :color="statusColor(task.status)"
                size="x-small"
                class="ml-2"
                label
              >
                {{ task.status }}
              </v-chip>
              <v-chip
                v-if="task.priority"
                :color="priorityColor(task.priority)"
                size="x-small"
                class="ml-1"
                label
                variant="outlined"
              >
                {{ task.priority }}
              </v-chip>
              <v-chip v-if="task.taskType" size="x-small" class="ml-1" label>
                {{ task.taskType }}
              </v-chip>
            </div>

            <p v-if="task.taskDescription" class="text-body-2 text-medium-emphasis mb-1">
              {{ task.taskDescription }}
            </p>

            <div class="d-flex flex-wrap ga-3 text-caption text-medium-emphasis">
              <span v-if="task.Shift">
                <v-icon size="14" class="mr-1">mdi-calendar</v-icon>
                Shift #{{ task.shiftId }}
              </span>
              <span v-if="task.assignedUser">
                <v-icon size="14" class="mr-1">mdi-account</v-icon>
                {{ task.assignedUser.firstName }} {{ task.assignedUser.lastName }}
              </span>
              <span v-if="task.dueTime">
                <v-icon size="14" class="mr-1">mdi-clock-outline</v-icon>
                Due: {{ formatTime(task.dueTime) }}
              </span>
              <span v-if="task.estimatedDuration">
                <v-icon size="14" class="mr-1">mdi-timer-outline</v-icon>
                ~{{ task.estimatedDuration }} min
              </span>
            </div>
          </div>

          <!-- Right: actions -->
          <div class="d-flex align-center ga-1 ml-2">
            <v-btn
              v-if="task.status === 'pending'"
              icon="mdi-play"
              size="small"
              variant="text"
              color="primary"
              title="Start"
              @click="handleStart(task)"
            />
            <v-btn
              v-if="task.status === 'in_progress'"
              icon="mdi-check"
              size="small"
              variant="text"
              color="success"
              title="Complete"
              @click="handleComplete(task)"
            />
            <v-btn
              icon="mdi-pencil"
              size="small"
              variant="text"
              title="Edit"
              @click="openEditDialog(task)"
            />
            <v-menu>
              <template #activator="{ props }">
                <v-btn icon="mdi-dots-vertical" size="small" variant="text" v-bind="props" />
              </template>
              <v-list density="compact">
                <v-list-item
                  v-if="task.status !== 'cancelled' && task.status !== 'completed'"
                  prepend-icon="mdi-cancel"
                  title="Cancel"
                  @click="handleCancel(task)"
                />
                <v-list-item
                  prepend-icon="mdi-delete"
                  title="Delete"
                  class="text-error"
                  @click="handleDelete(task)"
                />
              </v-list>
            </v-menu>
          </div>
        </div>
      </v-card>
    </div>

    <!-- Create / Edit dialog -->
    <v-dialog v-model="dialog" max-width="560" persistent>
      <v-card>
        <v-card-title class="text-h6 pa-4 pb-2">
          {{ editingTask ? 'Edit Task' : 'New Task' }}
        </v-card-title>

        <v-card-text class="pa-4 pt-2">
          <v-text-field
            v-model="form.taskName"
            label="Task Name *"
            variant="outlined"
            density="compact"
            :error-messages="formErrors.taskName"
            class="mb-3"
          />

          <v-textarea
            v-model="form.taskDescription"
            label="Description"
            variant="outlined"
            density="compact"
            rows="2"
            auto-grow
            class="mb-3"
          />

          <v-row dense class="mb-3">
            <v-col cols="6">
              <v-select
                v-model="form.shiftId"
                :items="shiftItems"
                label="Shift *"
                variant="outlined"
                density="compact"
                :error-messages="formErrors.shiftId"
                :disabled="!!editingTask"
              />
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="form.assignedTo"
                :items="workerItems"
                label="Assign To"
                variant="outlined"
                density="compact"
                clearable
              />
            </v-col>
          </v-row>

          <v-row dense class="mb-3">
            <v-col cols="4">
              <v-select
                v-model="form.taskType"
                :items="typeOptions"
                label="Type"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="4">
              <v-select
                v-model="form.priority"
                :items="priorityOptions"
                label="Priority"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="4">
              <v-text-field
                v-model.number="form.estimatedDuration"
                label="Est. minutes"
                variant="outlined"
                density="compact"
                type="number"
                min="0"
              />
            </v-col>
          </v-row>

          <v-row dense>
            <v-col cols="6">
              <v-text-field
                v-model="form.dueTime"
                label="Due Time"
                variant="outlined"
                density="compact"
                type="time"
              />
            </v-col>
            <v-col cols="3">
              <v-checkbox
                v-model="form.isRequired"
                label="Required"
                density="compact"
                hide-details
              />
            </v-col>
            <v-col cols="3">
              <v-checkbox
                v-model="form.isRecurring"
                label="Recurring"
                density="compact"
                hide-details
              />
            </v-col>
          </v-row>
        </v-card-text>

        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
          <v-btn color="primary" variant="flat" :loading="saving" @click="saveTask">
            {{ editingTask ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Confirm delete dialog -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h6 pa-4">Delete Task</v-card-title>
        <v-card-text class="pa-4 pt-0">
          Are you sure you want to delete "{{ deletingTask?.taskName }}"? This cannot be undone.
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" :loading="deleting" @click="confirmDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackColor" timeout="3000" location="bottom end">
      {{ snackMessage }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import shiftTaskService from "../services/shiftTaskService.js";
import shiftService from "../services/shiftService.js";
import UserRoleServices from "../services/userRoleServices.js";
import Utils from "../config/utils.js";

/* ── Static options ──────────────────────────────────────── */

const statusOptions = [
  { title: "Pending", value: "pending" },
  { title: "In Progress", value: "in_progress" },
  { title: "Completed", value: "completed" },
  { title: "Cancelled", value: "cancelled" },
];

const priorityOptions = [
  { title: "Low", value: "low" },
  { title: "Medium", value: "medium" },
  { title: "High", value: "high" },
  { title: "Urgent", value: "urgent" },
];

const typeOptions = [
  { title: "General", value: "general" },
  { title: "Cleaning", value: "cleaning" },
  { title: "Setup", value: "setup" },
  { title: "Closing", value: "closing" },
  { title: "Inventory", value: "inventory" },
  { title: "Custom", value: "custom" },
];

/* ── State ───────────────────────────────────────────────── */

const tasks = ref([]);
const shifts = ref([]);
const workers = ref([]);
const loading = ref(true);
const error = ref(null);

// Filters
const filterStatus = ref(null);
const filterPriority = ref(null);
const filterType = ref(null);
const filterAssignee = ref(null);

// Dialog
const dialog = ref(false);
const editingTask = ref(null);
const saving = ref(false);
const formErrors = ref({});
const form = ref(emptyForm());

// Delete
const deleteDialog = ref(false);
const deletingTask = ref(null);
const deleting = ref(false);

// Snackbar
const snackbar = ref(false);
const snackMessage = ref("");
const snackColor = ref("success");

/* ── Computed ────────────────────────────────────────────── */

const hasFilters = computed(
  () => filterStatus.value || filterPriority.value || filterType.value || filterAssignee.value
);

const filteredTasks = computed(() => {
  let list = tasks.value;
  if (filterStatus.value) list = list.filter((t) => t.status === filterStatus.value);
  if (filterPriority.value) list = list.filter((t) => t.priority === filterPriority.value);
  if (filterType.value) list = list.filter((t) => t.taskType === filterType.value);
  if (filterAssignee.value) list = list.filter((t) => t.assignedTo === filterAssignee.value);
  return list;
});

const shiftItems = computed(() =>
  shifts.value.map((s) => ({
    title: `#${s.id} — ${s.shift_date || "No date"} (${s.start_time || "?"} – ${s.end_time || "?"})`,
    value: s.id,
  }))
);

const workerItems = computed(() =>
  workers.value.map((w) => ({
    title: `${w.firstName || w.first_name || ""} ${w.lastName || w.last_name || ""}`.trim() || w.email,
    value: w.id,
  }))
);

/* ── Helpers ─────────────────────────────────────────────── */

function emptyForm() {
  return {
    taskName: "",
    taskDescription: "",
    shiftId: null,
    assignedTo: null,
    taskType: "general",
    priority: "medium",
    estimatedDuration: null,
    dueTime: null,
    isRequired: false,
    isRecurring: false,
  };
}

function statusColor(status) {
  const map = { pending: "grey", in_progress: "blue", completed: "success", cancelled: "error" };
  return map[status] || "grey";
}

function priorityColor(priority) {
  const map = { low: "grey", medium: "info", high: "warning", urgent: "error" };
  return map[priority] || "grey";
}

function formatTime(t) {
  if (!t) return "";
  try {
    return new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return t;
  }
}

function toast(msg, color = "success") {
  snackMessage.value = msg;
  snackColor.value = color;
  snackbar.value = true;
}

/* ── Data loading ────────────────────────────────────────── */

async function loadTasks() {
  loading.value = true;
  error.value = null;
  try {
    const res = await shiftTaskService.getAllTasks();
    tasks.value = res.data || [];
  } catch (e) {
    error.value = e.response?.data?.message || e.message || "Failed to load tasks";
  } finally {
    loading.value = false;
  }
}

async function loadShifts() {
  try {
    const res = await shiftService.listShifts();
    shifts.value = res.data || [];
  } catch {
    /* shifts dropdown will just be empty */
  }
}

async function loadWorkers() {
  try {
    const res = await UserRoleServices.getAllUsersWithRoles(true);
    workers.value = res.data || [];
  } catch {
    /* workers dropdown will just be empty */
  }
}

/* ── Dialog handlers ─────────────────────────────────────── */

function openCreateDialog() {
  editingTask.value = null;
  form.value = emptyForm();
  formErrors.value = {};
  dialog.value = true;
}

function openEditDialog(task) {
  editingTask.value = task;
  form.value = {
    taskName: task.taskName,
    taskDescription: task.taskDescription || "",
    shiftId: task.shiftId,
    assignedTo: task.assignedTo,
    taskType: task.taskType || "general",
    priority: task.priority || "medium",
    estimatedDuration: task.estimatedDuration,
    dueTime: task.dueTime || null,
    isRequired: !!task.isRequired,
    isRecurring: !!task.isRecurring,
  };
  formErrors.value = {};
  dialog.value = true;
}

function closeDialog() {
  dialog.value = false;
  editingTask.value = null;
}

async function saveTask() {
  formErrors.value = {};
  if (!form.value.taskName?.trim()) {
    formErrors.value.taskName = "Task name is required";
    return;
  }
  if (!editingTask.value && !form.value.shiftId) {
    formErrors.value.shiftId = "Shift is required";
    return;
  }

  saving.value = true;
  try {
    if (editingTask.value) {
      await shiftTaskService.updateTask(editingTask.value.id, form.value);
      toast("Task updated");
    } else {
      await shiftTaskService.createTask(form.value);
      toast("Task created");
    }
    closeDialog();
    await loadTasks();
  } catch (e) {
    toast(e.response?.data?.message || "Save failed", "error");
  } finally {
    saving.value = false;
  }
}

/* ── Action handlers ─────────────────────────────────────── */

async function handleStart(task) {
  try {
    await shiftTaskService.startTask(task.id);
    toast("Task started");
    await loadTasks();
  } catch (e) {
    toast(e.response?.data?.message || "Could not start task", "error");
  }
}

async function handleComplete(task) {
  const user = Utils.getStore("user");
  try {
    await shiftTaskService.completeTask(task.id, { completedBy: user?.id });
    toast("Task completed");
    await loadTasks();
  } catch (e) {
    toast(e.response?.data?.message || "Could not complete task", "error");
  }
}

async function handleCancel(task) {
  try {
    await shiftTaskService.cancelTask(task.id);
    toast("Task cancelled");
    await loadTasks();
  } catch (e) {
    toast(e.response?.data?.message || "Could not cancel task", "error");
  }
}

function handleDelete(task) {
  deletingTask.value = task;
  deleteDialog.value = true;
}

async function confirmDelete() {
  deleting.value = true;
  try {
    await shiftTaskService.deleteTask(deletingTask.value.id);
    toast("Task deleted");
    deleteDialog.value = false;
    deletingTask.value = null;
    await loadTasks();
  } catch (e) {
    toast(e.response?.data?.message || "Could not delete task", "error");
  } finally {
    deleting.value = false;
  }
}

/* ── Init ────────────────────────────────────────────────── */

onMounted(() => {
  loadTasks();
  loadShifts();
  loadWorkers();
});
</script>

<style scoped>
.manager-tasks {
  max-width: 960px;
  margin: 0 auto;
}
</style>
