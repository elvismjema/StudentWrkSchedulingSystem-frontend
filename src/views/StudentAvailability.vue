<template>
  <div class="availability-container">
    <!-- Header -->
    <div class="page-header">
      <h1 class="page-title">My Availability</h1>
      <p class="page-subtitle">
        Click on time slots to mark when you're available to work. Green slots indicate availability.
      </p>
    </div>

    <!-- Action Buttons -->
    <div class="action-buttons">
      <v-btn
        color="#0D9488"
        variant="flat"
        :loading="saving"
        :disabled="!hasChanges"
        @click="saveChanges"
      >
        Save Changes
      </v-btn>
      <v-btn variant="outlined" @click="clearAll">Clear All</v-btn>
    </div>

    <!-- Loading Indicator -->
    <v-progress-linear v-if="loading" indeterminate color="#8B1538" class="mb-4" />

    <!-- Weekly Grid -->
    <div class="grid-card">
      <table class="availability-grid">
        <thead>
          <tr>
            <th class="time-header">Time</th>
            <th v-for="day in days" :key="day.value" class="day-header">{{ day.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="hour in timeSlots" :key="hour.value">
            <td class="time-cell">{{ hour.label }}</td>
            <td
              v-for="day in days"
              :key="`${day.value}-${hour.value}`"
              class="slot-cell"
              :class="{ selected: isSelected(day.value, hour.value) }"
              @click="openTimeRangeDialog(day, hour.value)"
            />
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Time Range Dialog -->
    <v-dialog v-model="showTimeRangeDialog" max-width="420">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-clock-outline" class="mr-2" />
          Set Availability — {{ timeRangeForm.dayLabel }}
        </v-card-title>
        <v-card-text>
          <p class="text-body-2 text-grey mb-4">
            Choose the time range you are available on <strong>{{ timeRangeForm.dayLabel }}</strong>.
          </p>
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="timeRangeForm.startTime"
                type="time"
                label="Start Time"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="timeRangeForm.endTime"
                type="time"
                label="End Time"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
          </v-row>
          <p v-if="timeRangeForm.startTime && timeRangeForm.endTime" class="text-body-2 mt-1">
            <v-icon icon="mdi-check-circle" color="#0D9488" size="16" class="mr-1" />
            {{ formatTimeLabel(timeRangeForm.startTime) }} – {{ formatTimeLabel(timeRangeForm.endTime) }}
          </p>
        </v-card-text>
        <v-card-actions>
          <v-btn variant="text" color="error" @click="clearDaySlots">Clear Day</v-btn>
          <v-spacer />
          <v-btn variant="text" @click="showTimeRangeDialog = false">Cancel</v-btn>
          <v-btn color="#0D9488" variant="flat" @click="applyTimeRange">Apply</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Availability Exceptions -->
    <div class="exceptions-section">
      <h2 class="exceptions-title">Availability Exceptions</h2>
      <p class="exceptions-subtitle">
        Mark specific dates when your availability differs from the regular schedule.
      </p>

      <!-- Existing exceptions list -->
      <div v-if="exceptions.length" class="exceptions-list">
        <v-card
          v-for="exc in exceptions"
          :key="exc.id"
          variant="outlined"
          class="exception-card"
        >
          <v-card-text class="d-flex align-center justify-space-between pa-3">
            <div>
              <strong>{{ formatDate(exc.specificDate) }}</strong>
              <span class="ml-2 text-grey">
                {{ formatTimeLabel(exc.startTime) }} – {{ formatTimeLabel(exc.endTime) }}
              </span>
              <v-chip size="x-small" class="ml-2" :color="exc.availabilityType === 'unavailable' ? 'error' : 'success'" variant="tonal">
                {{ exc.availabilityType }}
              </v-chip>
            </div>
            <v-btn icon="mdi-close" size="small" variant="text" color="error" @click="removeException(exc)" />
          </v-card-text>
        </v-card>
      </div>

      <v-btn variant="outlined" size="small" class="mt-3" @click="showExceptionDialog = true">
        Add Exception
      </v-btn>
    </div>

    <!-- Exception Dialog -->
    <v-dialog v-model="showExceptionDialog" max-width="480">
      <v-card>
        <v-card-title>Add Exception</v-card-title>
        <v-card-text>
          <v-form ref="exceptionFormRef" v-model="exceptionFormValid">
            <v-text-field
              v-model="exceptionForm.specificDate"
              type="date"
              label="Date"
              variant="outlined"
              density="comfortable"
              class="mb-3"
              :rules="[requiredRule]"
            />
            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model="exceptionForm.startTime"
                  type="time"
                  label="Start Time"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="exceptionForm.endTime"
                  type="time"
                  label="End Time"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </v-col>
            </v-row>
            <v-select
              v-model="exceptionForm.availabilityType"
              :items="['available', 'unavailable']"
              label="Type"
              variant="outlined"
              density="comfortable"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showExceptionDialog = false">Cancel</v-btn>
          <v-btn color="#0D9488" variant="flat" :loading="savingException" @click="saveException">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3500">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import Utils from "../config/utils.js";
import availabilityService from "../services/availabilityService.js";

const currentUser = Utils.getStore("user") || {};
const userId = currentUser.userId;

// --- State ---
const loading = ref(false);
const saving = ref(false);
const savingException = ref(false);
const selectedSlots = ref(new Set());
const initialSlots = ref(new Set());
const existingRecords = ref([]);
const showExceptionDialog = ref(false);
const exceptionFormRef = ref(null);
const exceptionFormValid = ref(false);
const snackbar = ref({ show: false, text: "", color: "success" });
const showTimeRangeDialog = ref(false);
const timeRangeForm = ref({ dayValue: null, dayLabel: "", startTime: "", endTime: "" });

// --- Days and Time Slots ---
const days = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 0 },
];

