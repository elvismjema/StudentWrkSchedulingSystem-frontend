<template>
  <PullToRefresh @refresh="handlePullRefresh">
  <div :class="['student-schedule', mobile ? 'pa-3' : 'pa-4']">

    <!-- Header row -->
    <div class="d-flex align-center justify-space-between mb-4 flex-wrap" style="gap:12px">
      <div :class="[mobile ? 'text-h5' : 'text-h4', 'font-weight-bold']">Schedule</div>
      <div class="text-body-2 text-medium-emphasis font-weight-medium">{{ weekRangeLabel }}</div>
    </div>

    <!-- Controls row -->
    <div :class="['d-flex', 'align-center', mobile ? 'flex-column' : 'justify-space-between', 'mb-3', 'flex-wrap']" style="gap:12px">
      <!-- Week navigation -->
      <div class="d-flex align-center" style="gap:8px">
        <v-btn icon variant="outlined" :size="mobile ? 'default' : 'small'" :min-height="mobile ? 48 : undefined" :min-width="mobile ? 48 : undefined" @click="prevWeek">
          <v-icon>mdi-chevron-left</v-icon>
        </v-btn>
        <v-btn variant="outlined" :size="mobile ? 'default' : 'small'" style="min-width:70px" :min-height="mobile ? 48 : undefined" @click="goToToday">TODAY</v-btn>
        <v-btn icon variant="outlined" :size="mobile ? 'default' : 'small'" :min-height="mobile ? 48 : undefined" :min-width="mobile ? 48 : undefined" @click="nextWeek">
          <v-icon>mdi-chevron-right</v-icon>
        </v-btn>
      </div>

      <!-- Open shifts toggle -->
      <v-btn-toggle v-model="showOpenShifts" density="compact" mandatory color="primary">
        <v-btn :value="false" size="small">My Schedule</v-btn>
        <v-btn :value="true" size="small">+ Open Shifts</v-btn>
      </v-btn-toggle>
    </div>

    <!-- Legend -->
    <div class="d-flex align-center flex-wrap mb-3" style="gap:16px">
      <div class="d-flex align-center" style="gap:6px">
        <span class="legend-dot" style="background:#80162B"></span>
        <span class="text-caption">My Shifts</span>
      </div>
      <div v-if="hasPendingAcks" class="d-flex align-center" style="gap:6px">
        <span class="legend-dot" style="background:#EF6C00"></span>
        <span class="text-caption">Needs Acknowledgement</span>
      </div>
      <div v-if="showOpenShifts" class="d-flex align-center" style="gap:6px">
        <span class="legend-dot" style="background:#0277BD"></span>
        <span class="text-caption">Open Shifts</span>
      </div>
    </div>

    <!-- Error banner -->
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" closable @click:close="error = null">
      {{ error }}
      <template #append>
        <v-btn variant="text" size="small" @click="loadShifts">Retry</v-btn>
      </template>
    </v-alert>

    <!-- Calendar -->
    <div v-if="!loading" class="calendar-wrap">
      <FullCalendar ref="calendarRef" :options="calendarOptions" />
    </div>
    <div v-else class="d-flex justify-center align-center" style="height:500px">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <!-- Event detail dialog -->
    <v-dialog v-model="eventDialog.show" max-width="460px">
      <v-card v-if="eventDialog.shift" rounded="lg">
        <v-card-title class="pa-5 pb-3 d-flex align-center" style="gap:10px">
          <v-icon :color="dialogIconColor" size="22">mdi-calendar-clock</v-icon>
          <span>{{ eventDialog.title }}</span>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <div class="mb-2 d-flex align-center" style="gap:6px">
            <v-icon size="16" color="grey">mdi-office-building</v-icon>
            <span class="text-body-2">{{ eventDialog.department }}</span>
          </div>
          <div class="mb-2 d-flex align-center" style="gap:6px">
            <v-icon size="16" color="grey">mdi-calendar</v-icon>
            <span class="text-body-2">{{ eventDialog.dateLabel }}</span>
          </div>
          <div class="d-flex align-center" style="gap:6px">
            <v-icon size="16" color="grey">mdi-clock-outline</v-icon>
            <span class="text-body-2">{{ eventDialog.timeLabel }}</span>
          </div>
          <v-alert
            v-if="eventDialog.type === 'pending_ack'"
            type="warning"
            variant="tonal"
            density="compact"
            class="mt-3"
          >
            You need to acknowledge this shift to confirm your availability.
          </v-alert>
          <v-alert
            v-if="eventDialog.claimConflict"
            type="warning"
            variant="tonal"
            density="compact"
            class="mt-3"
          >
            {{ eventDialog.claimConflict }}
          </v-alert>
        </v-card-text>
        <v-card-actions class="pa-5 pt-0 flex-wrap" style="gap:8px">
          <v-spacer />
          <v-btn variant="text" @click="eventDialog.show = false">Close</v-btn>
          <!-- My assigned shift -->
          <template v-if="eventDialog.type === 'mine'">
            <v-btn variant="outlined" size="small" color="primary" @click="onAddToCalendar">
              <v-icon start size="16">mdi-calendar-plus</v-icon>Add to Calendar
            </v-btn>
            <v-btn variant="outlined" size="small" @click="onFindCover">Find Cover</v-btn>
            <v-btn variant="outlined" size="small" @click="onTrade">Trade</v-btn>
          </template>
          <!-- Pending acknowledgement -->
          <v-btn
            v-if="eventDialog.type === 'pending_ack'"
            color="warning"
            variant="flat"
            :loading="eventDialog.loading"
            @click="onAcknowledge"
          >
            Accept
          </v-btn>
          <!-- Open shift -->
          <v-btn
            v-if="eventDialog.type === 'open'"
            color="primary"
            variant="flat"
            :loading="eventDialog.loading"
            @click="onClaim"
          >
            Pick Up
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Swap dialog -->
    <SwapDialog
      v-model="swapDialogOpen"
      :shift="swapTarget"
      :mode="swapMode"
      :coworkers="coworkers"
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
  </PullToRefresh>
