<template>
  <div class="student-dashboard pa-6">
    <!-- Header -->
    <div class="dashboard-header d-flex align-center justify-space-between mb-6">
      <div>
        <div class="text-h4 font-weight-bold">Hi, {{ firstName }}!</div>
        <div class="text-body-1 text-medium-emphasis">{{ todayLabel }}</div>
      </div>
      <NotificationBell :unread-count="unreadCount" @click="goToNotifications" />
    </div>

    <!-- Clock Status Banner -->
    <ClockStatusBanner
      :clocked-in="clockStatus.isClockedIn"
      :clock-in-time="clockStatus.clockInTime"
      :on-break="clockStatus.onBreak"
      class="mb-6"
    />

    <!-- Loading skeleton -->
    <template v-if="loading">
      <v-row>
        <v-col cols="12">
          <v-skeleton-loader type="card" class="mb-4" />
        </v-col>
        <v-col cols="12">
          <v-skeleton-loader type="chip, chip, chip, chip, chip, chip, chip" class="mb-4" />
        </v-col>
        <v-col cols="12" md="4">
          <v-skeleton-loader type="card" />
        </v-col>
        <v-col cols="12" md="4">
          <v-skeleton-loader type="card" />
        </v-col>
        <v-col cols="12" md="4">
          <v-skeleton-loader type="card" />
        </v-col>
      </v-row>
    </template>

    <!-- Error state -->
    <v-alert
      v-else-if="error"
      type="error"
      variant="tonal"
      class="mb-4"
      closable
    >
      {{ error }}
      <template #append>
        <v-btn variant="text" size="small" @click="loadDashboard">Retry</v-btn>
      </template>
    </v-alert>

    <template v-else>
      <!-- Primary Card: Next / Current Shift — full width -->
      <v-card
        v-if="nextShift"
        class="next-shift-card mb-6"
        elevation="0"
        rounded="lg"
        border
      >
        <div class="next-shift-card__bar" :style="{ backgroundColor: nextShiftColor }"></div>
        <div class="pa-5 flex-grow-1">
          <v-chip size="x-small" color="primary" variant="tonal" class="mb-2">
            {{ nextShiftLabel }}
          </v-chip>
          <div class="text-h6 font-weight-bold mb-1">
            {{ nextShift.department_name || nextShift.department?.department_name || "Shift" }}
          </div>
          <div class="d-flex align-center text-body-2 text-medium-emphasis mb-1">
            <v-icon size="16" class="mr-1">mdi-clock-outline</v-icon>
            {{ formatTimeRange(nextShift) }}
          </div>
          <div class="d-flex align-center text-body-2 text-medium-emphasis mb-1">
            <v-icon size="16" class="mr-1">mdi-map-marker</v-icon>
            {{ nextShift.position_name || nextShift.location || nextShift.department_name || "TBD" }}
          </div>
          <div v-if="nextShift.supervisor_name" class="d-flex align-center text-body-2 text-medium-emphasis mb-3">
            <v-icon size="16" class="mr-1">mdi-account-tie</v-icon>
            {{ nextShift.supervisor_name }}
          </div>

          <div class="d-flex ga-2">
            <v-btn
              color="primary"
              variant="flat"
              :disabled="!canClockIn"
              @click="handleClockIn"
              :loading="clockingIn"
              aria-label="Clock in to shift"
            >
              <v-icon start>mdi-login</v-icon>
              Clock In
            </v-btn>
            <v-btn
              variant="outlined"
              color="primary"
              @click="openSwapDialog(nextShift)"
              aria-label="Find cover for this shift"
            >
              <v-icon start>mdi-account-switch</v-icon>
              Find Cover
            </v-btn>
          </div>
          <div v-if="!canClockIn && !clockStatus.isClockedIn" class="text-caption text-medium-emphasis mt-2">
            Clock-in available within 15 minutes of shift start
          </div>
        </div>
      </v-card>

      <!-- Empty state: no upcoming shift -->
      <v-card v-else class="mb-6 pa-8 text-center" elevation="0" rounded="lg" border>
        <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-calendar-blank</v-icon>
        <div class="text-body-1 text-medium-emphasis">No upcoming shifts</div>
        <div class="text-caption text-medium-emphasis">Check the Open Shifts tab for available shifts</div>
      </v-card>

      <!-- Week Strip — full width -->
      <WeekStrip
        :selected-date="selectedDate"
        :shift-dates="shiftDates"
        class="mb-6"
        @select-day="selectedDate = $event"
        @change-week="onWeekChange"
      />

      <!-- 3-column grid: Open Shifts, Pending Requests, Weekly Summary -->
      <v-row>
        <!-- Open Shifts Card -->
        <v-col cols="12" md="4">
          <v-card class="fill-height" elevation="0" rounded="lg" border>
            <v-card-text class="pa-4">
              <div class="d-flex align-center justify-space-between mb-2">
                <div class="text-subtitle-1 font-weight-bold">
                  <v-icon size="20" class="mr-1">mdi-briefcase-plus</v-icon>
                  Open Shifts
                </div>
                <v-btn
                  variant="text"
                  color="primary"
                  size="small"
                  @click="$router.push({ name: 'student-schedule', query: { tab: 'open' } })"
                >
                  See All ({{ openShiftsCount }})
                </v-btn>
              </div>
              <template v-if="topOpenShifts.length">
                <ShiftCard
                  v-for="shift in topOpenShifts"
                  :key="shift.id"
                  :shift="shift"
                  :show-actions="false"
                  class="mb-2"
                />
              </template>
              <div v-else class="text-body-2 text-medium-emphasis text-center pa-3">
                No open shifts available right now
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Pending Requests -->
        <v-col cols="12" md="4">
          <v-card class="fill-height" elevation="0" rounded="lg" border>
            <v-card-text class="pa-4">
              <div class="text-subtitle-1 font-weight-bold mb-2">
                <v-icon size="20" class="mr-1">mdi-clipboard-text-clock</v-icon>
                Pending Requests
              </div>
              <template v-if="pendingRequests.length">
                <div
                  v-for="req in pendingRequests"
                  :key="req.id"
                  class="d-flex align-center justify-space-between py-2"
                >
                  <div class="d-flex align-center">
                    <v-icon size="18" :color="req.iconColor" class="mr-2">{{ req.icon }}</v-icon>
                    <span class="text-body-2">{{ req.label }}</span>
                  </div>
                  <v-chip :color="req.statusColor" size="x-small" variant="tonal">
                    {{ req.status }}
                  </v-chip>
                </div>
              </template>
              <div v-else class="text-body-2 text-medium-emphasis text-center pa-3">
                No pending requests
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Weekly Summary -->
        <v-col cols="12" md="4">
          <v-card class="fill-height" elevation="0" rounded="lg" border>
            <v-card-text class="pa-4">
              <div class="text-subtitle-1 font-weight-bold mb-3">
                <v-icon size="20" class="mr-1">mdi-chart-bar</v-icon>
                This Week
              </div>
              <div class="d-flex flex-column ga-4">
                <div class="text-center">
                  <div class="text-h5 font-weight-bold" style="color: #80162B">{{ weeklyHours }}</div>
                  <div class="text-caption text-medium-emphasis">Hours Scheduled</div>
                </div>
                <v-divider />
                <div class="text-center">
                  <div class="text-h5 font-weight-bold" style="color: #196CA2">{{ weeklyShifts }}</div>
                  <div class="text-caption text-medium-emphasis">Shifts</div>
                </div>
                <v-divider />
                <div class="text-center">
                  <div class="text-h5 font-weight-bold" style="color: #2e7d32">${{ estimatedEarnings }}</div>
                  <div class="text-caption text-medium-emphasis">Est. Earnings</div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- Swap Dialog -->
    <SwapDialog
      v-model="swapDialogOpen"
      :shift="swapShift"
      mode="cover"
      :coworkers="[]"
      @submitted="handleSwapSubmit"
    />

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="bottom">
      {{ snackbar.text }}
      <template #actions>
        <v-btn variant="text" @click="snackbar.show = false">Close</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils.js";
