<template>
  <div :class="['student-clock', mobile ? 'pa-3' : 'pa-6']" role="main" aria-label="Time and Attendance">
    <h1 :class="[mobile ? 'text-h6' : 'text-h5', 'font-weight-bold', mobile ? 'mb-3' : 'mb-4']">Time &amp; Attendance</h1>

    <!-- Loading -->
    <template v-if="loading">
      <v-skeleton-loader type="card" class="mb-4" />
      <v-skeleton-loader type="button" class="mb-4" />
      <v-skeleton-loader type="table" />
    </template>

    <template v-else>
      <!-- ── #1: Inline Clock Status (replaces ClockStatusBanner) ────────── -->
      <v-card
        :class="[mobile ? 'mb-3 pa-4' : 'mb-4 pa-4', 'd-flex', mobile ? 'flex-column align-center text-center' : 'align-center']"
        :style="{ backgroundColor: statusBg, color: statusFg }"
        elevation="0"
        rounded="lg"
      >
        <v-icon :color="statusFg" :size="mobile ? 28 : 22" :class="mobile ? 'mb-2' : 'mr-3'">{{ statusIcon }}</v-icon>
        <div class="flex-grow-1">
          <div :class="[mobile ? 'text-body-1' : 'text-body-1', 'font-weight-semibold']">{{ statusLabel }}</div>
          <!-- #2: Live elapsed timer when clocked in — large on mobile -->
          <div v-if="clockedIn" :class="[mobile ? 'text-h4' : 'text-h5', 'font-weight-bold']" style="font-variant-numeric: tabular-nums; letter-spacing: 1px;">
            {{ elapsed }}
          </div>
          <!-- #2: Countdown to clock-in window when not clocked in -->
          <div v-else-if="activeShift && !canClockIn" class="text-body-2" :style="{ color: statusFg, opacity: 0.85 }">
            Available in {{ clockInCountdown }}
          </div>
          <div v-else-if="activeShift && canClockIn" class="text-body-2 font-weight-medium" :style="{ color: statusFg }">
            Clock-in window is open
          </div>
        </div>
        <!-- On Break chip -->
        <v-chip v-if="onBreak" color="white" text-color="warning" variant="outlined" size="small" class="ml-2">
          On Break
        </v-chip>
      </v-card>

      <!-- Current/Next Shift Info -->
      <v-card
        v-if="activeShift"
        elevation="0"
        rounded="lg"
        class="mb-4"
        style="border: 1px solid #e0e0e0"
      >
        <v-card-text class="pa-4">
          <div class="text-caption font-weight-bold text-medium-emphasis mb-1">
            {{ clockedIn ? 'CURRENT SHIFT' : 'NEXT SHIFT' }}
          </div>
          <div class="text-body-1 font-weight-medium">
            {{ activeShift.department_name || activeShift.departmentName }}
          </div>
          <div class="text-body-2">
            <v-icon size="14" class="mr-1">mdi-clock-outline</v-icon>
            {{ formatShiftTime(activeShift) }}
          </div>
          <div v-if="activeShift.location" class="text-body-2 text-medium-emphasis">
            <v-icon size="14" class="mr-1">mdi-map-marker-outline</v-icon>
            {{ activeShift.location }}
          </div>
        </v-card-text>
      </v-card>

      <!-- Clock In/Out Actions -->
      <div :class="['text-center', mobile ? 'mb-4' : 'mb-6']">
        <!-- Not clocked in -->
        <v-btn
          v-if="!clockedIn"
          size="x-large"
          color="primary"
          variant="flat"
          rounded="pill"
          :loading="clockingIn"
          :class="['clock-btn', { 'clock-btn--mobile': mobile }]"
          aria-label="Clock in"
          @click="confirmClockIn"
        >
          <v-icon start :size="mobile ? 32 : 28">mdi-login</v-icon>
          Clock In
        </v-btn>

        <!-- Clocked in -->
        <div v-else :class="['d-flex', 'flex-column', 'align-center', mobile ? 'gap-3' : 'gap-3']">
          <div v-if="!onBreak" :class="['d-flex', mobile ? 'flex-column gap-3' : 'gap-2']" :style="mobile ? 'width:100%;max-width:320px' : ''">
            <!-- #5: Start Break with confirmation -->
            <!-- Start Break = secondary action (outlined maroon) -->
            <v-btn
              color="primary"
              variant="outlined"
              rounded="lg"
              :size="mobile ? 'large' : 'default'"
              :block="mobile"
              :min-height="mobile ? 48 : undefined"
              :loading="breakLoading"
              class="clock-action-btn"
              aria-label="Start break"
              @click="startBreakDialog = true"
            >
              <v-icon start>mdi-coffee-outline</v-icon>
              Start Break
            </v-btn>
            <!-- Clock Out = primary destructive-ish action (solid maroon) -->
            <v-btn
              color="primary"
              variant="flat"
              rounded="lg"
              :size="mobile ? 'large' : 'default'"
              :block="mobile"
              :min-height="mobile ? 48 : undefined"
              :loading="clockingOut"
              class="clock-action-btn"
              aria-label="Clock out"
              @click="confirmClockOut"
            >
              <v-icon start>mdi-logout</v-icon>
              Clock Out
            </v-btn>
          </div>

          <!-- #5: End Break with confirmation -->
          <v-btn
            v-else
            color="primary"
            variant="flat"
            rounded="lg"
            :size="mobile ? 'x-large' : 'default'"
            :min-height="mobile ? 56 : undefined"
            :loading="breakLoading"
            class="clock-action-btn"
            aria-label="End break"
            @click="endBreakDialog = true"
          >
            <v-icon start>mdi-coffee-off-outline</v-icon>
            End Break
          </v-btn>
        </div>

        <!-- Hint when no scheduled shift at all — user can still clock in
             (e.g. covering for a teammate); they’ll get the off-schedule
             warning first. -->
        <p v-if="!activeShift" class="text-caption text-medium-emphasis mt-2">
          No scheduled shift — you can still clock in if you’re covering.
        </p>
      </div>

      <!-- Weekly Timesheet -->
      <v-card elevation="0" rounded="lg" style="border: 1px solid #e0e0e0">
        <v-card-title class="pa-4 pb-2">
          <v-icon class="mr-2" size="20">mdi-table-clock</v-icon>
          Weekly Timesheet
        </v-card-title>

        <v-card-text class="pa-0">
          <!-- Mobile: two-line card rows (avoids 5-column wrap on ~320px screens) -->
          <template v-if="mobile">
            <div
              v-for="day in timesheetRows"
              :key="day.date"
              class="ts-row-mobile"
              :class="{ 'ts-row-mobile--today': day.isToday }"
            >
              <!-- Primary line: day label + hours -->
              <div class="ts-row-mobile__primary">
                <span class="ts-row-mobile__day" :class="{ 'font-weight-bold': day.isToday }">{{ day.label }}</span>
                <span class="ts-row-mobile__hours font-weight-medium">{{ day.hours ? day.hours + 'h' : '—' }}</span>
              </div>
              <!-- Secondary line: scheduled → actual · break -->
              <div class="ts-row-mobile__secondary">
                <span>{{ day.scheduled || '—' }}</span>
                <template v-if="day.actual">
                  <span class="ts-row-mobile__sep">→</span>
                  <span :class="day.actualClass">{{ day.actual }}</span>
                </template>
                <template v-if="day.breakDuration">
                  <span class="ts-row-mobile__sep">·</span>
                  <span>{{ day.breakDuration }} break</span>
                </template>
              </div>
            </div>
            <!-- Footer: totals -->
            <div class="ts-row-mobile ts-row-mobile--total">
              <div class="ts-row-mobile__primary">
                <span class="font-weight-bold">Weekly Total</span>
                <span class="font-weight-bold">{{ weeklyTotal }}h</span>
              </div>
              <div class="ts-row-mobile__primary">
                <span class="text-body-2" style="color: var(--text-3)">Est. Earnings</span>
                <span
                  class="text-body-2 font-weight-bold"
                  :style="{ color: parseFloat(weeklyEarnings) > 0 ? '#811429' : 'var(--text-3)' }"
                >${{ weeklyEarnings }}</span>
              </div>
            </div>
          </template>

          <!-- Desktop: standard 5-column table -->
          <v-table v-else density="comfortable">
            <thead>
              <tr>
                <th>Day</th>
                <th>Scheduled</th>
                <th>Actual</th>
                <th>Break</th>
                <th class="text-right">Hours</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="day in timesheetRows" :key="day.date">
                <td>
                  <span :class="{ 'font-weight-bold': day.isToday }">{{ day.label }}</span>
                </td>
                <!-- #3: Scheduled from shifts data -->
                <td class="text-body-2">{{ day.scheduled || '—' }}</td>
                <td class="text-body-2">
                  <span :class="day.actualClass">{{ day.actual || '—' }}</span>
                </td>
                <td class="text-body-2">{{ day.breakDuration || '—' }}</td>
                <td class="text-right text-body-2 font-weight-medium">{{ day.hours || '—' }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4" class="font-weight-bold">Weekly Total</td>
                <td class="text-right font-weight-bold">{{ weeklyTotal }}h</td>
              </tr>
              <tr>
                <td colspan="4" class="text-body-2 text-medium-emphasis">Est. Earnings</td>
                <td
                  class="text-right text-body-2 font-weight-bold"
                  :style="{ color: parseFloat(weeklyEarnings) > 0 ? '#811429' : 'var(--text-3)' }"
                >${{ weeklyEarnings }}</td>
              </tr>
            </tfoot>
          </v-table>
        </v-card-text>
      </v-card>
    </template>

    <!-- Clock In Confirmation Dialog -->
    <v-dialog v-model="clockInDialog" max-width="400">
      <v-card rounded="lg">
        <v-card-title class="pa-4">Confirm Clock In</v-card-title>
        <v-card-text class="pa-4 pt-0">
          <p v-if="activeShift">
            Clocking in for <strong>{{ activeShift.department_name || activeShift.departmentName }}</strong>
            at {{ formatShiftTime(activeShift) }}.
          </p>
          <p v-if="activeShift && activeShift.location">Location: {{ activeShift.location }}</p>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="clockInDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" :loading="clockingIn" @click="doClockIn()">Clock In</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Clock Out Confirmation Dialog -->
    <v-dialog v-model="clockOutDialog" max-width="400">
      <v-card rounded="lg">
        <v-card-title class="pa-4">Confirm Clock Out</v-card-title>
        <v-card-text class="pa-4 pt-0">
          <p>Are you sure you want to clock out?</p>
          <p v-if="clockInTime" class="text-body-2 text-medium-emphasis">
            Clocked in since {{ new Date(clockInTime).toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true }) }}
            &nbsp;·&nbsp; {{ elapsed }} elapsed
          </p>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="clockOutDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" :loading="clockingOut" @click="doClockOut()">Clock Out</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- #5: Start Break Confirmation Dialog -->
    <v-dialog v-model="startBreakDialog" max-width="360">
      <v-card rounded="lg">
        <v-card-title class="pa-4">Start Break?</v-card-title>
        <v-card-text class="pa-4 pt-0">
          <p>This will pause your clock. You can end your break at any time.</p>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="startBreakDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" :loading="breakLoading" @click="doStartBreak">Start Break</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- #5: End Break Confirmation Dialog -->
    <v-dialog v-model="endBreakDialog" max-width="360">
      <v-card rounded="lg">
        <v-card-title class="pa-4">End Break?</v-card-title>
        <v-card-text class="pa-4 pt-0">
          <p>Your clock will resume from now.</p>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="endBreakDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" :loading="breakLoading" @click="doEndBreak">End Break</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Off-schedule clock-in/out warning (±15 min rule) -->
    <OffScheduleClockDialog
      v-model="offScheduleDialog"
      :action="offScheduleAction"
      :reason="offScheduleReason"
      :loading="offScheduleAction === 'in' ? clockingIn : clockingOut"
      @confirm="confirmOffSchedule"
      @cancel="offScheduleDialog = false"
    />

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="bottom">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useDisplay } from 'vuetify';
import Utils from '../config/utils.js';
import { TZ } from '../utils/tz.js';
import studentService from '../services/studentService.js';
import OffScheduleClockDialog from '../components/student/OffScheduleClockDialog.vue';
import { evaluateClockAction } from '../composables/useClockWindow.js';

