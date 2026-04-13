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
      <v-btn-toggle v-model="gridMode" mandatory :color="UI_COLORS.available" rounded="lg" density="comfortable">
        <v-btn value="available" prepend-icon="mdi-calendar-check">
          Mark Available
        </v-btn>
        <v-btn value="unavailable" prepend-icon="mdi-calendar-remove" color="error">
          Mark Unavailable
        </v-btn>
      </v-btn-toggle>
      <v-spacer />
      <v-btn
        :color="UI_COLORS.available"
        variant="flat"
        :loading="saving"
        :disabled="!hasChanges"
        @click="saveChanges"
      >
        Save Changes
      </v-btn>
      <v-btn variant="outlined" @click="clearAll">Clear Manual Blocks</v-btn>
      <v-chip size="small" variant="tonal" color="primary">
        Class schedule auto-sync: ON
      </v-chip>
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
      <span class="legend-item">
        <span class="legend-dot class-dot" />
        Class Time (auto-synced, locked)
      </span>
    </div>

    <v-alert
      :type="statusTone"
      variant="tonal"
      border="start"
      density="comfortable"
      class="mb-4"
    >
      <div class="d-flex align-center justify-space-between flex-wrap" style="gap: 8px">
        <div>
          <div class="text-body-2 font-weight-medium">Class Schedule Sync: {{ statusLabel }}</div>
          <div class="text-caption text-medium-emphasis">
            Last synced: {{ formatDateTime(syncStatus.lastSyncedAt) }}
            · Term: {{ syncStatus.termCode || 'N/A' }}
            · Class blocks: {{ syncStatus.totalClassBlocks ?? 0 }}
            · Updated this sync: {{ syncStatus.updated ?? 0 }}
            <span v-if="syncStatus.error"> · {{ syncStatus.error }}</span>
          </div>
        </div>
        <div class="d-flex align-center" style="gap: 8px">
          <v-btn
            size="x-small"
            variant="text"
            color="primary"
            :loading="syncingClassSchedule"
            :disabled="loadingSyncStatus"
            @click="syncClassSchedule()"
          >
            Re-sync now
          </v-btn>
          <v-progress-circular
            v-if="loadingSyncStatus"
            indeterminate
            size="18"
            width="2"
            :color="statusTone === 'error' ? 'error' : 'primary'"
          />
        </div>
      </div>
    </v-alert>

    <!-- Loading Indicator -->
    <v-progress-linear v-if="loading" indeterminate :color="UI_COLORS.brand" class="mb-4" />

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
            <v-btn value="available" :color="createForm.availabilityType === 'available' ? UI_COLORS.available : undefined">
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
          <v-btn :color="UI_COLORS.available" variant="flat" @click="confirmCreate">Add</v-btn>
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
            <v-btn value="available" :color="editForm.availabilityType === 'available' ? UI_COLORS.available : undefined">
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
          <v-btn :color="UI_COLORS.available" variant="flat" @click="confirmEdit">Save</v-btn>
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
          <v-btn :color="UI_COLORS.available" variant="flat" :loading="savingException" @click="saveException">Save</v-btn>
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
import departmentServices from "../services/departmentServices.js";
import studentService from "../services/studentService.js";

const currentUser = Utils.getStore("user") || {};
const userId = currentUser.userId || currentUser.id;

const UI_COLORS = Object.freeze({
  available: "#0D9488",
  unavailable: "#DC2626",
  classSchedule: "#9A3412",
  brand: "#8B1538",
});

// --- FullCalendar ref ---
const calendarRef = ref(null);

// --- State ---
const loading = ref(false);
const saving = ref(false);
const savingException = ref(false);
const syncingClassSchedule = ref(false);
const loadingSyncStatus = ref(false);
const syncStatus = ref({
  status: "never_synced",
  lastSyncedAt: null,
  termCode: null,
  totalClassBlocks: 0,
  updated: 0,
  error: null,
});
const calendarHours = ref({ slotMinTime: "05:00:00", slotMaxTime: "24:00:00" });
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

const isClassScheduleRecord = (record) =>
  record?.sourceType === "class_schedule"
  || record?.recurrencePattern === "class_schedule"
  || Boolean(record?.isSystemManaged);

const isClassScheduleBlock = (block) =>
  block?.sourceType === "class_schedule" || Boolean(block?.isSystemManaged);

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