import studentService from "../services/studentService.js";
import NotificationBell from "../components/student/NotificationBell.vue";
import ClockStatusBanner from "../components/student/ClockStatusBanner.vue";
import WeekStrip from "../components/student/WeekStrip.vue";
import ShiftCard from "../components/student/ShiftCard.vue";
import SwapDialog from "../components/student/SwapDialog.vue";

const router = useRouter();
const user = ref(Utils.getStore("user") || {});

// State
const loading = ref(true);
const error = ref(null);
const selectedDate = ref(new Date().toISOString().slice(0, 10));
const clockingIn = ref(false);

// Dashboard data
const nextShift = ref(null);
const todayShifts = ref([]);
const weekShifts = ref([]);
const openShiftsCount = ref(0);
const topOpenShifts = ref([]);
const pendingRequests = ref([]);
const unreadCount = ref(0);
const weeklyHours = ref(0);
const weeklyShifts = ref(0);
const estimatedEarnings = ref("0.00");
const clockStatus = reactive({
  isClockedIn: false,
  clockInTime: null,
  onBreak: false,
  clockRecordId: null,
});

// Swap dialog
const swapDialogOpen = ref(false);
const swapShift = ref(null);

// Snackbar
const snackbar = reactive({ show: false, text: "", color: "success" });

