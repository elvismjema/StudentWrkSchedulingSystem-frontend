<template>
  <div class="task-lists-page pa-6">
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">Task Lists</h1>
        <p class="text-medium-emphasis mt-1">
          Create reusable task checklists and apply them to shifts
        </p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">
        New Task List
      </v-btn>
    </div>

    <!-- Loading -->
    <template v-if="loading">
      <v-skeleton-loader v-for="n in 3" :key="n" type="card" class="mb-4" />
    </template>

    <!-- Error -->
    <v-alert
      v-else-if="error"
      type="error"
      variant="tonal"
      class="mb-4"
      closable
      @click:close="error = null"
    >
      {{ error }}
      <template #append>
        <v-btn variant="text" size="small" @click="loadTaskLists">Retry</v-btn>
      </template>
    </v-alert>

    <!-- Empty state -->
    <v-card
      v-else-if="taskLists.length === 0"
      elevation="0"
      rounded="lg"
      border
      class="pa-12 text-center"
    >
      <v-icon size="64" color="grey-lighten-1" class="mb-4">
        mdi-clipboard-list-outline
      </v-icon>
      <div class="text-h6 text-medium-emphasis mb-2">No task lists yet</div>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Create a task list (e.g. "Opening Checklist") and apply it to shifts so
        workers can check off their tasks each day.
      </p>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">
        Create First Task List
      </v-btn>
    </v-card>

    <!-- Task list cards -->
    <div v-else class="task-lists-grid">
      <v-card
        v-for="list in taskLists"
        :key="list.id"
        elevation="0"
        rounded="lg"
        border
        class="mb-4"
      >
        <v-card-title class="d-flex align-center pa-4 pb-2">
          <v-icon color="primary" class="mr-2">mdi-clipboard-list-outline</v-icon>
          <span class="text-subtitle-1 font-weight-semibold flex-grow-1">{{ list.name }}</span>
          <v-chip size="x-small" variant="tonal" color="primary" class="mr-2">
            {{ list.items?.length || 0 }} item{{ (list.items?.length || 0) !== 1 ? 's' : '' }}
          </v-chip>
          <v-btn icon="mdi-pencil" size="small" variant="text" @click="openEditDialog(list)" />
          <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="promptDelete(list)" />
        </v-card-title>

        <v-card-text class="pt-0">
          <p v-if="list.description" class="text-body-2 text-medium-emphasis mb-2">
            {{ list.description }}
          </p>
          <v-list density="compact" class="task-item-list pa-0">
            <v-list-item
              v-for="(item, idx) in list.items"
              :key="item.id"
              class="px-0"
            >
              <template #prepend>
                <v-icon size="16" color="grey-lighten-1">mdi-drag-vertical</v-icon>
                <span class="text-caption text-medium-emphasis mr-2 ml-1">{{ idx + 1 }}.</span>
              </template>
              <v-list-item-title class="text-body-2">{{ item.title }}</v-list-item-title>
            </v-list-item>
          </v-list>
          <div v-if="!list.items?.length" class="text-body-2 text-medium-emphasis font-italic">
            No items — edit to add tasks
          </div>
        </v-card-text>
      </v-card>
    </div>

    <!-- Create / Edit Dialog -->
    <v-dialog v-model="showDialog" max-width="600px" persistent>
      <v-card>
        <v-card-title class="d-flex align-center pa-5 pb-3">
          <v-icon color="primary" class="mr-2">mdi-clipboard-list-outline</v-icon>
          {{ editingList ? 'Edit Task List' : 'New Task List' }}
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-text-field
            v-model="form.name"
            label="List Name *"
            placeholder="e.g. Opening Checklist"
            variant="outlined"
            density="comfortable"
            :error-messages="formErrors.name"
            class="mb-3"
          />
          <v-textarea
            v-model="form.description"
            label="Description (optional)"
            variant="outlined"
            density="comfortable"
            rows="2"
            auto-grow
            class="mb-4"
          />

          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-subtitle-2 font-weight-medium">Tasks</span>
            <v-btn
              size="small"
              variant="outlined"
              prepend-icon="mdi-plus"
              @click="addItem"
            >
              Add Task
            </v-btn>
          </div>

          <div v-if="form.items.length === 0" class="text-body-2 text-medium-emphasis text-center py-4">
            No tasks added yet
          </div>

          <div
            v-for="(item, idx) in form.items"
            :key="idx"
            class="d-flex align-center gap-2 mb-2"
          >
            <span class="text-caption text-medium-emphasis" style="min-width:20px">{{ idx + 1 }}.</span>
            <v-text-field
              v-model="item.title"
              :label="`Task ${idx + 1}`"
              variant="outlined"
              density="compact"
              hide-details
              class="flex-grow-1"
            />
            <v-btn
              icon="mdi-delete"
              size="small"
              variant="text"
              color="error"
              @click="removeItem(idx)"
            />
          </div>
        </v-card-text>
        <v-card-actions class="px-5 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            :loading="saving"
            @click="saveList"
          >
            {{ editingList ? 'Save Changes' : 'Create List' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete confirm dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="420px">
      <v-card>
        <v-card-title class="text-h6 pa-4">Delete Task List</v-card-title>
        <v-card-text class="pa-4 pt-0">
          Are you sure you want to delete
          <strong>{{ deletingList?.name }}</strong>? This cannot be undone. Any
          shifts using this list will lose their task list assignment.
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="showDeleteDialog = false">Cancel</v-btn>
          <v-btn
            color="error"
            variant="flat"
            :loading="deleting"
            @click="confirmDelete"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar
      v-model="snackbar"
      :color="snackColor"
      timeout="3000"
      location="bottom end"
    >
      {{ snackMessage }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import taskListService from "../services/taskListService.js";
import Utils from "../config/utils.js";

const deptContext = Utils.getStore("currentDepartmentContext") || {};
const currentDeptId = deptContext.department_id || null;

const taskLists = ref([]);
const loading = ref(true);
const error = ref(null);

const showDialog = ref(false);
const editingList = ref(null);
const saving = ref(false);
const formErrors = ref({});
const form = ref(emptyForm());

const showDeleteDialog = ref(false);
const deletingList = ref(null);
const deleting = ref(false);

const snackbar = ref(false);
const snackMessage = ref("");
const snackColor = ref("success");

function emptyForm() {
  return { name: "", description: "", items: [] };
}

function toast(msg, color = "success") {
  snackMessage.value = msg;
  snackColor.value = color;
  snackbar.value = true;
}

async function loadTaskLists() {
  loading.value = true;
  error.value = null;
  try {
    const res = await taskListService.listTaskLists(
      currentDeptId ? { department_id: currentDeptId } : {}
    );
    taskLists.value = res.data || [];
  } catch (e) {
    error.value = e.response?.data?.message || e.message || "Failed to load task lists";
  } finally {
    loading.value = false;
  }
}

function openCreateDialog() {
  editingList.value = null;
  form.value = emptyForm();
  formErrors.value = {};
  showDialog.value = true;
}

function openEditDialog(list) {
  editingList.value = list;
  form.value = {
    name: list.name,
    description: list.description || "",
    items: (list.items || []).map((item) => ({ title: item.title })),
  };
  formErrors.value = {};
  showDialog.value = true;
}

function closeDialog() {
  showDialog.value = false;
  editingList.value = null;
}

function addItem() {
  form.value.items.push({ title: "" });
}

function removeItem(idx) {
  form.value.items.splice(idx, 1);
}

async function saveList() {
  formErrors.value = {};
  if (!form.value.name?.trim()) {
    formErrors.value.name = "List name is required";
    return;
  }

  saving.value = true;
  try {
    const payload = {
      name: form.value.name.trim(),
      description: form.value.description || null,
      department_id: currentDeptId,
      items: form.value.items.filter((i) => i.title?.trim()),
    };

    if (editingList.value) {
      await taskListService.updateTaskList(editingList.value.id, payload);
      toast("Task list updated");
    } else {
      await taskListService.createTaskList(payload);
      toast("Task list created");
    }

    closeDialog();
    await loadTaskLists();
  } catch (e) {
    toast(e.response?.data?.message || "Could not save task list", "error");
  } finally {
    saving.value = false;
  }
}

function promptDelete(list) {
  deletingList.value = list;
  showDeleteDialog.value = true;
}

async function confirmDelete() {
  deleting.value = true;
  try {
    await taskListService.deleteTaskList(deletingList.value.id);
    toast("Task list deleted");
    showDeleteDialog.value = false;
    deletingList.value = null;
    await loadTaskLists();
  } catch (e) {
    toast(e.response?.data?.message || "Could not delete task list", "error");
  } finally {
    deleting.value = false;
  }
}

onMounted(loadTaskLists);
</script>

<style scoped>
.task-lists-page {
  max-width: 800px;
  margin: 0 auto;
}

.task-item-list :deep(.v-list-item) {
  min-height: 32px;
}
</style>
