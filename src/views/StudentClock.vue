<template>
  <div class="clock-page">
    <section class="page-header">
      <h1 class="page-title">Clock In/Out</h1>
      <p class="page-subtitle">Clock only for your assigned published shift.</p>
    </section>

    <v-card class="mb-6" elevation="0">
      <v-card-title>Today</v-card-title>
      <v-card-text>
        <div v-if="todayShift">
          <p class="mb-1"><strong>Department:</strong> {{ todayShift.department?.department_name || "-" }}</p>
          <p class="mb-1"><strong>Position:</strong> {{ todayShift.position?.position_name || "-" }}</p>
          <p class="mb-1"><strong>Time:</strong> {{ formatTime(todayShift.start_time) }} - {{ formatTime(todayShift.end_time) }}</p>
          <p class="mb-3">
            <strong>Status:</strong>
            <v-chip size="small" :color="todayShift.shift_status === 'published' ? 'success' : 'warning'" variant="tonal">
              {{ todayShift.shift_status }}
            </v-chip>
          </p>
        </div>
        <div v-else class="text-medium-emphasis">No assigned shift for today.</div>

        <div class="d-flex flex-wrap ga-3 mt-4">
          <v-btn
            color="primary"
            :disabled="!todayShift || hasOpenRecord"
            :loading="clockingIn"
            @click="clockIn"
          >
            Clock In
          </v-btn>
          <v-btn
            color="error"
            variant="tonal"
            :disabled="!hasOpenRecord"
            :loading="clockingOut"
            @click="clockOut"
          >
            Clock Out
          </v-btn>
          <v-btn variant="text" prepend-icon="mdi-refresh" :loading="loading" @click="loadData">
            Refresh
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <v-card elevation="0">
      <v-card-title>Recent Clock Records</v-card-title>
      <v-card-text class="pt-0">
        <v-data-table
          :headers="headers"
          :items="records"
          :loading="loading"
          density="comfortable"
          item-key="clock_id"
        >
          <template #item.shift="{ item }">
            {{ item.shift?.department?.department_name || "-" }} / {{ item.shift?.position?.position_name || "-" }}
          </template>
          <template #item.clock_in="{ item }">
            {{ formatDateTime(item.clock_in) }}
          </template>
          <template #item.clock_out="{ item }">
            {{ item.clock_out ? formatDateTime(item.clock_out) : "Open" }}
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
import shiftService from "../services/shiftService.js";
import clockRecordService from "../services/clockRecordService.js";

const currentUser = Utils.getStore("user") || {};
const userId = currentUser.userId;
const todayISO = new Date().toISOString().slice(0, 10);

const loading = ref(false);
const clockingIn = ref(false);
const clockingOut = ref(false);
const shifts = ref([]);
const records = ref([]);
const openRecord = ref(null);
const snackbar = ref({ show: false, text: "", color: "success" });

const headers = [
  { title: "Shift", key: "shift", sortable: false },
  { title: "Clock In", key: "clock_in" },
  { title: "Clock Out", key: "clock_out" },
];

const notify = (text, color = "success") => {
  snackbar.value = { show: true, text, color };
};

const todayShift = computed(() =>
  (shifts.value || []).find(
    (shift) =>
      shift.shift_date === todayISO &&
      shift.shift_status === "published" &&
      Number(shift.assigned_user_id) === Number(userId),
  ),
);

const hasOpenRecord = computed(() => Boolean(openRecord.value?.clock_id));

const formatTime = (value) => (value ? String(value).slice(0, 5) : "-");

const formatDateTime = (value) => new Date(value).toLocaleString();

const loadOpenRecord = async () => {
  try {
    const response = await clockRecordService.getMyOpenRecord();
    openRecord.value = response.data;
  } catch (error) {
    if (error?.response?.status === 404) {
      openRecord.value = null;
      return;
    }
    throw error;
  }
};

const loadData = async () => {
  if (!userId) {
    notify("Missing logged-in user context.", "error");
    return;
  }

  loading.value = true;
  try {
    const [shiftResponse, recordResponse] = await Promise.all([
      shiftService.listShifts({ assigned_user_id: userId, shift_date: todayISO }),
      clockRecordService.getMyRecords(),
    ]);
    shifts.value = shiftResponse?.data || [];
    records.value = recordResponse?.data || [];
    await loadOpenRecord();
  } catch (error) {
    notify(error?.response?.data?.message || "Failed to load clock data.", "error");
  } finally {
    loading.value = false;
  }
};

const clockIn = async () => {
  if (!todayShift.value) {
    notify("No eligible shift to clock in.", "error");
    return;
  }

  clockingIn.value = true;
  try {
    await clockRecordService.clockIn({
      user_id: userId,
      shift_id: todayShift.value.shift_id,
    });
    notify("Clock-in successful.");
    await loadData();
  } catch (error) {
    notify(error?.response?.data?.message || "Clock-in failed.", "error");
  } finally {
    clockingIn.value = false;
  }
};

const clockOut = async () => {
  if (!openRecord.value?.clock_id) return;

  clockingOut.value = true;
  try {
    await clockRecordService.clockOut(openRecord.value.clock_id);
    notify("Clock-out successful.");
    await loadData();
  } catch (error) {
    notify(error?.response?.data?.message || "Clock-out failed.", "error");
  } finally {
    clockingOut.value = false;
  }
};

onMounted(loadData);
</script>

<style scoped>
.clock-page {
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