const firstName = computed(() => user.value?.fName || "Student");

const todayLabel = computed(() => {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
});

const shiftDates = computed(() => {
  return [...new Set(weekShifts.value.map((s) => {
    if (s.shift_date) return s.shift_date;
    const d = shiftStartDT(s);
    if (!d) return null;
    const dt = new Date(d);
    return isNaN(dt) ? null : dt.toISOString().slice(0, 10);
  }).filter(Boolean))];
});

const nextShiftLabel = computed(() => {
  if (!nextShift.value) return "";
  const start = new Date(shiftStartDT(nextShift.value));
  const now = new Date();
  if (!isNaN(start) && start <= now) return "Current Shift";
  return "Next Shift";
});

const nextShiftColor = computed(() => {
  const name = (nextShift.value?.department_name || nextShift.value?.department?.department_name || "").toLowerCase();
  const colors = {
    barista: "#6F4E37", library: "#196CA2", dining: "#E85D04",
    maintenance: "#2D6A4F", tutoring: "#7B2D8E", athletics: "#1B4332",
  };
  for (const [key, color] of Object.entries(colors)) {
    if (name.includes(key)) return color;
  }
  return "#80162B";
});

const canClockIn = computed(() => {
  if (clockStatus.isClockedIn) return false;
  if (!nextShift.value) return false;
  const start = new Date(shiftStartDT(nextShift.value));
  if (isNaN(start)) return false;
  const now = new Date();
  const diffMin = (start - now) / 60000;
  return diffMin <= 15 && diffMin >= -60; // within 15 min before to 60 min after
});

/** Combine separate shift_date + time fields into a parseable datetime string */
function buildDateTime(shift, timeField) {
  const time = shift[timeField];
  if (!time) return null;
  // Handle Date objects
  if (time instanceof Date) return time.toISOString();
  // If time is already a full datetime (contains 'T' or '-'), use as-is
  if (typeof time === "string" && (time.includes("T") || (time.includes("-") && time.length > 10))) return time;
  // Bare time — combine with shift_date
  const date = shift.shift_date || shift.date;
  if (date) {
    const dateStr = date instanceof Date ? date.toISOString().slice(0, 10) : String(date).slice(0, 10);
    return dateStr + "T" + time;
  }
  return null;
}

