<template>
  <div class="student-schedule pa-6">
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-4">
      <div class="text-h4 font-weight-bold">Schedule</div>
      <v-btn-toggle v-model="activeTab" density="compact" mandatory color="primary">
        <v-btn value="mine" size="small" aria-label="My Schedule">My Schedule</v-btn>
        <v-btn value="open" size="small" aria-label="Open Shifts">Open Shifts</v-btn>
      </v-btn-toggle>
    </div>

    <!-- Week Strip — full width -->
    <WeekStrip
      :selected-date="selectedDate"
      :shift-dates="shiftDates"
      class="mb-6"
      @select-day="selectedDate = $event"
      @change-week="handleWeekChange"
    />

    <!-- Loading -->
    <template v-if="loading">
      <v-row>
        <v-col v-for="n in 3" :key="n" cols="12" md="4">
          <v-skeleton-loader type="card" />
        </v-col>
      </v-row>
    </template>

    <!-- Error -->
    <v-alert v-else-if="error" type="error" variant="tonal" class="mb-4" closable>
      {{ error }}
      <template #append>
        <v-btn variant="text" size="small" @click="loadShifts">Retry</v-btn>
      </template>
    </v-alert>

    <template v-else>
      <!-- My Schedule Tab -->
      <div v-if="activeTab === 'mine'">
        <!-- Selected day label -->
        <div class="text-subtitle-1 font-weight-medium text-medium-emphasis mb-3">
          {{ selectedDayLabel }}
        </div>

        <!-- Shifts for selected day — grid layout -->
        <template v-if="selectedDayShifts.length">
          <v-row>
            <v-col
              v-for="shift in selectedDayShifts"
              :key="shift.id"
              cols="12"
              sm="6"
              lg="4"
            >
              <ShiftCard
                :shift="shift"
                :show-actions="true"
                class="fill-height"
                @find-cover="openSwap($event, 'cover')"
                @trade="openSwap($event, 'trade')"
                @add-to-calendar="addToCalendar"
              />
            </v-col>
          </v-row>
        </template>

        <!-- Empty state -->
        <v-card v-else elevation="0" rounded="lg" border class="pa-8 text-center">
          <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-calendar-blank-outline</v-icon>
          <div class="text-body-1 text-medium-emphasis">No shifts on this day</div>
          <div class="text-caption text-medium-emphasis">
            Select a different day above, or check Open Shifts
          </div>
        </v-card>

        <!-- Pending Acknowledgements -->
        <div v-if="pendingAcks.length" class="mt-6">
          <div class="text-subtitle-1 font-weight-bold mb-3">
            <v-icon size="18" class="mr-1">mdi-alert-circle-outline</v-icon>
            Shifts to Acknowledge ({{ pendingAcks.length }})
          </div>
          <v-row>
            <v-col
              v-for="ack in pendingAcks"
              :key="ack.id"
              cols="12"
              sm="6"
              lg="4"
            >
              <v-card
                elevation="0"
                rounded="lg"
                border
                class="pa-4 d-flex align-center justify-space-between fill-height"
              >
                <div>
                  <div class="text-body-2 font-weight-medium">
                    {{ ack.shift?.department?.department_name || ack.shift?.department_name || "Shift" }} — {{ formatDate(ack.shift?.shift_date || ack.shift?.date) }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ ack.shift ? formatTimeRange(ack.shift) : "" }}
                  </div>
                </div>
                <div class="d-flex ga-2">
                  <v-btn
                    size="small"
                    color="primary"
                    variant="flat"
                    :loading="ack._loading"
                    @click="acknowledgeShift(ack)"
                  >
                    Accept
                  </v-btn>
                </div>
              </v-card>
            </v-col>
          </v-row>
        </div>
      </div>

      <!-- Open Shifts Tab -->
      <div v-else>
        <!-- Department filter -->
        <div v-if="allOpenShifts.length > 0 || departmentFilter" class="d-flex align-center mb-4 flex-wrap" style="gap: 12px">
          <v-select
            v-model="departmentFilter"
            :items="openShiftDepartments"
            item-title="title"
            item-value="value"
            label="Filter by Department"
            variant="outlined"
            density="compact"
            hide-details
            style="max-width: 280px"
          />
          <span class="text-body-2 text-medium-emphasis">
            {{ openShifts.length }} shift{{ openShifts.length !== 1 ? 's' : '' }} available
          </span>
        </div>

        <template v-if="openShifts.length">
          <v-row>
            <v-col
              v-for="shift in openShifts"
              :key="shift.id"
              cols="12"
              sm="6"
              lg="4"
            >
              <v-card
                elevation="0"
                rounded="lg"
                border
                class="d-flex fill-height"
              >
                <div class="open-shift-color" :style="{ backgroundColor: getDeptColor(shift) }"></div>
                <div class="pa-4 flex-grow-1">
                  <div class="text-body-1 font-weight-bold mb-1">
                    {{ shift.department_name || shift.department?.department_name || "Open Shift" }}
                  </div>
                  <div class="text-body-2 text-medium-emphasis mb-1">
                    {{ formatDate(shift.shift_date || shift.date) }} · {{ formatTimeRange(shift) }}
                  </div>
                  <div v-if="shift.location" class="text-caption text-medium-emphasis mb-3">
                    <v-icon size="12" class="mr-1">mdi-map-marker</v-icon>{{ shift.location }}
                  </div>
                  <v-btn
                    color="primary"
                    variant="flat"
                    size="small"
                    block
                    :loading="shift._claiming"
                    @click="claimShift(shift)"
                  >
                    Pick Up
                  </v-btn>
                  <v-alert
                    v-if="shift._conflict"
                    type="warning"
                    variant="tonal"
                    density="compact"
                    class="mt-2"
                  >
                    {{ shift._conflict }}
                  </v-alert>
                </div>
              </v-card>
            </v-col>
          </v-row>
        </template>

        <v-card v-else elevation="0" rounded="lg" border class="pa-8 text-center">
          <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-briefcase-off</v-icon>
          <div class="text-body-1 text-medium-emphasis">
            {{ departmentFilter ? 'No open shifts in this department' : 'No open shifts available' }}
          </div>
          <div class="text-caption text-medium-emphasis">
            {{ departmentFilter ? 'Try clearing the filter or check back later' : 'Check back later \u2014 new shifts get posted regularly' }}
          </div>
          <v-btn
            v-if="departmentFilter"
            variant="text"
            color="primary"
            size="small"
            class="mt-2"
            @click="departmentFilter = ''"
          >
            Clear Filter
          </v-btn>
        </v-card>
      </div>
    </template>

    <!-- Swap Dialog -->
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
</template>

