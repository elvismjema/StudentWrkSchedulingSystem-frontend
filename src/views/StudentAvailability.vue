<template>
  <div class="availability-container">
    <!-- Header -->
    <div class="page-header">
      <h1 class="page-title">My Availability</h1>
      <p class="page-subtitle">
        Drag on the calendar to mark when you're available or unavailable each week. Click a block to edit or delete it.
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

    <!-- Legend -->
    <div class="legend-row">
      <span class="legend-item">
        <span class="legend-dot available-dot" />
        Available
      </span>
      <span class="legend-item">
        <span class="legend-dot unavailable-dot" />
        Unavailable
      </span>
    </div>

    <!-- Loading Indicator -->
    <v-progress-linear v-if="loading" indeterminate color="#8B1538" class="mb-4" />

    <!-- FullCalendar weekly availability grid -->
    <div :class="['calendar-card', gridMode === 'unavailable' ? 'mode-unavailable' : 'mode-available']">
      <FullCalendar ref="calendarRef" :options="calendarOptions" />
    </div>

    <!-- Create Dialog -->
    <v-dialog v-model="showCreateDialog" max-width="420">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-clock-outline" class="mr-2" />
          Add Block â€” {{ dowLabel(createForm.dayOfWeek) }}
        </v-card-title>
        <v-card-text>
          <p class="text-body-2 text-grey mb-3">Choose the type and time range for this block.</p>
          <v-btn-toggle
            v-model="createForm.availabilityType"
            mandatory
            density="comfortable"
            rounded="lg"
            class="mb-4"
          >
            <v-btn value="available" :color="createForm.availabilityType === 'available' ? '#0D9488' : undefined">
              <v-icon start>mdi-calendar-check</v-icon>
              Available
            </v-btn>
            <v-btn value="unavailable" :color="createForm.availabilityType === 'unavailable' ? 'error' : undefined">
              <v-icon start>mdi-calendar-remove</v-icon>
              Unavailable
            </v-btn>
          </v-btn-toggle>
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="createForm.startTime"
                type="time"
                label="Start Time"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="createForm.endTime"
                type="time"
                label="End Time"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showCreateDialog = false">Cancel</v-btn>
          <v-btn color="#0D9488" variant="flat" @click="confirmCreate">Add</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Dialog -->
    <v-dialog v-model="showEditDialog" max-width="420">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-pencil-outline" class="mr-2" />
          Edit Block â€” {{ dowLabel(editForm.dayOfWeek) }}
        </v-card-title>
        <v-card-text>
          <v-btn-toggle
            v-model="editForm.availabilityType"
            mandatory
            density="comfortable"
            rounded="lg"
            class="mb-4"
          >
            <v-btn value="available" :color="editForm.availabilityType === 'available' ? '#0D9488' : undefined">
              <v-icon start>mdi-calendar-check</v-icon>
              Available
            </v-btn>
            <v-btn value="unavailable" :color="editForm.availabilityType === 'unavailable' ? 'error' : undefined">
              <v-icon start>mdi-calendar-remove</v-icon>
              Unavailable
            </v-btn>
          </v-btn-toggle>
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="editForm.startTime"
                type="time"
                label="Start Time"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="editForm.endTime"
                type="time"
                label="End Time"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-btn variant="text" color="error" @click="deleteBlock">
            <v-icon start>mdi-delete</v-icon>
            Delete
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="showEditDialog = false">Cancel</v-btn>
          <v-btn color="#0D9488" variant="flat" @click="confirmEdit">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Time Off Requests (formerly Availability Exceptions) -->
    <div class="exceptions-section">
      <h2 class="exceptions-title">Time Off Requests</h2>
      <p class="exceptions-subtitle">
        Request specific dates when you are unavailable â€” your manager will review and approve.
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
                {{ formatTimeLabel(exc.startTime) }} â€“ {{ formatTimeLabel(exc.endTime) }}
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
import FullCalendar from "@fullcalendar/vue3";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import Utils from "../config/utils.js";
import availabilityService from "../services/availabilityService.js";

const currentUser = Utils.getStore("user") || {};
const userId = currentUser.userId || currentUser.id;

// --- FullCalendar ref ---
const calendarRef = ref(null);

// --- State ---
const loading = ref(false);
const saving = ref(false);
const savingException = ref(false);
const gridMode = ref("available");

// blocks: array of { tempId, dayOfWeek, startTime (HH:mm), endTime (HH:mm), availabilityType }
const blocks = ref([]);
const initialFingerprint = ref("");
const existingRecords = ref([]);
let tempIdCounter = 0;

