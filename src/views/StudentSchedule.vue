<template>
  <div class="schedule-page">
    <section class="page-header">
      <h1 class="page-title">My Schedule</h1>
      <p class="page-subtitle">Published and assigned shifts</p>
    </section>

    <v-card elevation="0">
      <v-card-title class="d-flex align-center">
        Shifts
        <v-spacer />
        <v-btn variant="text" prepend-icon="mdi-refresh" :loading="loading" @click="loadData">
          Refresh
        </v-btn>
      </v-card-title>
      <v-card-text class="pt-0">
        <v-data-table
          :headers="headers"
          :items="rows"
          :loading="loading"
          item-key="shift_id"
          density="comfortable"
        >
          <template #item.shift_date="{ item }">
            {{ formatDate(item.shift_date) }}
          </template>
          <template #item.time="{ item }">
            {{ formatTime(item.start_time) }} - {{ formatTime(item.end_time) }}
          </template>
          <template #item.department="{ item }">
            {{ item.department?.department_name || "-" }}
          </template>
          <template #item.position="{ item }">
            {{ item.position?.position_name || "-" }}
          </template>
          <template #item.shift_status="{ item }">
            <v-chip size="small" :color="statusColor(item.shift_status)" variant="tonal">
              {{ item.shift_status }}
            </v-chip>
          </template>
          <template #item.acknowledgement="{ item }">
            <v-chip
              size="small"
              :color="isAcknowledged(item) ? 'success' : 'warning'"
              variant="tonal"
            >
              {{ isAcknowledged(item) ? "Acknowledged" : "Pending" }}
            </v-chip>
          </template>
          <template #item.actions="{ item }">
            <v-btn
              v-if="!isAcknowledged(item)"
              size="small"
              color="primary"
              :loading="acknowledgingId === item.shift_id"
              @click="acknowledge(item)"
            >
              Acknowledge
            </v-btn>
            <span v-else class="text-medium-emphasis">Done</span>
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
import shiftAcknowledgementService from "../services/shiftAcknowledgementService.js";

const currentUser = Utils.getStore("user") || {};
const userId = currentUser.userId;

const loading = ref(false);
const acknowledgingId = ref(null);
const shifts = ref([]);
const acknowledgements = ref([]);
const snackbar = ref({ show: false, text: "", color: "success" });

const headers = [
  { title: "Date", key: "shift_date" },
  { title: "Time", key: "time", sortable: false },
  { title: "Department", key: "department", sortable: false },
  { title: "Position", key: "position", sortable: false },
  { title: "Status", key: "shift_status" },
  { title: "Acknowledgement", key: "acknowledgement", sortable: false },
  { title: "Actions", key: "actions", sortable: false },
];

const notify = (text, color = "success") => {
  snackbar.value = { show: true, text, color };
};

const ackByShiftId = computed(() => {
  const map = new Map();
  for (const item of acknowledgements.value) {
    if (item.shiftId) {
      map.set(Number(item.shiftId), item);
    }
  }
  return map;
});

const rows = computed(() =>
  (shifts.value || [])
    .filter((shift) => shift.shift_status !== "cancelled")
    .sort((a, b) => {
      const aDate = new Date(`${a.shift_date || "2100-01-01"}T${a.start_time || "00:00:00"}`);
      const bDate = new Date(`${b.shift_date || "2100-01-01"}T${b.start_time || "00:00:00"}`);
      return aDate - bDate;
    }),
);

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString();
};

const formatTime = (value) => (value ? String(value).slice(0, 5) : "-");

const statusColor = (status) => {
  if (status === "published") return "success";
  if (status === "changed") return "warning";
  if (status === "cancelled") return "error";
  return "grey";
};

const isAcknowledged = (shift) => {
  const ack = ackByShiftId.value.get(Number(shift.shift_id));
  return Boolean(ack?.acknowledged);
};

const loadData = async () => {
  if (!userId) {
    notify("Missing logged-in user context.", "error");
    return;
  }

  loading.value = true;
  try {
    const [shiftResponse, ackResponse] = await Promise.all([
      shiftService.listShifts({ assigned_user_id: userId }),
      shiftAcknowledgementService.listForUser(userId),
    ]);
    shifts.value = shiftResponse?.data || [];
    acknowledgements.value = ackResponse?.data || [];
  } catch (error) {
    notify(error?.response?.data?.message || "Failed to load schedule.", "error");
  } finally {
    loading.value = false;
  }
};

const acknowledge = async (shift) => {
  const ack = ackByShiftId.value.get(Number(shift.shift_id));
  if (!ack?.id) {
    notify("No acknowledgement record found for this shift.", "error");
    return;
  }

  acknowledgingId.value = shift.shift_id;
  try {
    await shiftAcknowledgementService.acknowledge(ack.id);
    notify("Shift acknowledged.");
    await loadData();
  } catch (error) {
    notify(error?.response?.data?.message || "Failed to acknowledge shift.", "error");
  } finally {
    acknowledgingId.value = null;
  }
};

onMounted(loadData);
</script>

<style scoped>
.schedule-page {
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

