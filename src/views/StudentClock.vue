<template>
  <div class="clock-page">
    <section class="page-header">
      <h1 class="page-title">Clock In/Out</h1>
      <p class="page-subtitle">Track your work time</p>
    </section>

    <v-card class="clock-card" elevation="0">
      <div class="status-panel">
        <div class="status-icon-wrap">
          <v-icon size="72" class="status-icon">
            {{ isClockedIn ? "mdi-timer-play-outline" : "mdi-clock-outline" }}
          </v-icon>
        </div>
        <p class="status-label">{{ currentStatusLabel }}</p>
        <p class="status-meta">{{ currentStatusMeta }}</p>
      </div>

      <v-divider />

      <div class="shift-panel">
        <div class="shift-panel-top">
          <div>
            <p class="section-label">Today's Shift</p>
            <div class="role-row">
              <v-chip class="location-chip" size="large" variant="outlined">
                <span class="chip-dot" />
                {{ currentShift.location }}
              </v-chip>
              <span class="role-title">{{ currentShift.role }}</span>
            </div>
          </div>

          <div class="attendance-pill" :class="attendanceClass">
            <v-icon size="18">{{ attendanceIcon }}</v-icon>
            <span>{{ attendanceLabel }}</span>
          </div>
        </div>

        <div class="detail-row">
          <div class="detail-item">
            <v-icon size="20" class="detail-icon">mdi-clock-outline</v-icon>
            <span>{{ currentShift.scheduledWindow }}</span>
          </div>
          <div class="detail-item">
            <v-icon size="20" class="detail-icon">mdi-map-marker-outline</v-icon>
            <span>{{ currentShift.campusLocation }}</span>
          </div>
        </div>

        <div v-if="isClockedIn" class="active-session">
          <div class="active-session-label">Current session</div>
          <div class="active-session-time">
            Started at {{ formatTime(clockInTime) }} • {{ activeDurationLabel }}
          </div>
        </div>

        <v-btn
          block
          size="x-large"
          class="clock-action"
          :class="isClockedIn ? 'clock-out' : 'clock-in'"
          @click="toggleClock"
        >
          {{ isClockedIn ? "Clock Out" : "Clock In" }}
        </v-btn>
      </div>
    </v-card>

    <section class="history-section">
      <h2 class="history-title">Recent History</h2>
      <p class="history-subtitle">Your recent clock records</p>

      <div class="history-list">
        <v-card
          v-for="entry in history"
          :key="entry.id"
          class="history-card"
          elevation="0"
        >
          <div class="history-card-content">
            <div>
              <p class="history-date">{{ entry.dateLabel }}</p>
              <p class="history-time">
                {{ entry.actualWindow }} • Scheduled: {{ entry.scheduledWindow }}
              </p>
            </div>
            <div class="history-status" :class="entry.statusClass">
              {{ entry.status }}
            </div>
          </div>
        </v-card>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

const currentShift = {
  role: "Barista",
  location: "The Brew",
  campusLocation: "The Brew - Main Campus",
  scheduledWindow: "14:00 - 18:00",
  scheduledStartHour: 14,
  scheduledStartMinute: 0,
};

const now = ref(new Date());
const isClockedIn = ref(false);
const clockInTime = ref(null);
const history = ref([
  {
    id: 1,
    dateLabel: "Saturday, Feb 28",
    actualWindow: "1:43 PM - 5:43 PM",
    scheduledWindow: "14:00 - 18:00",
    status: "On Time",
    statusClass: "on-time",
  },
]);

let timerId;

const scheduledStart = computed(() => {
  const date = new Date(now.value);
  date.setHours(currentShift.scheduledStartHour, currentShift.scheduledStartMinute, 0, 0);
  return date;
});

const attendanceState = computed(() => {
  if (isClockedIn.value && clockInTime.value) {
    return clockInTime.value <= scheduledStart.value ? "on-time" : "late";
  }

  return now.value <= scheduledStart.value ? "on-time" : "upcoming";
});

const attendanceLabel = computed(() => {
  if (attendanceState.value === "late") {
    return "Late";
  }

  if (attendanceState.value === "upcoming") {
    return "Upcoming";
  }

  return "On time";
});

const attendanceClass = computed(() => attendanceState.value);

const attendanceIcon = computed(() => {
  if (attendanceState.value === "late") {
    return "mdi-alert-circle-outline";
  }

  return "mdi-check-circle-outline";
});

const currentStatusLabel = computed(() =>
  isClockedIn.value ? "Currently clocked in" : "Ready to clock in"
);

const currentStatusMeta = computed(() => {
  if (isClockedIn.value && clockInTime.value) {
    return `Started at ${formatTime(clockInTime.value)} today`;
  }

  return `Scheduled shift starts at ${formatTime(scheduledStart.value)}`;
});

