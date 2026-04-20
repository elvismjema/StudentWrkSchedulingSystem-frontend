<template>
  <PageFrame>
    <template #header>
      <PageHeader :title="managerHeading" :subtitle="todayLabel">
        <template #actions>
          <v-btn
            variant="outlined"
            prepend-icon="mdi-calendar-month-outline"
            class="mr-2"
            @click="router.push({ name: 'manager-schedule' })"
          >
            View Schedule
          </v-btn>
          <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateShiftPopup">
            Create Shift
          </v-btn>
        </template>
      </PageHeader>
    </template>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>

    <!-- Top row: Who's Working Now + Pending Approvals -->
    <div class="db-top-row mb-4">

      <!-- Who's Working Now -->
      <div class="db-card">
        <div class="db-card__head">
          <div>
            <div class="db-card__title">Who's Working Now</div>
            <div class="db-card__sub">Currently clocked-in workers</div>
          </div>
          <div class="working-count">
            <span class="working-count__num">{{ workingNowCount }}</span>
            <span class="pulse-dot" />
          </div>
        </div>
        <div v-if="workingNow.length === 0" class="db-empty">
          No workers currently clocked in
        </div>
        <ul v-else class="worker-list">
          <li
            v-for="shift in workingNow"
            :key="shift.shift_id || shift.id"
            class="worker-row"
          >
            <span class="worker-avatar">{{ initialsFor(shift.assignedUser?.fName || shift.user?.fName, shift.assignedUser?.lName || shift.user?.lName) }}</span>
            <div class="worker-info">
              <span class="worker-name">{{ ((shift.assignedUser?.fName || shift.user?.fName || '') + ' ' + (shift.assignedUser?.lName || shift.user?.lName || '')).trim() }}</span>
              <span class="worker-dept">{{ shift.position?.position_name || 'Shift' }}</span>
            </div>
            <div class="worker-right">
              <span class="worker-time">{{ formatRange(shift.start_time, shift.end_time) }}</span>
              <span class="badge badge--green">In Progress</span>
            </div>
          </li>
        </ul>
      </div>

      <!-- Pending Approvals -->
      <div class="db-card">
        <div class="db-card__head">
          <div>
            <div class="db-card__title">Pending Approvals</div>
            <div class="db-card__sub">{{ pendingApprovals.length }} waiting</div>
          </div>
          <router-link :to="{ name: 'manager-approvals' }" class="db-link">
            View All <v-icon size="15">mdi-arrow-right</v-icon>
          </router-link>
        </div>
        <div v-if="pendingApprovals.length === 0" class="db-empty">
          No pending requests
        </div>
        <ul v-else class="approval-list">
          <li v-for="item in pendingApprovals.slice(0, 3)" :key="item.id" class="approval-row">
            <div class="approval-row__top">
              <span class="badge badge--neutral">{{ item.type }}</span>
              <span class="badge badge--orange">Pending</span>
            </div>
            <div class="approval-row__name">{{ item.workerName }}</div>
            <div class="approval-row__meta">{{ item.dateLabel }} · {{ item.timeRange }}</div>
          </li>
        </ul>
      </div>
    </div>

    <!-- Middle row: Coming Up + Unfilled Shifts -->
    <div class="db-mid-row mb-4">

      <!-- Coming Up -->
      <div class="db-card">
        <div class="db-card__head">
          <div>
            <div class="db-card__title">Coming Up</div>
            <div class="db-card__sub">Next shifts today</div>
          </div>
          <router-link :to="{ name: 'manager-schedule' }" class="db-link">
            View All <v-icon size="15">mdi-arrow-right</v-icon>
          </router-link>
        </div>
        <div v-if="comingUpToday.length === 0" class="db-empty">
          No more shifts scheduled today
        </div>
        <ul v-else class="worker-list">
          <li
            v-for="shift in comingUpToday"
            :key="shift.shift_id || shift.id"
            class="worker-row"
          >
            <span class="worker-avatar">{{ shift.initials }}</span>
            <div class="worker-info">
              <span class="worker-name">{{ shift.assigneeName }}</span>
              <span class="worker-dept">{{ shift.departmentName || shift.positionName }}</span>
            </div>
            <span class="worker-time">{{ shift.timeRange }}</span>
          </li>
        </ul>
      </div>

      <!-- Unfilled Shifts -->
      <div class="db-card">
        <div class="db-card__head">
          <div>
            <div class="db-card__title">Unfilled Shifts</div>
            <div class="db-card__sub">Shifts needing coverage</div>
          </div>
          <router-link :to="{ name: 'manager-schedule', query: { filter: 'open' } }" class="db-link">
            View All <v-icon size="15">mdi-arrow-right</v-icon>
          </router-link>
        </div>
        <div v-if="unfilledNext7.length === 0" class="db-empty">
          No unfilled shifts in the next 7 days
        </div>
        <ul v-else class="approval-list">
          <li
            v-for="shift in unfilledNext7.slice(0, 3)"
            :key="shift.shift_id || shift.id"
            class="approval-row"
          >
            <div class="approval-row__top">
              <span class="approval-row__name">{{ shift.position?.position_name || 'Shift' }}</span>
              <span class="badge badge--orange">Open</span>
            </div>
            <div class="approval-row__meta">{{ formatDateShort(shift.shift_date) }} · {{ formatRange(shift.start_time, shift.end_time) }}</div>
          </li>
        </ul>
      </div>
    </div>

    <!-- Quick actions -->
    <div class="db-actions-row">
      <button class="db-action-btn" @click="router.push('/manager/time-pay')">
        <v-icon size="22" class="mb-1">mdi-currency-usd</v-icon>
        <span>Time &amp; Pay</span>
      </button>
      <button class="db-action-btn" @click="router.push('/manager/workers')">
        <v-icon size="22" class="mb-1">mdi-account-group-outline</v-icon>
        <span>Student Workers</span>
      </button>
    </div>

  </PageFrame>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import PageFrame from "../components/PageFrame.vue";
