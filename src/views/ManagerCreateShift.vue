<template>
  <div class="create-shift-page">
    <div class="header-row">
      <v-btn icon variant="text" size="small" @click="goBack">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <div>
        <h1 class="page-title">Create Shift</h1>
        <p class="page-subtitle">Schedule a new shift for your department</p>
      </div>
    </div>

    <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-4">
      {{ errorMessage }}
    </v-alert>

    <v-card class="form-card" elevation="0">
      <v-card-text>
        <h2 class="card-title">Shift Details</h2>
        <p class="card-subtitle">Fill in the shift information</p>

        <v-row>
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
              no-data-text="No positions available — ask an admin to add positions for this department"
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
            <v-menu
              v-model="startTimeMenu"
              :close-on-content-click="false"
              location="bottom"
              offset="8"
            >
              <template #activator="{ props }">
                <v-text-field
                  v-bind="props"
                  :model-value="formatTimeDisplay(form.start_time)"
                  label="Start Time *"
                  variant="outlined"
                  readonly
                  prepend-inner-icon="mdi-clock-outline"
                  hide-details="auto"
                />
              </template>
              <v-card class="time-picker-card" min-width="320">
                <v-card-text class="pa-3">
                  <div class="time-picker-grid">
                    <div class="time-picker-col">
                      <div class="time-picker-col-title">Hour</div>
                      <v-btn
                        v-for="hour in hourOptions"
                        :key="`start-hour-${hour}`"
                        size="small"
                        variant="flat"
                        block
                        class="mb-1"
                        :color="startTimeParts.hour === hour ? '#1976d2' : undefined"
                        @click="updateTimePart('start', 'hour', hour)"
                      >
                        {{ hour }}
                      </v-btn>
                    </div>
                    <div class="time-picker-col">
                      <div class="time-picker-col-title">Minute</div>
                      <v-btn
                        v-for="minute in minuteOptions"
                        :key="`start-minute-${minute}`"
                        size="small"
                        variant="flat"
                        block
                        class="mb-1"
                        :color="startTimeParts.minute === minute ? '#1976d2' : undefined"
                        @click="updateTimePart('start', 'minute', minute)"
                      >
                        {{ minute }}
                      </v-btn>
                    </div>
                    <div class="time-picker-col">
                      <div class="time-picker-col-title">Period</div>
                      <v-btn
                        v-for="period in periodOptions"
                        :key="`start-period-${period}`"
                        size="small"
                        variant="flat"
                        block
                        class="mb-1"
                        :color="startTimeParts.period === period ? '#1976d2' : undefined"
                        @click="updateTimePart('start', 'period', period)"
                      >
                        {{ period }}
                      </v-btn>
                    </div>
                  </div>
                  <div class="time-picker-actions">
                    <v-btn variant="text" size="small" @click="clearTime('start')">Clear</v-btn>
                    <v-btn variant="text" size="small" @click="startTimeMenu = false">Done</v-btn>
                  </div>
                </v-card-text>
              </v-card>
            </v-menu>
          </v-col>

          <v-col cols="12" md="4">
            <v-menu
              v-model="endTimeMenu"
              :close-on-content-click="false"
              location="bottom"
              offset="8"
              :disabled="!form.start_time"
            >
              <template #activator="{ props }">
                <v-text-field
                  v-bind="props"
                  :model-value="formatTimeDisplay(form.end_time)"
                  label="End Time *"
                  variant="outlined"
                  readonly
                  prepend-inner-icon="mdi-clock-outline"
                  :disabled="!form.start_time"
                  hide-details="auto"
                />
              </template>
              <v-card class="time-picker-card" min-width="320">
                <v-card-text class="pa-3">
                  <div class="time-picker-grid">
                    <div class="time-picker-col">
                      <div class="time-picker-col-title">Hour</div>
                      <v-btn
                        v-for="hour in hourOptions"
                        :key="`end-hour-${hour}`"
                        size="small"
                        variant="flat"
                        block
                        class="mb-1"
                        :color="endTimeParts.hour === hour ? '#1976d2' : undefined"
                        @click="updateTimePart('end', 'hour', hour)"
                      >
                        {{ hour }}
                      </v-btn>
                    </div>
                    <div class="time-picker-col">
                      <div class="time-picker-col-title">Minute</div>
                      <v-btn
                        v-for="minute in minuteOptions"
                        :key="`end-minute-${minute}`"
                        size="small"
                        variant="flat"
                        block
                        class="mb-1"
                        :color="endTimeParts.minute === minute ? '#1976d2' : undefined"
                        @click="updateTimePart('end', 'minute', minute)"
                      >
                        {{ minute }}
                      </v-btn>
                    </div>
                    <div class="time-picker-col">
                      <div class="time-picker-col-title">Period</div>
                      <v-btn
                        v-for="period in periodOptions"
                        :key="`end-period-${period}`"
                        size="small"
                        variant="flat"
                        block
                        class="mb-1"
                        :color="endTimeParts.period === period ? '#1976d2' : undefined"
                        @click="updateTimePart('end', 'period', period)"
                      >
                        {{ period }}
                      </v-btn>
                    </div>
                  </div>
                  <div class="time-picker-actions">
                    <v-btn variant="text" size="small" @click="clearTime('end')">Clear</v-btn>
                    <v-btn variant="text" size="small" @click="endTimeMenu = false">Done</v-btn>
                  </div>
                </v-card-text>
              </v-card>
            </v-menu>
          </v-col>


          <v-col cols="12">
            <div class="toggle-row">
              <div>
                <div class="toggle-title">Recurring Shift</div>
                <div class="toggle-subtitle">Repeat this shift on the same day each week</div>
              </div>
              <v-switch v-model="form.recurring" color="#8B1538" hide-details inset />
            </div>
          </v-col>

          <v-col cols="12">
            <div class="toggle-row">
              <div>
                <div class="toggle-title">Post as Open Shift</div>
                <div class="toggle-subtitle">Allow workers to claim this shift</div>
              </div>
              <v-switch v-model="form.post_as_open" color="#8B1538" hide-details inset />
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

          <v-col cols="12">
            <v-select
              v-model="form.assigned_user_id"
              :items="workerOptions"
              item-title="label"
              item-value="value"
              label="Assign To *"
              variant="outlined"
              :disabled="form.post_as_open || !form.department_id || loadingWorkers"
              clearable
              :no-data-text="loadingWorkers ? 'Loading workers...' : 'No workers available'"
              :messages="form.post_as_open ? 'Disabled when Post as Open Shift is enabled.' : undefined"
              hide-details="auto"
              no-data-text="No workers found — check department member setup"
            />
            <div v-if="workerLoadError" class="assign-error">
              {{ workerLoadError }}
            </div>
          </v-col>

          <v-col cols="12">
            <div class="tasks-section">
              <h3 class="section-title">Tasks</h3>
              <p class="section-subtitle">Add checkpoint tasks for this shift.</p>
              
              <!-- Tasks Section -->
              <div class="tasks-list">
                <div class="tasks-header">
                  <h4 class="tasks-title">Tasks</h4>
                  <v-btn size="small" variant="outlined" @click="addTask">
                    <v-icon start>mdi-plus</v-icon>
                    Add Task
                  </v-btn>
                </div>
                
                <div v-if="form.tasks.length === 0" class="empty-tasks">
                  <p>No tasks added yet. Click "Add Task" to create checkpoint tasks.</p>
                </div>
                
                <div v-for="(task, index) in form.tasks" :key="task.id" class="task-item">
                  <v-icon class="task-icon" color="#667085">mdi-checkbox-blank-circle-outline</v-icon>
                  <v-text-field
                    v-model="task.text"
                    placeholder="Enter checkpoint task..."
                    variant="outlined"
                    hide-details="auto"
                    class="task-input"
                  />
                  <v-btn
                    icon="mdi-delete-outline"
                    size="small"
                    variant="text"
                    color="error"
                    @click="removeTask(index)"
                  />
                </div>
              </div>
              
            </div>
          </v-col>
        </v-row>

        <div class="action-row">
          <v-btn variant="outlined" @click="goBack">Cancel</v-btn>
          <v-btn
            color="#8B1538"
            prepend-icon="mdi-content-save-outline"
            :loading="submitting"
            :disabled="isCreateDisabled"
            @click="submitShift"
          >
            Create Shift
          </v-btn>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import apiClient from "../services/services.js";