const { mobile } = useDisplay();

const user = Utils.getStore('user');

// ── State ─────────────────────────────────────────────────────────────────────
const loading      = ref(true);
const clockedIn    = ref(false);
const clockInTime  = ref(null);
const onBreak      = ref(false);
const currentRecordId = ref(null);
const activeShift  = ref(null);
const hourlyRate   = ref(0);       // #4 — real rate from profile

const clockingIn   = ref(false);
const clockingOut  = ref(false);
const breakLoading = ref(false);

const clockInDialog    = ref(false);
const clockOutDialog   = ref(false);
const startBreakDialog = ref(false);  // #5
const endBreakDialog   = ref(false);  // #5

// Off-schedule warning (no shift within 15 min). Holds the reason so the
// same dialog handles both clock-in and clock-out cases.
const offScheduleDialog  = ref(false);
const offScheduleAction  = ref('in'); // 'in' | 'out'
const offScheduleReason  = ref('');

const timesheetData  = ref([]);
const weekShifts     = ref([]);       // #3 — published shifts for the week
const snackbar = ref({ show: false, text: '', color: 'success' });

// ── Live tick (used for elapsed + countdown) ──────────────────────────────────
const now = ref(Date.now());
let ticker = null;
onMounted(()    => { ticker = setInterval(() => { now.value = Date.now(); }, 1000); });
onUnmounted(()  => { clearInterval(ticker); });

