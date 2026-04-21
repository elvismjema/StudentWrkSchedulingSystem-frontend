<template>
  <div class="time-pay-page">
    <section class="page-header">
      <div>
        <h1 class="page-title">Time &amp; Pay</h1>
        <p class="page-subtitle">
          Review worker hours, approve timecards, and track payroll for the current pay period.
        </p>
      </div>

      <div class="period-nav">
        <v-select
          v-model="periodType"
          :items="periodTypeOptions"
          item-title="label"
          item-value="value"
          label="Period Type"
          variant="outlined"
          density="comfortable"
          hide-details
          class="period-type-field"
        />
        <v-btn icon variant="outlined" :disabled="false" @click="goToPreviousPeriod">
          <v-icon>mdi-chevron-left</v-icon>
        </v-btn>
        <v-btn variant="outlined" class="period-label" :ripple="false">
          {{ periodLabel }}
        </v-btn>
        <v-btn icon variant="outlined" :disabled="!canGoForward" @click="goToNextPeriod">
          <v-icon>mdi-chevron-right</v-icon>
        </v-btn>
      </div>
    </section>

    <v-alert
      v-if="showPayrollDueBanner"
      type="warning"
      variant="tonal"
      class="mb-4"
      border="start"
    >
      <div class="d-flex align-center justify-space-between flex-wrap gap-2">
        <div>
          <div class="font-weight-medium">
            Payroll closes in {{ payrollDaysLeft }} day{{ payrollDaysLeft === 1 ? "" : "s" }}
          </div>
          <div class="text-body-2">
            {{ pendingCount }} pending timecard{{ pendingCount === 1 ? "" : "s" }} for this period.
          </div>
        </div>
        <v-btn
          color="primary"
          variant="flat"
          prepend-icon="mdi-check-all"
          :disabled="pendingCount === 0 || approvingAll"
          :loading="approvingAll"
          @click="confirmAction({
            title: 'Approve All Pending Timecards',
            message: `Approve ${pendingCount} time entr${pendingCount === 1 ? 'y' : 'ies'}?`,
            confirmLabel: 'Approve All',
            confirmColor: 'success',
            action: approveAllPending,
          })"
        >
          Approve All
        </v-btn>
      </div>
    </v-alert>

    <v-card class="filters-card mb-4" elevation="0">
      <v-card-text class="d-flex flex-wrap gap-3">
        <v-text-field
          v-model="searchQuery"
          prepend-inner-icon="mdi-magnify"
          label="Search workers..."
          variant="outlined"
          density="comfortable"
          hide-details
          class="search-field"
        />

        <v-select
          v-model="statusFilter"
          :items="statusOptions"
          item-title="label"
          item-value="value"
          label="Status"
          variant="outlined"
          density="comfortable"
          hide-details
          class="status-field"
        />

        <v-btn
          variant="outlined"
          prepend-icon="mdi-download"
          class="csv-btn"
          @click="exportCsv"
        >
          Export CSV
        </v-btn>
      </v-card-text>
    </v-card>

    <v-card class="table-card" elevation="0">
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Worker Timecards</span>
        <span class="text-caption text-medium-emphasis">{{ rows.length }} worker{{ rows.length === 1 ? "" : "s" }}</span>
      </v-card-title>

      <v-divider />

      <v-progress-linear v-if="loading" indeterminate color="primary" />

      <v-table class="timecard-table" fixed-header>
        <thead>
          <tr>
            <th>Worker</th>
            <th>Reg Hours</th>
            <th>OT Hours</th>
            <th>Total Hours</th>
            <th>Est. Pay</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!loading && rows.length === 0">
            <td colspan="7" class="empty-row">No worker timecards found for this period.</td>
          </tr>
          <tr
            v-for="row in rows"
            :key="`${row.user_id}-${row.department_id}`"
            class="table-row"
            @click="openDetail(row)"
          >
            <td>
              <div class="worker-cell">
                <v-avatar size="38" color="brandPrimaryLt">
                  <span class="avatar-initials">{{ getInitials(row.worker) }}</span>
                </v-avatar>
                <div>
                  <div v-if="workerLabel(row.worker).deleted" class="worker-name worker-name--deleted">
                    <v-tooltip
                      text="This time record belongs to a user that was removed from the system. It is kept for payroll integrity."
                      location="top"
                    >
                      <template #activator="{ props: tooltipProps }">
                        <span v-bind="tooltipProps" class="deleted-label">Deleted user</span>
                      </template>
                    </v-tooltip>
                    <v-chip
                      color="error"
                      size="x-small"
                      variant="tonal"
                      class="ml-1"
                    >
                      Deleted
                    </v-chip>
                  </div>
                  <div v-else class="worker-name">{{ workerLabel(row.worker).name }}</div>
                  <div class="worker-email">{{ workerLabel(row.worker).email }}</div>
                </div>
              </div>
            </td>
            <td>{{ formatHours(row.regular_hours) }}</td>
            <td>{{ formatHours(row.overtime_hours) }}</td>
            <td class="font-weight-bold">{{ formatHours(row.total_hours) }}</td>
            <td>{{ formatMoney(row.estimated_pay) }}</td>
            <td>
              <v-chip :color="statusColor(row.status)" size="small" variant="tonal">
                {{ capitalize(row.status) }}
              </v-chip>
            </td>
            <td>
              <div class="d-flex align-center gap-2" @click.stop>
                <v-btn
                  size="small"
                  icon
                  variant="text"
                  color="success"
                  :disabled="updatingStatusKey === statusKey(row, 'approved')"
                  @click="confirmAction({
                    title: 'Approve Timecard',
                    message: `Approve ${workerLabel(row.worker).deleted ? 'this' : workerLabel(row.worker).name + '\u2019s'} time entry for ${periodLabel}?`,
                    confirmLabel: 'Approve',
                    confirmColor: 'success',
                    action: () => setStatus(row, 'approved'),
                  })"
                >
                  <v-icon>mdi-check</v-icon>
                </v-btn>
                <v-btn
                  size="small"
                  icon
                  variant="text"
                  color="error"
                  :disabled="updatingStatusKey === statusKey(row, 'rejected')"
                  @click="confirmAction({
                    title: 'Reject Timecard',
                    message: `Reject ${workerLabel(row.worker).deleted ? 'this' : workerLabel(row.worker).name + '\u2019s'} time entry for ${periodLabel}?`,
                    confirmLabel: 'Reject',
                    confirmColor: 'error',
                    action: () => setStatus(row, 'rejected'),
                  })"
                >
                  <v-icon>mdi-close</v-icon>
                </v-btn>
                <v-btn
                  v-if="row.status !== 'pending'"
                  size="small"
                  icon
                  variant="text"
                  color="primary"
                  :disabled="updatingStatusKey === statusKey(row, 'pending')"
                  @click="confirmAction({
                    title: 'Reset to Pending',
                    message: `Reset ${workerLabel(row.worker).deleted ? 'this' : workerLabel(row.worker).name + '\u2019s'} time entry to pending for ${periodLabel}?`,
                    confirmLabel: 'Reset',
                    confirmColor: 'primary',
                    action: () => setStatus(row, 'pending'),
                  })"
                >
                  <v-icon>mdi-restore</v-icon>
                </v-btn>
              </div>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <v-dialog v-model="detailDialog" max-width="980">
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <div>
            <template v-if="workerLabel(selectedRow?.worker).deleted">
              <span class="deleted-label">Deleted user</span>
              <v-chip color="error" size="x-small" variant="tonal" class="ml-1">Deleted</v-chip>
            </template>
            <template v-else>
              {{ selectedRow?.worker?.fName }} {{ selectedRow?.worker?.lName }}
            </template>
            <div class="text-caption text-medium-emphasis">{{ selectedRow?.worker?.email }}</div>
          </div>
          <v-btn icon variant="text" @click="detailDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-divider />

        <v-tabs v-model="detailTab" color="primary" class="px-4 pt-2">
          <v-tab value="punch-log">Punch Log</v-tab>
          <v-tab value="exceptions">Exceptions</v-tab>
          <v-tab value="summary">Summary</v-tab>
        </v-tabs>

        <v-divider />

        <v-card-text>
          <v-progress-linear v-if="detailLoading" indeterminate color="primary" class="mb-3" />

          <v-window v-model="detailTab">
            <v-window-item value="punch-log">
              <v-table density="comfortable">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Clock In</th>
                    <th>Clock Out</th>
                    <th>Hours</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="detailPunchLog.length === 0">
                    <td colspan="5" class="empty-row">No punch log records for this period.</td>
                  </tr>
                  <tr v-for="row in detailPunchLog" :key="row.clock_id">
                    <td>{{ formatDate(row.shift_date || row.clock_in) }}</td>
                    <td>{{ formatDateTime(row.clock_in) }}</td>
                    <td>{{ row.clock_out ? formatDateTime(row.clock_out) : "Missing" }}</td>
                    <td>{{ formatHours(row.worked_hours) }}</td>
                    <td>
                      <v-chip size="small" :color="punchStatusColor(row.status)" variant="tonal">
                        {{ punchStatusLabel(row) }}
                      </v-chip>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </v-window-item>

            <v-window-item value="exceptions">
              <div v-if="detailExceptions.length === 0" class="empty-exception">
                <v-icon color="success" class="mr-2">mdi-check-circle</v-icon>
                No exceptions for this worker in the selected period.
              </div>
              <v-list v-else density="comfortable">
                <v-list-item v-for="(exception, idx) in detailExceptions" :key="`${exception.type}-${idx}`">
                  <template #prepend>
                    <v-icon :color="exceptionIconColor(exception.severity)">
                      {{ exceptionIcon(exception.type) }}
                    </v-icon>
                  </template>
                  <v-list-item-title>{{ exception.message }}</v-list-item-title>
                  <v-list-item-subtitle>{{ formatDate(exception.date) }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-window-item>

            <v-window-item value="summary">
              <v-row>
                <v-col cols="12" sm="6" md="3">
                  <v-card variant="outlined">
                    <v-card-text>
                      <div class="stat-label">Regular Hours</div>
                      <div class="stat-value">{{ formatHours(detailSummary.regular_hours) }}</div>
                    </v-card-text>
                  </v-card>
                </v-col>
                <v-col cols="12" sm="6" md="3">
                  <v-card variant="outlined">
                    <v-card-text>
                      <div class="stat-label">Overtime Hours</div>
                      <div class="stat-value">{{ formatHours(detailSummary.overtime_hours) }}</div>
                    </v-card-text>
                  </v-card>
                </v-col>
                <v-col cols="12" sm="6" md="3">
                  <v-card variant="outlined">
                    <v-card-text>
                      <div class="stat-label">Total Hours</div>
                      <div class="stat-value">{{ formatHours(detailSummary.total_hours) }}</div>
                    </v-card-text>
                  </v-card>
                </v-col>
                <v-col cols="12" sm="6" md="3">
                  <v-card variant="outlined">
                    <v-card-text>
                      <div class="stat-label">Estimated Pay</div>
                      <div class="stat-value">{{ formatMoney(detailSummary.estimated_pay) }}</div>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>

              <div class="d-flex gap-2 mt-4">
                <v-btn
                  color="success"
                  variant="tonal"
                  @click="confirmAction({
                    title: 'Approve Timecard',
                    message: `Approve ${workerLabel(selectedRow?.worker).deleted ? 'this' : workerLabel(selectedRow?.worker).name + '\u2019s'} time entry for ${periodLabel}?`,
                    confirmLabel: 'Approve',
                    confirmColor: 'success',
                    action: () => setStatus(selectedRow, 'approved', true),
                  })"
                >Approve</v-btn>
                <v-btn
                  color="error"
                  variant="tonal"
                  @click="confirmAction({
                    title: 'Reject Timecard',
                    message: `Reject ${workerLabel(selectedRow?.worker).deleted ? 'this' : workerLabel(selectedRow?.worker).name + '\u2019s'} time entry for ${periodLabel}?`,
                    confirmLabel: 'Reject',
                    confirmColor: 'error',
                    action: () => setStatus(selectedRow, 'rejected', true),
                  })"
                >Reject</v-btn>
                <v-btn
                  v-if="selectedRow?.status !== 'pending'"
                  color="primary"
                  variant="text"
                  @click="confirmAction({
                    title: 'Reset to Pending',
                    message: `Reset ${workerLabel(selectedRow?.worker).deleted ? 'this' : workerLabel(selectedRow?.worker).name + '\u2019s'} time entry to pending for ${periodLabel}?`,
                    confirmLabel: 'Reset',
                    confirmColor: 'primary',
                    action: () => setStatus(selectedRow, 'pending', true),
                  })"
                >
                  Reset to Pending
                </v-btn>
              </div>
            </v-window-item>
          </v-window>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Confirmation dialog — driven by confirmAction() helper -->
    <v-dialog v-model="dialogOpen" max-width="440" persistent>
      <v-card>
        <v-card-title class="text-h6">{{ pendingAction.title }}</v-card-title>
        <v-card-text>{{ pendingAction.message }}</v-card-text>
        <v-card-actions class="justify-end gap-2 pa-4">
          <v-btn variant="text" @click="dialogOpen = false">Cancel</v-btn>
          <v-btn
            :color="pendingAction.confirmColor"
            variant="flat"
            @click="runPendingAction"
          >
            {{ pendingAction.confirmLabel }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.open" :color="snackbar.color" timeout="2500">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import timePayService from "../services/timePayService.js";
import { TZ, localDateStr } from "../utils/tz.js";

const HOURLY_RATE = 10; // TODO: replace with per-worker rate from API — see follow-up issue
const ANCHOR_DATE = new Date("2026-03-30T00:00:00");

const rows = ref([]);
const loading = ref(false);
const approvingAll = ref(false);
const updatingStatusKey = ref("");
const searchQuery = ref("");
const statusFilter = ref("all");
const periodType = ref("biweekly");
const periodOffset = ref(0);

const detailDialog = ref(false);
const detailLoading = ref(false);
const detailTab = ref("punch-log");
const selectedRow = ref(null);
const detailPunchLog = ref([]);
const detailExceptions = ref([]);
const detailSummary = reactive({
  regular_hours: 0,
  overtime_hours: 0,
  total_hours: 0,
  estimated_pay: 0,
});

const snackbar = reactive({
  open: false,
  message: "",
  color: "success",
});

// --- Confirmation dialog state ---
const dialogOpen = ref(false);
const pendingAction = reactive({
  title: "",
  message: "",
  confirmLabel: "Confirm",
  confirmColor: "primary",
  action: null,
});

/**
 * Open the confirmation dialog. Pass an `action` callback that will be invoked
 * only when the user clicks the confirm button.
 */
const confirmAction = ({ title, message, confirmLabel, confirmColor, action }) => {
  pendingAction.title = title;
  pendingAction.message = message;
  pendingAction.confirmLabel = confirmLabel || "Confirm";
  pendingAction.confirmColor = confirmColor || "primary";
  pendingAction.action = action;
  dialogOpen.value = true;
};

const runPendingAction = () => {
  dialogOpen.value = false;
  if (typeof pendingAction.action === "function") {
    pendingAction.action();
  }
};

/**
 * Return a normalised worker descriptor from a possibly-null worker object.
 * When the worker record is missing (deleted user), `deleted` is true and
 * `name` / `email` carry sentinel display values.
 */
const workerLabel = (worker) => {
  if (!worker || (!worker.fName && !worker.lName && !worker.email)) {
    return { name: "Deleted user", email: "", deleted: true };
  }
  return {
    name: `${worker.fName || ""} ${worker.lName || ""}`.trim() || "Deleted user",
    email: worker.email || "",
    deleted: false,
  };
};

const statusOptions = [
  { label: "All Statuses", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];
const periodTypeOptions = [
  { label: "Biweekly (14 days)", value: "biweekly" },
  { label: "Weekly (7 days)", value: "weekly" },
];
const periodLengthDays = computed(() => (periodType.value === "weekly" ? 7 : 14));

const todayStart = computed(() => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
});

const currentPeriodStart = computed(() => {
  const daysSinceAnchor = Math.floor((todayStart.value - ANCHOR_DATE) / 86400000);
  const periodIndex = Math.floor(daysSinceAnchor / periodLengthDays.value);
  const normalizedIndex = Number.isFinite(periodIndex) ? Math.max(periodIndex, 0) : 0;
  return addDays(ANCHOR_DATE, normalizedIndex * periodLengthDays.value);
});

const periodStart = computed(() => addDays(currentPeriodStart.value, -periodOffset.value * periodLengthDays.value));
const periodEnd = computed(() => addDays(periodStart.value, periodLengthDays.value - 1));
const canGoForward = computed(() => periodOffset.value > 0);

const periodStartStr = computed(() => toDateOnlyString(periodStart.value));
const periodEndStr = computed(() => toDateOnlyString(periodEnd.value));
const periodLabel = computed(() => `${formatDate(periodStart.value)} – ${formatDate(periodEnd.value)}`);

const pendingCount = computed(() => rows.value.filter((row) => row.status === "pending").length);
const payrollDaysLeft = computed(() => {
  const delta = Math.ceil((endOfDay(periodEnd.value) - new Date()) / 86400000);
  return Math.max(delta, 0);
});
const showPayrollDueBanner = computed(() => payrollDaysLeft.value >= 0 && payrollDaysLeft.value <= 3);

let searchTimeout = null;

const showSnack = (message, color = "success") => {
  snackbar.message = message;
  snackbar.color = color;
  snackbar.open = true;
};

const addDays = (date, days) => {
  const clone = new Date(date);
  clone.setDate(clone.getDate() + days);
  return clone;
};

const endOfDay = (date) => {
  const clone = new Date(date);
  clone.setHours(23, 59, 59, 999);
  return clone;
};

const toDateOnlyString = (date) => localDateStr(new Date(date));

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
};