import shiftService from "../services/shiftService.js";
import UserRoleServices from "../services/userRoleServices.js";
import Utils from "../config/utils.js";

const router = useRouter();
const currentUser = Utils.getStore("user") || {};
const deptContext = Utils.getStore("currentDepartmentContext") || {};

const positions = ref([]);
const departmentWorkers = ref([]);

const loadingPositions = ref(false);
const loadingWorkers = ref(false);
const workerLoadError = ref("");
const submitting = ref(false);
const errorMessage = ref("");
const startTimeMenu = ref(false);
const endTimeMenu = ref(false);

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
  tasks: [],
});

const startTimeParts = reactive({ hour: "09", minute: "00", period: "AM" });
const endTimeParts = reactive({ hour: "10", minute: "00", period: "AM" });
const hourOptions = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
const minuteOptions = ["00", "30"];
const periodOptions = ["AM", "PM"];

const todayIso = computed(() => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
});

const toItems = (response) => response?.data?.data || response?.data || [];

const toMinutes = (timeValue) => {
  if (!timeValue) return null;
  const [hour, minute] = String(timeValue).split(":").map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
};

const parseTimeToParts = (timeValue) => {
  if (!timeValue) return { hour: "09", minute: "00", period: "AM" };

  const [rawHour, rawMinute] = String(timeValue).split(":");
  const hour24 = Number(rawHour || 0);
  const minute = String(rawMinute || "00").padStart(2, "0");
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;

  return {
    hour: String(hour12).padStart(2, "0"),
    minute,
    period,
  };
};