<script setup>
import { ref, computed, watch, reactive, onMounted } from "vue";
import { useRoute } from "vue-router";
import Utils from "../config/utils.js";
import studentService from "../services/studentService.js";
import { buildDateTime, shiftStartDT, shiftEndDT, shiftDateStr, formatTimeRange, formatShiftDate as formatDate } from "../utils/shiftDateTime.js";
import { TZ, localDateStr } from "../utils/tz.js";
import WeekStrip from "../components/student/WeekStrip.vue";
import ShiftCard from "../components/student/ShiftCard.vue";
import SwapDialog from "../components/student/SwapDialog.vue";

const route = useRoute();
const user = ref(Utils.getStore("user") || {});

// State
const loading = ref(true);
const error = ref(null);
const selectedDate = ref(localDateStr());
const activeTab = ref(route.query.tab === "open" ? "open" : "mine");
const allShifts = ref([]);
const openShifts = ref([]);
const allOpenShifts = ref([]); // unfiltered copy for building dept dropdown
const pendingAcks = ref([]);
const coworkers = ref([]);
const departmentFilter = ref(route.query.departmentId || '');

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

function normalizeOpenShiftPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    if (Array.isArray(payload.shifts)) return payload.shifts;
    if (Array.isArray(payload.preview)) return payload.preview;
  }
  return [];
}

// Computed
const shiftDates = computed(() =>
  [...new Set(allShifts.value.map((s) => {
    // Prefer shift_date directly (already YYYY-MM-DD)
    if (s.shift_date) return s.shift_date;
    const d = shiftStartDT(s);
    if (!d) return null;
    const dt = new Date(d);
    return isNaN(dt) ? null : localDateStr(dt);
  }).filter(Boolean))]
);

const selectedDayShifts = computed(() => {
  return allShifts.value
    .filter((s) => {
      if (s.shift_date) return s.shift_date === selectedDate.value;
      const d = shiftStartDT(s);
      if (!d) return false;
      const dt = new Date(d);
      return !isNaN(dt) && localDateStr(dt) === selectedDate.value;
    })
    .sort((a, b) => new Date(shiftStartDT(a)) - new Date(shiftStartDT(b)));
});

const selectedDayLabel = computed(() => {
  const d = new Date(selectedDate.value + "T00:00:00");
  return d.toLocaleDateString("en-US", { timeZone: TZ, weekday: "long", month: "long", day: "numeric" });
});

// Unique departments from ALL open shifts (unfiltered) for the dropdown
const openShiftDepartments = computed(() => {
  const depts = new Map();
  allOpenShifts.value.forEach((s) => {
    const id = String(s.department_id || s.department?.department_id || '');
    const name = s.department_name || s.department?.department_name || 'Unknown';
    if (id) depts.set(id, name);
  });
  return [{ value: '', title: 'All Departments' }, ...Array.from(depts, ([value, title]) => ({ value, title }))];
});