import PageHeader from "../components/PageHeader.vue";
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

// TODO: department opening/closing hours aren't in the context payload yet.
const deptOpeningHour = computed(() => deptContext.openingHour || "06:00");
const deptClosingHour = computed(() => deptContext.closingHour || "23:00");

const managerHeading = computed(() => {
  const firstName = currentUser?.fName || "";
  return firstName ? `Hey, ${firstName}` : "Hey there";
});
const managerSubtitle = computed(() => `Manager · ${deptContext.department_name || "Department"}`);
const todayLabel = computed(() =>
  new Date().toLocaleDateString("en-US", {
    timeZone: TZ, weekday: "long", month: "long", day: "numeric", year: "numeric",
  }),
);

// ---- Date helpers (preserved from previous version) ---------------------
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
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const initialsFor = (fName, lName) => {
  const a = String(fName || "").trim();
  const b = String(lName || "").trim();
  return `${a.charAt(0)}${b.charAt(0)}`.toUpperCase() || "?";
};

// TODO: join with clock records to derive on-break / needs-coverage states.
const workingNow = computed(() => {
  const now = new Date();
  return allShifts.value.filter((shift) => {
    const start = toDateTime(shift.shift_date, shift.start_time);
    const end = toDateTime(shift.shift_date, shift.end_time);
    return !!shift.assigned_user_id && start && end && now >= start && now <= end;
  });
});
const workingNowCount = computed(() => workingNow.value.length);
const clockedInAvatars = computed(() =>
  workingNow.value.slice(0, 3).map((shift) => {
    const u = shift.assignedUser || shift.user || {};
    const name = `${u.fName || ""} ${u.lName || ""}`.trim() || "Worker";
    return { key: shift.shift_id || shift.id || name, initials: initialsFor(u.fName, u.lName), name };
  }),
);
const clockedInOverflow = computed(() =>
  Math.max(workingNow.value.length - clockedInAvatars.value.length, 0),
);