const activeDurationLabel = computed(() => {
  if (!clockInTime.value) {
    return "0m";
  }

  const diffMs = now.value.getTime() - clockInTime.value.getTime();
  const totalMinutes = Math.max(0, Math.floor(diffMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
});

const toggleClock = () => {
  if (!isClockedIn.value) {
    clockInTime.value = new Date(now.value);
    isClockedIn.value = true;
    return;
  }

  const clockOutTime = new Date(now.value);
  history.value.unshift({
    id: Date.now(),
    dateLabel: formatHistoryDate(clockOutTime),
    actualWindow: `${formatTime(clockInTime.value)} - ${formatTime(clockOutTime)}`,
    scheduledWindow: currentShift.scheduledWindow,
    status: clockInTime.value <= scheduledStart.value ? "On Time" : "Late",
    statusClass: clockInTime.value <= scheduledStart.value ? "on-time" : "late",
  });

  isClockedIn.value = false;
  clockInTime.value = null;
};

const formatTime = (value) =>
  new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

const formatHistoryDate = (value) =>
  new Date(value).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

onMounted(() => {
  timerId = window.setInterval(() => {
    now.value = new Date();
  }, 1000);
});

onBeforeUnmount(() => {
  window.clearInterval(timerId);
});
</script>

<style scoped>
.clock-page {
  min-height: 100%;
  padding: 32px;
  background:
    radial-gradient(circle at top right, rgba(209, 233, 217, 0.55), transparent 24%),
    linear-gradient(180deg, #f7f7f4 0%, #f3f4f1 100%);
  overflow-y: auto;
}

.page-header {
  margin-bottom: 28px;
}

.page-title {
  margin: 0;
  font-size: clamp(2.3rem, 4vw, 3.3rem);
  font-weight: 800;
  line-height: 1.05;
  color: #1f2023;
  letter-spacing: -0.04em;
}

.page-subtitle,
.history-subtitle,
.section-label,
.history-time,
.status-meta,
.detail-item,
.active-session-time {
  color: #6f7685;
}

.page-subtitle {
  margin: 10px 0 0;
  font-size: 1.1rem;
}

.clock-card,
.history-card {
  border: 1px solid #d7dadf;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(8px);
  box-shadow: 0 10px 24px rgba(36, 43, 51, 0.06);
}

.status-panel {
  min-height: 360px;
  padding: 40px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.status-icon-wrap {
  width: 124px;
  height: 124px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  border: 10px solid #b6bac3;
  color: #aeb3bc;
  margin-bottom: 26px;
}

.status-label {
  margin: 0;
  font-size: clamp(2rem, 3vw, 2.7rem);
  font-weight: 500;
  color: #656d7e;
}

.status-meta {
  margin: 14px 0 0;
  font-size: 1rem;
}

.shift-panel {
  padding: 30px 48px 38px;
}

.shift-panel-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.section-label {
  margin: 0 0 14px;
  font-size: 1rem;
}

.role-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.location-chip {
  border-color: #f3b186;
  color: #f97316;
  font-weight: 600;
  background: #fff3eb;
}

.location-chip :deep(.v-chip__content) {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chip-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #f97316;
}

.role-title {
  font-size: 1.9rem;
  font-weight: 500;
  color: #222327;
}

.attendance-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  border-radius: 999px;
  font-size: 0.98rem;
  font-weight: 600;
  white-space: nowrap;
}

.attendance-pill.on-time {
  color: #22c55e;
  background: #e9f9ee;
}

.attendance-pill.upcoming {
  color: #16a34a;
  background: #edf9ee;
}

.attendance-pill.late {
  color: #dc2626;
  background: #fcebea;
}

.detail-row {
  margin-top: 28px;
  display: flex;
  flex-wrap: wrap;
  gap: 28px;
}

.detail-item {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-size: 1rem;
}

.detail-icon {
  color: #737b8b;
}

.active-session {
  margin-top: 24px;
  padding: 18px 20px;
  border-radius: 16px;
  background: #f5fbf7;
  border: 1px solid #d7efde;
}

.active-session-label {
  color: #1f7a3f;
  font-size: 0.92rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.active-session-time {
  margin-top: 6px;
  font-size: 1rem;
}

.clock-action {
  margin-top: 30px;
  border-radius: 16px;
  min-height: 74px;
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  text-transform: none;
}

.clock-action.clock-in {
  background: linear-gradient(135deg, #22c55e 0%, #26b85b 100%);
  color: #ffffff;
}

.clock-action.clock-out {
  background: linear-gradient(135deg, #8b1538 0%, #b11f49 100%);
  color: #ffffff;
}

.history-section {
  margin-top: 44px;
}

.history-title {
  margin: 0;
  font-size: clamp(2rem, 3vw, 2.7rem);
  font-weight: 800;
  line-height: 1.05;
  color: #1f2023;
  letter-spacing: -0.04em;
}

.history-subtitle {
  margin: 10px 0 24px;
  font-size: 1.08rem;
}

.history-list {
  display: grid;
  gap: 16px;
}

.history-card {
  padding: 22px 24px;
}

.history-card-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.history-date {
  margin: 0;
  color: #202126;
  font-size: 1.15rem;
  font-weight: 700;
}

.history-time {
  margin: 8px 0 0;
  font-size: 1rem;
}

.history-status {
  padding: 10px 18px;
  border-radius: 999px;
  font-size: 0.98rem;
  font-weight: 700;
  white-space: nowrap;
}

.history-status.on-time {
  color: #22c55e;
  background: #e9f9ee;
  border: 1px solid #b8e8c5;
}

.history-status.late {
  color: #dc2626;
  background: #fef0ef;
  border: 1px solid #f3bfbb;
}

@media (max-width: 900px) {
  .clock-page {
    padding: 24px 18px 32px;
  }

  .status-panel {
    min-height: 300px;
  }

  .shift-panel {
    padding: 24px;
  }

  .shift-panel-top,
  .history-card-content {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 640px) {
  .page-title,
  .history-title {
    letter-spacing: -0.03em;
  }

  .status-icon-wrap {
    width: 108px;
    height: 108px;
    border-width: 8px;
  }

  .status-label {
    font-size: 1.8rem;
  }

  .role-title {
    font-size: 1.5rem;
  }

  .clock-action {
    min-height: 64px;
    font-size: 1.2rem;
  }
}
</style>