function shiftStartDT(shift) {
  return buildDateTime(shift, "start_time") || shift.start_time || shift.shift_start;
}

function shiftEndDT(shift) {
  return buildDateTime(shift, "end_time") || shift.end_time || shift.shift_end;
}

function formatTimeRange(shift) {
  const fmt = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    if (isNaN(dt)) return "";
    return dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };
  return `${fmt(shiftStartDT(shift))} – ${fmt(shiftEndDT(shift))}`;
}

function showSnack(text, color = "success") {
  snackbar.text = text;
  snackbar.color = color;
  snackbar.show = true;
}

function normalizeOpenShiftPayload(payload) {
  if (Array.isArray(payload)) {
    return {
      count: payload.length,
      shifts: payload,
    };
  }

  if (payload && typeof payload === "object") {
    const shifts = Array.isArray(payload.preview)
      ? payload.preview
      : Array.isArray(payload.shifts)
        ? payload.shifts
        : [];

    return {
      count: Number(payload.count ?? shifts.length ?? 0),
      shifts,
    };
  }

  return {
    count: 0,
    shifts: [],
  };
}

async function loadDashboard() {
  loading.value = true;
  error.value = null;

  try {
    // Try the aggregated dashboard endpoint first
    const res = await studentService.getDashboard();
    const data = res?.data?.data || res?.data || {};
    const openShiftData = normalizeOpenShiftPayload(data.openShifts);

    nextShift.value = data.nextShift || null;
    todayShifts.value = data.todayShifts || [];
    weekShifts.value = data.weekShifts || [];
    openShiftsCount.value = data.openShiftsCount ?? openShiftData.count;
    topOpenShifts.value = openShiftData.shifts.slice(0, 3);
    unreadCount.value = data.unreadNotifications || 0;
    weeklyHours.value = data.weeklyHours ?? data.estimatedWeeklyHours ?? 0;
    weeklyShifts.value = data.weeklyShifts || weekShifts.value.length;
    estimatedEarnings.value = data.estimatedEarnings || "0.00";

    // Map pending requests
    const rawRequests = Array.isArray(data.pendingRequests)
      ? data.pendingRequests
      : data.pendingCounts && typeof data.pendingCounts === "object"
        ? Object.entries(data.pendingCounts)
            .filter(([, count]) => Number(count) > 0)
            .map(([type, count]) => ({
              id: type,
              type,
              label: `${count} pending ${type.replace(/([A-Z])/g, " $1").toLowerCase()}`,
              status: "Pending",
            }))
        : [];
    pendingRequests.value = rawRequests.map((r) => ({
      id: r.id,
      label: r.type === "time_off" ? `Time off: ${r.startDate} – ${r.endDate}` : r.label || "Request",
      icon: r.type === "time_off" ? "mdi-calendar-remove" : "mdi-swap-horizontal",
      iconColor: r.type === "time_off" ? "orange" : "blue",
      status: r.status || "Pending",
      statusColor: r.status === "approved" ? "success" : r.status === "denied" ? "error" : "warning",
    }));

    // Clock status
    if (data.clockStatus) {
      clockStatus.isClockedIn = data.clockStatus.isClockedIn || false;
      clockStatus.clockInTime = data.clockStatus.clockInTime || null;
      clockStatus.onBreak = data.clockStatus.onBreak || false;
      clockStatus.clockRecordId = data.clockStatus.clockRecordId || null;
    }
  } catch (dashErr) {
    // Fallback: load data from individual endpoints
    try {
      await loadFromIndividualEndpoints();
    } catch (fallbackErr) {
      error.value = "Failed to load dashboard. Please try again.";
      console.error("Dashboard load failed:", fallbackErr);
    }
  } finally {
    loading.value = false;
  }
}