const partsToTime = (parts) => {
  const hour12 = Number(parts.hour);
  const minute = Number(parts.minute);
  if (Number.isNaN(hour12) || Number.isNaN(minute)) return "";

  let hour24 = hour12 % 12;
  if (parts.period === "PM") {
    hour24 += 12;
  }

  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

const formatTimeDisplay = (timeValue) => {
  if (!timeValue) return "";
  const [rawHour, rawMinute] = String(timeValue).split(":");
  const hour = Number(rawHour || 0);
  const minute = String(rawMinute || "00").padStart(2, "0");
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${minute} ${period}`;
};

const syncTimePartsFromForm = (target, timeValue) => {
  const next = parseTimeToParts(timeValue);
  if (target === "start") {
    startTimeParts.hour = next.hour;
    startTimeParts.minute = next.minute;
    startTimeParts.period = next.period;
    return;
  }

  endTimeParts.hour = next.hour;
  endTimeParts.minute = next.minute;
  endTimeParts.period = next.period;
};

const updateTimePart = (target, part, value) => {
  const parts = target === "start" ? startTimeParts : endTimeParts;
  parts[part] = value;
  const nextTime = partsToTime(parts);

  if (target === "start") {
    form.start_time = nextTime;
    return;
  }

  form.end_time = nextTime;
};

const clearTime = (target) => {
  if (target === "start") {
    form.start_time = "";
    startTimeMenu.value = false;
    return;
  }
  form.end_time = "";
  endTimeMenu.value = false;
};

const workerOptions = computed(() =>
  (departmentWorkers.value || []).map((worker) => ({
    value: worker.userId || worker.id,
    label: `${worker.fName || ""} ${worker.lName || ""}`.trim() || worker.email || "Worker",
  })),
);

const isPastDate = computed(() => !!form.shift_date && form.shift_date < todayIso.value);
const hasRequiredFields = computed(
  () => !!form.department_id && !!form.position_id && !!form.shift_date && !!form.start_time && !!form.end_time,
);
const workersNeededValid = computed(() => Number(form.workers_needed) >= 1 && Number(form.workers_needed) <= 10);

const isCreateDisabled = computed(() => {
  if (!hasRequiredFields.value || isPastDate.value) return true;
  const start = toMinutes(form.start_time);
  const end = toMinutes(form.end_time);
  if (start == null || end == null || end <= start) return true;
  if (form.post_as_open) return !workersNeededValid.value;
  if (!form.assigned_user_id) return true;
  return false;
});

const goBack = () => {
  router.push("/manager/schedule");
};

let taskIdCounter = 0;

const addTask = () => {
  form.tasks.push({
    id: ++taskIdCounter,
    text: "",
  });
};

const removeTask = (index) => {
  form.tasks.splice(index, 1);
};

const loadPositions = async () => {
  const departmentId = deptContext.department_id;
  if (!departmentId) {
    positions.value = [];
    return;
  }

  loadingPositions.value = true;
  try {
    const response = await apiClient.get(`positions?department_id=${departmentId}`);
    positions.value = toItems(response);
  } catch (error) {
    positions.value = [];
    errorMessage.value = error?.response?.data?.message || "Failed to load positions.";
  } finally {
    loadingPositions.value = false;
  }
};

const loadWorkers = async () => {
  const departmentId = deptContext.department_id;
  if (!departmentId) {
    departmentWorkers.value = [];
    return;
  }

  loadingWorkers.value = true;
  workerLoadError.value = "";
  try {
    const response = await UserRoleServices.getAllUsersWithRoles(true);
    const users = toItems(response);
    const departmentMembers = users.filter((user) =>
      (user.userDepartments || []).some(
        (membership) => Number(membership.department_id) === Number(departmentId),
      ),
    );

    const studentMembers = departmentMembers.filter((user) =>
      (user.userDepartments || []).some(
        (membership) =>
          Number(membership.department_id) === Number(departmentId) &&
          String(membership?.role?.role_name || "").toLowerCase().includes("student"),
      ),
    );

    const candidateUsers = studentMembers.length > 0 ? studentMembers : departmentMembers;
    departmentWorkers.value = candidateUsers
      .filter((user) => Number(user.id) !== Number(currentUser.userId || currentUser.id))
      .map((user) => ({
        id: user.id,
        userId: user.id,
        fName: user.fName,
        lName: user.lName,
        email: user.email,
      }));
  } catch (error) {
    departmentWorkers.value = [];
    workerLoadError.value = error?.response?.data?.message || "Service is unavailable. Please try again later.";
  } finally {
    loadingWorkers.value = false;
  }
};

watch(
  () => form.department_id,
  async () => {
    await Promise.all([loadPositions(), loadWorkers()]);
  },
  { immediate: true },
);

watch(
  () => form.start_time,
  (start) => {
    syncTimePartsFromForm("start", start);
    if (!start) {
      form.end_time = "";
      return;
    }
    if (form.end_time && toMinutes(form.end_time) <= toMinutes(start)) {
      form.end_time = "";
    }
  },
);

watch(
  () => form.end_time,
  (end) => {
    syncTimePartsFromForm("end", end);
  },
);

watch(
  () => form.post_as_open,
  (isOpenShift) => {
    if (isOpenShift) {
      form.assigned_user_id = null;
    }
  },
);

const getAssignedWorkerLabel = () => {
  const match = workerOptions.value.find((worker) => String(worker.value) === String(form.assigned_user_id));
  return match?.label || "worker";
};

const submitShift = async () => {
  if (isCreateDisabled.value) return;

  submitting.value = true;
  errorMessage.value = "";
  try {
    const creatorId = currentUser.userId || currentUser.id || null;
    const isOpenShift = form.post_as_open;
    const taskEntries = form.tasks
      .map((task) => String(task.text || "").trim())
      .filter(Boolean);

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
      workers_needed: form.post_as_open ? Number(form.workers_needed) : null,
      trade_status: isOpenShift ? "open" : null,
    };

    const response = await shiftService.createShift(payload);
    const createdShift = response?.data || {};
    const shiftId = createdShift?.shift_id || createdShift?.data?.shift_id;
    let taskSaveFailed = false;

    if (shiftId && taskEntries.length > 0) {
      try {
        await Promise.all(
          taskEntries.map((taskName, index) =>
            apiClient.post("/shift-tasks", {
              shiftId,
              taskName,
              sortOrder: index + 1,
              isRequired: true,
              status: "pending",
            }),
          ),
        );
      } catch (taskError) {
        taskSaveFailed = true;
      }
    }

    const toastMessage = isOpenShift
      ? "Shift Created: posted as open."
      : `Shift Created: assigned to ${getAssignedWorkerLabel()}.${taskSaveFailed ? " Some tasks could not be saved." : ""}`;

    Utils.setStore("managerScheduleToast", { message: toastMessage });
    router.push("/manager/schedule");
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || "Failed to create shift.";
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  loadPositions();
  loadWorkers();
});
</script>

<style scoped>
.create-shift-page {
  padding: 24px;
  max-width: 980px;
}

.header-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 16px;
}

.page-title {
  margin: 0;
  font-size: 40px;
  line-height: 1.05;
  font-weight: 700;
  color: #101828;
}

.page-subtitle {
  margin: 6px 0 0;
  color: #667085;
  font-size: 16px;
}

.form-card {
  border: 1px solid #e3e5e8;
  border-radius: 14px;
}

.card-title {
  margin: 0;
  font-size: 30px;
  color: #101828;
  font-weight: 700;
}

.card-subtitle {
  margin: 8px 0 18px;
  color: #667085;
}

.toggle-row {
  border: 1px solid #e3e5e8;
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.toggle-title {
  font-size: 17px;
  font-weight: 600;
  color: #1f2937;
}

.toggle-subtitle {
  margin-top: 2px;
  color: #667085;
  font-size: 14px;
}

.action-row {
  margin-top: 14px;
  display: flex;
  gap: 10px;
}

.tasks-section {
  border: 1px solid #e3e5e8;
  border-radius: 12px;
  padding: 16px;
  margin-top: 8px;
}

.section-title {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 600;
  color: #101828;
}

.section-subtitle {
  margin: 0 0 16px;
  color: #667085;
  font-size: 14px;
}

.tasks-list {
  margin-bottom: 20px;
}

.tasks-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.tasks-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.empty-tasks {
  padding: 16px;
  text-align: center;
  color: #667085;
  font-size: 14px;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 12px;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.task-icon {
  flex-shrink: 0;
}

.task-input {
  flex: 1;
}

.assign-error {
  margin-top: 6px;
  color: #b42318;
  font-size: 13px;
}

.time-picker-card {
  border: 1px solid #d0d5dd;
}

.time-picker-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  max-height: 280px;
}

.time-picker-col {
  overflow-y: auto;
  max-height: 250px;
}

.time-picker-col-title {
  position: sticky;
  top: 0;
  background: #fff;
  font-size: 12px;
  color: #667085;
  padding-bottom: 6px;
}

.time-picker-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 8px;
}
</style>