// ── #1: Inline status display helpers ────────────────────────────────────────
// Maroon-family palette (matches oc.edu brand + student app tokens):
//   clocked in   → primary maroon (active/alive feel)
//   on break     → amber-family neutral (break signal retained)
//   idle / next  → light maroon tint so the countdown card blends
//                  with the rest of the student app.
const statusBg = computed(() => {
  if (onBreak.value)   return '#C67B3C';
  if (clockedIn.value) return '#811429';
  return '#F8ECEE';
});
const statusFg = computed(() => (clockedIn.value || onBreak.value) ? 'white' : '#48111C');
const statusIcon = computed(() => {
  if (onBreak.value)   return 'mdi-coffee-outline';
  if (clockedIn.value) return 'mdi-clock-check-outline';
  return 'mdi-clock-outline';
});
const statusLabel = computed(() => {
  if (onBreak.value)   return 'On break';
  if (clockedIn.value) return 'Clocked in' + (activeShift.value ? ' — ' + (activeShift.value.department_name || activeShift.value.departmentName || '') : '');
  return 'Not clocked in';
});

// ── #2: Live elapsed timer ────────────────────────────────────────────────────
const elapsed = computed(() => {
  if (!clockedIn.value || !clockInTime.value) return '00:00:00';
  const diff = now.value - new Date(clockInTime.value).getTime();
  if (diff < 0) return '00:00:00';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
});

