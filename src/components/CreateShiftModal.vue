<template>
  <v-dialog v-model="dialogOpen" max-width="920px" scrollable persistent>
    <v-card>
      <v-card-title class="modal-header">
        <div>
          <h2 class="modal-title">Create Shift</h2>
          <p class="modal-subtitle">Schedule a new shift for your department</p>
        </div>
      </v-card-title>

      <v-card-text class="modal-content">
        <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-4">
          {{ errorMessage }}
        </v-alert>

        <v-row>
          <v-col cols="12">
            <v-text-field
              :model-value="deptContext.department_name || 'No Department Selected'"
              label="Department"
              variant="outlined"
              readonly
              hide-details="auto"
            />
          </v-col>

          <v-col cols="12">
            <v-select
              v-model="form.position_id"
              :items="positions"
              item-title="position_name"
              item-value="position_id"
              label="Position *"
              variant="outlined"
              :loading="loadingPositions"
              :disabled="loadingPositions"
              hide-details="auto"
            />
          </v-col>

          <v-col cols="12" md="4">
            <v-text-field
              v-model="form.shift_date"
              type="date"
              label="Date *"
              variant="outlined"
              :min="todayIso"
              hide-details="auto"
            />
          </v-col>

          <v-col cols="12" md="4">
            <v-select
              v-model="form.start_time"
              :items="startTimeOptions"
              label="Start Time *"
              variant="outlined"
              hide-details="auto"
            />
          </v-col>

          <v-col cols="12" md="4">
            <v-select
              v-model="form.end_time"
              :items="endTimeOptions"
              label="End Time *"
              variant="outlined"
              :disabled="!form.start_time"
              hide-details="auto"
            />
          </v-col>

          <v-col cols="12">
            <div class="toggle-row">
              <div>
                <div class="toggle-title">Recurring Shift</div>
                <div class="toggle-subtitle">Repeat this shift weekly</div>
              </div>
              <v-switch v-model="form.recurring" color="primary" hide-details inset />
            </div>
          </v-col>

          <v-col cols="12">
            <div class="toggle-row">
              <div>
                <div class="toggle-title">Post as Open Shift</div>
                <div class="toggle-subtitle">Allow workers to claim this shift</div>
              </div>
              <v-switch v-model="form.post_as_open" color="primary" hide-details inset />
            </div>
          </v-col>

          <v-col v-if="form.post_as_open" cols="12" md="4">
            <v-text-field
              v-model.number="form.workers_needed"
              type="number"
              min="1"
              max="10"
              label="Workers Needed"
              variant="outlined"
              hide-details="auto"
            />
          </v-col>

          <v-col v-else cols="12">
            <v-select
              v-model="form.assigned_user_id"
              :items="workerOptions"
              item-title="label"
              item-value="value"
              label="Assign To"
              variant="outlined"
              :disabled="loadingWorkers || !form.department_id"
              clearable
              hide-details="auto"
            />
          </v-col>

          <v-col cols="12">
            <v-textarea
              v-model="form.notes"
              label="Notes"
              variant="outlined"
              rows="3"
              auto-grow
              hide-details="auto"
              placeholder="Optional notes for this shift..."
            />
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions class="modal-actions">
        <v-spacer />
        <v-btn variant="text" @click="closeModal">Cancel</v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-content-save-outline"
          :loading="submitting"
          :disabled="isCreateDisabled"
          @click="submitShift"
        >
          Create Shift
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from "vue";
import apiClient from "../services/services.js";
import shiftService from "../services/shiftService.js";
import Utils from "../config/utils.js";
import { localDateStr } from "../utils/tz.js";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  open: {
    type: Boolean,
    default: undefined,
  },
});

const emit = defineEmits(["update:modelValue", "close", "shift-created"]);

const dialogOpen = computed({
  get: () => (typeof props.open === "boolean" ? props.open : props.modelValue),
  set: (value) => {
    emit("update:modelValue", value);
    if (!value) emit("close");
  },
});

const currentUser = Utils.getStore("user") || {};
const deptContext = Utils.getStore("currentDepartmentContext") || {};

const positions = ref([]);
const departmentWorkers = ref([]);
const loadingPositions = ref(false);
const loadingWorkers = ref(false);
const submitting = ref(false);
const errorMessage = ref("");

const form = reactive({
  department_id: deptContext.department_id || null,
  position_id: null,
  shift_date: "",
  start_time: "",
  end_time: "",
  recurring: false,
  post_as_open: false,
  workers_needed: 1,
  assigned_user_id: null,
  notes: "",
});

const todayIso = computed(() => localDateStr());

const toItems = (response) => response?.data?.data || response?.data || [];

const startTimeOptions = computed(() => {
  const items = [];
  for (let hour = 6; hour <= 22; hour += 1) {
    items.push(`${String(hour).padStart(2, "0")}:00`);
    items.push(`${String(hour).padStart(2, "0")}:30`);
  }
  return items.filter((time) => time <= "22:30");
});