async function loadFromIndividualEndpoints() {
  const userId = user.value?.userId || user.value?.id;

  const [shiftsRes, clockRes, notifRes, openRes] = await Promise.allSettled([
    studentService.getShifts({ assigned_user_id: userId, is_published: true }),
    studentService.getOpenClockRecord(),
    studentService.getUnreadNotificationCount(),
    studentService.getOpenShifts(),
  ]);

  // Parse shifts
  if (shiftsRes.status === "fulfilled") {
    const allShifts = shiftsRes.value?.data?.data || shiftsRes.value?.data || [];
    const now = new Date();
    const weekStart = getWeekStart(now);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    weekShifts.value = allShifts.filter((s) => {
      const d = new Date(shiftStartDT(s) || s.shift_date);
      return !isNaN(d) && d >= weekStart && d < weekEnd;
    });

    const upcoming = allShifts
      .filter((s) => {
        const d = new Date(shiftStartDT(s));
        return !isNaN(d) && d >= new Date(now.getTime() - 3600000);
      })
      .sort((a, b) => new Date(shiftStartDT(a)) - new Date(shiftStartDT(b)));
    nextShift.value = upcoming[0] || null;

    weeklyShifts.value = weekShifts.value.length;
    weeklyHours.value = weekShifts.value.reduce((sum, s) => {
      const start = new Date(shiftStartDT(s));
      const end = new Date(shiftEndDT(s));
      if (isNaN(start) || isNaN(end)) return sum;
      return sum + Math.max(0, (end - start) / 3600000);
    }, 0).toFixed(1);
    estimatedEarnings.value = (parseFloat(weeklyHours.value) * (user.value?.hourlyRate || 10)).toFixed(2);
  }

  // Clock status
  if (clockRes.status === "fulfilled") {
    const record = clockRes.value?.data?.data || clockRes.value?.data;
    if (record && !record.clock_out_time) {
      clockStatus.isClockedIn = true;
      clockStatus.clockInTime = record.clock_in_time;
      clockStatus.clockRecordId = record.id;
      clockStatus.onBreak = record.on_break || false;
    }
  }

  // Notification count
  if (notifRes.status === "fulfilled") {
    const notifs = notifRes.value?.data?.data || notifRes.value?.data || [];
    unreadCount.value = Array.isArray(notifs) ? notifs.filter((n) => !n.isRead).length : 0;
  }

  // Open shifts
  if (openRes.status === "fulfilled") {
    const openShiftData = normalizeOpenShiftPayload(openRes.value?.data?.data || openRes.value?.data);
    topOpenShifts.value = openShiftData.shifts.slice(0, 3);
    openShiftsCount.value = openShiftData.count;
  }
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

async function handleClockIn() {
  clockingIn.value = true;
  try {
    const payload = { shiftId: nextShift.value?.id };
    await studentService.clockIn(payload);
    clockStatus.isClockedIn = true;
    clockStatus.clockInTime = new Date().toISOString();
    showSnack("Clocked in successfully!");
  } catch (err) {
    showSnack(err?.response?.data?.message || "Failed to clock in", "error");
  } finally {
    clockingIn.value = false;
  }
}

function openSwapDialog(shift) {
  swapShift.value = shift;
  swapDialogOpen.value = true;
}

function onWeekChange({ monday }) {
  selectedDate.value = monday;
}

async function handleSwapSubmit(data) {
  try {
    if (data.type === "pool") {
      await studentService.findCover(data.shift.id, { notes: data.notes });
    } else {
      await studentService.requestSwap(data.shift.id, {
        targetUserId: data.coworker?.id,
        notes: data.notes,
      });
    }
    swapDialogOpen.value = false;
    showSnack("Request submitted!");
  } catch (err) {
    showSnack(err?.response?.data?.message || "Failed to submit request", "error");
  }
}

function goToNotifications() {
  router.push({ name: "student-notifications" });
}

onMounted(loadDashboard);
</script>

<style scoped>
.student-dashboard {
  width: 100%;
}

.next-shift-card {
  overflow: hidden;
  display: flex;
}

.next-shift-card__bar {
  width: 5px;
  flex-shrink: 0;
}
</style>