</template>

<script setup>
import { ref, computed, reactive, onMounted, watch } from "vue";
import { useDisplay } from "vuetify";
import FullCalendar from "@fullcalendar/vue3";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import Utils from "../config/utils.js";
import studentService from "../services/studentService.js";
import departmentServices from "../services/departmentServices.js";
import { shiftStartDT, shiftEndDT, formatTimeRange } from "../utils/shiftDateTime.js";
import { TZ } from "../utils/tz.js";
import SwapDialog from "../components/student/SwapDialog.vue";
import PullToRefresh from "../components/mobile/PullToRefresh.vue";

const { mobile } = useDisplay();

const user = ref(Utils.getStore("user") || {});
const calendarRef = ref(null);

// â”€â”€ State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const loading = ref(true);
const error = ref(null);
const showOpenShifts = ref(true);
const allShifts = ref([]);
const openShifts = ref([]);
const pendingAcks = ref([]);
const coworkers = ref([]);
const weekRangeLabel = ref("");
const calendarHours = ref({ slotMinTime: "05:00:00", slotMaxTime: "24:00:00" });

// Swap dialog
const swapDialogOpen = ref(false);
const swapTarget = ref(null);
const swapMode = ref("cover");

// Snackbar
const snackbar = reactive({ show: false, text: "", color: "success" });
function showSnack(text, color = "success") {
  snackbar.text = text;
  snackbar.color = color;
  snackbar.show = true;
}

// Event detail dialog
const eventDialog = reactive({
  show: false,
  type: "",        // 'mine' | 'pending_ack' | 'open'
  shift: null,
  ack: null,
  title: "",
  department: "",
  dateLabel: "",
  timeLabel: "",
  loading: false,
  claimConflict: null,
});

const dialogIconColor = computed(() =>
  ({ mine: "#80162B", pending_ack: "#EF6C00", open: "#0277BD" }[eventDialog.type] || "primary")
);

const hasPendingAcks = computed(() => pendingAcks.value.length > 0);

// â”€â”€ Calendar navigation helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getCalendarApi() { return calendarRef.value?.getApi(); }
function prevWeek() { getCalendarApi()?.prev(); }
function nextWeek() { getCalendarApi()?.next(); }
function goToToday() { getCalendarApi()?.today(); }