// ── #2: Clock-in countdown ────────────────────────────────────────────────────
const clockInCountdown = computed(() => {
  if (!activeShift.value) return '';
  const raw = buildDT(activeShift.value, 'start_time') || activeShift.value.start_time || activeShift.value.startTime || activeShift.value.shift_start;
  const start = new Date(raw).getTime();
  if (isNaN(start)) return '';
  // Open window starts 15 min before shift
  const windowOpen = start - 15 * 60 * 1000;
  const diff = windowOpen - now.value;
  if (diff <= 0) return 'now';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
});

// ── Utilities ─────────────────────────────────────────────────────────────────
const buildDT = (shift, field) => {
  const time = shift[field];
  if (!time) return null;
  if (typeof time === 'string' && (time.includes('T') || (time.includes('-') && time.length > 10))) return time;
  const date = shift.shift_date || shift.date;
  if (date) return String(date).slice(0, 10) + 'T' + time;
  return null;
};

const canClockIn = computed(() => {
  if (clockedIn.value) return false;
  if (!activeShift.value) return false;
  const raw = buildDT(activeShift.value, 'start_time') || activeShift.value.start_time || activeShift.value.startTime || activeShift.value.shift_start;
  const start = new Date(raw).getTime();
  if (isNaN(start)) return false;
  const diff = start - now.value;
  return diff <= 15 * 60 * 1000 && diff >= -60 * 60 * 1000;
});