// Data loading
async function loadShifts() {
  loading.value = true;
  error.value = null;
  const userId = user.value?.userId || user.value?.id;

  // Build open-shift params — pass departmentId for server-side filter
  const openParams = {};
  if (departmentFilter.value) openParams.departmentId = departmentFilter.value;

  try {
    const [shiftsRes, allOpenRes, filteredOpenRes, acksRes] = await Promise.allSettled([
      studentService.getShifts({ assigned_user_id: userId, is_published: true }),
      studentService.getOpenShifts(),                   // unfiltered — for dropdown
      studentService.getOpenShifts(openParams),          // filtered — for display
      studentService.getPendingAcknowledgements(),
    ]);

    if (shiftsRes.status === "fulfilled") {
      allShifts.value = shiftsRes.value?.data?.data || shiftsRes.value?.data || [];
    }
    // All open shifts (unfiltered) — used to build the department dropdown
    if (allOpenRes.status === "fulfilled") {
      allOpenShifts.value = normalizeOpenShiftPayload(allOpenRes.value?.data?.data || allOpenRes.value?.data);
    }
    // Filtered open shifts — what we actually display
    if (filteredOpenRes.status === "fulfilled") {
      openShifts.value = normalizeOpenShiftPayload(filteredOpenRes.value?.data?.data || filteredOpenRes.value?.data).map((s) => ({
        ...s,
        _claiming: false,
        _conflict: null,
      }));
    }
    if (acksRes.status === "fulfilled") {
      pendingAcks.value = (acksRes.value?.data?.data || acksRes.value?.data || [])
        .filter((a) => !a.acknowledged && !a.acknowledgedAt && !a.acknowledged_at)
        .map((a) => ({ ...a, _loading: false, _declining: false }));
    }
  } catch (err) {
    error.value = "Failed to load schedule. Please try again.";
    console.error("Schedule load failed:", err);
  } finally {
    loading.value = false;
  }
}

function handleWeekChange({ monday }) {
  selectedDate.value = monday;
}

// When department filter changes, re-fetch open shifts from API (server-side filter)
watch(departmentFilter, async () => {
  await loadOpenShifts();
});

// Watch for tab changes to reload open shifts if needed
watch(activeTab, (tab) => {
  if (tab === "open") {
    loadOpenShifts();
  }
});

async function loadOpenShifts() {
  try {
    const params = {};
    if (departmentFilter.value) params.departmentId = departmentFilter.value;
    const res = await studentService.getOpenShifts(params);
    openShifts.value = normalizeOpenShiftPayload(res?.data?.data || res?.data).map((s) => ({
      ...s,
      _claiming: false,
      _conflict: null,
    }));
  } catch (err) {
    showSnack("Failed to load open shifts", "error");
  }
}

async function claimShift(shift) {
  shift._claiming = true;
  try {
    await studentService.claimOpenShift(shift.shift_id || shift.id);
    openShifts.value = openShifts.value.filter((s) => (s.shift_id || s.id) !== (shift.shift_id || shift.id));
    showSnack("Claim submitted. Waiting for manager approval.");
    // Reload my shifts so it shows in My Schedule
    const userId = user.value?.userId || user.value?.id;
    const res = await studentService.getShifts({ assigned_user_id: userId, is_published: true });
    allShifts.value = res?.data?.data || res?.data || [];
  } catch (err) {
    const msg = err?.response?.data?.message;
    if (msg?.toLowerCase().includes("conflict")) {
      shift._conflict = msg;
    } else {
      showSnack(msg || "Failed to pick up shift", "error");
    }
  } finally {
    shift._claiming = false;
  }
}

async function acknowledgeShift(ack) {
  ack._loading = true;
  try {
    await studentService.acknowledgeShift(ack.id);
    pendingAcks.value = pendingAcks.value.filter((a) => a.id !== ack.id);
    showSnack("Shift accepted!");
  } catch (err) {
    showSnack("Failed to accept shift", "error");
  } finally {
    ack._loading = false;
  }
}

// Swap
function openSwap(shift, mode) {
  swapTarget.value = shift;
  swapMode.value = mode;
  swapDialogOpen.value = true;
}

async function handleSwapSubmit() {
  swapDialogOpen.value = false;
  showSnack("Request submitted!");
  await loadAll();
}

function addToCalendar(shift) {
  const start = new Date(shiftStartDT(shift));
  const end = new Date(shiftEndDT(shift));
  const dept = shift.department_name || shift.department?.department_name || "Work Shift";
  const loc = shift.department_name || shift.location || "";

  const fmt = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(dept)}&dates=${fmt(start)}/${fmt(end)}&location=${encodeURIComponent(loc)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

// Helpers


function getDeptColor(shift) {
  const name = (shift.department_name || shift.department?.department_name || "").toLowerCase();
  const colors = {
    barista: "#6F4E37", library: "#196CA2", dining: "#E85D04",
    maintenance: "#2D6A4F", tutoring: "#7B2D8E", athletics: "#1B4332",
  };
  for (const [k, v] of Object.entries(colors)) {
    if (name.includes(k)) return v;
  }
  return shift.department_color || "#80162B";
}

onMounted(loadShifts);
</script>

<style scoped>
.student-schedule {
  width: 100%;
}

.open-shift-color {
  width: 4px;
  flex-shrink: 0;
  border-radius: 4px 0 0 4px;
}
</style>
