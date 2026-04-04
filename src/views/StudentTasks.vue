<template>
  <div class="tasks-page pa-6">
    <div class="text-h4 font-weight-bold mb-2">My Tasks</div>
    <div class="text-body-1 text-medium-emphasis mb-6">
      Your assigned tasks and follow-up actions.
    </div>

    <!-- Loading -->
    <template v-if="loading">
      <v-skeleton-loader v-for="n in 3" :key="n" type="list-item-two-line" class="mb-3" />
    </template>

    <!-- Error -->
    <v-alert v-else-if="error" type="error" variant="tonal" class="mb-4" closable>
      {{ error }}
      <template #append>
        <v-btn variant="text" size="small" @click="loadTasks">Retry</v-btn>
      </template>
    </v-alert>

    <!-- Tasks list -->
    <template v-else-if="tasks.length">
      <v-card elevation="0" rounded="lg" border>
        <v-list>
          <v-list-item
            v-for="task in tasks"
            :key="task.id"
            class="task-item"
          >
            <template #prepend>
              <v-checkbox-btn
                :model-value="task.is_completed"
                color="primary"
                :loading="task._completing"
                @update:model-value="completeTask(task)"
              />
            </template>
            <v-list-item-title
              :class="{ 'text-decoration-line-through text-medium-emphasis': task.is_completed }"
            >
              {{ task.task_name || task.title || task.description }}
            </v-list-item-title>
            <v-list-item-subtitle v-if="task.due_date || task.shift_date">
              Due: {{ formatDate(task.due_date || task.shift_date) }}
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-card>
    </template>

    <!-- Empty state -->
    <v-card v-else elevation="0" rounded="lg" border class="pa-8 text-center">
      <v-icon size="64" color="grey-lighten-1" class="mb-3">mdi-clipboard-check-outline</v-icon>
      <div class="text-h6 text-medium-emphasis mb-1">No Tasks</div>
      <div class="text-body-2 text-medium-emphasis">
        Your assigned tasks will show up here once they are available.
      </div>
    </v-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import studentService from "../services/studentService.js";

const loading = ref(true);
const error = ref(null);
const tasks = ref([]);

async function loadTasks() {
  loading.value = true;
  error.value = null;
  try {
    const res = await studentService.getTasks();
    const data = res?.data?.data || res?.data || [];
    tasks.value = (Array.isArray(data) ? data : []).map((t) => ({
      ...t,
      _completing: false,
    }));
  } catch (err) {
    error.value = "Failed to load tasks. Please try again.";
    console.error("Tasks load failed:", err);
  } finally {
    loading.value = false;
  }
}

async function completeTask(task) {
  if (task.is_completed) return;
  task._completing = true;
  try {
    await studentService.completeTask(task.id);
    task.is_completed = true;
  } catch (err) {
    console.error("Failed to complete task:", err);
  } finally {
    task._completing = false;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

onMounted(loadTasks);
</script>

<style scoped>
.tasks-page {
  max-width: 960px;
  margin: 0 auto;
}

.task-item {
  border-bottom: 1px solid #f0f0f0;
}

.task-item:last-child {
  border-bottom: none;
}
</style>