const formatShiftTime = (s) => {
  if (!s) return '';
  const fmt = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt)) return '';
    return dt.toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true });
  };
  const startDT = buildDT(s, 'start_time') || s.start_time || s.startTime || s.shift_start;
  const endDT   = buildDT(s, 'end_time')   || s.end_time   || s.endTime   || s.shift_end;
  return fmt(startDT) + ' – ' + fmt(endDT);
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const toDateStr = (d) =>
  d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

const todayStr = toDateStr(new Date());

// ── #3: Timesheet rows merge clock records AND week shifts ────────────────────
const timesheetRows = computed(() => {
  const monday = getMonday(new Date());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const dateStr = toDateStr(d);

    // Clock record for this day
    const entry = timesheetData.value.find(t => {
      const td = new Date(t.date || t.shift_date);
      return toDateStr(td) === dateStr;
    });

    // #3: Scheduled shift for this day (from weekShifts)
    const shift = weekShifts.value.find(s => {
      const sd = new Date(s.shift_date || s.date);
      return toDateStr(sd) === dateStr;
    });

    const fmtTime = (v) => {
      if (!v) return null;
      const dt = new Date(v);
      return isNaN(dt) ? null : dt.toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true });
    };

    // Scheduled: entry.scheduled_start is a full datetime string after normalise;
    // fall back to building one from weekShifts if not present.
    let scheduled = null;
    if (entry?.scheduled_start || shift) {
      const sStart = fmtTime(entry?.scheduled_start || buildDT(shift, 'start_time') || combineDateAndTime(dateStr, shift?.start_time));
      const sEnd   = fmtTime(entry?.scheduled_end   || buildDT(shift, 'end_time')   || combineDateAndTime(dateStr, shift?.end_time));
      if (sStart || sEnd) scheduled = (sStart || '') + (sStart && sEnd ? ' – ' : '') + (sEnd || '');
    }

    // Actual: actual_start/actual_end are full ISO timestamps after normalise
    let actual = null;
    if (entry) {
      const aStart = fmtTime(entry.actual_start);
      const aEnd   = fmtTime(entry.actual_end);
      if (aStart || aEnd) actual = (aStart || '') + (aStart && aEnd ? ' – ' : '') + (aEnd || '');
    }

    // Keep raw decimal for weekly sum; only round for per-row display.
    // toFixed(1) on 0.03 → "0.0" which is misleading — show at least 2 decimals
    // for sub-1-hour sessions so e.g. 18 min shows "0.30h" not "0.0h".
    const rawHours = entry?.total_hours != null ? Number(entry.total_hours) : null;
    const hours = rawHours != null
      ? (rawHours < 1 && rawHours > 0 ? rawHours.toFixed(2) : rawHours.toFixed(1))
      : null;

    const breakDuration = entry?.break_minutes ? entry.break_minutes + 'm' : null;

    let actualClass = '';
    if (entry?.actual_start && entry?.scheduled_start) {
      const late = new Date(entry.actual_start).getTime() - new Date(entry.scheduled_start).getTime();
      if (late > 5 * 60 * 1000) actualClass = 'text-error';
    }

    return { date: dateStr, label: DAY_LABELS[d.getDay()] + ' ' + d.getDate(), isToday: dateStr === todayStr, scheduled, actual, hours, breakDuration, actualClass };
  });
});

