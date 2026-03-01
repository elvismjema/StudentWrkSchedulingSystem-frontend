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
            <v-icon size="20">{{ attendanceIcon }}</v-icon>
            <span>{{ attendanceLabel }}</span>
          </div>
        </div>

        <div class="detail-row">
          <div class="detail-item">
            <v-icon size="22" class="detail-icon">mdi-clock-outline</v-icon>
            <span>{{ currentShift.scheduledWindow }}</span>
          </div>
          <div class="detail-item">
            <v-icon size="22" class="detail-icon">mdi-map-marker-outline</v-icon>
            <span>{{ currentShift.campusLocation }}</span>
          </div>
        </div>

        <div v-if="isClockedIn" class="active-session">
          Started at {{ formatTime(clockInTime) }} • {{ activeDurationLabel }}
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

    <v-card class="history-shell" elevation="0">
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
                {{ entry.actualWindow }} <span class="history-dot">•</span> Scheduled: {{ entry.scheduledWindow }}
              </p>
            </div>
            <div class="history-status" :class="entry.statusClass">
              {{ entry.status }}
            </div>
          </div>
        </v-card>
      </div>
    </v-card>
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

const createDemoNow = () => {
  const date = new Date();
  date.setHours(15, 12, 0, 0);
  return date;
};

const now = ref(createDemoNow());
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

const lateMinutes = computed(() => {
  const diffMs = now.value.getTime() - scheduledStart.value.getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
});

const attendanceState = computed(() => {
  if (isClockedIn.value && clockInTime.value) {
    return clockInTime.value <= scheduledStart.value ? "on-time" : "late";
  }

  if (now.value > scheduledStart.value) {
    return "late";
  }

  return "upcoming";
});

const attendanceLabel = computed(() => {
  if (attendanceState.value === "late") {
    return `${lateMinutes.value} minutes late`;
  }

  if (attendanceState.value === "upcoming") {
    return "Upcoming";
  }

  return "On Time";
});

const attendanceClass = computed(() => attendanceState.value);

const attendanceIcon = computed(() => {
  if (attendanceState.value === "late") {
    return "mdi-alert-outline";
  }

  return "mdi-check-circle-outline";
});

const currentStatusLabel = computed(() =>
  isClockedIn.value ? "Currently clocked in" : "Ready to clock in"
);

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
    now.value = new Date(now.value.getTime() + 1000);
  }, 1000);
});

onBeforeUnmount(() => {
  window.clearInterval(timerId);
});
</script>

<style scoped>
.clock-page {
  min-height: 100%;
  padding: 34px 36px 48px;
  background: #f3f3f4;
  overflow-y: auto;
}

.page-header {
  margin-bottom: 28px;
}

.page-title {
  margin: 0;
  font-size: clamp(2.4rem, 4vw, 3.4rem);
  font-weight: 800;
  line-height: 1.04;
  letter-spacing: -0.04em;
  color: #222328;
}

.page-subtitle,
.history-subtitle,
.section-label,
.history-time,
.detail-item,
.active-session {
  color: #6e7584;
}

.page-subtitle {
  margin: 10px 0 0;
  font-size: 1.15rem;
}

.clock-card,
.history-shell,
.history-card {
  border: 1px solid #d4d7dd;
  border-radius: 18px;
  background: #f7f7f8;
  box-shadow: 0 2px 8px rgba(26, 33, 46, 0.08);
}

.clock-card {
  overflow: hidden;
}

.status-panel {
  min-height: 410px;
  padding: 42px 24px 38px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.status-icon-wrap {
  width: 124px;
  height: 124px;
  margin-bottom: 28px;
  border: 10px solid #b0b5bd;
  border-radius: 50%;
  display: grid;
  place-items: center;
}

.status-icon {
  color: #afb4bc;
}

.status-label {
  margin: 0;
  font-size: clamp(2rem, 3vw, 2.45rem);
  font-weight: 500;
  color: #6b7281;
}

.shift-panel {
  padding: 34px 48px 42px;
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
  flex-wrap: wrap;
  gap: 16px;
}

.location-chip {
  background: #fbefe6;
  border-color: #f1b38e;
  color: #f27a21;
  font-weight: 500;
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
  background: #f27a21;
}

.role-title {
  color: #232428;
  font-size: 2rem;
  font-weight: 600;
}

.attendance-pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 1rem;
  white-space: nowrap;
}

.attendance-pill.late {
  color: #f1453d;
}

.attendance-pill.on-time,
.attendance-pill.upcoming {
  color: #22a44e;
}

.detail-row {
  display: flex;
  flex-wrap: wrap;
  gap: 30px;
  margin-top: 32px;
}

.detail-item {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-size: 1rem;
}

.detail-icon {
  color: #747b88;
}

.active-session {
  margin-top: 22px;
  font-size: 0.98rem;
}

.clock-action {
  margin-top: 30px;
  min-height: 78px;
  border-radius: 14px;
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  text-transform: none;
}

.clock-action.clock-in {
  background: #28c45a;
  color: #ffffff;
}

.clock-action.clock-out {
  background: #8b1538;
  color: #ffffff;
}

.history-shell {
  margin-top: 50px;
  padding: 30px 24px 24px;
}

.history-title {
  margin: 0;
  font-size: clamp(2rem, 3vw, 2.8rem);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.04em;
  color: #222328;
}

.history-subtitle {
  margin: 16px 0 30px;
  font-size: 1.1rem;
}

.history-list {
  display: grid;
  gap: 16px;
}

.history-card {
  padding: 18px 22px;
  background: #f6f6f7;
}

.history-card-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.history-date {
  margin: 0;
  color: #24252a;
  font-size: 1.2rem;
  font-weight: 700;
}

.history-time {
  margin: 10px 0 0;
  font-size: 1rem;
}

.history-dot {
  margin: 0 8px;
}

.history-status {
  padding: 10px 18px;
  border-radius: 999px;
  font-size: 0.98rem;
  font-weight: 600;
  white-space: nowrap;
}

.history-status.on-time {
  color: #20b24e;
  background: #ebf7ee;
  border: 1px solid #b7debf;
}

.history-status.late {
  color: #f1453d;
  background: #fdeeed;
  border: 1px solid #f1c0bc;
}

@media (max-width: 900px) {
  .clock-page {
    padding: 24px 18px 32px;
  }

  .status-panel {
    min-height: 320px;
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
  .status-icon-wrap {
    width: 108px;
    height: 108px;
    border-width: 8px;
  }

  .status-label {
    font-size: 1.8rem;
  }

  .role-title {
    font-size: 1.6rem;
  }

  .clock-action {
    min-height: 66px;
    font-size: 1.25rem;
  }

  .history-shell {
    padding: 22px 16px 16px;
  }
}
</style>
