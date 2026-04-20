<template>
  <v-dialog :model-value="modelValue" max-width="500px" @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center pa-4 pb-2">
        <v-icon color="primary" class="mr-2">mdi-clipboard-check-outline</v-icon>
        <div class="flex-grow-1 overflow-hidden">
          <div class="text-subtitle-1 font-weight-semibold">
            {{ shift?.position?.position_name || 'Shift Tasks' }}
          </div>
          <div class="text-caption text-medium-emphasis">
            {{ shiftDateLabel }} &middot; {{ timeRange }}
          </div>
        </div>
        <v-btn icon="mdi-close" size="small" variant="text" @click="$emit('update:modelValue', false)" />
      </v-card-title>

      <v-divider />

      <!-- Loading -->
      <v-card-text v-if="loading" class="pa-4">
        <v-skeleton-loader v-for="n in 3" :key="n" type="list-item" class="mb-1" />
      </v-card-text>

      <!-- No task list -->
      <v-card-text v-else-if="!items.length" class="pa-6 text-center">
        <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-clipboard-outline</v-icon>
        <div class="text-body-2 text-medium-emphasis">No tasks assigned to this shift</div>
      </v-card-text>

      <!-- Task list -->
      <v-card-text v-else class="pa-2">
        <v-list>
          <v-list-item
            v-for="item in items"
            :key="item.id"
            class="task-item px-3"
            :class="{ 'task-item--done': isCompleted(item.id) }"
          >
            <template #prepend>
              <v-checkbox-btn
                :model-value="isCompleted(item.id)"
                :loading="pending.has(item.id)"
                color="primary"
                @update:model-value="(val) => toggleTask(item.id, val)"
              />
            </template>
            <v-list-item-title
              :class="{
                'text-decoration-line-through text-medium-emphasis': isCompleted(item.id),
              }"
            >
              {{ item.title }}
            </v-list-item-title>
            <v-list-item-subtitle v-if="item.description" class="text-caption">
              {{ item.description }}
            </v-list-item-subtitle>
            <template v-if="isCompleted(item.id)" #append>
              <v-icon size="14" color="success">mdi-check-circle</v-icon>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>

      <!-- Progress footer -->
      <v-card-actions v-if="items.length" class="pa-4 pt-2 d-flex flex-column align-stretch">
        <div class="d-flex align-center justify-space-between mb-2 w-100">
          <span class="text-caption text-medium-emphasis">
            {{ completedCount }} / {{ items.length }} completed
          </span>
          <v-chip
            size="x-small"
            :color="completedCount === items.length ? 'success' : 'grey'"
            variant="tonal"
          >
            {{ completedCount === items.length ? 'All Done!' : 'In Progress' }}
          </v-chip>
        </div>
        <v-progress-linear
          :model-value="(completedCount / items.length) * 100"
          color="primary"
          rounded
          height="6"
        />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import shiftTaskCompletionService from "../services/shiftTaskCompletionService.js";
import taskListService from "../services/taskListService.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  shift: { type: Object, default: null },
});

const emit = defineEmits(["update:modelValue"]);

const items = ref([]);
const completedItemIds = ref(new Set());
const pending = ref(new Set());
const loading = ref(false);

const toMin = (t) => {
  if (!t) return 0;
  const [h, m] = String(t).split(":").map(Number);
  return h * 60 + (m || 0);
};

const shiftDateLabel = computed(() => {
  const d = props.shift?.shift_date;
  if (!d) return "";
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
});

const timeRange = computed(() => {
  const s = props.shift?.start_time?.slice(0, 5) || "";
  const e = props.shift?.end_time?.slice(0, 5) || "";
  if (!s || !e) return "";
  const fmt = (t) => {
    const [h, m] = t.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, "0")} ${period}`;
  };
  return `${fmt(s)} – ${fmt(e)}`;
});

const isCompleted = (itemId) => completedItemIds.value.has(itemId);

const completedCount = computed(
  () => items.value.filter((i) => isCompleted(i.id)).length
);

async function load() {
  if (!props.shift) return;
  loading.value = true;

  try {
    // Use pre-loaded task list items when available, otherwise fetch
    if (props.shift.taskList?.items?.length) {
      items.value = props.shift.taskList.items;
    } else if (props.shift.task_list_id) {
      const listRes = await taskListService.getTaskList(props.shift.task_list_id);
      items.value = listRes.data?.items || [];
    } else {
      items.value = [];
    }

    // Load existing completions for this shift
    if (props.shift.shift_id && items.value.length) {
      const compRes = await shiftTaskCompletionService.getShiftCompletions(props.shift.shift_id);
      const completions = compRes.data || [];
      completedItemIds.value = new Set(completions.map((c) => c.task_list_item_id));
    } else {
      completedItemIds.value = new Set();
    }
  } catch (e) {
    console.error("ShiftTaskModal: failed to load tasks", e);
    items.value = [];
  } finally {
    loading.value = false;
  }
}

async function toggleTask(itemId, checked) {
  if (pending.value.has(itemId)) return;
  pending.value = new Set([...pending.value, itemId]);

  try {
    if (checked) {
      await shiftTaskCompletionService.completeTask(props.shift.shift_id, itemId);
      completedItemIds.value = new Set([...completedItemIds.value, itemId]);
    } else {
      await shiftTaskCompletionService.uncompleteTask(props.shift.shift_id, itemId);
      const next = new Set(completedItemIds.value);
      next.delete(itemId);
      completedItemIds.value = next;
    }
  } catch (e) {
    console.error("ShiftTaskModal: toggle failed", e);
  } finally {
    const next = new Set(pending.value);
    next.delete(itemId);
    pending.value = next;
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) load();
    else {
      items.value = [];
      completedItemIds.value = new Set();
    }
  }
);
</script>

<style scoped>
.task-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  transition: background 0.15s;
}
.task-item:last-child {
  border-bottom: none;
}
.task-item--done {
  background: rgba(76, 175, 80, 0.04);
}
</style>