// â”€â”€ Normalize HH:MM from DB value â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function normTime(t) {
  if (!t) return "00:00";
  const p = String(t).split(":");
  return `${String(Number(p[0])).padStart(2, "0")}:${String(Number(p[1] || 0)).padStart(2, "0")}`;
}

// â”€â”€ Calendar events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const pendingAckShiftIds = computed(() =>
  new Set(pendingAcks.value.map((a) => String(a.shift?.shift_id || a.shift?.id || "")).filter(Boolean))
);

const calendarEvents = computed(() => {
  const events = [];

  // My assigned shifts â€” maroon; skip those covered by a pending ack entry
  allShifts.value.forEach((s) => {
    if (!s.shift_date) return;
    if (pendingAckShiftIds.value.has(String(s.shift_id || s.id))) return;
    events.push({
      id: `mine-${s.shift_id || s.id}`,
      title: s.position?.position_name || s.position_name || "Shift",
      start: `${s.shift_date}T${normTime(s.start_time)}:00`,
      end: `${s.shift_date}T${normTime(s.end_time)}:00`,
      backgroundColor: "#80162B",
      borderColor: "#80162B",
      textColor: "#fff",
      extendedProps: { type: "mine", shift: s },
    });
  });

  // Pending acknowledgements â€” orange
  pendingAcks.value.forEach((ack) => {
    const s = ack.shift;
    if (!s?.shift_date) return;
    events.push({
      id: `ack-${ack.id}`,
      title: (s.position?.position_name || s.position_name || "Shift") + " âš ",
      start: `${s.shift_date}T${normTime(s.start_time)}:00`,
      end: `${s.shift_date}T${normTime(s.end_time)}:00`,
      backgroundColor: "#EF6C00",
      borderColor: "#BF360C",
      textColor: "#fff",
      extendedProps: { type: "pending_ack", ack, shift: s },
    });
  });

  // Open shifts â€” blue (only when toggle is on)
  if (showOpenShifts.value) {
    openShifts.value.forEach((s) => {
      if (!s.shift_date) return;
      events.push({
        id: `open-${s.shift_id || s.id}`,
        title: "+ " + (s.position?.position_name || s.position_name || "Open Shift"),
        start: `${s.shift_date}T${normTime(s.start_time)}:00`,
        end: `${s.shift_date}T${normTime(s.end_time)}:00`,
        backgroundColor: "#0277BD",
        borderColor: "#01579B",
        textColor: "#fff",
        extendedProps: { type: "open", shift: s },
      });
    });
  }

  return events;
});

// â”€â”€ Calendar options â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const calendarOptions = computed(() => {
  const isMobile = mobile.value;
  return {
    plugins: [timeGridPlugin, listPlugin, interactionPlugin],
    initialView: isMobile ? "listWeek" : "timeGridWeek",
    headerToolbar: false,
    allDaySlot: false,
    events: calendarEvents.value,
    slotMinTime: calendarHours.value.slotMinTime,
    slotMaxTime: calendarHours.value.slotMaxTime,
    slotDuration: "00:30:00",
    slotLabelInterval: "01:00:00",
    scrollTime: "07:00:00",
    nowIndicator: true,
    editable: false,
    selectable: false,
    eventClick: onEventClick,
    datesSet: onDatesSet,
    eventTimeFormat: { hour: "numeric", minute: "2-digit", meridiem: "short" },
    dayHeaderFormat: { weekday: "short", month: "numeric", day: "numeric", omitCommas: true },
    height: isMobile ? "auto" : 700,
    expandRows: true,
  };
});

// Switch calendar view when breakpoint changes
watch(mobile, (isMobile) => {
  const api = getCalendarApi();
  if (api) {
    api.changeView(isMobile ? "listWeek" : "timeGridWeek");
  }
});

// â”€â”€ Calendar callbacks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function onDatesSet(info) {
  const start = info.start;
  const end = new Date(info.end);
  end.setDate(end.getDate() - 1);
  const opts = { timeZone: TZ, month: "long", day: "numeric" };
  weekRangeLabel.value =
    start.toLocaleDateString("en-US", opts) +
    " \u2013 " +
    end.toLocaleDateString("en-US", { ...opts, year: "numeric" });
}