const pendingApprovals = computed(() =>
  (swapRequests.value || [])
    .filter((item) => String(item.status || "").toLowerCase() === "pending")
    .map((item) => {
      const userName = item.requestedBy
        || `${item.user?.fName || ""} ${item.user?.lName || ""}`.trim()
        || "Unknown Worker";
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

const unfilledNext7 = computed(() => {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const horizon = new Date(startOfToday);
  horizon.setDate(horizon.getDate() + 7);
  return (allShifts.value || [])
    .filter((shift) => !shift.assigned_user_id)
    .filter((shift) => {
      const start = toDateTime(shift.shift_date, shift.start_time);
      return start && start >= startOfToday && start < horizon;
    })
    .sort((a, b) => {
      const aStart = toDateTime(a.shift_date, a.start_time)?.getTime() || 0;
      const bStart = toDateTime(b.shift_date, b.start_time)?.getTime() || 0;
      return aStart - bStart;
    });
});
const unfilledNext7Count = computed(() => unfilledNext7.value.length);
const unfilledNext7Subtitle = computed(() => {
  const next = unfilledNext7.value[0];
  return next ? `Nearest: ${formatDateShort(next.shift_date)}` : "";
});

const upcomingPreview = computed(() => {
  const now = new Date();
  const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return (allShifts.value || [])
    .map((shift) => ({ shift, start: toDateTime(shift.shift_date, shift.start_time) }))
    .filter(({ start }) => start && start >= now && start < end)
    .sort((a, b) => a.start - b.start)
    .slice(0, 5)
    .map(({ shift }) => {
      const u = shift.assignedUser || shift.user || {};
      const assigneeName = shift.assigned_user_id
        ? (`${u.fName || ""} ${u.lName || ""}`.trim() || "Assigned")
        : "";
      return {
        ...shift,
        assigneeName,
        positionName: shift.position?.position_name || "Shift",
        dateLabel: formatDateShort(shift.shift_date),
        timeRange: formatRange(shift.start_time, shift.end_time),
      };
    });
});

const todayRange = computed(() => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
});

const todayEvents = computed(() => {
  const now = new Date();
  return (allShifts.value || [])
    .filter((shift) => {
      const start = toDateTime(shift.shift_date, shift.start_time);
      return start && sameDay(start, now);
    })
    .map((shift) => {
      const start = toDateTime(shift.shift_date, shift.start_time);
      const end = toDateTime(shift.shift_date, shift.end_time);
      const u = shift.assignedUser || shift.user || {};
      const assigneeName = shift.assigned_user_id
        ? (`${u.fName || ""} ${u.lName || ""}`.trim() || "Assigned")
        : "";
      // TODO: derive clocked-in / on-break / needs-coverage from clock records.
      const state = shift.assigned_user_id ? "filled" : "open";
      return {
        id: shift.shift_id || shift.id,
        title: shift.position?.position_name || "Shift",
        start, end,
        positionId: shift.position_id,
        positionColor: shift.position?.color || null,
        assigneeName,
        state,
      };
    });
});

// No dedicated shift detail modal exists yet — route to schedule so the user
// can find the shift there. TODO: open ShiftDetailModal when it lands.
const onTimelineEventClick = () => { router.push({ name: "manager-schedule" }); };

const loadDashboardData = async () => {
  error.value = "";
  try {
    const [shiftsRes, swapsRes] = await Promise.all([
      shiftService.listShifts({ department_id: currentDeptId, is_published: true }),
      apiClient.get("/manager/swap-requests"),
    ]);
    allShifts.value = shiftsRes?.data || [];
    const raw = swapsRes?.data?.data || swapsRes?.data || [];
    swapRequests.value = raw.map((item) => ({
      id: item.id,
      status: item.status === "manager_pending" ? "pending" : item.status,
      requestType: item.type === "find_cover" ? "Cover Request" : "Swap Request",
      requestedBy: item.requester ? `${item.requester.fName} ${item.requester.lName}` : "Unknown Worker",
      shift: item.requesterShift || null,
      shift_date: item.requesterShift?.shift_date || null,
      start_time: item.requesterShift?.start_time || null,
      end_time: item.requesterShift?.end_time || null,
    }));
  } catch (err) {
    error.value = err?.response?.data?.message || "Failed to load dashboard data.";
  }
};

const comingUpToday = computed(() => {
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return (allShifts.value || [])
    .filter((shift) => {
      const start = toDateTime(shift.shift_date, shift.start_time);
      return start && start > now && start <= endOfToday && !!shift.assigned_user_id;
    })
    .sort((a, b) => {
      const aStart = toDateTime(a.shift_date, a.start_time)?.getTime() || 0;
      const bStart = toDateTime(b.shift_date, b.start_time)?.getTime() || 0;
      return aStart - bStart;
    })
    .slice(0, 5)
    .map((shift) => {
      const u = shift.assignedUser || shift.user || {};
      const name = `${u.fName || ""} ${u.lName || ""}`.trim() || "Worker";
      return {
        ...shift,
        assigneeName: name,
        initials: initialsFor(u.fName, u.lName),
        positionName: shift.position?.position_name || "Shift",
        departmentName: shift.department?.department_name || deptContext.department_name || "",
        timeRange: formatRange(shift.start_time, shift.end_time),
      };
    });
});

// Preserve existing behavior: Schedule opens CreateShiftModal via query flag.
const openCreateShiftPopup = () => {
  router.push({ name: "manager-schedule", query: { createShift: "1" } });
};

onMounted(loadDashboardData);
</script>

<style scoped>
/* ── Layout ───────────────────────────────────────────────────────────── */
.db-top-row {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: var(--space-3);
}
.db-mid-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
.db-actions-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
@media (max-width: 960px) {
  .db-top-row,
  .db-mid-row,
  .db-actions-row { grid-template-columns: 1fr; }
}

/* ── Card ─────────────────────────────────────────────────────────────── */
.db-card {
  background: var(--surface-0);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.db-card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.db-card__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-1);
}
.db-card__sub {
  font-size: 13px;
  color: var(--text-2);
  margin-top: 2px;
}
.db-link {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 13px;
  color: var(--text-2);
  text-decoration: none;
  white-space: nowrap;
}
.db-link:hover { color: var(--brand-primary); }
.db-empty {
  color: var(--text-2);
  font-size: 13px;
  text-align: center;
  padding: 28px 0;
}

/* ── Working count + pulse dot ────────────────────────────────────────── */
.working-count {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.working-count__num {
  font-size: 28px;
  font-weight: 800;
  color: var(--text-1);
  line-height: 1;
}
.pulse-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
  animation: pulse 2s infinite;
  flex-shrink: 0;
}
@keyframes pulse {
  0%   { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
  70%  { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
  100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
}

/* ── Worker rows ──────────────────────────────────────────────────────── */
.worker-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}
.worker-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 10px 0;
  border-bottom: 1px solid var(--border-1);
}
.worker-row:last-child { border-bottom: none; }
.worker-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--brand-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}
.worker-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.worker-name { font-size: 14px; font-weight: 600; color: var(--text-1); }
.worker-dept { font-size: 12px; color: var(--text-2); }
.worker-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}
.worker-time { font-size: 12px; color: var(--text-2); }

