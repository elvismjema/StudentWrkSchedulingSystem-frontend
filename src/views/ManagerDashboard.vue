<template>
  <PageFrame>
    <template #header>
      <PageHeader :title="managerHeading" :subtitle="managerSubtitle">
        <template #actions>
          <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateShiftPopup">
            Create Shift
          </v-btn>
        </template>
      </PageHeader>
    </template>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-0">{{ error }}</v-alert>

    <!-- Status strip ------------------------------------------------------ -->
    <section class="status-strip" aria-label="At-a-glance metrics">
      <StatCard
        label="Clocked in now"
        :value="workingNowCount"
        :to="{ name: 'manager-schedule', query: { filter: 'today' } }"
        icon="mdi-account-clock-outline"
      >
        <template v-if="clockedInAvatars.length" #subtitle>
          <span class="avatar-row">
            <span
              v-for="a in clockedInAvatars"
              :key="a.key"
              class="avatar-row__pill"
              :title="a.name"
            >{{ a.initials }}</span>
            <span v-if="clockedInOverflow > 0" class="avatar-row__overflow">+{{ clockedInOverflow }}</span>
          </span>
        </template>
      </StatCard>

      <StatCard
        label="Pending approvals"
        :value="pendingApprovals.length"
        :subtitle="pendingApprovals[0]?.workerName || ''"
        :to="{ name: 'manager-approvals' }"
        icon="mdi-clipboard-check-outline"
      />

      <StatCard
        label="Unfilled · next 7 days"
        :value="unfilledNext7Count"
        :subtitle="unfilledNext7Subtitle"
        :to="{ name: 'manager-schedule', query: { filter: 'open' } }"
        icon="mdi-calendar-alert"
      />

      <!-- TODO: wire to timecards weekly rollup once backend returns totals. -->
      <StatCard
        label="Labor this week"
        value="—"
        subtitle="Hours · est. cost"
        :to="{ name: 'manager-time-pay' }"
        :mute-zero="false"
        coming-soon
        icon="mdi-cash-clock"
      />
    </section>

    <!-- Today timeline ---------------------------------------------------- -->
    <section class="today-section" aria-label="Today's timeline">
      <header class="today-section__head">
        <h2 class="type-h2">Today</h2>
        <span class="type-meta">{{ todayLabel }}</span>
      </header>
      <div class="today-section__grid">
        <AvailabilityGrid
          mode="readonly"
          :range="todayRange"
          :slot-min-time="deptOpeningHour"
          :slot-max-time="deptClosingHour"
          :events="todayEvents"
          @event:click="onTimelineEventClick"
        />
      </div>
    </section>

    <!-- Two-up: Needs attention + Upcoming -------------------------------- -->
    <section class="two-up">
      <article class="panel">
        <header class="panel__head">
          <h2 class="type-h2">Needs attention</h2>
          <router-link :to="{ name: 'manager-approvals' }" class="panel__link">
            View all <v-icon size="16">mdi-arrow-right</v-icon>
          </router-link>
        </header>
        <div v-if="pendingApprovals.length === 0" class="panel__empty">
          <v-icon size="20" color="success">mdi-check-circle-outline</v-icon>
          <span>All caught up.</span>
        </div>
        <ul v-else class="list">
          <li v-for="item in pendingApprovals.slice(0, 5)" :key="item.id" class="list__row">
            <router-link :to="{ name: 'manager-approvals', hash: `#item-${item.id}` }" class="list__link">
              <div class="list__primary">
                <span class="type-h3">{{ item.workerName }}</span>
                <span class="list__chip">{{ item.type }}</span>
              </div>
              <div class="type-meta list__meta">{{ item.dateLabel }} · {{ item.timeRange }}</div>
            </router-link>
          </li>
        </ul>
      </article>

      <article class="panel">
        <header class="panel__head">
          <h2 class="type-h2">Upcoming</h2>
          <router-link :to="{ name: 'manager-schedule' }" class="panel__link">
            View schedule <v-icon size="16">mdi-arrow-right</v-icon>
          </router-link>
        </header>
        <div v-if="upcomingPreview.length === 0" class="panel__empty">
          <v-icon size="20" color="success">mdi-check-circle-outline</v-icon>
          <span>No shifts starting in the next 24 hours.</span>
        </div>
        <ul v-else class="list">
          <li v-for="shift in upcomingPreview" :key="shift.shift_id || shift.id" class="list__row">
            <router-link :to="{ name: 'manager-schedule' }" class="list__link">
              <div class="list__primary">
                <span class="type-h3">{{ shift.positionName }}</span>
                <span class="list__chip">{{ shift.assigneeName || 'Open' }}</span>
              </div>
              <div class="type-meta list__meta">{{ shift.dateLabel }} · {{ shift.timeRange }}</div>
            </router-link>
          </li>
        </ul>
      </article>
    </section>

    <!-- Demoted shortcuts ------------------------------------------------- -->
    <nav class="shortcut-links" aria-label="Shortcuts">
      <button type="button" class="shortcut-links__item" @click="openCreateShiftPopup">Create shift</button>
      <span class="shortcut-links__sep" aria-hidden="true">·</span>
      <button type="button" class="shortcut-links__item" @click="router.push({ name: 'manager-templates' })">New template</button>
      <span class="shortcut-links__sep" aria-hidden="true">·</span>
      <button type="button" class="shortcut-links__item" @click="router.push({ name: 'manager-student-workers' })">Invite worker</button>
    </nav>
  </PageFrame>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import PageFrame from "../components/PageFrame.vue";
import PageHeader from "../components/PageHeader.vue";
import StatCard from "../components/StatCard.vue";
import AvailabilityGrid from "../components/AvailabilityGrid.vue";
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

// Preserve existing behavior: Schedule opens CreateShiftModal via query flag.
const openCreateShiftPopup = () => {
  router.push({ name: "manager-schedule", query: { createShift: "1" } });
};

onMounted(loadDashboardData);
</script>

<style scoped>
.status-strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-3); }
@media (max-width: 960px) { .status-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 520px) { .status-strip { grid-template-columns: 1fr; } }

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