// Sum raw total_hours from timesheetData (not the rounded display strings)
// so short sessions don't get zeroed out before summing.
const weeklyTotalRaw = computed(() =>
  timesheetData.value.reduce((acc, e) => acc + (e.total_hours != null ? Number(e.total_hours) : 0), 0)
);
const weeklyTotal = computed(() => {
  const raw = weeklyTotalRaw.value;
  return raw < 1 && raw > 0 ? raw.toFixed(2) : raw.toFixed(1);
});

// ── #4: Real hourly rate ──────────────────────────────────────────────────────
// Use raw sum for earnings so rounding doesn't silently drop pay.
const weeklyEarnings = computed(() =>
  (weeklyTotalRaw.value * (hourlyRate.value || 0)).toFixed(2)
);

const combineDateAndTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;
  return `${String(dateStr).slice(0, 10)}T${String(timeStr).slice(0, 8)}`;
};

const normalizeTimesheetEntries = (payload) => {
  const rawEntries = Array.isArray(payload)
    ? payload
    : (payload && typeof payload === 'object' && Array.isArray(payload.entries) ? payload.entries : []);

  return rawEntries.map((entry) => {
    const date = entry.date || entry.shift_date || null;
    const scheduledStart = entry.scheduledStart || entry.scheduled_start || entry.scheduled_start_time || null;
    const scheduledEnd = entry.scheduledEnd || entry.scheduled_end || entry.scheduled_end_time || null;
    const workedMinutes = Number(entry.netMinutes ?? entry.net_minutes ?? entry.workedMinutes ?? entry.worked_minutes ?? 0);
    const breakMinutes = Number(entry.breakMinutes ?? entry.break_minutes ?? 0);

    return {
      ...entry,
      date,
      scheduled_start: combineDateAndTime(date, scheduledStart),
      scheduled_end: combineDateAndTime(date, scheduledEnd),
      actual_start: entry.clockIn || entry.clock_in || entry.actual_start || null,
      actual_end: entry.clockOut || entry.clock_out || entry.actual_end || null,
      break_minutes: Number.isFinite(breakMinutes) ? breakMinutes : 0,
      total_hours: Number.isFinite(workedMinutes) ? (workedMinutes / 60) : 0,
    };
  });
};

// ── Data fetching ─────────────────────────────────────────────────────────────
const fetchAll = async () => {
  loading.value = true;
  try {
    await Promise.allSettled([
      fetchClockStatus(),
      fetchActiveShift(),
      fetchTimesheet(),
      fetchWeekShifts(),   // #3
      fetchProfile(),      // #4
    ]);
  } finally {
    loading.value = false;
  }
};

const fetchClockStatus = async () => {
  try {
    const res = await studentService.getOpenClockRecord();
    const record = res?.data?.data || res?.data;
    const recId = record?.clock_id || record?.id;
    if (record && recId && !record.clock_out && !record.clock_out_time && !record.clockOutTime) {
      clockedIn.value = true;
      currentRecordId.value = recId;
      clockInTime.value = record.clock_in || record.clock_in_time || record.clockInTime || record.createdAt;
      onBreak.value = !!record.on_break || !!record.onBreak;
    } else {
      clockedIn.value = false;
      currentRecordId.value = null;
      clockInTime.value = null;
      onBreak.value = false;
    }
  } catch {
    clockedIn.value = false;
  }
};