function onEventClick(info) {
  const { type, shift, ack } = info.event.extendedProps;
  const title = shift?.position?.position_name || shift?.position_name || "Shift";
  const department =
    shift?.department_name || shift?.department?.department_name || "â€”";
  const dateLabel = shift?.shift_date
    ? new Date(shift.shift_date + "T00:00:00").toLocaleDateString("en-US", {
        timeZone: TZ,
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "â€”";
  const timeLabel = formatTimeRange(shift);
  Object.assign(eventDialog, {
    show: true,
    type,
    shift,
    ack: ack || null,
    title,
    department,
    dateLabel,
    timeLabel,
    loading: false,
    claimConflict: null,
  });
}

// â”€â”€ Dialog actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function onAcknowledge() {
  const ack = eventDialog.ack;
  if (!ack) return;
  eventDialog.loading = true;
  try {
    await studentService.acknowledgeShift(ack.id);
    eventDialog.show = false;
    showSnack("Shift accepted!");
    // Reload all schedule data from the server so the shift cleanly
    // transitions from orange (pending ack) to maroon (my shifts).
    await loadShifts();
  } catch {
    showSnack("Failed to accept shift", "error");
  } finally {
    eventDialog.loading = false;
  }
}

async function onClaim() {
  const shift = eventDialog.shift;
  if (!shift) return;
  eventDialog.loading = true;
  eventDialog.claimConflict = null;
  try {
    await studentService.claimOpenShift(shift.shift_id || shift.id);
    openShifts.value = openShifts.value.filter(
      (s) => (s.shift_id || s.id) !== (shift.shift_id || shift.id)
    );
    eventDialog.show = false;
    showSnack("Claim submitted. Waiting for manager approval.");
    const userId = user.value?.userId || user.value?.id;
    const res = await studentService.getShifts({ assigned_user_id: userId, is_published: true });
    allShifts.value = res?.data?.data || res?.data || [];
  } catch (err) {
    const msg = err?.response?.data?.message;
    if (msg?.toLowerCase().includes("conflict")) {
      eventDialog.claimConflict = msg;
    } else {
      showSnack(msg || "Failed to pick up shift", "error");
    }
  } finally {
    eventDialog.loading = false;
  }
}

function onFindCover() {
  swapTarget.value = eventDialog.shift;
  swapMode.value = "cover";
  eventDialog.show = false;
  swapDialogOpen.value = true;
}

function onTrade() {
  swapTarget.value = eventDialog.shift;
  swapMode.value = "trade";
  eventDialog.show = false;
  swapDialogOpen.value = true;
}

function onAddToCalendar() {
  const shift = eventDialog.shift;
  const start = new Date(shiftStartDT(shift));
  const end = new Date(shiftEndDT(shift));
  const dept = shift.department_name || shift.department?.department_name || "Work Shift";
  const fmt = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  window.open(
    `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(dept)}&dates=${fmt(start)}/${fmt(end)}&location=${encodeURIComponent(dept)}`,
    "_blank",
    "noopener,noreferrer"
  );
}

async function handleSwapSubmit() {
  swapDialogOpen.value = false;
  showSnack("Request submitted!");
  await loadShifts();
}

// â”€â”€ Data loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function normalizeOpenShiftPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    if (Array.isArray(payload.shifts)) return payload.shifts;
    if (Array.isArray(payload.preview)) return payload.preview;
  }
  return [];
}

const pickCalendarBoundsFromHours = (hoursRows = []) => {
  const valid = hoursRows.filter((row) => row?.open_time && row?.close_time && row.open_time < row.close_time);
  if (!valid.length) return { slotMinTime: "05:00:00", slotMaxTime: "24:00:00" };
  const mins = valid.map((row) => `${String(row.open_time).slice(0, 5)}:00`).sort();
  const maxs = valid.map((row) => `${String(row.close_time).slice(0, 5)}:00`).sort();
  return { slotMinTime: mins[0], slotMaxTime: maxs[maxs.length - 1] };
};

const loadDepartmentCalendarHours = async (departmentIds = []) => {
  const uniq = [...new Set((departmentIds || []).map((id) => Number(id)).filter(Boolean))];
  if (!uniq.length) {
    calendarHours.value = { slotMinTime: "05:00:00", slotMaxTime: "24:00:00" };
    return;
  }

  try {
    const responses = await Promise.all(uniq.map((deptId) => departmentServices.getDepartmentHours(deptId)));
    const allRows = responses.flatMap((res) => res?.data?.data || []);
    calendarHours.value = pickCalendarBoundsFromHours(allRows);
  } catch {
    calendarHours.value = { slotMinTime: "05:00:00", slotMaxTime: "24:00:00" };
  }
};