const timeSlots = [];
for (let h = 6; h <= 20; h++) {
  const period = h >= 12 ? "PM" : "AM";
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
  timeSlots.push({ label: `${display}:00 ${period}`, value: h });
}

// --- Exception Form ---
const exceptionForm = ref({
  specificDate: "",
  startTime: "",
  endTime: "",
  availabilityType: "unavailable",
});

const requiredRule = (v) => (v !== null && v !== undefined && v !== "" ? true : "Required");

// --- Computed ---
const hasChanges = computed(() => {
  if (selectedSlots.value.size !== initialSlots.value.size) return true;
  for (const key of selectedSlots.value) {
    if (!initialSlots.value.has(key)) return true;
  }
  return false;
});

const exceptions = computed(() =>
  existingRecords.value.filter((r) => r.specificDate && !r.isRecurring)
);

// --- Helpers ---
const slotKey = (day, hour) => `${day}-${hour}`;

const isSelected = (day, hour) => selectedSlots.value.has(slotKey(day, hour));

const notify = (text, color = "success") => {
  snackbar.value = { show: true, text, color };
};

const formatTimeLabel = (value) => {
  if (!value) return "";
  const [hStr, mStr] = String(value).split(":");
  const h = parseInt(hStr, 10);
  const period = h >= 12 ? "PM" : "AM";
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${display}:${mStr} ${period}`;
};

const formatDate = (value) => {
  if (!value) return "";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const pad = (n) => String(n).padStart(2, "0");

// --- Grid Interactions ---
const openTimeRangeDialog = (day, hour) => {
  const existingHours = [];
  for (const key of selectedSlots.value) {
    const [d, h] = key.split("-").map(Number);
    if (d === day.value) existingHours.push(h);
  }
  existingHours.sort((a, b) => a - b);

  let startH = hour;
  let endH = hour + 1;
  if (existingHours.length > 0) {
    startH = existingHours[0];
    endH = existingHours[existingHours.length - 1] + 1;
  }

  timeRangeForm.value = {
    dayValue: day.value,
    dayLabel: days.find((d) => d.value === day.value)?.label || "",
    startTime: `${pad(startH)}:00`,
    endTime: `${pad(endH)}:00`,
  };
  showTimeRangeDialog.value = true;
};

const applyTimeRange = () => {
  const { dayValue, startTime, endTime } = timeRangeForm.value;
  if (!startTime || !endTime) return;

  const startH = parseInt(startTime.split(":")[0], 10);
  const startM = parseInt(startTime.split(":")[1], 10);
  const endH = parseInt(endTime.split(":")[0], 10);
  const endM = parseInt(endTime.split(":")[1], 10);

  if (startH > endH || (startH === endH && startM >= endM)) {
    notify("End time must be after start time.", "error");
    return;
  }

  const updated = new Set(selectedSlots.value);
  // Clear existing slots for this day
  for (const key of [...updated]) {
    if (key.startsWith(`${dayValue}-`)) updated.delete(key);
  }
  // Fill slots for the range (round to full hours)
  const effectiveStart = startM > 0 ? startH : startH;
  const effectiveEnd = endM > 0 ? endH + 1 : endH;
  for (let h = effectiveStart; h < effectiveEnd && h <= 20; h++) {
    if (h >= 6) updated.add(slotKey(dayValue, h));
  }
  selectedSlots.value = updated;
  showTimeRangeDialog.value = false;
};

const clearDaySlots = () => {
  const { dayValue } = timeRangeForm.value;
  const updated = new Set(selectedSlots.value);
  for (const key of [...updated]) {
    if (key.startsWith(`${dayValue}-`)) updated.delete(key);
  }
  selectedSlots.value = updated;
  showTimeRangeDialog.value = false;
};

const clearAll = () => {
  selectedSlots.value = new Set();
};

// --- API ---
const loadAvailabilities = async () => {
  if (!userId) return;
  loading.value = true;
  try {
    const response = await availabilityService.listForUser(userId);
    const records = response.data || [];
    existingRecords.value = records;

    const slots = new Set();
    for (const rec of records) {
      if (rec.specificDate && !rec.isRecurring) continue;
      if (rec.dayOfWeek == null) continue;
      const startHour = parseInt(String(rec.startTime).split(":")[0], 10);
      const endHour = parseInt(String(rec.endTime).split(":")[0], 10);
      for (let h = startHour; h < endHour; h++) {
        slots.add(slotKey(rec.dayOfWeek, h));
      }
    }
    selectedSlots.value = new Set(slots);
    initialSlots.value = new Set(slots);
  } catch (error) {
    notify(error?.response?.data?.message || "Failed to load availability.", "error");
  } finally {
    loading.value = false;
  }
};

const saveChanges = async () => {
  if (!userId) return;
  saving.value = true;
  try {
    const recurringRecords = existingRecords.value.filter(
      (r) => !r.specificDate || r.isRecurring
    );
    for (const rec of recurringRecords) {
      await availabilityService.remove(rec.id);
    }

    const slotsByDay = {};
    for (const key of selectedSlots.value) {
      const [day, hour] = key.split("-").map(Number);
      if (!slotsByDay[day]) slotsByDay[day] = [];
      slotsByDay[day].push(hour);
    }

    for (const [day, hours] of Object.entries(slotsByDay)) {
      hours.sort((a, b) => a - b);
      const ranges = [];
      let start = hours[0];
      let end = hours[0];

      for (let i = 1; i < hours.length; i++) {
        if (hours[i] === end + 1) {
          end = hours[i];
        } else {
          ranges.push({ start, end: end + 1 });
          start = hours[i];
          end = hours[i];
        }
      }
      ranges.push({ start, end: end + 1 });

      for (const range of ranges) {
        await availabilityService.create({
          userId,
          dayOfWeek: parseInt(day, 10),
          startTime: `${pad(range.start)}:00`,
          endTime: `${pad(range.end)}:00`,
          availabilityType: "available",
          isRecurring: true,
        });
      }
    }

    notify("Availability saved successfully.");
    await loadAvailabilities();
  } catch (error) {
    notify(error?.response?.data?.message || "Failed to save availability.", "error");
  } finally {
    saving.value = false;
  }
};

const saveException = async () => {
  const valid = await exceptionFormRef.value?.validate();
  if (!valid?.valid) return;

  savingException.value = true;
  try {
    await availabilityService.create({
      userId,
      startTime: exceptionForm.value.startTime,
      endTime: exceptionForm.value.endTime,
      availabilityType: exceptionForm.value.availabilityType,
      specificDate: exceptionForm.value.specificDate,
      isRecurring: false,
    });
    notify("Exception added.");
    showExceptionDialog.value = false;
    exceptionForm.value = { specificDate: "", startTime: "", endTime: "", availabilityType: "unavailable" };
    await loadAvailabilities();
  } catch (error) {
    notify(error?.response?.data?.message || "Failed to add exception.", "error");
  } finally {
    savingException.value = false;
  }
};

const removeException = async (exc) => {
  try {
    await availabilityService.remove(exc.id);
    notify("Exception removed.");
    await loadAvailabilities();
  } catch (error) {
    notify(error?.response?.data?.message || "Failed to remove exception.", "error");
  }
};

onMounted(loadAvailabilities);
</script>

<style scoped>
.availability-container {
  padding: 24px;
  background-color: #fafafa;
  min-height: 100%;
}

.page-header {
  margin-bottom: 16px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.page-subtitle {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.grid-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
  overflow: hidden;
  margin-bottom: 32px;
}

.availability-grid {
  width: 100%;
  border-collapse: collapse;
  user-select: none;
}

.availability-grid th,
.availability-grid td {
  border: 1px solid #e8e8e8;
  text-align: center;
}

.time-header {
  width: 100px;
  padding: 14px 8px;
  font-size: 13px;
  font-weight: 600;
  color: #666;
  background: #fafafa;
}

.day-header {
  padding: 14px 8px;
  font-size: 13px;
  font-weight: 600;
  color: #333;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: #fafafa;
}

.time-cell {
  padding: 10px 8px;
  font-size: 12px;
  color: #666;
  background: #fafafa;
  white-space: nowrap;
  width: 100px;
}

.slot-cell {
  height: 44px;
  cursor: pointer;
  transition: background-color 0.1s ease;
  background-color: white;
}

.slot-cell:hover {
  background-color: #e0f2f1;
}

.slot-cell.selected {
  background-color: #0D9488;
}

.slot-cell.selected:hover {
  background-color: #0f766e;
}

/* Exceptions Section */
.exceptions-section {
  background: white;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
  padding: 24px;
}

.exceptions-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0 0 6px 0;
}

.exceptions-subtitle {
  font-size: 13px;
  color: #666;
  margin: 0 0 12px 0;
}

.exceptions-list {
  margin-bottom: 8px;
}

.exception-card {
  margin-bottom: 8px;
}
</style>
