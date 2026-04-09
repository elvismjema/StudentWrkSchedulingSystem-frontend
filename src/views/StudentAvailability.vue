<template>
  <div class="availability-container">
    <!-- Header -->
    <div class="page-header">
      <h1 class="page-title">My Availability</h1>
      <p class="page-subtitle">
        Click on time slots to mark when you're available or unavailable to work.
      </p>
    </div>

    <!-- Mode Toggle + Action Buttons -->
    <div class="action-buttons">
      <v-btn-toggle v-model="gridMode" mandatory color="#0D9488" rounded="lg" density="comfortable">
        <v-btn value="available" prepend-icon="mdi-calendar-check">
          Mark Available
        </v-btn>
        <v-btn value="unavailable" prepend-icon="mdi-calendar-remove" color="error">
          Mark Unavailable
        </v-btn>
      </v-btn-toggle>
      <v-spacer />
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
              :class="{
                'available': isAvailable(day.value, hour.value),
                'unavailable-slot': isUnavailable(day.value, hour.value),
                disabled: hour.disabled
              }"
              @click="hour.disabled ? null : openTimeRangeDialog(day, hour.value)"
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
          {{ gridMode === 'available' ? 'Set Availability' : 'Set Unavailability' }} — {{ timeRangeForm.dayLabel }}
        </v-card-title>
        <v-card-text>
          <p class="text-body-2 text-grey mb-4">
            Choose the time range you are
            <strong>{{ gridMode === 'available' ? 'available' : 'unavailable' }}</strong>
            on <strong>{{ timeRangeForm.dayLabel }}</strong>.
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

    <!-- Time Off Requests (formerly Availability Exceptions) -->
    <div class="exceptions-section">
      <h2 class="exceptions-title">Time Off Requests</h2>
      <p class="exceptions-subtitle">
        Request specific dates when you are unavailable — your manager will review and approve.
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

      <v-btn variant="outlined" size="small" class="mt-3" prepend-icon="mdi-calendar-plus" @click="showExceptionDialog = true">
        Request Time Off
      </v-btn>
    </div>

    <!-- Exception Dialog -->
    <v-dialog v-model="showExceptionDialog" max-width="480">
      <v-card>
        <v-card-title>Request Time Off</v-card-title>
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
const userId = currentUser.userId || currentUser.id;

// --- State ---
const loading = ref(false);
const saving = ref(false);
const savingException = ref(false);
const gridMode = ref('available'); // 'available' | 'unavailable'
const selectedSlots = ref(new Set()); // available (green)
const unavailableSlots = ref(new Set()); // unavailable (red)
const initialSlots = ref(new Set());
const initialUnavailableSlots = ref(new Set());
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
for (let h = 6; h <= 24; h++) {
  const normalizedHour = h === 24 ? 0 : h;
  const period = normalizedHour >= 12 ? "PM" : "AM";
  const display = normalizedHour > 12 ? normalizedHour - 12 : normalizedHour === 0 ? 12 : normalizedHour;
  timeSlots.push({ label: `${display}:00 ${period}`, value: h, disabled: h === 24 });
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
  if (unavailableSlots.value.size !== initialUnavailableSlots.value.size) return true;
  for (const key of unavailableSlots.value) {
    if (!initialUnavailableSlots.value.has(key)) return true;
  }
  return false;
});

const exceptions = computed(() =>
  existingRecords.value.filter((r) => r.specificDate && !r.isRecurring)
);

// --- Helpers ---
const slotKey = (day, hour) => `${day}-${hour}`;

const isAvailable = (day, hour) => selectedSlots.value.has(slotKey(day, hour));
const isUnavailable = (day, hour) => unavailableSlots.value.has(slotKey(day, hour));

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

  const targetSet = gridMode.value === 'available' ? selectedSlots : unavailableSlots;
  const otherSet = gridMode.value === 'available' ? unavailableSlots : selectedSlots;

  const updated = new Set(targetSet.value);
  const updatedOther = new Set(otherSet.value);
  // Clear existing slots for this day in both sets
  for (const key of [...updated]) {
    if (key.startsWith(`${dayValue}-`)) updated.delete(key);
  }
  for (const key of [...updatedOther]) {
    if (key.startsWith(`${dayValue}-`)) updatedOther.delete(key);
  }
  // Fill slots for the range (round to full hours)
  const effectiveStart = startH;
  const effectiveEnd = endM > 0 ? endH + 1 : endH;
  for (let h = effectiveStart; h < effectiveEnd && h <= 24; h++) {
    if (h >= 6) updated.add(slotKey(dayValue, h));
  }

  targetSet.value = updated;
  otherSet.value = updatedOther;
  showTimeRangeDialog.value = false;
};

