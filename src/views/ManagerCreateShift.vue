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

          <v-col v-else cols="12">
            <v-select
              v-model="form.assigned_user_id"
              :items="workerOptions"
              item-title="label"
              item-value="value"
              label="Assign To"
              variant="outlined"
              :disabled="!form.department_id || loadingWorkers"
              :loading="loadingWorkers"
              clearable
              hide-details="auto"
              no-data-text="No workers found — check department member setup"
            />
          </v-col>

          <v-col cols="12">
            <div class="tasks-section">
              <h3 class="section-title">Tasks & Notes</h3>
              <p class="section-subtitle">Add tasks for this shift and any additional notes</p>
              
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
                  <p>No tasks added yet. Click "Add Task" to create tasks for this shift.</p>
                </div>
                
                <div v-for="(task, index) in form.tasks" :key="task.id" class="task-item">
                  <v-checkbox
                    v-model="task.completed"
                    hide-details
                    density="compact"
                    class="task-checkbox"
                  />
                  <v-text-field
                    v-model="task.text"
                    placeholder="Enter task description..."
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
              
              <!-- Notes Section -->
              <div class="notes-section">
                <h4 class="notes-title">Additional Notes</h4>
                <v-textarea
                  v-model="form.notes"
                  label="Notes"
                  variant="outlined"
                  rows="3"
                  auto-grow
                  placeholder="Any special instructions or additional information..."
                  hide-details="auto"
                />
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
import Utils from "../config/utils.js";

const router = useRouter();
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
  tasks: [],
  notes: "",
});

const todayIso = computed(() => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
});

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

const isPastDate = computed(() => !!form.shift_date && form.shift_date < todayIso.value);
const hasRequiredFields = computed(
  () => !!form.department_id && !!form.position_id && !!form.shift_date && !!form.start_time && !!form.end_time,
);
const workersNeededValid = computed(() => Number(form.workers_needed) >= 1 && Number(form.workers_needed) <= 10);

const isCreateDisabled = computed(() => {
  if (!hasRequiredFields.value || isPastDate.value) return true;
  if (form.end_time <= form.start_time) return true;
  if (form.post_as_open) return !workersNeededValid.value;
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
    completed: false,
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
  try {
    // Primary: admin endpoint with all users + role info
    const response = await apiClient.get("user-departments/admin/users-with-roles?activeOnly=true");
    const users = toItems(response);
    const targetDeptId = Number(departmentId);

    const workers = [];
    for (const u of users) {
      const memberships = Array.isArray(u?.userDepartments) ? u.userDepartments
        : Array.isArray(u?.departments) ? u.departments
        : [];
      const deptMembership = memberships.find((m) => {
        const dId = Number(m?.department_id ?? m?.department?.department_id ?? m?.departmentId ?? 0);
        return dId === targetDeptId;
      });
      if (!deptMembership) continue;
      if (deptMembership?.is_active === false) continue;

      const roleName = String(deptMembership?.role?.role_name || deptMembership?.role_name || "").toLowerCase();
      const permLevel = Number(deptMembership?.role?.permission_level ?? deptMembership?.permission_level ?? 0);
      if (!(roleName.includes("student") || permLevel < 50)) continue;

      const userId = u?.userId || u?.id || u?.user_id;
      if (!userId) continue;
      workers.push({ userId, id: userId, fName: u?.fName || "", lName: u?.lName || "", email: u?.email || "" });
    }

    if (workers.length > 0) {
      departmentWorkers.value = workers;
      return;
    }

    // Fallback: department-scoped member list
    const membersRes = await apiClient.get(`admin/departments/${departmentId}/members`);
    const members = toItems(membersRes);
    departmentWorkers.value = members
      .filter((m) => {
        const rn = String(m?.role?.role_name || m?.role_name || "").toLowerCase();
        const pl = Number(m?.role?.permission_level ?? m?.permission_level ?? 0);
        return rn.includes("student") || pl < 50;
      })
      .map((m) => m.user || m)
      .filter((w) => w && (w.userId || w.id));
  } catch (error) {
    departmentWorkers.value = [];
    errorMessage.value = error?.response?.data?.message || "Failed to load workers.";
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
    if (!start) {
      form.end_time = "";
      return;
    }
    if (form.end_time && form.end_time <= start) {
      form.end_time = "";
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
    const isOpenShift = form.post_as_open || !form.assigned_user_id;

    const tasksData = {
      tasks: form.tasks.filter(task => task.text.trim()),
      notes: form.notes?.trim() || null,
    };

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
      tasks_notes: JSON.stringify(tasksData),
      workers_needed: form.post_as_open ? Number(form.workers_needed) : null,
      trade_status: isOpenShift ? "open" : null,
    };

    await shiftService.createShift(payload);

    const toastMessage = isOpenShift
      ? "Shift Created: posted as open."
      : `Shift Created: assigned to ${getAssignedWorkerLabel()}.`;

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

.task-checkbox {
  flex-shrink: 0;
}

.task-input {
  flex: 1;
}

.notes-section {
  border-top: 1px solid #e3e5e8;
  padding-top: 16px;
}

.notes-title {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}
</style>