// Dialog state
const showCreateDialog = ref(false);
const createForm = ref({ dayOfWeek: 1, startTime: "", endTime: "", availabilityType: "available" });
const showEditDialog = ref(false);
const editForm = ref({ tempId: "", dayOfWeek: 1, startTime: "", endTime: "", availabilityType: "available" });

// Exception form state
const showExceptionDialog = ref(false);
const exceptionFormRef = ref(null);
const exceptionFormValid = ref(false);
const exceptionForm = ref({
  specificDate: "",
  startTime: "",
  endTime: "",
  availabilityType: "unavailable",
});

const snackbar = ref({ show: false, text: "", color: "success" });

// --- Day-of-week mappings ---
// Reference week: 2024-01-01 (Mon) â€¦ 2024-01-07 (Sun)
const DOW_TO_DATE = {
  1: "2024-01-01",
  2: "2024-01-02",
  3: "2024-01-03",
  4: "2024-01-04",
  5: "2024-01-05",
  6: "2024-01-06",
  0: "2024-01-07",
};

const DOW_LABELS = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  0: "Sunday",
};

const dowLabel = (dow) => DOW_LABELS[dow] ?? "";

// --- Helpers ---
const normalizeToHHMM = (t) => (t ? String(t).slice(0, 5) : "");
const notify = (text, color = "success") => { snackbar.value = { show: true, text, color }; };
const requiredRule = (v) => (v !== null && v !== undefined && v !== "" ? true : "Required");

const blocksFingerprint = (bs) =>
  JSON.stringify(
    [...bs]
      .map((b) => `${b.dayOfWeek}|${b.startTime}|${b.endTime}|${b.availabilityType}`)
      .sort()
  );

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

// --- Computed ---
const hasChanges = computed(() => blocksFingerprint(blocks.value) !== initialFingerprint.value);

const exceptions = computed(() =>
  existingRecords.value.filter((r) => r.specificDate && !r.isRecurring)
);

const calendarEvents = computed(() =>
  blocks.value.map((b) => ({
    id: b.tempId,
    title: b.availabilityType === "available" ? "Available" : "Unavailable",
    start: `${DOW_TO_DATE[b.dayOfWeek]}T${b.startTime}`,
    end: `${DOW_TO_DATE[b.dayOfWeek]}T${b.endTime}`,
    backgroundColor: b.availabilityType === "available" ? "#0D9488" : "#DC2626",
    borderColor: b.availabilityType === "available" ? "#0D9488" : "#DC2626",
    extendedProps: { block: b },
  }))
);

// --- FullCalendar callbacks ---
const onCalendarSelect = (selectInfo) => {
  const dateStr = selectInfo.startStr.split("T")[0];
  const dow = new Date(`${dateStr}T12:00:00`).getDay();
  const startTime = selectInfo.startStr.split("T")[1].slice(0, 5);
  const endTime = selectInfo.endStr.split("T")[1].slice(0, 5);
  createForm.value = {
    dayOfWeek: dow,
    startTime,
    endTime,
    availabilityType: gridMode.value,
  };
  showCreateDialog.value = true;
  calendarRef.value?.getApi()?.unselect();
};

const confirmCreate = () => {
  const { dayOfWeek, startTime, endTime, availabilityType } = createForm.value;
  if (!startTime || !endTime) return;
  if (startTime >= endTime) {
    notify("End time must be after start time.", "error");
    return;
  }
  blocks.value = [
    ...blocks.value,
    { tempId: `blk-${++tempIdCounter}`, dayOfWeek, startTime, endTime, availabilityType },
  ];
  showCreateDialog.value = false;
};

const onEventClick = (clickInfo) => {
  const block = clickInfo.event.extendedProps.block;
  editForm.value = { ...block };
  showEditDialog.value = true;
};

const confirmEdit = () => {
  const { tempId, dayOfWeek, startTime, endTime, availabilityType } = editForm.value;
  if (!startTime || !endTime) return;
  if (startTime >= endTime) {
    notify("End time must be after start time.", "error");
    return;
  }
  const idx = blocks.value.findIndex((b) => b.tempId === tempId);
  if (idx !== -1) {
    const updated = [...blocks.value];
    updated[idx] = { tempId, dayOfWeek, startTime, endTime, availabilityType };
    blocks.value = updated;
  }
  showEditDialog.value = false;
};

const deleteBlock = () => {
  blocks.value = blocks.value.filter((b) => b.tempId !== editForm.value.tempId);
  showEditDialog.value = false;
};

