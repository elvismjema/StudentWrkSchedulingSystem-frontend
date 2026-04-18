<template>
  <div class="dashboard-page">
    <section class="page-header">
      <div class="header-text">
        <h1 class="page-title">{{ managerHeading }}</h1>
        <p class="page-subtitle">{{ todayLabel }}</p>
      </div>
      <div class="header-actions">
        <v-btn color="#8B1538" prepend-icon="mdi-plus" @click="openCreateShiftPopup">
          Create Shift
        </v-btn>
        <v-btn variant="outlined" prepend-icon="mdi-calendar-month-outline" @click="router.push('/manager/schedule')">
          View Schedule
        </v-btn>
      </div>
    </section>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>

    <v-row class="mb-4">
      <v-col cols="12" md="6">
        <v-card elevation="0" class="summary-card">
          <v-card-text>
            <div class="summary-label">Working Now</div>
            <div class="summary-value">{{ workingNowCount }}</div>
            <div class="summary-caption">Currently clocked-in workers</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card elevation="0" class="summary-card">
          <v-card-text>
            <div class="summary-label">Coming Up</div>
            <div class="summary-value">{{ comingUpCount }}</div>
            <div class="summary-caption">Upcoming shifts today</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mb-4">
      <v-col cols="12" md="6">
        <v-card elevation="0" class="content-card">
          <v-card-text>
            <div class="card-head">
              <div>
                <h2 class="card-title">Pending Approvals</h2>
                <div class="card-subtitle">{{ pendingApprovals.length }} waiting</div>
              </div>
              <v-btn variant="text" class="ghost-btn" @click="router.push('/manager/approvals')">
                View All
                <v-icon end>mdi-arrow-right</v-icon>
              </v-btn>
            </div>

            <div v-if="pendingPreview.length === 0" class="empty-state">
              <v-icon size="24" color="success">mdi-check-circle-outline</v-icon>
              <span>All caught up!</span>
            </div>

            <div v-else class="list-wrap">
              <div v-for="item in pendingPreview" :key="item.id" class="pending-item">
                <div class="pending-top-row">
                  <v-chip size="small" variant="outlined">{{ item.type }}</v-chip>
                  <v-chip size="small" color="warning" variant="outlined">{{ item.status }}</v-chip>
                </div>
                <div class="worker-name">{{ item.workerName }}</div>
                <div class="meta-line">{{ item.dateLabel }} · {{ item.timeRange }}</div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card elevation="0" class="content-card">
          <v-card-text>
            <div class="card-head">
              <div>
                <h2 class="card-title">Unfilled Shifts</h2>
                <div class="card-subtitle">Shifts needing coverage</div>
              </div>
              <v-btn variant="text" class="ghost-btn" @click="router.push('/manager/schedule')">
                View All
                <v-icon end>mdi-arrow-right</v-icon>
              </v-btn>
            </div>

            <div v-if="unfilledPreview.length === 0" class="empty-state">
              <v-icon size="24" color="success">mdi-check-circle-outline</v-icon>
              <span>All shifts are filled!</span>
            </div>

            <div v-else class="list-wrap">
              <div v-for="shift in unfilledPreview" :key="shift.shift_id" class="unfilled-item">
                <div class="unfilled-top-row">
                  <v-chip size="small" color="warning" variant="outlined">{{ shift.departmentName }}</v-chip>
                  <div class="position-name">{{ shift.positionName }}</div>
                  <v-spacer />
                  <v-chip size="small" color="warning" variant="outlined">Open</v-chip>
                </div>
                <div class="meta-line">{{ shift.dateLabel }} · {{ shift.timeRange }}</div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" sm="6">
        <v-btn block variant="outlined" class="quick-btn" @click="router.push('/manager/time-pay')">
          <div class="quick-content">
            <v-icon size="24">mdi-clock-outline</v-icon>
            <span>Time &amp; Pay</span>
          </div>
        </v-btn>
      </v-col>
      <v-col cols="12" sm="6">
        <v-btn block variant="outlined" class="quick-btn" @click="router.push('/manager/workers')">
          <div class="quick-content">
            <v-icon size="24">mdi-account-group-outline</v-icon>
            <span>Student Workers</span>
          </div>
        </v-btn>
      </v-col>
    </v-row>

  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import apiClient from "../services/services.js";
