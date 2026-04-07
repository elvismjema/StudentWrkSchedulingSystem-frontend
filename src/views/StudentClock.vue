<template>
  <div class="student-clock pa-6" role="main" aria-label="Time and Attendance">
    <h1 class="text-h5 font-weight-bold mb-4">Time & Attendance</h1>

    <!-- Loading -->
    <template v-if="loading">
      <v-skeleton-loader type="card" class="mb-4" />
      <v-skeleton-loader type="button" class="mb-4" />
      <v-skeleton-loader type="table" />
    </template>

    <template v-else>
      <!-- Clock Status Banner -->
      <ClockStatusBanner
        :clocked-in="clockedIn"
        :clock-in-time="clockInTime"
        :on-break="onBreak"
        :shift-name="currentShiftName"
        class="mb-4"
      />

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

      <!-- Clock In/Out Button -->
      <div class="text-center mb-6">
        <v-btn
          v-if="!clockedIn"
          size="x-large"
          color="success"
          variant="flat"
          rounded="pill"
          :disabled="!canClockIn"
          :loading="clockingIn"
          class="clock-btn"
          aria-label="Clock in"
          @click="confirmClockIn"
        >
          <v-icon start size="28">mdi-login</v-icon>
          Clock In
        </v-btn>

        <div v-else class="d-flex flex-column align-center gap-3">
          <!-- Break controls -->
          <div v-if="!onBreak" class="d-flex gap-2">
            <v-btn
              color="warning"
              variant="flat"
              rounded="pill"
              :loading="breakLoading"
              aria-label="Start break"
              @click="startBreak"
            >
              <v-icon start>mdi-coffee-outline</v-icon>
              Start Break
            </v-btn>
            <v-btn
              color="error"
              variant="flat"
              rounded="pill"
              :loading="clockingOut"
              aria-label="Clock out"
              @click="confirmClockOut"
            >
              <v-icon start>mdi-logout</v-icon>
              Clock Out
            </v-btn>
          </div>

          <v-btn
            v-else
            color="success"
            variant="flat"
            rounded="pill"
            :loading="breakLoading"
            aria-label="End break"
            @click="endBreakAction"
          >
            <v-icon start>mdi-coffee-off-outline</v-icon>
            End Break
          </v-btn>
        </div>

        <p v-if="!canClockIn && !clockedIn" class="text-caption text-medium-emphasis mt-2">
          Clock in is available within 15 minutes of your shift start.
        </p>
      </div>

      <!-- Weekly Timesheet -->
      <v-card elevation="0" rounded="lg" style="border: 1px solid #e0e0e0">
        <v-card-title class="pa-4 pb-2">
          <v-icon class="mr-2" size="20">mdi-table-clock</v-icon>
          Weekly Timesheet
        </v-card-title>

        <v-card-text class="pa-0">
          <v-table density="comfortable">
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
                <td class="text-right text-body-2 font-weight-bold" style="color: #2E7D32">${{ weeklyEarnings }}</td>
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
          <p v-if="activeShift && activeShift.location">
            Location: {{ activeShift.location }}
          </p>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="clockInDialog = false">Cancel</v-btn>
          <v-btn color="success" variant="flat" :loading="clockingIn" @click="doClockIn">
            Clock In
          </v-btn>
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
            Clocked in since {{ new Date(clockInTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) }}
          </p>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="clockOutDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" :loading="clockingOut" @click="doClockOut">
            Clock Out
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="bottom">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import Utils from '../config/utils.js';
import studentService from '../services/studentService.js';
import ClockStatusBanner from '../components/student/ClockStatusBanner.vue';

const user = Utils.getStore('user');

const loading = ref(true);
const clockedIn = ref(false);
const clockInTime = ref(null);
const onBreak = ref(false);
const currentRecordId = ref(null);
const activeShift = ref(null);
const currentShiftName = ref('');

const clockingIn = ref(false);
const clockingOut = ref(false);
const breakLoading = ref(false);
const clockInDialog = ref(false);
const clockOutDialog = ref(false);

const timesheetData = ref([]);
const snackbar = ref({ show: false, text: '', color: 'success' });

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
  const diff = start - Date.now();
  return diff <= 15 * 60 * 1000 && diff >= -60 * 60 * 1000;
});

const formatShiftTime = (s) => {
  if (!s) return '';
  const fmt = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt)) return '';
    return dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };
  const startDT = buildDT(s, 'start_time') || s.start_time || s.startTime || s.shift_start;
  const endDT = buildDT(s, 'end_time') || s.end_time || s.endTime || s.shift_end;
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

