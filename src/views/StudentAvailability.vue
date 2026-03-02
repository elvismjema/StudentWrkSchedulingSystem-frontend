<template>
  <div class="availability-page">
    <section class="page-header">
      <h1 class="page-title">Availability</h1>
      <p class="page-subtitle">Set the times you are available to work.</p>
    </section>

    <v-card class="mb-6" elevation="0">
      <v-card-title>{{ editingId ? "Edit Availability" : "Add Availability" }}</v-card-title>
      <v-card-text>
        <v-form ref="formRef" v-model="formValid">
          <v-row>
            <v-col cols="12" md="3">
              <v-select
                v-model="form.dayOfWeek"
                :items="dayOptions"
                item-title="label"
                item-value="value"
                label="Day"
                variant="outlined"
                density="comfortable"
                :rules="[requiredRule]"
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field
                v-model="form.startTime"
                type="time"
                label="Start Time"
                variant="outlined"
                density="comfortable"
                :rules="[requiredRule]"
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field
                v-model="form.endTime"
                type="time"
                label="End Time"
                variant="outlined"
                density="comfortable"
                :rules="[requiredRule]"
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-select
                v-model="form.availabilityType"
                :items="availabilityTypes"
                label="Type"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.specificDate"
                type="date"
                label="Specific Date (optional)"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="12" md="6" class="d-flex align-center">
              <v-checkbox
                v-model="form.isRecurring"
                label="Recurring"
                hide-details
                class="mt-0"
              />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn v-if="editingId" variant="text" @click="resetForm">Cancel</v-btn>
        <v-btn color="primary" :loading="saving" @click="submitForm">
          {{ editingId ? "Update" : "Save" }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-card elevation="0">
      <v-card-title class="d-flex align-center">
        My Availability
        <v-spacer />
        <v-btn variant="text" prepend-icon="mdi-refresh" :loading="loading" @click="loadAvailabilities">
          Refresh
        </v-btn>
      </v-card-title>
      <v-card-text class="pt-0">
        <v-data-table
          :headers="headers"
          :items="rows"
          :loading="loading"
          density="comfortable"
          item-key="id"
        >
          <template #item.dayOfWeek="{ item }">
            {{ dayLabel(item.dayOfWeek) }}
          </template>
          <template #item.timeRange="{ item }">
            {{ formatTime(item.startTime) }} - {{ formatTime(item.endTime) }}
          </template>
          <template #item.requestStatus="{ item }">
            <v-chip size="small" :color="statusColor(item.requestStatus)" variant="tonal">
              {{ item.requestStatus }}
            </v-chip>
          </template>
          <template #item.actions="{ item }">
            <v-btn size="small" variant="text" icon="mdi-pencil" @click="startEdit(item)" />
            <v-btn size="small" variant="text" icon="mdi-delete" color="error" @click="removeRow(item)" />
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3500">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import Utils from "../config/utils.js";
import availabilityService from "../services/availabilityService.js";

const currentUser = Utils.getStore("user") || {};
const userId = currentUser.userId;

const loading = ref(false);
const saving = ref(false);
const formRef = ref(null);
const formValid = ref(false);
const editingId = ref(null);
const list = ref([]);
const snackbar = ref({ show: false, text: "", color: "success" });

const dayOptions = [
  { label: "Sunday", value: 0 },
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
];

const availabilityTypes = ["available", "preferred", "unavailable", "time_off"];

const headers = [
  { title: "Day", key: "dayOfWeek" },
  { title: "Time", key: "timeRange", sortable: false },
  { title: "Type", key: "availabilityType" },
  { title: "Status", key: "requestStatus" },
  { title: "Date", key: "specificDate" },
  { title: "Actions", key: "actions", sortable: false },
];

const form = ref({
  dayOfWeek: null,
  startTime: "",
  endTime: "",
  availabilityType: "available",
  specificDate: "",
  isRecurring: true,
});

const requiredRule = (v) => (v !== null && v !== undefined && v !== "" ? true : "Required");

const rows = computed(() => list.value || []);

const notify = (text, color = "success") => {
  snackbar.value = { show: true, text, color };
};

const dayLabel = (day) => dayOptions.find((item) => item.value === day)?.label || "-";

const formatTime = (value) => {
  if (!value) return "-";
  const [hour, minute] = String(value).split(":");
  return `${hour}:${minute}`;
};

const statusColor = (status) => {
  if (status === "approved") return "success";
  if (status === "rejected") return "error";
  return "warning";
};

const resetForm = () => {
  editingId.value = null;
  form.value = {
    dayOfWeek: null,
    startTime: "",
    endTime: "",
    availabilityType: "available",
    specificDate: "",
    isRecurring: true,
  };
};

const loadAvailabilities = async () => {
  if (!userId) {
    notify("Missing logged-in user context.", "error");
    return;
  }

  loading.value = true;
  try {
    const response = await availabilityService.listForUser(userId);
    list.value = response.data || [];
  } catch (error) {
    notify(error?.response?.data?.message || "Failed to load availability.", "error");
  } finally {
    loading.value = false;
  }
};

const submitForm = async () => {
  const valid = await formRef.value?.validate();
  if (!valid?.valid) return;

  saving.value = true;
  try {
    const payload = {
      userId,
      dayOfWeek: form.value.dayOfWeek,
      startTime: form.value.startTime,
      endTime: form.value.endTime,
      availabilityType: form.value.availabilityType,
      specificDate: form.value.specificDate || null,
      isRecurring: form.value.isRecurring,
    };

    if (editingId.value) {
      await availabilityService.update(editingId.value, payload);
      notify("Availability updated.");
    } else {
      await availabilityService.create(payload);
      notify("Availability created.");
    }

    resetForm();
    await loadAvailabilities();
  } catch (error) {
    notify(error?.response?.data?.message || "Failed to save availability.", "error");
  } finally {
    saving.value = false;
  }
};

const startEdit = (item) => {
  editingId.value = item.id;
  form.value = {
    dayOfWeek: item.dayOfWeek,
    startTime: formatTime(item.startTime),
    endTime: formatTime(item.endTime),
    availabilityType: item.availabilityType || "available",
    specificDate: item.specificDate || "",
    isRecurring: Boolean(item.isRecurring),
  };
};

const removeRow = async (item) => {
  try {
    await availabilityService.remove(item.id);
    notify("Availability removed.");
    await loadAvailabilities();
  } catch (error) {
    notify(error?.response?.data?.message || "Failed to remove availability.", "error");
  }
};

onMounted(loadAvailabilities);
</script>

<style scoped>
.availability-page {
  padding: 24px;
}

.page-header {
  margin-bottom: 16px;
}

.page-title {
  margin: 0;
}

.page-subtitle {
  margin-top: 6px;
  color: #667085;
}
</style>