const endTimeOptions = computed(() => {
  if (!form.start_time) return [];
  return startTimeOptions.value.filter((time) => time > form.start_time);
});

const workerOptions = computed(() =>
  (departmentWorkers.value || []).map((worker) => ({
    value: worker.userId || worker.id,
    label: `${worker.fName || ""} ${worker.lName || ""}`.trim() || worker.email || "Worker",
  })),
);

const hasRequiredFields = computed(
  () => !!form.department_id && !!form.position_id && !!form.shift_date && !!form.start_time && !!form.end_time,
);
const isPastDate = computed(() => !!form.shift_date && form.shift_date < todayIso.value);
const workersNeededValid = computed(() => Number(form.workers_needed) >= 1 && Number(form.workers_needed) <= 10);

const isCreateDisabled = computed(() => {
  if (submitting.value) return true;
  if (!hasRequiredFields.value || isPastDate.value) return true;
  if (form.end_time <= form.start_time) return true;
  if (form.post_as_open) return !workersNeededValid.value;
  return false;
});

const resetForm = () => {
  form.department_id = deptContext.department_id || null;
  form.position_id = null;
  form.shift_date = "";
  form.start_time = "";
  form.end_time = "";
  form.recurring = false;
  form.post_as_open = false;
  form.workers_needed = 1;
  form.assigned_user_id = null;
  form.notes = "";
  errorMessage.value = "";
};

const closeModal = () => {
  dialogOpen.value = false;
  resetForm();
};

const loadPositions = async () => {
  if (!deptContext.department_id) {
    positions.value = [];
    return;
  }

  loadingPositions.value = true;
  try {
    const response = await apiClient.get(`/positions?department_id=${deptContext.department_id}`);
    positions.value = toItems(response);
  } catch (error) {
    positions.value = [];
    errorMessage.value = error?.response?.data?.message || "Failed to load positions.";
  } finally {
    loadingPositions.value = false;
  }
};

const loadWorkers = async () => {
  if (!deptContext.department_id) {
    departmentWorkers.value = [];
    return;
  }

  loadingWorkers.value = true;
  try {
    const response = await apiClient.get(`/user-departments?departmentId=${deptContext.department_id}&status=approved`);
    const assignments = toItems(response);
    departmentWorkers.value = assignments
      .filter((assignment) => {
        const roleName = String(assignment?.role?.role_name || assignment?.role_name || "").toLowerCase();
        if (!roleName) return true;
        return roleName.includes("student");
      })
      .map((assignment) => assignment.user || assignment)
      .filter((worker) => worker && (worker.userId || worker.id));
  } catch (error) {
    departmentWorkers.value = [];
    errorMessage.value = error?.response?.data?.message || "Failed to load workers.";
  } finally {
    loadingWorkers.value = false;
  }
};

watch(
  () => form.start_time,
  (start) => {
    if (!start) {
      form.end_time = "";
      return;
    }
    if (form.end_time && form.end_time <= start) {
      form.end_time = "";
    }
  },
);

watch(
  dialogOpen,
  async (isOpen) => {
    if (!isOpen) return;
    resetForm();
    await Promise.all([loadPositions(), loadWorkers()]);
  },
  { immediate: true },
);

const submitShift = async () => {
  if (isCreateDisabled.value) return;

  submitting.value = true;
  errorMessage.value = "";
  try {
    const creatorId = currentUser.userId || currentUser.id || null;
    const isOpenShift = form.post_as_open || !form.assigned_user_id;

    const payload = {
      department_id: form.department_id,
      position_id: form.position_id,
      shift_date: form.shift_date,
      start_time: form.start_time,
      end_time: form.end_time,
      assigned_user_id: form.post_as_open ? null : form.assigned_user_id || null,
      created_by: creatorId,
      is_published: true,
      is_recurring: form.recurring,
      recurrence_pattern: form.recurring ? "weekly" : null,
      recurrence_start_date: form.recurring ? form.shift_date : null,
      tasks_notes: JSON.stringify({
        tasks: [],
        notes: form.notes?.trim() || null,
      }),
      workers_needed: form.post_as_open ? Number(form.workers_needed) : null,
      trade_status: isOpenShift ? "open" : null,
    };

    const response = await shiftService.createShift(payload);
    emit("shift-created", response?.data?.data || response?.data || null);
    closeModal();
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || "Failed to create shift.";
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.modal-header {
  padding: 20px 24px 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.modal-title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: var(--text-1);
}

.modal-subtitle {
  margin: 6px 0 0;
  color: var(--text-2);
  font-size: 14px;
}

.modal-content {
  padding: 8px 24px 20px;
}

.toggle-row {
  border: 1px solid var(--border-1);
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.toggle-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-1);
}

.toggle-subtitle {
  margin-top: 2px;
  color: var(--text-2);
  font-size: 14px;
}

.modal-actions {
  padding: 12px 24px 20px;
}

@media (max-width: 768px) {
  .modal-content {
    padding: 8px 16px 16px;
  }

  .modal-actions {
    padding: 8px 16px 16px;
  }
}
</style>