const formatDateTime = (value) => {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const statusTone = computed(() => {
  const status = String(syncStatus.value.status || "never_synced");
  if (status === "success") return "success";
  if (status === "failed") return "error";
  return "warning";
});

const statusLabel = computed(() => {
  const status = String(syncStatus.value.status || "never_synced");
  if (status === "success") return "Synced";
  if (status === "failed") return "Sync Failed";
  return "Not Synced Yet";
});

const hasClassConflict = (candidate) => {
  if (!candidate) return false;
  const type = String(candidate.availabilityType || "available").toLowerCase();
  if (!["available", "preferred"].includes(type)) return false;
  return blocks.value
    .filter((b) => isClassScheduleBlock(b) && Number(b.dayOfWeek) === Number(candidate.dayOfWeek))
    .some((cls) =>
      candidate.startTime < cls.endTime && candidate.endTime > cls.startTime
    );
};

const pickCalendarBoundsFromHours = (hoursRows = []) => {
  const valid = hoursRows.filter((row) => row?.open_time && row?.close_time && row.open_time < row.close_time);
  if (!valid.length) return { slotMinTime: "05:00:00", slotMaxTime: "24:00:00" };
  const mins = valid.map((row) => `${String(row.open_time).slice(0, 5)}:00`).sort();
  const maxs = valid.map((row) => `${String(row.close_time).slice(0, 5)}:00`).sort();
  return {
    slotMinTime: mins[0],
    slotMaxTime: maxs[maxs.length - 1],
  };
};

// --- Computed ---
const manualBlocks = computed(() => blocks.value.filter((b) => !isClassScheduleBlock(b)));
const hasChanges = computed(() => blocksFingerprint(manualBlocks.value) !== initialFingerprint.value);

const exceptions = computed(() =>
  existingRecords.value.filter((r) => r.specificDate && !r.isRecurring)
);

const calendarEvents = computed(() =>
  blocks.value.map((b) => {
    const isClassBlock = b.sourceType === "class_schedule";
    return {
      id: b.tempId,
      title: isClassBlock
        ? "Class Time"
        : b.availabilityType === "available"
          ? "Available"
          : "Unavailable",
      start: `${DOW_TO_DATE[b.dayOfWeek]}T${b.startTime}`,
      end: `${DOW_TO_DATE[b.dayOfWeek]}T${b.endTime}`,
      backgroundColor: isClassBlock
        ? UI_COLORS.classSchedule
        : b.availabilityType === "available"
          ? UI_COLORS.available
          : UI_COLORS.unavailable,
      borderColor: isClassBlock
        ? UI_COLORS.classSchedule
        : b.availabilityType === "available"
          ? UI_COLORS.available
          : UI_COLORS.unavailable,
      classNames: isClassBlock ? ["class-synced-event"] : [],
      editable: !isClassBlock,
      startEditable: !isClassBlock,
      durationEditable: !isClassBlock,
      extendedProps: { block: b },
    };
  })
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
  if (hasClassConflict({ dayOfWeek, startTime, endTime, availabilityType })) {
    notify("This block overlaps locked class time. Choose a different time.", "error");
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
  if (isClassScheduleBlock(block)) {
    notify("Class-synced blocks are locked. Update your course schedule and re-sync.", "info");
    return;
  }
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
    const candidate = { tempId, dayOfWeek, startTime, endTime, availabilityType };
    const withoutCurrent = updated.filter((b) => b.tempId !== tempId);
    const classConflict = withoutCurrent
      .filter((b) => isClassScheduleBlock(b) && Number(b.dayOfWeek) === Number(dayOfWeek))
      .some((cls) => startTime < cls.endTime && endTime > cls.startTime && ["available", "preferred"].includes(String(availabilityType || "available")));
    if (classConflict) {
      notify("This update overlaps locked class time. Choose a different time.", "error");
      return;
    }
    updated[idx] = candidate;
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
  const idx = blocks.value.findIndex((b) => b.tempId === tempId);
  if (idx === -1) return;

  if (isClassScheduleBlock(blocks.value[idx])) {
    dropInfo.revert();
    notify("Class-synced blocks cannot be moved.", "info");
    return;
  }

  const newDateStr = dropInfo.event.startStr.split("T")[0];
  const newDow = new Date(`${newDateStr}T12:00:00`).getDay();
  const newStart = dropInfo.event.startStr.split("T")[1].slice(0, 5);
  const newEnd = dropInfo.event.endStr.split("T")[1].slice(0, 5);

  const updated = [...blocks.value];
  updated[idx] = { ...updated[idx], dayOfWeek: newDow, startTime: newStart, endTime: newEnd };
  blocks.value = updated;
};

const onEventResize = (resizeInfo) => {
  const tempId = resizeInfo.event.id;
  const idx = blocks.value.findIndex((b) => b.tempId === tempId);
  if (idx === -1) return;

  if (isClassScheduleBlock(blocks.value[idx])) {
    resizeInfo.revert();
    notify("Class-synced blocks cannot be resized.", "info");
    return;
  }

  const newEnd = resizeInfo.event.endStr.split("T")[1].slice(0, 5);
  const updated = [...blocks.value];
  updated[idx] = { ...updated[idx], endTime: newEnd };
  blocks.value = updated;
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
  slotMinTime: calendarHours.value.slotMinTime,
  slotMaxTime: calendarHours.value.slotMaxTime,
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
  blocks.value = blocks.value.filter((b) => isClassScheduleBlock(b));
};

// --- API ---
const loadClassSyncStatus = async () => {
  loadingSyncStatus.value = true;
  try {
    const response = await availabilityService.getClassSyncStatus();
    const data = response?.data?.data || {};
    const normalized = {
      status: data.status || "never_synced",
      lastSyncedAt: data.lastSyncedAt || null,
      termCode: data.termCode || null,
      totalClassBlocks: Number(data.totalClassBlocks || 0),
      updated: Number(data.updated || 0),
      error: data.error || null,
    };

    const shouldPreserveLastSyncError =
      syncStatus.value.status === "failed"
      && Boolean(syncStatus.value.error)
      && normalized.status === "never_synced"
      && !normalized.error;

    syncStatus.value = shouldPreserveLastSyncError
      ? {
        ...normalized,
        status: "failed",
        error: syncStatus.value.error,
      }
      : normalized;
  } catch {
    syncStatus.value = {
      status: "never_synced",
      lastSyncedAt: syncStatus.value.lastSyncedAt || null,
      termCode: syncStatus.value.termCode || null,
      totalClassBlocks: Number(syncStatus.value.totalClassBlocks || 0),
      updated: Number(syncStatus.value.updated || 0),
      error: syncStatus.value.error || null,
    };
  } finally {
    loadingSyncStatus.value = false;
  }
};

const loadDepartmentCalendarHours = async () => {
  const deptContext = Utils.getStore("currentDepartmentContext") || {};
  let departmentId = Number(deptContext.department_id || 0);
  if (!departmentId) {
    try {
      const membershipsRes = await studentService.getUserDepartments();
      const memberships = membershipsRes?.data?.data || membershipsRes?.data || [];
      const activeMembership = memberships.find((m) => m.is_active || String(m.request_status || "").toLowerCase() === "approved");
      departmentId = Number(activeMembership?.department_id || activeMembership?.department?.department_id || 0);
    } catch {
      departmentId = 0;
    }
  }

  if (!departmentId) {
    calendarHours.value = { slotMinTime: "05:00:00", slotMaxTime: "24:00:00" };
    return;
  }

  try {
    const response = await departmentServices.getDepartmentHours(departmentId);
    const rows = response?.data?.data || [];
    calendarHours.value = pickCalendarBoundsFromHours(rows);
  } catch {
    calendarHours.value = { slotMinTime: "05:00:00", slotMaxTime: "24:00:00" };
  }
};

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
        sourceType: isClassScheduleRecord(r) ? "class_schedule" : (r.sourceType || "manual"),
        sourceRef: r.sourceRef || null,
        isSystemManaged: Boolean(r.isSystemManaged || isClassScheduleRecord(r)),
      }));
    blocks.value = loadedBlocks;
    initialFingerprint.value = blocksFingerprint(loadedBlocks.filter((b) => !isClassScheduleBlock(b)));
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
    const manualOnlyBlocks = blocks.value.filter((block) => !isClassScheduleBlock(block));
    const hasConflict = manualOnlyBlocks.some((block) => hasClassConflict(block));
    if (hasConflict) {
      notify("One or more manual availability blocks overlap locked class time.", "error");
      return;
    }

    // Delete only manual recurring records (preserve class-synced recurring records)
    const recurringManualRecords = existingRecords.value.filter(
      (r) => (r.isRecurring || !r.specificDate) && !isClassScheduleRecord(r)
    );
    for (const rec of recurringManualRecords) {
      await availabilityService.remove(rec.id);
    }

    // Re-create only manual blocks sequentially to avoid race conditions
    for (const block of manualOnlyBlocks) {
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

const syncClassSchedule = async ({ silent = false, suppressErrorToast = false } = {}) => {
  syncingClassSchedule.value = true;
  try {
    const response = await availabilityService.syncClassSchedule();
    const data = response?.data?.data || {};

    syncStatus.value = {
      status: "success",
      lastSyncedAt: data.lastSyncedAt || new Date().toISOString(),
      termCode: data.termCode || syncStatus.value.termCode || null,
      totalClassBlocks: Number((data.created || 0) + (data.updated || 0) + (data.unchanged || 0)),
      updated: Number(data.updated || 0),
      error: null,
    };

    if (!silent) {
      notify(
        `Class schedule synced. Added ${data.created || 0}, updated ${data.updated || 0}, removed ${data.deleted || 0}, unchanged ${data.unchanged || 0}.`,
        "success"
      );
    }

    await Promise.all([loadAvailabilities(), loadClassSyncStatus()]);
    return data;
  } catch (error) {
    const message = error?.response?.data?.message || "Failed to sync class schedule.";

    syncStatus.value = {
      status: "failed",
      lastSyncedAt: syncStatus.value.lastSyncedAt || null,
      termCode: syncStatus.value.termCode || null,
      totalClassBlocks: Number(syncStatus.value.totalClassBlocks || 0),
      updated: Number(syncStatus.value.updated || 0),
      error: message,
    };

    if (!suppressErrorToast) {
      notify(message, "error");
    }

    return null;
  } finally {
    syncingClassSchedule.value = false;
  }
};

onMounted(async () => {
  await loadDepartmentCalendarHours();
  const autoSyncResult = await syncClassSchedule({ silent: true, suppressErrorToast: true });

  if (!autoSyncResult) {
    await Promise.all([
      loadAvailabilities(),
      loadClassSyncStatus(),
    ]);
  }
});
</script>

<style scoped>
.availability-container {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --color-text-primary: #333;
  --color-text-secondary: #666;
  --color-text-muted: #555;
  --color-surface: #fff;
  --color-border-subtle: #e0e0e0;
  --color-available: #0D9488;
  --color-unavailable: #DC2626;
  --color-class: #9A3412;
  padding: var(--space-6);
}

.page-header {
  margin-bottom: var(--space-4);
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
  color: var(--color-text-primary);
  margin: 0;
}

.page-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-top: var(--space-1);
}