const formatHours = (value) => {
  const n = Number(value || 0);
  // Use 2 decimal places for sub-1h sessions so "0.03h" shows instead of "0.0h"
  return n > 0 && n < 1 ? `${n.toFixed(2)}h` : `${n.toFixed(1)}h`;
};
const formatMoney = (value) => Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });

const getInitials = (worker) => {
  const first = worker?.fName?.[0] || "";
  const last = worker?.lName?.[0] || "";
  return `${first}${last}`.toUpperCase() || "?";
};

const capitalize = (value) => {
  const text = String(value || "");
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
};

const statusColor = (status) => {
  const map = { pending: "warning", approved: "success", rejected: "error" };
  return map[String(status || "").toLowerCase()] || "default";
};

const punchStatusColor = (status) => {
  const map = { "on-time": "success", late: "warning", early: "info", missed: "error" };
  return map[String(status || "").toLowerCase()] || "default";
};

const punchStatusLabel = (row) => {
  const status = String(row.status || "");
  if (status === "late" && Number(row.late_minutes || 0) > 0) {
    return `Late (${row.late_minutes}m)`;
  }
  return capitalize(status.replace("-", " "));
};

const exceptionIcon = (type) => {
  if (type === "late_arrival") return "mdi-clock-alert-outline";
  if (type === "missing_clock_out") return "mdi-timer-off-outline";
  if (type === "missed_shift") return "mdi-calendar-remove-outline";
  return "mdi-alert-circle-outline";
};