const clearDaySlots = () => {
  const { dayValue } = timeRangeForm.value;
  const updatedAvail = new Set(selectedSlots.value);
  const updatedUnavail = new Set(unavailableSlots.value);
  for (const key of [...updatedAvail]) {
    if (key.startsWith(`${dayValue}-`)) updatedAvail.delete(key);
  }
  for (const key of [...updatedUnavail]) {
    if (key.startsWith(`${dayValue}-`)) updatedUnavail.delete(key);
  }
  selectedSlots.value = updatedAvail;
  unavailableSlots.value = updatedUnavail;
  showTimeRangeDialog.value = false;
};

const clearAll = () => {
  selectedSlots.value = new Set();
  unavailableSlots.value = new Set();
};

// --- API ---
const loadAvailabilities = async () => {
  if (!userId) return;
  loading.value = true;
  try {
    const response = await availabilityService.listForUser(userId);
    const records = response.data || [];
    existingRecords.value = records;

    const availSlots = new Set();
    const unavailSlots = new Set();
    for (const rec of records) {
      if (rec.specificDate && !rec.isRecurring) continue;
      if (rec.dayOfWeek == null) continue;
      const startHour = parseInt(String(rec.startTime).split(":")[0], 10);
      const endHour = parseInt(String(rec.endTime).split(":")[0], 10);
      const targetSet = rec.availabilityType === 'unavailable' ? unavailSlots : availSlots;
      for (let h = startHour; h < endHour; h++) {
        targetSet.add(slotKey(rec.dayOfWeek, h));
      }
    }
    selectedSlots.value = new Set(availSlots);
    unavailableSlots.value = new Set(unavailSlots);
    initialSlots.value = new Set(availSlots);
    initialUnavailableSlots.value = new Set(unavailSlots);
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

    successMessage.value = ''
    errorMessage.value = ''
    
    // Save available slots
    const availableByDay = {}
    availableSlots.value.forEach(slot => {
      const [day, time] = slot.split('-')
      if (!availableByDay[day]) {
        availableByDay[day] = { startHour: 24, endHour: 0 }
      }
      
      const hour = parseInt(time.split(':')[0])
      availableByDay[day].startHour = Math.min(availableByDay[day].startHour, hour)
      availableByDay[day].endHour = Math.max(availableByDay[day].endHour, hour + 1)
    })
    
    // Save unavailable slots
    const unavailableByDay = {}
    unavailableSlots.value.forEach(slot => {
      const [day, time] = slot.split('-')
      if (!unavailableByDay[day]) {
        unavailableByDay[day] = { startHour: 24, endHour: 0 }
      }
      
      const hour = parseInt(time.split(':')[0])
      unavailableByDay[day].startHour = Math.min(unavailableByDay[day].startHour, hour)
      unavailableByDay[day].endHour = Math.max(unavailableByDay[day].endHour, hour + 1)
    })
    
    const userId = getCurrentUserId()
    
    // Save available time blocks
    for (const [day, timeRange] of Object.entries(availableByDay)) {
      const availability = {
        userId: userId,
        dayOfWeek: parseInt(day),
        startTime: `${timeRange.startHour.toString().padStart(2, '0')}:00`,
        endTime: `${timeRange.endHour.toString().padStart(2, '0')}:00`,
        availabilityType: 'available',
        isRecurring: true
      }
      
      await axios.post('/api/availability', availability)
    }
    
    // Save unavailable time blocks
    for (const [day, timeRange] of Object.entries(unavailableByDay)) {
      const availability = {
        userId: userId,
        dayOfWeek: parseInt(day),
        startTime: `${timeRange.startHour.toString().padStart(2, '0')}:00`,
        endTime: `${timeRange.endHour.toString().padStart(2, '0')}:00`,
        availabilityType: 'unavailable',
        isRecurring: true
      }
      
      await axios.post('/api/availability', availability)
    }
    
    await loadExistingAvailability()
    successMessage.value = 'Availability saved successfully!'
    
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
    

    const recurringRecords = existingRecords.value.filter(
      (r) => !r.specificDate || r.isRecurring
    );
    for (const rec of recurringRecords) {
      await availabilityService.remove(rec.id);
    }

    const buildRanges = (slotsSet, type) => {
      const slotsByDay = {};
      for (const key of slotsSet) {
        const [day, hour] = key.split("-").map(Number);
        if (!slotsByDay[day]) slotsByDay[day] = [];
        slotsByDay[day].push(hour);
      }
      const payloads = [];
      for (const [day, hours] of Object.entries(slotsByDay)) {
        hours.sort((a, b) => a - b);
        let start = hours[0];
        let end = hours[0];
        for (let i = 1; i < hours.length; i++) {
          if (hours[i] === end + 1) {
            end = hours[i];
          } else {
            payloads.push({ day, start, end: end + 1 });
            start = hours[i];
            end = hours[i];
          }
        }
        payloads.push({ day, start, end: end + 1 });
      }
      return payloads.map(({ day, start, end }) =>
        availabilityService.create({
          userId,
          dayOfWeek: parseInt(day, 10),
          startTime: `${pad(start)}:00`,
          endTime: `${pad(end)}:00`,
          availabilityType: type,
          isRecurring: true,
        })
      );
    };

    await Promise.all([
      ...buildRanges(selectedSlots.value, 'available'),
      ...buildRanges(unavailableSlots.value, 'unavailable'),
    ]);

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

    const userId = getCurrentUserId()
    const response = await axios.get(`/api/availability/user/${userId}`)
    existingAvailability.value = response.data
    
    availableSlots.value.clear()
    unavailableSlots.value.clear()
    
    existingAvailability.value.forEach(avail => {
      const startHour = parseInt(avail.startTime.split(':')[0])
      const endHour = parseInt(avail.endTime.split(':')[0])
      
      for (let h = startHour; h < endHour; h++) {
        const timeStr = h.toString().padStart(2, '0') + ':00'
        if (avail.availabilityType === 'available') {
          availableSlots.value.add(`${avail.dayOfWeek}-${timeStr}`)
        } else {
          unavailableSlots.value.add(`${avail.dayOfWeek}-${timeStr}`)
        }
      }
    })
    

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
}

.page-header {
  margin-bottom: 16px;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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
  align-items: center;
  flex-wrap: wrap;
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


.time-slot.available {
  background: #4caf50;
}

.time-slot.available:hover {
  background: #45a049;
}

.time-slot.unavailable {
  background: #f44336;
}

.time-slot.unavailable:hover {
  background: #d32f2f;
}

.slot-content {
  width: 100%;
  height: 100%;
  min-height: 40px;
}

.availability-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.save-btn, .clear-btn, .mark-available-btn, .mark-unavailable-btn {
  padding: 12px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.mark-available-btn {
  background: #00897b;
  color: white;
}

.mark-available-btn:hover:not(:disabled) {
  background: #00796b;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 137, 123, 0.3);
}

.mark-unavailable-btn {
  background: white;
  color: #333;
  border: 2px solid #ddd;
}

.mark-unavailable-btn:hover:not(:disabled) {
  background: #f5f5f5;
  border-color: #bbb;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
.slot-cell {
  height: 44px;
  cursor: pointer;
  transition: background-color 0.1s ease;
  background-color: white;
}

.slot-cell.disabled {
  cursor: default;
  background-color: #fafafa;
}

.slot-cell:hover {
  background-color: #e0f2f1;

}

.slot-cell.disabled:hover {
  background-color: #fafafa;
}

.slot-cell.available {
  background-color: #0D9488;
}

.save-btn:disabled, .mark-available-btn:disabled, .mark-unavailable-btn:disabled {
  background: #e0e0e0;
  color: #9e9e9e;
  cursor: not-allowed;
  opacity: 0.6;
  border-color: #e0e0e0;
}

.clear-btn {
  background: white;
  color: #333;
  border: 2px solid #ddd;
}

.clear-btn:hover {
  background: #f5f5f5;
  border-color: #bbb;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  
.slot-cell.available:hover {
  background-color: #0f766e;
}

.slot-cell.unavailable-slot {
  background-color: #ef5350;
}

.slot-cell.unavailable-slot:hover {
  background-color: #c62828;
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
