<template>
  <PullToRefresh @refresh="handlePullRefresh">

    <!-- ═══════════════════════════════════════════════════
         MOBILE LAYOUT  (phone width)
    ════════════════════════════════════════════════════ -->
    <div v-if="mobile" class="home-screen">

      <!-- ── Greeting ─────────────────────────────────── -->
      <div class="home-greeting">
        <div class="home-greeting-name">Hi, {{ firstName }} 👋</div>
        <div class="home-greeting-date">{{ todayLabel }}</div>
      </div>

      <!-- ── Shift Acknowledgements (priority 0) ────────── -->
      <div v-if="pendingAcknowledgements.length" class="home-section">
        <div class="ack-banner">
          <div class="ack-banner-head">
            <v-icon size="16" color="#EA580C">mdi-bell-ring-outline</v-icon>
            <span>{{ pendingAcknowledgements.length }} shift{{ pendingAcknowledgements.length > 1 ? 's' : '' }} need your response</span>
          </div>
          <div v-for="ack in pendingAcknowledgements" :key="ack.id" class="ack-item">
            <div class="ack-item-info">
              <div class="ack-item-dept">{{ ack.shift?.department?.department_name || 'New Shift' }}</div>
              <div class="ack-item-time">
                {{ formatShiftDate(ack.shift) }} &middot; {{ ack.shift?.start_time?.slice(0,5) }} – {{ ack.shift?.end_time?.slice(0,5) }}
              </div>
            </div>
            <div class="ack-item-actions">
              <button
                class="ack-btn ack-btn--accept"
                :disabled="acknowledgingId !== null"
                @click="acknowledgeShift(ack)"
              >Accept</button>
              <button
                class="ack-btn ack-btn--cover"
                :disabled="acknowledgingId !== null"
                @click="acknowledgeAndFindCover(ack)"
              >Cover</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Clock Status Banner (priority 1) ──────────── -->
      <div class="home-section">
        <ClockStatusBanner
          :clocked-in="clockStatus.isClockedIn"
          :clock-in-time="clockStatus.clockInTime"
          :on-break="clockStatus.onBreak"
          :loading="clockingIn"
          @clock-in="handleClockIn"
          @clock-out="handleClockOut"
          @start-break="handleStartBreak"
          @end-break="handleEndBreak"
        />
      </div>

      <!-- ── Loading ────────────────────────────────────── -->
      <template v-if="loading">
        <div class="home-section">
          <v-skeleton-loader type="card" rounded="lg" />
        </div>
        <div class="home-section">
          <v-skeleton-loader type="sentences" rounded="lg" />
        </div>
      </template>

      <!-- ── Error ──────────────────────────────────────── -->
      <div v-else-if="error" class="home-section">
        <div class="error-card">
          <span>{{ error }}</span>
          <button class="error-retry" @click="loadDashboard">Retry</button>
        </div>
      </div>

      <template v-else>
        <!-- ── Next Shift (priority 2) ───────────────────── -->
        <div class="home-section">
          <div class="section-eyebrow">{{ nextShiftLabel || 'NEXT SHIFT' }}</div>
          <div
            v-if="nextShift"
            class="shift-hero-card"
          >
            <div class="shift-hero-accent" :style="{ background: nextShiftColor }"></div>
            <div class="shift-hero-body">
              <div class="shift-hero-dept">
                {{ nextShift.department_name || nextShift.department?.department_name || 'Shift' }}
              </div>
              <div class="shift-hero-meta">
                <v-icon size="13" class="mr-1">mdi-calendar-outline</v-icon>
                {{ formatShiftDate(nextShift) }}
              </div>
              <div class="shift-hero-meta">
                <v-icon size="13" class="mr-1">mdi-clock-outline</v-icon>
                {{ formatTimeRange(nextShift) }}
              </div>
              <div v-if="nextShiftPosition" class="shift-hero-meta">
                <v-icon size="13" class="mr-1">mdi-badge-account-outline</v-icon>
                {{ nextShiftPosition }}
              </div>
              <button class="shift-hero-cta" @click="openSwapDialog(nextShift)">
                <v-icon size="15" class="mr-1">mdi-account-switch</v-icon>
                Find Cover
              </button>
            </div>
          </div>
          <div v-else class="empty-card">
            <v-icon size="36" color="#D1D5DB">mdi-calendar-blank-outline</v-icon>
            <div class="empty-card-text">No upcoming shifts</div>
            <div class="empty-card-sub">Check the Schedule tab for open shifts</div>
          </div>
        </div>

        <!-- ── This Week Stats (priority 3) ──────────────── -->
        <div class="home-section">
          <div class="section-eyebrow">THIS WEEK</div>
          <div class="stats-strip">
            <div class="stat-cell">
              <div class="stat-value" style="color: #80162B">{{ weeklyHours }}h</div>
              <div class="stat-label">Hours</div>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-cell">
              <div class="stat-value" style="color: #196CA2">{{ weeklyShifts }}</div>
              <div class="stat-label">Shifts</div>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-cell">
              <div class="stat-value" style="color: #2E7D32">${{ estimatedEarnings }}</div>
              <div class="stat-label">Est. Pay</div>
            </div>
          </div>
        </div>

        <!-- ── Open Shifts Preview (priority 4) ──────────── -->
        <div v-if="openShiftsCount > 0 || topOpenShifts.length" class="home-section">
          <div class="section-header">
            <div class="section-eyebrow" style="margin-bottom:0">OPEN SHIFTS</div>
            <button
              class="section-link"
              @click="$router.push({ name: 'student-schedule', query: { tab: 'open' } })"
            >
              See all<span v-if="openShiftsCount > 0"> ({{ openShiftsCount }})</span>
            </button>
          </div>
          <div class="open-shifts-list">
            <div
              v-for="shift in topOpenShifts"
              :key="shift.id || shift.shift_id"
              class="open-shift-row"
              @click="goToOpenShiftsForDept(shift)"
            >
              <div class="open-shift-bar"></div>
              <div class="open-shift-info">
                <div class="open-shift-dept">{{ shift.department?.department_name || shift.department_name }}</div>
                <div class="open-shift-time">{{ formatTimeRange(shift) }} &middot; {{ formatShiftDate(shift) }}</div>
              </div>
              <v-icon size="16" color="#D1D5DB">mdi-chevron-right</v-icon>
            </div>
            <div v-if="!topOpenShifts.length" class="open-shift-row">
              <div class="open-shift-info">
                <div class="open-shift-time">No shifts visible right now</div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Pending Requests (priority 5) ─────────────── -->
        <div v-if="pendingRequests.length" class="home-section">
          <div class="section-eyebrow">PENDING REQUESTS</div>
          <div class="requests-list">
            <div v-for="req in pendingRequests" :key="req.id" class="request-row">
              <v-icon size="16" :color="req.iconColor" class="request-icon">{{ req.icon }}</v-icon>
              <div class="request-info">
                <span class="request-label">{{ req.label }}</span>
              </div>
              <v-chip :color="req.statusColor" size="x-small" variant="tonal" class="flex-shrink-0">
                {{ req.statusLabel }}
              </v-chip>
              <v-btn
                v-if="req.type === 'time_off' && req.status === 'pending'"
                size="x-small"
                variant="text"
                color="error"
                :loading="req.cancelling"
                icon="mdi-close"
                aria-label="Cancel request"
                class="flex-shrink-0"
                @click.stop="cancelRequest(req)"
              />
            </div>
          </div>
        </div>
      </template><!-- /v-else -->
    </div><!-- /mobile -->


    <!-- ═══════════════════════════════════════════════════
         DESKTOP LAYOUT  (tablet / desktop)
    ════════════════════════════════════════════════════ -->
    <div v-else class="student-dashboard pa-6">
      <!-- Header -->
      <div class="dashboard-header mb-6">
        <div class="text-h4 font-weight-bold">Hi, {{ firstName }}!</div>
        <div class="text-body-1 text-medium-emphasis">{{ todayLabel }}</div>
      </div>

      <!-- Ack Alert (desktop) -->
      <v-alert
        v-if="pendingAcknowledgements.length > 0"
        type="warning"
        variant="tonal"
        prominent
        border="start"
        class="mb-6 ack-alert"
      >
        <template #title>
          <span class="text-subtitle-1 font-weight-bold">
            {{ pendingAcknowledgements.length }} new shift{{ pendingAcknowledgements.length > 1 ? 's' : '' }} assigned to you
          </span>
        </template>
        <template #text>
          <div class="mt-2">
            <v-card
              v-for="ack in pendingAcknowledgements"
              :key="ack.id"
              class="mb-2 ack-card"
              elevation="0"
              rounded="lg"
              color="white"
            >
              <div class="ack-card__bar"></div>
              <div class="pa-4 d-flex align-center justify-space-between flex-wrap" style="gap: 12px; flex: 1">
                <div>
                  <div class="text-subtitle-2 font-weight-bold mb-1">
                    {{ ack.shift?.department?.department_name || 'New Shift Assigned' }}
                  </div>
                  <div class="d-flex align-center flex-wrap text-body-2 text-medium-emphasis" style="gap: 12px">
                    <span v-if="ack.shift?.shift_date">
                      <v-icon size="14" class="mr-1">mdi-calendar</v-icon>
                      {{ new Date(ack.shift.shift_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) }}
                    </span>
                    <span v-if="ack.shift?.start_time && ack.shift?.end_time">
                      <v-icon size="14" class="mr-1">mdi-clock-outline</v-icon>
                      {{ ack.shift.start_time.slice(0, 5) }} – {{ ack.shift.end_time.slice(0, 5) }}
                    </span>
                  </div>
                </div>
                <div class="d-flex ga-2">
                  <v-btn color="success" variant="flat" size="small" :loading="acknowledgingId === ack.id" :disabled="acknowledgingId !== null" prepend-icon="mdi-check-circle" @click="acknowledgeShift(ack)">Acknowledge</v-btn>
                  <v-btn color="primary" variant="outlined" size="small" :loading="acknowledgingId === ack.id + '-cover'" :disabled="acknowledgingId !== null" prepend-icon="mdi-account-switch" @click="acknowledgeAndFindCover(ack)">Find Cover</v-btn>
                </div>
              </div>
            </v-card>
          </div>
        </template>
      </v-alert>

      <!-- Clock Status Banner (desktop) -->
      <ClockStatusBanner
        :clocked-in="clockStatus.isClockedIn"
        :clock-in-time="clockStatus.clockInTime"
        :on-break="clockStatus.onBreak"
        :loading="clockingIn"
        class="mb-6"
        @clock-in="handleClockIn"
        @clock-out="handleClockOut"
        @start-break="handleStartBreak"
        @end-break="handleEndBreak"
      />

      <!-- Loading (desktop) -->
      <template v-if="loading">
        <v-row>
          <v-col cols="12"><v-skeleton-loader type="card" class="mb-4" /></v-col>
          <v-col cols="12"><v-skeleton-loader type="chip, chip, chip, chip, chip, chip, chip" class="mb-4" /></v-col>
          <v-col cols="12" md="4"><v-skeleton-loader type="card" /></v-col>
          <v-col cols="12" md="4"><v-skeleton-loader type="card" /></v-col>
          <v-col cols="12" md="4"><v-skeleton-loader type="card" /></v-col>
        </v-row>
      </template>

      <v-alert v-else-if="error" type="error" variant="tonal" class="mb-4" closable>
        {{ error }}
        <template #append><v-btn variant="text" size="small" @click="loadDashboard">Retry</v-btn></template>
      </v-alert>

      <template v-else>
        <!-- Next Shift (desktop) -->
        <v-card v-if="nextShift" class="next-shift-card mb-6" elevation="0" rounded="lg" border>
          <div class="next-shift-card__bar" :style="{ backgroundColor: nextShiftColor }"></div>
          <div class="pa-5 flex-grow-1">
            <v-chip size="x-small" color="primary" variant="tonal" class="mb-2">{{ nextShiftLabel }}</v-chip>
            <div class="text-h6 font-weight-bold mb-1">{{ nextShift.department_name || nextShift.department?.department_name || 'Shift' }}</div>
            <div class="d-flex align-center text-body-2 text-medium-emphasis mb-1"><v-icon size="16" class="mr-1">mdi-calendar</v-icon>{{ formatShiftDate(nextShift) }}</div>
            <div class="d-flex align-center text-body-2 text-medium-emphasis mb-1"><v-icon size="16" class="mr-1">mdi-clock-outline</v-icon>{{ formatTimeRange(nextShift) }}</div>
            <div v-if="nextShiftPosition" class="d-flex align-center text-body-2 text-medium-emphasis mb-3"><v-icon size="16" class="mr-1">mdi-badge-account-outline</v-icon>{{ nextShiftPosition }}</div>
            <v-btn variant="outlined" color="primary" @click="openSwapDialog(nextShift)"><v-icon start>mdi-account-switch</v-icon>Find Cover</v-btn>
          </div>
        </v-card>
        <v-card v-else class="mb-6 pa-8 text-center" elevation="0" rounded="lg" border>
          <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-calendar-blank</v-icon>
          <div class="text-body-1 text-medium-emphasis">No upcoming shifts</div>
          <div class="text-caption text-medium-emphasis">Check the Open Shifts tab for available shifts</div>
        </v-card>

        <!-- Week Strip (desktop only) -->
        <WeekStrip :selected-date="selectedDate" :shift-dates="shiftDates" class="mb-6" @select-day="selectedDate = $event" @change-week="onWeekChange" />

        <!-- 3-column grid (desktop) -->
        <v-row>
          <v-col cols="12" sm="6" md="4" :order="2">
            <v-card class="fill-height" elevation="0" rounded="lg" border>
              <v-card-text class="pa-4">
                <div class="text-subtitle-1 font-weight-bold mb-3"><v-icon size="20" class="mr-1">mdi-chart-bar</v-icon>This Week</div>
                <div class="d-flex flex-column ga-4">
                  <div class="text-center"><div class="text-h5 font-weight-bold" style="color:#80162B">{{ weeklyHours }}</div><div class="text-caption text-medium-emphasis">Hours</div></div>
                  <v-divider />
                  <div class="text-center"><div class="text-h5 font-weight-bold" style="color:#196CA2">{{ weeklyShifts }}</div><div class="text-caption text-medium-emphasis">Shifts</div></div>
                  <v-divider />
                  <div class="text-center"><div class="text-h5 font-weight-bold" style="color:#2e7d32">${{ estimatedEarnings }}</div><div class="text-caption text-medium-emphasis">Earnings</div></div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" sm="6" md="4" :order="0">
            <v-card class="fill-height" elevation="0" rounded="lg" border>
              <v-card-text class="pa-4">
                <div class="d-flex align-center justify-space-between mb-2">
                  <div class="text-subtitle-1 font-weight-bold"><v-icon size="20" class="mr-1">mdi-briefcase-plus</v-icon>Open Shifts</div>
                  <v-btn variant="text" color="primary" size="small" @click="$router.push({ name: 'student-schedule', query: { tab: 'open' } })">See All ({{ openShiftsCount }})</v-btn>
                </div>
                <template v-if="topOpenShifts.length">
                  <div v-for="shift in topOpenShifts" :key="shift.id" class="open-shift-item mb-2" @click="goToOpenShiftsForDept(shift)">
                    <ShiftCard :shift="shift" :show-actions="false" :is-open-shift="true" />
                  </div>
                </template>
                <div v-else class="text-body-2 text-medium-emphasis text-center pa-3">No open shifts available right now</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" sm="6" md="4" :order="1">
            <v-card class="fill-height" elevation="0" rounded="lg" border>
              <v-card-text class="pa-4">
                <div class="text-subtitle-1 font-weight-bold mb-2"><v-icon size="20" class="mr-1">mdi-clipboard-text-clock</v-icon>Pending Requests</div>
                <template v-if="pendingRequests.length">
                  <div v-for="req in pendingRequests" :key="req.id" class="d-flex align-center justify-space-between py-2" style="gap:8px">
                    <div class="d-flex align-center flex-grow-1" style="min-width:0"><v-icon size="18" :color="req.iconColor" class="mr-2 flex-shrink-0">{{ req.icon }}</v-icon><span class="text-body-2 text-truncate">{{ req.label }}</span></div>
                    <v-chip :color="req.statusColor" size="x-small" variant="tonal" class="flex-shrink-0">{{ req.statusLabel }}</v-chip>
                    <v-btn v-if="req.type === 'time_off' && req.status === 'pending'" size="x-small" variant="text" color="error" :loading="req.cancelling" icon="mdi-close" @click.stop="cancelRequest(req)" />
                  </div>
                </template>
                <div v-else class="text-body-2 text-medium-emphasis text-center pa-3">No pending requests</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </template>
    </div><!-- /desktop -->

    <!-- ─── Shared Dialogs ───────────────────────────────── -->
    <SwapDialog v-model="swapDialogOpen" :shift="swapShift" mode="cover" :coworkers="[]" @submitted="handleSwapSubmit" />
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="bottom">
      {{ snackbar.text }}
      <template #actions><v-btn variant="text" @click="snackbar.show = false">Close</v-btn></template>
    </v-snackbar>

  </PullToRefresh>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useDisplay } from "vuetify";