// ── #6: Look ahead 7 days if no shift today ───────────────────────────────────
const fetchActiveShift = async () => {
  try {
    const userId = user?.userId || user?.id;
    const today  = toDateStr(new Date());
    const res = await studentService.getShifts({ assigned_user_id: userId, start_date: today, end_date: today, is_published: true });
    let shifts = res?.data?.data || res?.data || [];

    if (!Array.isArray(shifts)) shifts = [];

    const nowTs = Date.now();
    const upcoming = shifts
      .filter(s => {
        const end = new Date(buildDT(s, 'end_time') || s.end_time || s.endTime || s.shift_end).getTime();
        return end > nowTs;
      })
      .sort((a, b) =>
        new Date(buildDT(a, 'start_time') || a.start_time).getTime() -
        new Date(buildDT(b, 'start_time') || b.start_time).getTime()
      );

    if (upcoming.length) {
      activeShift.value = upcoming[0];
    } else {
      // #6: No shift today — look ahead 7 days
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const futureRes = await studentService.getShifts({
        assigned_user_id: userId,
        start_date: toDateStr(tomorrow),
        end_date: toDateStr(nextWeek),
        is_published: true,
      });
      const futureRaw = futureRes?.data?.data || futureRes?.data || [];
      const futureShifts = (Array.isArray(futureRaw) ? futureRaw : [])
        .filter(Boolean)
        .sort((a, b) =>
          new Date(buildDT(a, 'start_time') || a.start_time).getTime() -
          new Date(buildDT(b, 'start_time') || b.start_time).getTime()
        );
      activeShift.value = futureShifts[0] || null;
    }
  } catch {
    activeShift.value = null;
  }
};

const fetchTimesheet = async () => {
  try {
    const monday = getMonday(new Date());
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    const res = await studentService.getTimesheet({ startDate: toDateStr(monday), endDate: toDateStr(sunday) });
    timesheetData.value = normalizeTimesheetEntries(res?.data?.data || res?.data);
  } catch {
    timesheetData.value = [];
  }
};

// ── #3: Fetch published shifts for the full week ──────────────────────────────
const fetchWeekShifts = async () => {
  try {
    const userId = user?.userId || user?.id;
    const monday = getMonday(new Date());
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    const res = await studentService.getShifts({
      assigned_user_id: userId,
      start_date: toDateStr(monday),
      end_date: toDateStr(sunday),
      is_published: true,
    });
    weekShifts.value = res?.data?.data || res?.data || [];
    if (!Array.isArray(weekShifts.value)) weekShifts.value = [];
  } catch {
    weekShifts.value = [];
  }
};

// ── #4: Fetch real hourly rate from student profile ───────────────────────────
const fetchProfile = async () => {
  try {
    const res = await studentService.getProfile();
    const profile = res?.data?.data || res?.data;
    hourlyRate.value = Number(profile?.hourlyRate || profile?.hourly_rate || 0);
  } catch {
    hourlyRate.value = 0;
  }
};

// ── Clock In/Out ──────────────────────────────────────────────────────────────
// Route clock-in through the window check. On-schedule → normal confirm
// dialog. Off-schedule → warning dialog (manager-will-be-notified).
const confirmClockIn = () => {
  const decision = evaluateClockAction({
    action: 'in',
    activeShift: activeShift.value,
    now: now.value,
  });
  if (decision.offSchedule) {
    offScheduleAction.value = 'in';
    offScheduleReason.value = decision.reason;
    offScheduleDialog.value = true;
  } else {
    clockInDialog.value = true;
  }
};

const doClockIn = async ({ offSchedule = false } = {}) => {
  clockingIn.value = true;
  try {
    const payload = activeShift.value
      ? { shiftId: activeShift.value.shift_id || activeShift.value.id }
      : {};
    if (offSchedule) {
      payload.offSchedule = true;
      payload.offScheduleReason = offScheduleReason.value || 'No scheduled shift within 15 minutes';
    }
    await studentService.clockIn(payload);
    showSnackbar(offSchedule ? 'Clocked in — manager notified.' : 'Clocked in!', 'success');
    clockInDialog.value = false;
    offScheduleDialog.value = false;
    await fetchClockStatus();
  } catch (err) {
    showSnackbar(err?.response?.data?.message || 'Failed to clock in.', 'error');
  } finally {
    clockingIn.value = false;
  }
};

const confirmClockOut = () => {
  const decision = evaluateClockAction({
    action: 'out',
    activeShift: activeShift.value,
    now: now.value,
  });
  if (decision.offSchedule) {
    offScheduleAction.value = 'out';
    offScheduleReason.value = decision.reason;
    offScheduleDialog.value = true;
  } else {
    clockOutDialog.value = true;
  }
};