const onEventDrop = (dropInfo) => {
  const tempId = dropInfo.event.id;
  const newDateStr = dropInfo.event.startStr.split("T")[0];
  const newDow = new Date(`${newDateStr}T12:00:00`).getDay();
  const newStart = dropInfo.event.startStr.split("T")[1].slice(0, 5);
  const newEnd = dropInfo.event.endStr.split("T")[1].slice(0, 5);
  const idx = blocks.value.findIndex((b) => b.tempId === tempId);
  if (idx !== -1) {
    const updated = [...blocks.value];
    updated[idx] = { ...updated[idx], dayOfWeek: newDow, startTime: newStart, endTime: newEnd };
    blocks.value = updated;
  }
};

const onEventResize = (resizeInfo) => {
  const tempId = resizeInfo.event.id;
  const newEnd = resizeInfo.event.endStr.split("T")[1].slice(0, 5);
  const idx = blocks.value.findIndex((b) => b.tempId === tempId);
  if (idx !== -1) {
    const updated = [...blocks.value];
    updated[idx] = { ...updated[idx], endTime: newEnd };
    blocks.value = updated;
  }
};

// --- Calendar options ---
const calendarOptions = computed(() => ({
  plugins: [timeGridPlugin, interactionPlugin],
  initialView: "timeGridWeek",
  initialDate: "2024-01-01",
  headerToolbar: false,
  allDaySlot: false,
  firstDay: 1,
  dayHeaderFormat: { weekday: "short" },
  validRange: { start: "2024-01-01", end: "2024-01-08" },
  slotMinTime: "05:00:00",
  slotMaxTime: "24:00:00",
  slotDuration: "00:15:00",
  slotLabelInterval: "01:00:00",
  snapDuration: "00:15:00",
  nowIndicator: false,
  selectable: true,
  selectMirror: true,
  editable: true,
  eventOverlap: false,
  selectOverlap: false,
  events: calendarEvents.value,
  select: onCalendarSelect,
  eventClick: onEventClick,
  eventDrop: onEventDrop,
  eventResize: onEventResize,
  height: 700,
  expandRows: true,
  eventTimeFormat: { hour: "numeric", minute: "2-digit", meridiem: "short" },
}));

const clearAll = () => {
  blocks.value = [];
};

// --- API ---
const loadAvailabilities = async () => {
  if (!userId) return;
  loading.value = true;
  try {
    const response = await availabilityService.listForUser(userId);
    const records = response.data || [];
    existingRecords.value = records;
    tempIdCounter = 0;
    const loadedBlocks = records
      .filter((r) => r.dayOfWeek != null && !r.specificDate)
      .map((r) => ({
        tempId: `loaded-${++tempIdCounter}`,
        dayOfWeek: r.dayOfWeek,
        startTime: normalizeToHHMM(r.startTime),
        endTime: normalizeToHHMM(r.endTime),
        availabilityType: r.availabilityType || "available",
      }));
    blocks.value = loadedBlocks;
    initialFingerprint.value = blocksFingerprint(loadedBlocks);
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
    // Delete all existing recurring records first
    const recurringRecords = existingRecords.value.filter((r) => !r.specificDate || r.isRecurring);
    for (const rec of recurringRecords) {
      await availabilityService.remove(rec.id);
    }
    // Re-create all current blocks sequentially to avoid race conditions
    for (const block of blocks.value) {
      await availabilityService.create({
        userId,
        dayOfWeek: block.dayOfWeek,
        startTime: block.startTime,
        endTime: block.endTime,
        availabilityType: block.availabilityType,
        isRecurring: true,
      });
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
  margin-bottom: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.legend-row {
  display: flex;
  gap: 20px;
  margin-bottom: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #555;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  display: inline-block;
}

.available-dot {
  background-color: #0D9488;
}

.unavailable-dot {
  background-color: #DC2626;
}

/* Calendar card */
.calendar-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
  padding: 8px 10px 12px;
  margin-bottom: 32px;
  overflow: visible;
}

/* FullCalendar theme overrides */
.calendar-card :deep(.fc) {
  --fc-border-color: #e5e7eb;
  --fc-page-bg-color: #ffffff;
  --fc-neutral-bg-color: #fafafa;
}

.calendar-card :deep(.fc .fc-event) {
  border-radius: 4px;
  padding: 1px 4px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.calendar-card :deep(.fc .fc-event-title) {
  font-weight: 600;
}

/* Selection highlight and mirror â€” teal for available mode, red for unavailable mode */
.mode-available :deep(.fc .fc-highlight) {
  background-color: rgba(13, 148, 136, 0.15);
}

.mode-available :deep(.fc .fc-event.fc-mirror) {
  background-color: rgba(13, 148, 136, 0.75);
  border-color: #0D9488;
}

.mode-unavailable :deep(.fc .fc-highlight) {
  background-color: rgba(220, 38, 38, 0.12);
}

.mode-unavailable :deep(.fc .fc-event.fc-mirror) {
  background-color: rgba(220, 38, 38, 0.7);
  border-color: #DC2626;
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