const toDateStr = (d) => {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

const todayStr = toDateStr(new Date());

const timesheetRows = computed(() => {
  const monday = getMonday(new Date());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const dateStr = toDateStr(d);
    const entry = timesheetData.value.find(t => {
      const td = new Date(t.date || t.shift_date);
      return toDateStr(td) === dateStr;
    });

    const fmtTime = (v) => {
      if (!v) return null;
      return new Date(v).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    let scheduled = null;
    let actual = null;
    let hours = null;
    let breakDuration = null;
    let actualClass = '';

    if (entry) {
      scheduled = (fmtTime(entry.scheduled_start) || '') + (entry.scheduled_start && entry.scheduled_end ? ' – ' : '') + (fmtTime(entry.scheduled_end) || '');
      if (!scheduled.trim() || scheduled === ' – ') scheduled = null;

      actual = (fmtTime(entry.actual_start || entry.clock_in_time) || '') +
        ((entry.actual_start || entry.clock_in_time) && (entry.actual_end || entry.clock_out_time) ? ' – ' : '') +
        (fmtTime(entry.actual_end || entry.clock_out_time) || '');
      if (!actual.trim() || actual === ' – ') actual = null;

      hours = entry.total_hours != null ? Number(entry.total_hours).toFixed(1) : null;
      breakDuration = entry.break_minutes ? entry.break_minutes + 'm' : null;

      // Highlight late clock-ins
      if (entry.actual_start && entry.scheduled_start) {
        const late = new Date(entry.actual_start).getTime() - new Date(entry.scheduled_start).getTime();
        if (late > 5 * 60 * 1000) actualClass = 'text-error';
      }
    }

    return {
      date: dateStr,
      label: DAY_LABELS[d.getDay()] + ' ' + d.getDate(),
      isToday: dateStr === todayStr,
      scheduled,
      actual,
      hours,
      breakDuration,
      actualClass,
    };
  });
});

const weeklyTotal = computed(() => {
  let sum = 0;
  timesheetRows.value.forEach(r => {
    if (r.hours) sum += parseFloat(r.hours);
  });
  return sum.toFixed(1);
});

const weeklyEarnings = computed(() => {
  return (parseFloat(weeklyTotal.value) * 10).toFixed(2);
});

const normalizeTimesheetEntries = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object' && Array.isArray(payload.entries)) {
    return payload.entries;
  }
  return [];
};

const fetchAll = async () => {
  loading.value = true;
  try {
    await Promise.allSettled([fetchClockStatus(), fetchActiveShift(), fetchTimesheet()]);
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

const fetchActiveShift = async () => {
  try {
    const userId = user?.userId || user?.id;
    const today = toDateStr(new Date());
    const res = await studentService.getShifts({ assigned_user_id: userId, start_date: today, end_date: today });
    const shifts = res?.data?.data || res?.data || [];
    const now = Date.now();

    // Find current or next upcoming shift today
    const sorted = shifts.sort((a, b) =>
      new Date(a.start_time || a.startTime || a.shift_start) - new Date(b.start_time || b.startTime || b.shift_start)
    );

    activeShift.value = sorted.find(s => {
      const end = new Date(s.end_time || s.endTime || s.shift_end).getTime();
      return end > now;
    }) || sorted[0] || null;

    if (activeShift.value) {
      currentShiftName.value = activeShift.value.department_name || activeShift.value.departmentName || '';
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

    const res = await studentService.getTimesheet({
      startDate: toDateStr(monday),
      endDate: toDateStr(sunday),
    });
    timesheetData.value = normalizeTimesheetEntries(res?.data?.data || res?.data);
  } catch {
    timesheetData.value = [];
  }
};

const confirmClockIn = () => {
  clockInDialog.value = true;
};

const doClockIn = async () => {
  clockingIn.value = true;
  try {
    const payload = {};
    if (activeShift.value) {
      payload.shiftId = activeShift.value.shift_id || activeShift.value.id;
    }
    await studentService.clockIn(payload);
    showSnackbar('Clocked in!', 'success');
    clockInDialog.value = false;
    await fetchClockStatus();
  } catch (err) {
    showSnackbar(err?.response?.data?.message || 'Failed to clock in.', 'error');
  } finally {
    clockingIn.value = false;
  }
};

const confirmClockOut = () => {
  clockOutDialog.value = true;
};

const doClockOut = async () => {
  clockingOut.value = true;
  try {
    await studentService.clockOut();
    showSnackbar('Clocked out!', 'success');
    clockOutDialog.value = false;
    await fetchAll();
  } catch (err) {
    showSnackbar(err?.response?.data?.message || 'Failed to clock out.', 'error');
  } finally {
    clockingOut.value = false;
  }
};

const startBreak = async () => {
  breakLoading.value = true;
  try {
    await studentService.startBreak(currentRecordId.value);
    onBreak.value = true;
    showSnackbar('Break started.', 'info');
  } catch (err) {
    showSnackbar(err?.response?.data?.message || 'Failed to start break.', 'error');
  } finally {
    breakLoading.value = false;
  }
};

const endBreakAction = async () => {
  breakLoading.value = true;
  try {
    await studentService.endBreak(currentRecordId.value);
    onBreak.value = false;
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
.student-clock {
  width: 100%;
}

.clock-btn {
  min-width: 200px;
  height: 56px !important;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }

.text-error {
  color: #EE5044;
}

</style>