const doClockOut = async ({ offSchedule = false } = {}) => {
  clockingOut.value = true;
  try {
    const payload = offSchedule
      ? { offSchedule: true, offScheduleReason: offScheduleReason.value || 'Clocking out outside the 15-minute window' }
      : {};
    await studentService.clockOut(payload);
    showSnackbar(offSchedule ? 'Clocked out — manager notified.' : 'Clocked out!', 'success');
    clockOutDialog.value = false;
    offScheduleDialog.value = false;
    await fetchAll();
  } catch (err) {
    showSnackbar(err?.response?.data?.message || 'Failed to clock out.', 'error');
  } finally {
    clockingOut.value = false;
  }
};

// Off-schedule dialog confirm handler — routes to the right doClockIn/Out.
const confirmOffSchedule = async () => {
  if (offScheduleAction.value === 'in')  await doClockIn({ offSchedule: true });
  else                                    await doClockOut({ offSchedule: true });
};

// ── #5: Break with confirmation ───────────────────────────────────────────────
const doStartBreak = async () => {
  breakLoading.value = true;
  try {
    await studentService.startBreak(currentRecordId.value);
    startBreakDialog.value = false;
    await fetchClockStatus();
    showSnackbar('Break started.', 'info');
  } catch (err) {
    showSnackbar(err?.response?.data?.message || 'Failed to start break.', 'error');
  } finally {
    breakLoading.value = false;
  }
};

const doEndBreak = async () => {
  breakLoading.value = true;
  try {
    await studentService.endBreak(currentRecordId.value);
    endBreakDialog.value = false;
    await fetchClockStatus();
    showSnackbar('Break ended.', 'success');
  } catch (err) {
    showSnackbar(err?.response?.data?.message || 'Failed to end break.', 'error');
  } finally {
    breakLoading.value = false;
  }
};

const showSnackbar = (text, color = 'success') => {
  snackbar.value = { show: true, text, color };
};

onMounted(fetchAll);
</script>

<style scoped>
.student-clock { width: 100%; }

.clock-btn {
  min-width: 200px;
  height: 56px !important;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.clock-btn--mobile {
  width: 100%;
  max-width: 320px;
  height: 72px !important;
  font-size: 22px;
  letter-spacing: 1px;
}

/* Start Break / Clock Out / End Break — cohesive maroon system.
   The outlined variant gets a soft tinted background so it reads as a
   real affordance rather than a hollow border. The flat primary variant
   gets a slightly heavier shadow for presence without being loud. */
.clock-action-btn {
  font-weight: 600;
  letter-spacing: 0.4px;
  text-transform: none;
  box-shadow: 0 1px 2px rgba(72, 17, 28, 0.08);
  transition: box-shadow 0.15s, transform 0.05s;
}
.clock-action-btn:active {
  transform: translateY(1px);
}
.clock-action-btn:hover {
  box-shadow: 0 3px 8px rgba(72, 17, 28, 0.14);
}
.clock-action-btn.v-btn--variant-outlined {
  background: #FCF6F7; /* very soft maroon wash so the border reads crisply */
}

.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
.text-error { color: #EE5044; }

/* ── Mobile timesheet rows ──────────────────────────────── */
.ts-row-mobile {
  padding: 10px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.ts-row-mobile--today {
  background: rgba(129, 20, 41, 0.06); /* soft maroon tint for today (was green) */
}
.ts-row-mobile--total {
  padding: 12px 16px;
  border-top: 2px solid rgba(0, 0, 0, 0.10);
  background: var(--surface-2);
}
.ts-row-mobile__primary {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}
.ts-row-mobile__day {
  font-size: 13px;
  color: var(--text-1);
}
.ts-row-mobile__hours {
  font-size: 13px;
  color: var(--text-1);
}
.ts-row-mobile__secondary {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
  font-size: 11px;
  color: var(--text-3);
}
.ts-row-mobile__sep {
  color: var(--text-3);
  opacity: 0.6;
}
</style>