/* ── Approval / unfilled rows ─────────────────────────────────────────── */
.approval-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.approval-row {
  background: var(--surface-1);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.approval-row__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-1);
}
.approval-row__name { font-size: 14px; font-weight: 600; color: var(--text-1); }
.approval-row__meta { font-size: 12px; color: var(--text-2); }

/* ── Badges ───────────────────────────────────────────────────────────── */
.badge {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
}
.badge--green  { background: #dcfce7; color: #15803d; border-color: #bbf7d0; }
.badge--orange { background: #fff7ed; color: #c2410c; border-color: #fed7aa; }
.badge--neutral { background: var(--surface-2); color: var(--text-2); border-color: var(--border-1); }

/* ── Quick action buttons ─────────────────────────────────────────────── */
.db-action-btn {
  background: var(--surface-0);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-md);
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-1);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  width: 100%;
}
.db-action-btn:hover {
  background: var(--brand-primary);
  color: #fff;
  border-color: var(--brand-primary);
}

/* keep old unused classes so any stray refs don't break -->
.status-strip { display: none; }

.avatar-row { display: inline-flex; align-items: center; gap: 4px; margin-top: 2px; }
.avatar-row__pill {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 999px;
  background-color: var(--brand-primary-lt); color: var(--brand-primary);
  font-size: 10px; font-weight: 600;
}
.avatar-row__overflow { font-family: var(--font-sans); font-size: var(--type-meta-size); color: var(--text-2); margin-left: 2px; }

.today-section, .panel {
  background-color: var(--surface-0);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  display: flex; flex-direction: column; gap: var(--space-2);
}
.today-section__head, .panel__head {
  display: flex; align-items: center; justify-content: space-between; gap: var(--space-2);
}
.today-section__head { align-items: baseline; }
.today-section__grid { height: 440px; }

.two-up { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
@media (max-width: 960px) { .two-up { grid-template-columns: 1fr; } }

.panel__link {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: var(--type-meta-size); color: var(--text-2); text-decoration: none;
}
.panel__link:hover, .list__link:hover, .shortcut-links__item:hover { color: var(--brand-primary); }
.panel__empty {
  display: flex; align-items: center; gap: var(--space-1);
  color: var(--text-2); min-height: 64px; font-size: var(--type-body-size);
}

.list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; }
.list__row { border-bottom: 1px solid var(--border-1); }
.list__row:last-child { border-bottom: 0; }
.list__link {
  display: flex; flex-direction: column; gap: 2px;
  padding: var(--space-2) 0; text-decoration: none; color: inherit;
}
.list__primary { display: flex; align-items: center; gap: var(--space-1); justify-content: space-between; }
.list__chip {
  font-family: var(--font-sans); font-size: 10px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--text-2); background-color: var(--surface-2);
  padding: 2px 6px; border-radius: 999px;
}
.list__meta { color: var(--text-2); }

.shortcut-links { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-1); padding-top: var(--space-2); }
.shortcut-links__item {
  background: transparent; border: 0; padding: 0;
  font-family: var(--font-sans); font-size: var(--type-meta-size);
  color: var(--text-2); cursor: pointer;
}
.shortcut-links__item:hover { text-decoration: underline; }
.shortcut-links__sep { color: var(--text-3); font-size: var(--type-meta-size); }
</style>