import shiftService from "../services/shiftService.js";
import Utils from "../config/utils.js";
import { TZ } from "../utils/tz.js";

const router = useRouter();
const currentUser = Utils.getStore("user") || {};
const error = ref("");
const allShifts = ref([]);
const swapRequests = ref([]);

const deptContext = Utils.getStore("currentDepartmentContext") || {};
const currentDeptId = deptContext.department_id || null;

const managerHeading = computed(() => {
  const firstName = currentUser?.fName || "";
  return firstName ? `Hi, ${firstName}!` : "Hi, Manager!";
});

const todayLabel = computed(() =>
  new Date().toLocaleDateString("en-US", {
    timeZone: TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }),
);

const toDateTime = (dateValue, timeValue) => {
  if (!dateValue || !timeValue) return null;
  const [year, month, day] = String(dateValue).split("-").map(Number);
  const [hour, minute] = String(timeValue).split(":").map(Number);
  return new Date(year, (month || 1) - 1, day || 1, hour || 0, minute || 0, 0, 0);
};

const formatDateShort = (dateValue) => {
  if (!dateValue) return "—";
  const date = new Date(`${dateValue}T00:00:00`);
  return date.toLocaleDateString("en-US", { timeZone: TZ, month: "short", day: "numeric" });
};

const formatTime = (timeValue) => {
  if (!timeValue) return "—";
  const [hour, minute] = String(timeValue).split(":");
  const date = new Date();
  date.setHours(Number(hour || 0), Number(minute || 0), 0, 0);
  return date.toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
};

const formatRange = (startTime, endTime) => `${formatTime(startTime)} – ${formatTime(endTime)}`;

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const workingNowCount = computed(() => {
  const now = new Date();
  return allShifts.value.filter((shift) => {
    const start = toDateTime(shift.shift_date, shift.start_time);
    const end = toDateTime(shift.shift_date, shift.end_time);
    if (!start || !end) return false;
    return !!shift.assigned_user_id && now >= start && now <= end;
  }).length;
});

const comingUpCount = computed(() => {
  const now = new Date();
  return allShifts.value.filter((shift) => {
    const start = toDateTime(shift.shift_date, shift.start_time);
    if (!start) return false;
    return !!shift.assigned_user_id && sameDay(start, now) && start > now;
  }).length;
});

const pendingApprovals = computed(() =>
  (swapRequests.value || [])
    .filter((item) => String(item.status || "").toLowerCase() === "pending")
    .map((item) => {
      const userName =
        item.requestedBy ||
        `${item.user?.fName || ""} ${item.user?.lName || ""}`.trim() ||
        "Unknown Worker";

      const shiftDate = item.shift?.shift_date || item.shift_date || item.date || null;
      const startTime = item.shift?.start_time || item.start_time || null;
      const endTime = item.shift?.end_time || item.end_time || null;

      return {
        id: item.id || `${userName}-${shiftDate || ""}-${startTime || ""}`,
        type: item.requestType || item.type || "Swap",
        status: "Pending",
        workerName: userName,
        dateLabel: shiftDate ? formatDateShort(shiftDate) : "—",
        timeRange: startTime && endTime ? formatRange(startTime, endTime) : "—",
      };
    }),
);

const pendingPreview = computed(() => pendingApprovals.value.slice(0, 3));

const unfilledShifts = computed(() => {
  const today = new Date();
  const sorted = (allShifts.value || [])
    .filter((shift) => !shift.assigned_user_id)
    .filter((shift) => {
      const shiftStart = toDateTime(shift.shift_date, shift.start_time);
      return shiftStart ? shiftStart >= new Date(today.getFullYear(), today.getMonth(), today.getDate()) : false;
    })
    .sort((a, b) => {
      const aStart = toDateTime(a.shift_date, a.start_time)?.getTime() || 0;
      const bStart = toDateTime(b.shift_date, b.start_time)?.getTime() || 0;
      return aStart - bStart;
    });

  return sorted.map((shift) => ({
    ...shift,
    departmentName: shift.department?.department_name || deptContext.department_name || "Department",
    positionName: shift.position?.position_name || "Position",
    dateLabel: formatDateShort(shift.shift_date),
    timeRange: formatRange(shift.start_time, shift.end_time),
  }));
});