async function loadShifts() {
  loading.value = true;
  error.value = null;
  try {
    // Use a wide date window so calendar navigation works without re-fetching.
    // getMySchedule embeds each shift's acknowledgements in a single call —
    // this is the single source of truth that eliminates the two-source sync bug.
    const now = new Date();
    const wideStart = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().slice(0, 10);
    const wideEnd = new Date(now.getFullYear(), now.getMonth() + 6, 0).toISOString().slice(0, 10);

    const [scheduleRes, openRes] = await Promise.allSettled([
      studentService.getMySchedule({ startDate: wideStart, endDate: wideEnd }),
      studentService.getOpenShifts(),
    ]);

    if (scheduleRes.status === "fulfilled") {
      const shifts = scheduleRes.value?.data?.data || scheduleRes.value?.data || [];
      allShifts.value = shifts;
      // Derive pending acks directly from the embedded acknowledgements on each shift.
      // This ensures allShifts and pendingAcks are always in sync.
      pendingAcks.value = shifts
        .filter((s) => s.acknowledgements?.some((a) => !a.acknowledged))
        .map((s) => {
          const ack = s.acknowledgements.find((a) => !a.acknowledged);
          return { id: ack.id, acknowledged: ack.acknowledged, acknowledgedAt: ack.acknowledgedAt, shift: s };
        });
    }

    if (openRes.status === "fulfilled") {
      openShifts.value = normalizeOpenShiftPayload(
        openRes.value?.data?.data || openRes.value?.data
      );
    }

    const departmentIds = [
      ...allShifts.value.map((s) => s.department_id || s.department?.department_id || s.department?.id),
      ...openShifts.value.map((s) => s.department_id || s.department?.department_id || s.department?.id),
    ];
    await loadDepartmentCalendarHours(departmentIds);
  } catch (err) {
    error.value = "Failed to load schedule. Please try again.";
    console.error("Schedule load failed:", err);
  } finally {
    loading.value = false;
  }
}

async function handlePullRefresh(done) {
  await loadShifts();
  done();
}

onMounted(loadShifts);
</script>

<style scoped>
.student-schedule {
  width: 100%;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

/* â”€â”€ Calendar wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.calendar-wrap {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e0e0e0;
}

.calendar-wrap :deep(.fc) {
  font-family: inherit;
}

/* Column headers */
.calendar-wrap :deep(.fc-col-header-cell) {
  padding: 10px 0;
  background: #fafafa;
  border-bottom: 1px solid #e0e0e0;
}

.calendar-wrap :deep(.fc-col-header-cell-cushion) {
  font-size: 13px;
  font-weight: 600;
  color: #444;
  text-decoration: none;
}

/* Today column highlight */
.calendar-wrap :deep(.fc-day-today) {
  background: rgba(128, 22, 43, 0.03) !important;
}

.calendar-wrap :deep(.fc-col-header-cell.fc-day-today .fc-col-header-cell-cushion) {
  color: #80162B;
}

/* Time slot labels */
.calendar-wrap :deep(.fc-timegrid-slot-label-cushion) {
  font-size: 12px;
  color: #999;
}

/* Event tiles */
.calendar-wrap :deep(.fc-event) {
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  padding: 2px 5px;
}

/* Now indicator — maroon */
.calendar-wrap :deep(.fc-timegrid-now-indicator-line) {
  border-color: #80162B;
}
.calendar-wrap :deep(.fc-timegrid-now-indicator-arrow) {
  border-top-color: #80162B;
  border-bottom-color: #80162B;
}

/* List view (mobile) — larger tap targets */
.calendar-wrap :deep(.fc-list-event) {
  cursor: pointer;
}
.calendar-wrap :deep(.fc-list-event td) {
  padding: 10px 8px;
  min-height: 48px;
}
.calendar-wrap :deep(.fc-list-day-cushion) {
  padding: 10px 8px;
  font-weight: 600;
}
</style>