const exceptionIconColor = (severity) => {
  if (severity === "error") return "error";
  if (severity === "warning") return "warning";
  return "info";
};

const statusKey = (row, status) => `${row.user_id}-${row.department_id}-${status}`;

const loadRows = async () => {
  loading.value = true;
  try {
    const response = await timePayService.listTimecards({
      period_start: periodStartStr.value,
      period_end: periodEndStr.value,
      search: searchQuery.value,
      status: statusFilter.value,
    });
    rows.value = response?.data?.data || response?.data || [];
  } catch (error) {
    rows.value = [];
    showSnack(error?.response?.data?.message || "Failed to load timecards.", "error");
  } finally {
    loading.value = false;
  }
};

const loadDetail = async (row) => {
  detailLoading.value = true;
  try {
    const response = await timePayService.getTimecardDetail(row.user_id, {
      period_start: periodStartStr.value,
      period_end: periodEndStr.value,
      department_id: row.department_id,
    });
    const data = response?.data?.data || {};
    detailPunchLog.value = data.punch_log || [];
    detailExceptions.value = data.exceptions || [];
    detailSummary.regular_hours = data.summary?.regular_hours || 0;
    detailSummary.overtime_hours = data.summary?.overtime_hours || 0;
    detailSummary.total_hours = data.summary?.total_hours || 0;
    detailSummary.estimated_pay = data.summary?.estimated_pay || detailSummary.total_hours * HOURLY_RATE;
  } catch (error) {
    detailPunchLog.value = [];
    detailExceptions.value = [];
    showSnack(error?.response?.data?.message || "Failed to load worker details.", "error");
  } finally {
    detailLoading.value = false;
  }
};