const unfilledPreview = computed(() => unfilledShifts.value.slice(0, 3));

const openCreateShiftDialog = () => {
  router.push('/manager/create-shift');
};

const loadDashboardData = async () => {
  error.value = "";
  try {
    const [shiftsRes, swapsRes] = await Promise.all([
      shiftService.listShifts({ department_id: currentDeptId, is_published: true }),
      // Fetch manager_pending swap/cover requests from the correct manager endpoint
      apiClient.get("/manager/swap-requests"),
    ]);

    allShifts.value = shiftsRes?.data || [];
    // Normalize to the shape pendingApprovals computed expects
    const raw = swapsRes?.data?.data || swapsRes?.data || [];
    swapRequests.value = raw.map((item) => ({
      id: item.id,
      status: item.status === 'manager_pending' ? 'pending' : item.status,
      requestType: item.type === 'find_cover' ? 'Cover Request' : 'Swap Request',
      requestedBy: item.requester
        ? `${item.requester.fName} ${item.requester.lName}`
        : 'Unknown Worker',
      shift: item.requesterShift || null,
      shift_date: item.requesterShift?.shift_date || null,
      start_time: item.requesterShift?.start_time || null,
      end_time: item.requesterShift?.end_time || null,
    }));
  } catch (err) {
    error.value = err?.response?.data?.message || "Failed to load dashboard data.";
  }
};

const openCreateShiftPopup = () => {
  router.push({ name: "manager-schedule", query: { createShift: "1" } });
};

onMounted(loadDashboardData);
</script>

<style scoped>
.dashboard-page {
  padding: 24px;
}

.page-header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.header-text {
  min-width: 260px;
}

.header-actions {
  margin-left: auto;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.page-title {
  margin: 0;
  font-size: 52px;
  line-height: 1.05;
  font-weight: 700;
  color: #101828;
}

.page-subtitle {
  margin: 6px 0 0;
  color: #667085;
  font-size: 16px;
}

.summary-card,
.content-card {
  border: 1px solid #e3e5e8;
  border-radius: 14px;
}

.summary-label {
  color: #667085;
  font-size: 14px;
  font-weight: 500;
}

.summary-value {
  margin-top: 2px;
  font-size: 34px;
  line-height: 1.1;
  color: #101828;
  font-weight: 700;
}

.summary-caption {
  margin-top: 4px;
  color: #667085;
  font-size: 13px;
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.card-title {
  margin: 0;
  font-size: 24px;
  color: #101828;
  font-weight: 700;
}

.card-subtitle {
  color: #667085;
  font-size: 15px;
  margin-top: 2px;
}

.ghost-btn {
  color: #1f2937;
}

.list-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pending-item {
  border: 1px solid #e3e5e8;
  border-radius: 12px;
  padding: 14px;
}

.pending-top-row,
.unfilled-top-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.worker-name {
  margin-top: 8px;
  font-size: 22px;
  line-height: 1.15;
  color: #101828;
  font-weight: 500;
}

.meta-line {
  margin-top: 4px;
  color: #667085;
  font-size: 16px;
}

.unfilled-item {
  border: 1px solid #f2c48a;
  background: #fff9f2;
  border-radius: 12px;
  padding: 14px;
}

.position-name {
  color: #101828;
  font-weight: 500;
  font-size: 18px;
}

.empty-state {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #667085;
  min-height: 64px;
}

.quick-btn {
  height: 104px;
  min-height: 104px;
  border-color: #d9dde3;
}

.quick-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: #1f2937;
  font-size: 17px;
}

@media (max-width: 960px) {
  .page-title {
    font-size: 40px;
  }
}
</style>