import Utils from "../config/utils.js";
import studentService from "../services/studentService.js";

import { shiftStartDT, shiftEndDT, formatTimeRange, formatShiftDate as _formatShiftDate, shiftDateStr } from "../utils/shiftDateTime.js";
import { TZ, localDateStr } from "../utils/tz.js";

import ClockStatusBanner from "../components/student/ClockStatusBanner.vue";
import WeekStrip from "../components/student/WeekStrip.vue";
import ShiftCard from "../components/student/ShiftCard.vue";
import SwapDialog from "../components/student/SwapDialog.vue";
import PullToRefresh from "../components/mobile/PullToRefresh.vue";

const { mobile } = useDisplay();

const router = useRouter();
const user = ref(Utils.getStore("user") || {});

// State
const loading = ref(true);
const error = ref(null);
const selectedDate = ref(localDateStr());
const clockingIn = ref(false);

// Dashboard data
const nextShift = ref(null);
const todayShifts = ref([]);
const weekShifts = ref([]);
const openShiftsCount = ref(0);
const topOpenShifts = ref([]);
const pendingRequests = ref([]);
const pendingAcknowledgements = ref([]);
const acknowledgingId = ref(null);
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
    timeZone: TZ,
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
    return isNaN(dt) ? null : localDateStr(dt);
  }).filter(Boolean))];
});