const openDetail = async (row) => {
  selectedRow.value = row;
  detailDialog.value = true;
  detailTab.value = "punch-log";
  await loadDetail(row);
};

const setStatus = async (row, status, refreshDetail = false) => {
  if (!row) return;
  updatingStatusKey.value = statusKey(row, status);
  try {
    await timePayService.updateTimecardStatus(row.user_id, {
      status,
      period_start: periodStartStr.value,
      period_end: periodEndStr.value,
      department_id: row.department_id,
    });
    row.status = status;
    if (selectedRow.value?.user_id === row.user_id) {
      selectedRow.value.status = status;
    }
    if (refreshDetail && selectedRow.value) {
      await loadDetail(selectedRow.value);
    }
    showSnack(`Timecard ${status}.`);
  } catch (error) {
    showSnack(error?.response?.data?.message || "Failed to update status.", "error");
  } finally {
    updatingStatusKey.value = "";
  }
};

const approveAllPending = async () => {
  approvingAll.value = true;
  try {
    const response = await timePayService.approveAll({
      period_start: periodStartStr.value,
      period_end: periodEndStr.value,
    });
    const updated = Number(response?.data?.updated_count || 0);
    rows.value = rows.value.map((row) => (row.status === "pending" ? { ...row, status: "approved" } : row));
    showSnack(`Approved ${updated} pending timecard${updated === 1 ? "" : "s"}.`);
    if (selectedRow.value && selectedRow.value.status === "pending") {
      selectedRow.value.status = "approved";
    }
  } catch (error) {
    showSnack(error?.response?.data?.message || "Failed to approve all pending timecards.", "error");
  } finally {
    approvingAll.value = false;
  }
};

