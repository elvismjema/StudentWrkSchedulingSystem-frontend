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
                <div class="toggle-subtitle">Repeat this shift on a regular schedule</div>
              </div>
              <v-switch v-model="form.recurring" color="primary" hide-details inset />
            </div>
            <v-expand-transition>
              <div v-if="form.recurring" class="mt-3">
                <div class="text-caption text-medium-emphasis mb-1">Repeat frequency</div>
                <v-btn-toggle
                  v-model="form.recurrence_frequency"
                  mandatory
                  density="compact"
                  color="primary"
                  class="mb-3 w-100"
                  divided
                  rounded="lg"
                >
                  <v-btn value="weekly" class="flex-grow-1">Every Week</v-btn>
                  <v-btn value="daily" class="flex-grow-1">Every Day</v-btn>
                </v-btn-toggle>
                <v-text-field
                  v-model="form.repeat_until"
                  type="date"
                  label="Repeat Until"
                  variant="outlined"
                  density="comfortable"
                  :min="form.shift_date || undefined"
                  hide-details="auto"
                />
              </div>
            </v-expand-transition>
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
              :disabled="loadingWorkers || !hasWorkerQueryInputs"
              :loading="loadingWorkers"
              :no-data-text="workerNoDataText"
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
  recurrence_frequency: "weekly",
  repeat_until: "",
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
  visibleWorkers.value.map((worker) => ({
    value: worker.userId || worker.id,
    label: `${worker.fName || ""} ${worker.lName || ""}`.trim() || worker.email || "Worker",
  })),
);

// Step 2 client-side narrowing: filter the already-fetched time-eligible list
// by selected position. When no position is picked yet, show everyone who is
// time-eligible so the manager can see who is free before committing.
const visibleWorkers = computed(() => {
  const positionId = Number(form.position_id) || null;
  if (!positionId) return departmentWorkers.value;
  return departmentWorkers.value.filter((w) => Number(w.position_id) === positionId);
});

const hasRequiredFields = computed(
  () => !!form.department_id && !!form.position_id && !!form.shift_date && !!form.start_time && !!form.end_time,
);
const isPastDate = computed(() => !!form.shift_date && form.shift_date < todayIso.value);
const workersNeededValid = computed(() => Number(form.workers_needed) >= 1 && Number(form.workers_needed) <= 10);
// Position is NOT required to fetch workers - the Step 1 fetch triggers on
// date/start/end alone, and position filtering happens client-side.
const hasWorkerQueryInputs = computed(
  () => !!form.department_id && !!form.shift_date && !!form.start_time && !!form.end_time,
);
const workerNoDataText = computed(() => {
  if (loadingWorkers.value) return "Loading workers...";
  if (!hasWorkerQueryInputs.value) return "Select date and time first";
  if (departmentWorkers.value.length === 0) return "No workers are free in this time window";
  if (form.position_id && visibleWorkers.value.length === 0) {
    return "No free workers are assigned to this position";
  }
  return "No available workers match this shift";
});

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
  form.recurrence_frequency = "weekly";
  form.repeat_until = "";
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

  if (!hasWorkerQueryInputs.value) {
    departmentWorkers.value = [];
    form.assigned_user_id = null;
    return;
  }

  loadingWorkers.value = true;
  try {
    // Step 1: department-wide list of time-eligible workers. No position_id
    // is sent - backend enforces the 5 eligibility rules, position filtering
    // is applied client-side via visibleWorkers.
    const response = await shiftService.getAssignableWorkers({
      department_id: form.department_id,
      shift_date: form.shift_date,
      start_time: form.start_time,
      end_time: form.end_time,
    });
    const workers = toItems(response);
    departmentWorkers.value = workers
      .filter((user) => Number(user.id) !== Number(currentUser.userId || currentUser.id))
      .map((user) => ({
        id: user.id,
        userId: user.userId || user.id,
        fName: user.fName,
        lName: user.lName,
        email: user.email,
        position_id: user.position_id != null ? Number(user.position_id) : null,
        position_name: user.position_name || null,
      }));

    if (
      form.assigned_user_id &&
      !departmentWorkers.value.some((worker) => String(worker.userId || worker.id) === String(form.assigned_user_id))
    ) {
      form.assigned_user_id = null;
    }
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

// Step 1 trigger: refetch only when the time window changes. Position
// changes re-filter the existing list via visibleWorkers (no network call).
watch(
  () => [form.shift_date, form.start_time, form.end_time],
  () => {
    loadWorkers();
  },
);

// If the manager switches positions, clear any previously-selected worker
// that is no longer in the narrowed set so we do not submit a worker who
// is not in the chosen position.
watch(
  () => form.position_id,
  (positionId) => {
    if (!positionId || !form.assigned_user_id) return;
    const stillVisible = visibleWorkers.value.some(
      (w) => Number(w.userId || w.id) === Number(form.assigned_user_id),
    );
    if (!stillVisible) form.assigned_user_id = null;
  },
);

const validateSelectedWorkerEligibility = async () => {
  if (!form.assigned_user_id || form.post_as_open) return true;

  const response = await shiftService.getAssignableWorkers({
    department_id: form.department_id,
    position_id: form.position_id,
    shift_date: form.shift_date,
    start_time: form.start_time,
    end_time: form.end_time,
  });

  const workers = toItems(response)
    .map((user) => Number(user.userId || user.id))
    .filter((id) => Number.isFinite(id));

  return workers.includes(Number(form.assigned_user_id));
};

const submitShift = async () => {
  if (isCreateDisabled.value) return;

  if (!form.post_as_open && form.assigned_user_id) {
    try {
      const eligible = await validateSelectedWorkerEligibility();
      if (!eligible) {
        errorMessage.value = "Selected worker no longer qualifies for this shift. Please choose another worker.";
        await loadWorkers();
        return;
      }
    } catch (error) {
      errorMessage.value = error?.response?.data?.message || "Unable to validate assigned worker eligibility.";
      return;
    }
  }

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
      recurrence_pattern: form.recurring ? form.recurrence_frequency : null,
      recurrence_start_date: form.recurring ? form.shift_date : null,
      recurrence_end_date: form.recurring ? form.repeat_until || null : null,
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