.action-buttons {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
  align-items: center;
  flex-wrap: wrap;
}

.legend-row {
  display: flex;
  gap: calc(var(--space-4) + var(--space-1));
  margin-bottom: var(--space-4);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-muted);
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  display: inline-block;
}

.available-dot {
  background-color: var(--color-available);
}

.unavailable-dot {
  background-color: var(--color-unavailable);
}

.class-dot {
  background-color: var(--color-class);
}

/* Calendar card */
.calendar-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-subtle);
  padding: var(--space-2) 10px var(--space-3);
  margin-bottom: calc(var(--space-6) + var(--space-2));
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

.calendar-card :deep(.fc .class-synced-event) {
  opacity: 0.95;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
}

/* Selection highlight and mirror — teal for available mode, red for unavailable mode */
.mode-available :deep(.fc .fc-highlight) {
  background-color: rgba(13, 148, 136, 0.15);
}

.mode-available :deep(.fc .fc-event.fc-mirror) {
  background-color: rgba(13, 148, 136, 0.75);
  border-color: var(--color-available);
}

.mode-unavailable :deep(.fc .fc-highlight) {
  background-color: rgba(220, 38, 38, 0.12);
}

.mode-unavailable :deep(.fc .fc-event.fc-mirror) {
  background-color: rgba(220, 38, 38, 0.7);
  border-color: var(--color-unavailable);
}

/* Exceptions Section */
.exceptions-section {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-subtle);
  padding: var(--space-6);
}

.exceptions-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 6px 0;
}

.exceptions-subtitle {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-3) 0;
}

.exceptions-list {
  margin-bottom: var(--space-2);
}

.exception-card {
  margin-bottom: var(--space-2);
}
</style>