const goToPreviousPeriod = () => {
  periodOffset.value += 1;
};

const goToNextPeriod = () => {
  if (!canGoForward.value) return;
  periodOffset.value -= 1;
};

watch(periodType, () => {
  periodOffset.value = 0;
});

const exportCsv = () => {
  const header = [
    "Worker Name",
    "Email",
    "Regular Hours",
    "Overtime Hours",
    "Total Hours",
    "Estimated Pay",
    "Status",
    "Period Start",
    "Period End",
  ];
  const lines = rows.value.map((row) => {
    const wl = workerLabel(row.worker);
    return [
      wl.deleted ? "Deleted user" : wl.name,
      wl.email,
      Number(row.regular_hours || 0).toFixed(2),
      Number(row.overtime_hours || 0).toFixed(2),
      Number(row.total_hours || 0).toFixed(2),
      Number(row.estimated_pay || 0).toFixed(2),
      row.status,
      periodStartStr.value,
      periodEndStr.value,
    ];
  });
  const csv = [header, ...lines].map((cols) => cols.map((col) => `"${String(col).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `time-pay-${periodStartStr.value}-to-${periodEndStr.value}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

watch([periodStartStr, periodEndStr, statusFilter], () => {
  loadRows();
});

watch(searchQuery, () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => loadRows(), 300);
});

onMounted(loadRows);
</script>

<style scoped>
.time-pay-page {
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 2rem;
  line-height: 1.15;
  margin: 0;
  color: var(--text-1);
}

.page-subtitle {
  margin: 6px 0 0;
  color: var(--text-2);
  max-width: 760px;
}

.period-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.period-type-field {
  min-width: 190px;
  max-width: 240px;
}

.period-label {
  text-transform: none;
  letter-spacing: 0;
  min-width: 260px;
}

.filters-card,
.table-card {
  border: 1px solid var(--border-1);
  border-radius: 14px;
}

.search-field {
  min-width: 280px;
  flex: 1;
}

.status-field {
  min-width: 180px;
  max-width: 220px;
}

.csv-btn {
  text-transform: none;
}

.timecard-table th {
  color: var(--text-2);
  font-weight: 600;
}

.table-row {
  cursor: pointer;
}

.worker-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar-initials {
  color: var(--brand-primary);
  font-weight: 700;
}

.worker-name {
  font-weight: 600;
}

.worker-name--deleted {
  display: flex;
  align-items: center;
  gap: 4px;
}

.deleted-label {
  font-style: italic;
  color: var(--text-3);
  font-weight: 400;
}

.worker-email {
  font-size: 0.82rem;
  color: var(--text-2);
}

.empty-row {
  text-align: center;
  color: var(--text-2);
  padding: 18px 12px;
}

.empty-exception {
  display: flex;
  align-items: center;
  color: var(--state-active);
  padding: 8px 2px;
}

.stat-label {
  font-size: 0.82rem;
  color: var(--text-2);
}

.stat-value {
  margin-top: 4px;
  font-size: 1.4rem;
  font-weight: 700;
}

@media (max-width: 960px) {
  .period-label {
    min-width: 220px;
  }
}
</style>
