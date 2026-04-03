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
              v-model="form.department_id"
              :items="managedDepartments"
              item-title="department_name"
              item-value="department_id"
              label="Department"
              variant="outlined"
              :loading="loadingDepartments"
              :disabled="loadingDepartments"
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
              :disabled="!form.department_id || loadingPositions"
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
            <v-text-field
              v-model="form.location"
              label="Location"
              variant="outlined"
              placeholder="e.g., The Brew - Main Campus"
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
              placeholder="Any special instructions..."
              hide-details="auto"
            />
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

const managedDepartments = ref([]);
const positions = ref([]);
const departmentWorkers = ref([]);

const loadingDepartments = ref(false);
const loadingPositions = ref(false);
const loadingWorkers = ref(false);
const submitting = ref(false);
const errorMessage = ref("");

const form = reactive({
  department_id: null,
  position_id: null,
  shift_date: "",
  start_time: "",
  end_time: "",
  location: "",
  recurring: false,
  post_as_open: false,
  workers_needed: 1,
  assigned_user_id: null,
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

const loadDepartments = async () => {
  loadingDepartments.value = true;
  errorMessage.value = "";
  try {
    const userId = currentUser.userId || currentUser.id;
    const membersResponse = userId ? await apiClient.get(`/user-departments/user/${userId}`) : null;
    const memberships = Array.isArray(toItems(membersResponse)) ? toItems(membersResponse) : [];

    const map = new Map();
    memberships.forEach((membership) => {
      const isActive = membership.is_active || String(membership.request_status || "").toLowerCase() === "approved";
      const department = membership.department || {};
      const departmentId = membership.department_id || department.department_id;
      const departmentName = department.department_name || membership.department_name;
      if (!isActive || !departmentId || !departmentName) return;
      if (!map.has(Number(departmentId))) {
        map.set(Number(departmentId), {
          department_id: Number(departmentId),
          department_name: departmentName,
        });
      }
    });

    if (map.size === 0 && deptContext.department_id && deptContext.department_name) {
      map.set(Number(deptContext.department_id), {
        department_id: Number(deptContext.department_id),
        department_name: deptContext.department_name,
      });
    }

    managedDepartments.value = Array.from(map.values());

    if (managedDepartments.value.length === 1) {
      form.department_id = managedDepartments.value[0].department_id;
    } else if (deptContext.department_id && map.has(Number(deptContext.department_id))) {
      form.department_id = Number(deptContext.department_id);
    }
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || "Failed to load departments.";
  } finally {
    loadingDepartments.value = false;
  }
};

const loadPositions = async (departmentId) => {
  if (!departmentId) {
    positions.value = [];
    return;
  }

  loadingPositions.value = true;
  try {
    const response = await apiClient.get(`/positions?department_id=${departmentId}`);
    positions.value = toItems(response);
  } catch (error) {
    positions.value = [];
    errorMessage.value = error?.response?.data?.message || "Failed to load positions.";
  } finally {
    loadingPositions.value = false;
  }
};

const loadWorkers = async (departmentId) => {
  if (!departmentId) {
    departmentWorkers.value = [];
    return;
  }

  loadingWorkers.value = true;
  try {
    const response = await apiClient.get(`/user-departments?departmentId=${departmentId}&status=approved`);
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
  () => form.department_id,
  async (nextDepartmentId, previousDepartmentId) => {
    if (nextDepartmentId === previousDepartmentId) return;
    form.position_id = null;
    form.assigned_user_id = null;
    await Promise.all([loadPositions(nextDepartmentId), loadWorkers(nextDepartmentId)]);
  },
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
      location: form.location?.trim() || null,
      notes: form.notes?.trim() || null,
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

onMounted(loadDepartments);
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

@media (max-width: 768px) {
  .create-shift-page {
    padding: 16px;
  }

  .page-title {
    font-size: 34px;
  }
}
</style>