const nextShiftLabel = computed(() => {
  if (!nextShift.value) return "";
  const start = new Date(shiftStartDT(nextShift.value));
  const now = new Date();
  if (!isNaN(start) && start <= now) return "Current Shift";
  return "Next Shift";
});

const nextShiftPosition = computed(() => {
  if (!nextShift.value) return '';
  return nextShift.value.position_name
    || nextShift.value.position?.position_name
    || '';
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


function formatShiftDate(shift) {
  if (!shift) return '';
  const dateStr = shift.shift_date || shiftDateStr(shift);
  return _formatShiftDate(dateStr);
}

function showSnack(text, color = "success") {
  snackbar.text = text;
  snackbar.color = color;
  snackbar.show = true;
}

/**
 * Map a raw request object (time-off or swap) from the API into the
 * display shape used by the Pending Requests card.
 */
function mapRequest(r) {
  const statusLabelMap = {
    pending:          "Pending",
    manager_pending:  "Awaiting Manager",
    approved:         "Approved",
    declined:         "Declined",
    rejected:         "Rejected",
    cancelled:        "Cancelled",
    accepted:         "Accepted",
  };
  const statusColorMap = {
    pending:          "warning",
    manager_pending:  "orange",
    approved:         "success",
    declined:         "error",
    rejected:         "error",
    cancelled:        "grey",
    accepted:         "info",
  };
  const status = r.status || "pending";
  return {
    id:          r.id,
    type:        r.type || "time_off",
    label:       r.type === "time_off"
                   ? `Time off: ${r.startDate ?? r.start_date} – ${r.endDate ?? r.end_date}`
                   : r.type === "find_cover"
                     ? `Cover request – ${r.shiftDate ?? r.shift_date ?? ""}`
                     : r.label || "Swap request",
    icon:        r.type === "time_off" ? "mdi-calendar-remove" : "mdi-swap-horizontal",
    iconColor:   r.type === "time_off" ? "orange" : "blue",
    status,
    statusLabel: statusLabelMap[status] || status,
    statusColor: statusColorMap[status] || "warning",
    cancelling:  false,
  };
}

/**
 * Cancel a pending time-off request from the Pending Requests card.
 * Uses the DELETE /student/time-off/:id endpoint.
 */
async function cancelRequest(req) {
  req.cancelling = true;
  try {
    await studentService.cancelTimeOff(req.id);
    pendingRequests.value = pendingRequests.value.filter((r) => r.id !== req.id);
    showSnack("Time-off request cancelled.");
  } catch (err) {
    showSnack(err?.response?.data?.message || "Failed to cancel request.", "error");
  } finally {
    req.cancelling = false;
  }
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
    openShiftsCount.value = openShiftData.count;
    topOpenShifts.value = openShiftData.shifts.slice(0, 3);
    weeklyHours.value = data.estimatedWeeklyHours ?? 0;
    weeklyShifts.value = weekShifts.value.length;
    estimatedEarnings.value = data.estimatedEarnings || "0.00";

    // Map pending requests — build display rows directly from counts
    // (acknowledgements are shown in the dedicated alert above, not here)
    const rawRequests = [];
    if (Array.isArray(data.pendingRequests)) {
      rawRequests.push(
        ...data.pendingRequests
          .filter((r) => r.type !== 'acknowledgement' && r.type !== 'acknowledgements')
          .map((r) => mapRequest(r))
      );
    } else if (data.pendingCounts && typeof data.pendingCounts === "object") {
      const { timeOff, swapRequests } = data.pendingCounts;
      if (Number(timeOff) > 0) {
        rawRequests.push({
          id: 'pending_time_off', type: 'time_off',
          label: `${timeOff} pending time-off request${timeOff > 1 ? 's' : ''}`,
          icon: 'mdi-calendar-remove', iconColor: 'orange',
          status: 'pending', statusLabel: 'Pending', statusColor: 'warning',
          cancelling: false,
        });
      }
      if (Number(swapRequests) > 0) {
        rawRequests.push({
          id: 'pending_swaps', type: 'swap',
          label: `${swapRequests} pending swap request${swapRequests > 1 ? 's' : ''}`,
          icon: 'mdi-swap-horizontal', iconColor: 'blue',
          status: 'pending', statusLabel: 'Pending', statusColor: 'warning',
          cancelling: false,
        });
      }
    }
    pendingRequests.value = rawRequests;

    // Clock status
    if (data.clockStatus) {
      clockStatus.isClockedIn = data.clockStatus.isClockedIn || false;
      clockStatus.clockInTime = data.clockStatus.clockInTime || null;
      clockStatus.onBreak = data.clockStatus.onBreak || false;
      clockStatus.clockRecordId = data.clockStatus.clockRecordId || null;
    }

    // Pending shift acknowledgements (fetched separately — dashboard only returns count)
    try {
      const ackRes = await studentService.getPendingAcknowledgements();
      // Handle both wrapped ({ data: [...] }) and unwrapped ([...]) response shapes
      const ackPayload = ackRes?.data;
      pendingAcknowledgements.value = Array.isArray(ackPayload)
        ? ackPayload
        : Array.isArray(ackPayload?.data)
          ? ackPayload.data
          : [];
    } catch {
      pendingAcknowledgements.value = [];
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

  const [shiftsRes, clockRes, openRes] = await Promise.allSettled([
    studentService.getShifts({ assigned_user_id: userId, is_published: true }),
    studentService.getOpenClockRecord(),
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

  // Clock status — field names match ClockRecord model: clock_in, clock_out, clock_id
  if (clockRes.status === "fulfilled") {
    const record = clockRes.value?.data?.data || clockRes.value?.data;
    if (record && !record.clock_out) {
      clockStatus.isClockedIn = true;
      clockStatus.clockInTime = record.clock_in;
      clockStatus.clockRecordId = record.clock_id;
      // onBreak: check if breaks array has an open entry (break_end is null)
      const breaks = record.breaks || record.breakRecords || [];
      clockStatus.onBreak = Array.isArray(breaks) && breaks.some((b) => !b.break_end);
    }
  }

  // Open shifts
  if (openRes.status === "fulfilled") {
    const openShiftData = normalizeOpenShiftPayload(openRes.value?.data?.data || openRes.value?.data);
    topOpenShifts.value = openShiftData.shifts.slice(0, 3);
    openShiftsCount.value = openShiftData.count;
  }

  // Pending acknowledgements (always fetch separately)
  try {
    const ackRes = await studentService.getPendingAcknowledgements();
    const ackPayload = ackRes?.data;
    pendingAcknowledgements.value = Array.isArray(ackPayload)
      ? ackPayload
      : Array.isArray(ackPayload?.data)
        ? ackPayload.data
        : [];
  } catch {
    pendingAcknowledgements.value = [];
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
  const shiftId = nextShift.value?.shift_id;
  if (!shiftId) {
    showSnack("No upcoming shift to clock into. Please acknowledge your shift first.", "warning");
    return;
  }
  clockingIn.value = true;
  try {
    await studentService.clockIn({ shiftId });
    clockStatus.isClockedIn = true;
    clockStatus.clockInTime = new Date().toISOString();
    showSnack("Clocked in successfully!");
  } catch (err) {
    showSnack(err?.response?.data?.message || "Failed to clock in", "error");
  } finally {
    clockingIn.value = false;
  }
}

async function handleClockOut() {
  clockingIn.value = true;
  try {
    await studentService.clockOut();
    clockStatus.isClockedIn = false;
    clockStatus.clockInTime = null;
    clockStatus.onBreak = false;
    clockStatus.clockRecordId = null;
    showSnack("Clocked out successfully!");
  } catch (err) {
    showSnack(err?.response?.data?.message || "Failed to clock out", "error");
  } finally {
    clockingIn.value = false;
  }
}

async function handleStartBreak() {
  clockingIn.value = true;
  try {
    await studentService.startBreak(clockStatus.clockRecordId);
    clockStatus.onBreak = true;
    showSnack("Break started!");
  } catch (err) {
    showSnack(err?.response?.data?.message || "Failed to start break", "error");
  } finally {
    clockingIn.value = false;
  }
}

async function handleEndBreak() {
  clockingIn.value = true;
  try {
    await studentService.endBreak(clockStatus.clockRecordId);
    clockStatus.onBreak = false;
    showSnack("Break ended!");
  } catch (err) {
    showSnack(err?.response?.data?.message || "Failed to end break", "error");
  } finally {
    clockingIn.value = false;
  }
}


async function acknowledgeShift(ack) {
  acknowledgingId.value = ack.id;
  try {
    await studentService.acknowledgeShift(ack.id);
    pendingAcknowledgements.value = pendingAcknowledgements.value.filter((a) => a.id !== ack.id);
    showSnack("Shift acknowledged! You can now clock in when your shift starts.");
    // Reload the full dashboard so next shift / clock status reflect the newly acknowledged shift
    await loadDashboard();
  } catch (err) {
    showSnack(err?.response?.data?.message || "Failed to acknowledge shift.", "error");
  } finally {
    acknowledgingId.value = null;
  }
}

async function acknowledgeAndFindCover(ack) {
  acknowledgingId.value = ack.id + '-cover';
  try {
    // Step 1: Acknowledge the shift (accept it into the schedule)
    await studentService.acknowledgeShift(ack.id);
    pendingAcknowledgements.value = pendingAcknowledgements.value.filter((a) => a.id !== ack.id);

    // Step 2: Open the Find Cover dialog for this shift
    const shift = ack.shift || {};
    swapShift.value = {
      ...shift,
      shift_id: shift.shift_id || shift.id,
      department_name: shift.department?.department_name || shift.department_name,
    };
    swapDialogOpen.value = true;
    showSnack("Shift acknowledged. Now post for cover.");
  } catch (err) {
    showSnack(err?.response?.data?.message || "Failed to acknowledge shift.", "error");
  } finally {
    acknowledgingId.value = null;
  }
}

function goToOpenShiftsForDept(shift) {
  // Use the department_id that the backend understands for server-side filtering
  const deptId = shift.department_id || shift.department?.department_id || shift.department?.id || '';
  router.push({
    name: 'student-schedule',
    query: { tab: 'open', departmentId: deptId },
  });
}

function openSwapDialog(shift) {
  swapShift.value = shift;
  swapDialogOpen.value = true;
}

function onWeekChange({ monday }) {
  selectedDate.value = monday;
}

function handleSwapSubmit() {
  swapDialogOpen.value = false;
  showSnack("Request submitted!");
  loadDashboard();
}


async function handlePullRefresh(done) {
  await loadDashboard();
  done();
}

onMounted(loadDashboard);
</script>

<style scoped>
/* ─── Shared (desktop retains original look) ─── */
.student-dashboard { width: 100%; }

.next-shift-card { overflow: hidden; display: flex; }
.next-shift-card__bar { width: 5px; flex-shrink: 0; }

.ack-card { overflow: hidden; display: flex; }
.ack-card__bar { width: 5px; flex-shrink: 0; background: #F57C00; }
.ack-alert { border-left-width: 4px !important; }
.open-shift-item { cursor: pointer; }

/* ─── Mobile Home Screen ──────────────────────────────────── */
.home-screen {
  background: #F7F7F8;
  min-height: 100%;
  padding: 20px 16px 32px;
}

/* ── Greeting ── */
.home-greeting {
  margin-bottom: 24px;
}
.home-greeting-name {
  font-size: 22px;
  font-weight: 700;
  color: #1A1A1A;
  line-height: 1.2;
}
.home-greeting-date {
  font-size: 13px;
  color: #6B7280;
  margin-top: 3px;
}

/* ── Section rhythm ── */
.home-section {
  margin-bottom: 24px;
}
.section-eyebrow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #9CA3AF;
  text-transform: uppercase;
  margin-bottom: 10px;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.section-link {
  font-size: 13px;
  color: #80162B;
  font-weight: 600;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}

/* ── Ack Banner ── */
.ack-banner {
  background: #FFF7ED;
  border: 1px solid #FED7AA;
  border-radius: 14px;
  padding: 14px;
}
.ack-banner-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #EA580C;
  margin-bottom: 12px;
}
.ack-item {
  background: #ffffff;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.ack-item:last-child { margin-bottom: 0; }
.ack-item-info { flex: 1; min-width: 0; }
.ack-item-dept {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ack-item-time {
  font-size: 12px;
  color: #6B7280;
  margin-top: 2px;
}
.ack-item-actions { display: flex; gap: 6px; flex-shrink: 0; }
.ack-btn {
  padding: 7px 13px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  -webkit-tap-highlight-color: transparent;
}
.ack-btn:disabled { opacity: 0.5; }
.ack-btn--accept { background: #80162B; color: #fff; }
.ack-btn--cover  { background: #F3F4F6; color: #374151; }

/* ── Next Shift Hero Card ── */
.shift-hero-card {
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid #EBEBEB;
  display: flex;
  overflow: hidden;
  transition: box-shadow 0.15s ease;
}
.shift-hero-card:active { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.shift-hero-accent {
  width: 4px;
  flex-shrink: 0;
}
.shift-hero-body {
  padding: 14px 16px;
  flex: 1;
}
.shift-hero-dept {
  font-size: 16px;
  font-weight: 700;
  color: #1A1A1A;
  margin-bottom: 8px;
}
.shift-hero-meta {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #6B7280;
  margin-bottom: 4px;
}
.shift-hero-cta {
  display: inline-flex;
  align-items: center;
  margin-top: 12px;
  background: #80162B;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

/* ── Empty Card ── */
.empty-card {
  background: #ffffff;
  border: 1px solid #EBEBEB;
  border-radius: 14px;
  padding: 32px 16px;
  text-align: center;
}
.empty-card-text {
  font-size: 14px;
  color: #6B7280;
  margin-top: 10px;
  font-weight: 500;
}
.empty-card-sub {
  font-size: 12px;
  color: #9CA3AF;
  margin-top: 4px;
}

/* ── Stats Strip ── */
.stats-strip {
  background: #ffffff;
  border: 1px solid #EBEBEB;
  border-radius: 14px;
  display: flex;
  align-items: center;
  padding: 16px 0;
}
.stat-cell {
  flex: 1;
  text-align: center;
}
.stat-value {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.1;
}
.stat-label {
  font-size: 11px;
  color: #9CA3AF;
  margin-top: 3px;
  font-weight: 500;
  letter-spacing: 0.02em;
}
.stat-divider {
  width: 1px;
  height: 34px;
  background: #EBEBEB;
  flex-shrink: 0;
}

/* ── Open Shifts Preview ── */
.open-shifts-list {
  background: #ffffff;
  border: 1px solid #EBEBEB;
  border-radius: 14px;
  overflow: hidden;
}
.open-shift-row {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  gap: 10px;
  cursor: pointer;
  border-bottom: 1px solid #F3F4F6;
  -webkit-tap-highlight-color: transparent;
}
.open-shift-row:last-child { border-bottom: none; }
.open-shift-bar {
  width: 3px;
  height: 30px;
  border-radius: 2px;
  background: #0277BD;
  flex-shrink: 0;
}
.open-shift-info { flex: 1; min-width: 0; }
.open-shift-dept {
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.open-shift-time {
  font-size: 12px;
  color: #6B7280;
  margin-top: 2px;
}

/* ── Pending Requests ── */
.requests-list {
  background: #ffffff;
  border: 1px solid #EBEBEB;
  border-radius: 14px;
  overflow: hidden;
}
.request-row {
  display: flex;
  align-items: center;
  padding: 11px 14px;
  gap: 8px;
  border-bottom: 1px solid #F3F4F6;
}
.request-row:last-child { border-bottom: none; }
.request-icon { flex-shrink: 0; }
.request-info { flex: 1; min-width: 0; }
.request-label {
  font-size: 13px;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

/* ── Error ── */
.error-card {
  background: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: 14px;
  padding: 14px 16px;
  color: #DC2626;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
}
.error-retry {
  background: none;
  border: none;
  color: #80162B;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
}
</style>
