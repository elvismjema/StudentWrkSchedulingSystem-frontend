<template>
  <div class="template-calendar-wrapper">
    <!-- Hint bar -->
    <div class="d-flex align-center flex-wrap gap-2 mb-2">
      <span class="text-caption text-medium-emphasis">
        <v-icon size="14" class="mr-1">mdi-gesture-tap-hold</v-icon>
        Drag to create a shift &nbsp;·&nbsp;
        <v-icon size="14" class="mr-1">mdi-cursor-pointer</v-icon>
        Click a shift to edit &nbsp;·&nbsp;
        <v-icon size="14" class="mr-1">mdi-arrow-expand-vertical</v-icon>
        Drag edges to resize
      </span>
      <v-spacer />
      <!-- Legend -->
      <div class="d-flex align-center gap-2 flex-wrap">
        <div class="legend-dot" style="background:#9E9E9E"></div>
        <span class="text-caption">No position</span>
        <div class="legend-dot" style="background:#F57C00"></div>
        <span class="text-caption">Unassigned</span>
        <div class="legend-dot" style="background:#E53935"></div>
        <span class="text-caption">Conflict</span>
        <div class="legend-dot" style="background:#1976D2"></div>
        <span class="text-caption">Complete</span>
      </div>
    </div>

    <FullCalendar ref="calendarRef" :options="calendarOptions" />

    <!-- ── Shift detail dialog ─────────────────────────────────────────────── -->
    <v-dialog v-model="dialog.show" max-width="500px" :scrim="true" @click:outside="handleDialogOutside">
      <v-card>
        <v-card-title class="d-flex align-center pa-4 pb-2">
          <v-icon class="mr-2" size="20">mdi-clock-edit-outline</v-icon>
          {{ dialog.isNew ? 'New Shift' : 'Edit Shift' }}
          <v-chip size="x-small" class="ml-2" color="primary" variant="tonal">
            {{ dayName(dialog.day_of_week) }}
          </v-chip>
          <v-spacer />
          <v-btn
            v-if="!dialog.isNew"
            icon
            size="small"
            color="error"
            variant="text"
            title="Remove this shift"
            @click="deleteShift"
          >
            <v-icon>mdi-delete-outline</v-icon>
          </v-btn>
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-4">
          <!-- Time row -->
          <v-row dense class="mb-1">
            <v-col cols="6">
              <v-text-field
                v-model="dialog.start_time"
                type="time"
                label="Start Time"
                variant="outlined"
                density="compact"
                @change="applyTimeChange"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="dialog.end_time"
                type="time"
                label="End Time"
                variant="outlined"
                density="compact"
                @change="applyTimeChange"
              />
            </v-col>
          </v-row>

          <!-- Position -->
          <v-select
            v-model="dialog.position_id"
            :items="positions"
            item-title="position_name"
            item-value="position_id"
            label="Position"
            variant="outlined"
            density="compact"
            clearable
            class="mb-3"
            :hint="dialog.isNew ? 'You can skip this and fill in later by clicking the shift block.' : ''"
            persistent-hint
          />

          <!-- Assigned worker -->
          <v-autocomplete
            v-model="dialog.assigned_user_id"
            :items="workers"
            :item-title="(w) => `${w.user.fName} ${w.user.lName}`"
            item-value="user_id"
            label="Assigned Worker (optional)"
            variant="outlined"
            density="compact"
            clearable
            prepend-inner-icon="mdi-account"
            class="mb-3"
          >
            <template #item="{ item, props: iProps }">
              <v-list-item v-bind="iProps">
                <template #title>{{ item.raw.user.fName }} {{ item.raw.user.lName }}</template>
                <template #subtitle>{{ item.raw.user.email }}</template>
              </v-list-item>
            </template>
          </v-autocomplete>

          <!-- Tasks collapsible -->
          <v-expansion-panels flat>
            <v-expansion-panel>
              <v-expansion-panel-title density="compact" class="py-1 px-2">
                <v-icon size="16" class="mr-2">mdi-format-list-checks</v-icon>
                Tasks ({{ dialog.tasks.length }})
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <div
                  v-for="(task, i) in dialog.tasks"
                  :key="i"
                  class="d-flex align-center gap-2 mb-2"
                >
                  <v-text-field
                    v-model="task.taskName"
                    label="Task name"
                    variant="outlined"
                    density="compact"
                    hide-details
                    class="flex-grow-1"
                  />
                  <v-select
                    v-model="task.taskType"
                    :items="taskTypeOptions"
                    item-title="label"
                    item-value="value"
                    label="Type"
                    variant="outlined"
                    density="compact"
                    hide-details
                    style="max-width: 130px"
                  />
                  <v-select
                    v-model="task.priority"
                    :items="priorityOptions"
                    item-title="label"
                    item-value="value"
                    label="Priority"
                    variant="outlined"
                    density="compact"
                    hide-details
                    style="max-width: 110px"
                  />
                  <v-btn
                    icon
                    size="small"
                    variant="text"
                    color="error"
                    @click="dialog.tasks.splice(i, 1)"
                  >
                    <v-icon size="16">mdi-close</v-icon>
                  </v-btn>
                </div>
                <v-btn
                  size="small"
                  variant="tonal"
                  prepend-icon="mdi-plus"
                  class="mt-1"
                  @click="addTask"
                >
                  Add Task
                </v-btn>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card-text>

        <v-card-actions class="pa-4 pt-0">
          <v-btn
            v-if="dialog.isNew"
            variant="text"
            size="small"
            @click="skipDialog"
          >
            Skip (fill in later)
          </v-btn>
          <v-spacer />
          <v-btn
            v-if="!dialog.isNew"
            variant="text"
            @click="dialog.show = false"
          >
            Cancel
          </v-btn>
          <v-btn color="primary" variant="elevated" @click="saveDialog">
            {{ dialog.isNew ? 'Add Shift' : 'Save Changes' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'

// ─── Props / emits ────────────────────────────────────────────────────────────
const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  positions:  { type: Array, default: () => [] },
  workers:    { type: Array, default: () => [] },
  conflicts:  { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue'])

// ─── Reference week mapping ───────────────────────────────────────────────────
// Template uses a fixed Mon 2024-01-01 → Sun 2024-01-07 reference week.
// day_of_week: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
const DOW_TO_DATE = {
  1: '2024-01-01',
  2: '2024-01-02',
  3: '2024-01-03',
  4: '2024-01-04',
  5: '2024-01-05',
  6: '2024-01-06',
  0: '2024-01-07',
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const dayName = (dow) => DAY_NAMES[dow] ?? ''

// ─── Reference data ───────────────────────────────────────────────────────────
const taskTypeOptions = [
  { label: 'Opening',          value: 'opening'         },
  { label: 'Closing',          value: 'closing'         },
  { label: 'Maintenance',      value: 'maintenance'     },
  { label: 'Customer Service', value: 'customer_service'},
  { label: 'Inventory',        value: 'inventory'       },
  { label: 'Cleaning',         value: 'cleaning'        },
  { label: 'Training',         value: 'training'        },
  { label: 'Administrative',   value: 'administrative'  },
  { label: 'Other',            value: 'other'           },
]
const priorityOptions = [
  { label: 'Low',    value: 'low'    },
  { label: 'Medium', value: 'medium' },
  { label: 'High',   value: 'high'   },
  { label: 'Urgent', value: 'urgent' },
]

// ─── State ────────────────────────────────────────────────────────────────────
const calendarRef = ref(null)
const internalShifts = ref([])
let tempIdCounter = 0
const newTempId = () => `_t${++tempIdCounter}_${Date.now()}`

const dialog = ref({
  show: false,
  isNew: false,
  tempId: null,
  day_of_week: 1,
  start_time: '09:00',
  end_time: '17:00',
  position_id: null,
  assigned_user_id: null,
  tasks: [],
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
const posName = (id) =>
  props.positions.find((p) => p.position_id === id)?.position_name || null

const eventColor = (shift) => {
  const hasConflict = props.conflicts.some(
    (c) => c.templateShiftId != null && c.templateShiftId === shift.shift_id
  )
  if (hasConflict)          return '#E53935' // red   – conflict
  if (!shift.position_id)   return '#9E9E9E' // grey  – no position
  if (!shift.assigned_user_id) return '#F57C00' // orange – no worker
  return '#1976D2'                             // blue  – complete
}

const buildTitle = (shift) => {
  const pos = posName(shift.position_id) || 'No position'
  const workerEntry = props.workers.find((w) => w.user_id === shift.assigned_user_id)
  const worker = workerEntry
    ? `${workerEntry.user.fName} ${workerEntry.user.lName}`
    : null
  return worker ? `${pos}\n${worker}` : pos
}

const shiftToEvent = (shift) => ({
  id: shift._tempId,
  title: buildTitle(shift),
  start: `${DOW_TO_DATE[shift.day_of_week] ?? '2024-01-01'}T${shift.start_time}:00`,
  end:   `${DOW_TO_DATE[shift.day_of_week] ?? '2024-01-01'}T${shift.end_time}:00`,
  backgroundColor: eventColor(shift),
  borderColor:     eventColor(shift),
  extendedProps: { tempId: shift._tempId },
})

const padTime = (date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

// ─── Calendar options ─────────────────────────────────────────────────────────
const calendarOptions = {
  plugins:  [timeGridPlugin, interactionPlugin],
  initialView: 'timeGridWeek',
  initialDate: '2024-01-01',
  firstDay: 1,                     // week starts Monday
  headerToolbar: false,            // no navigation buttons
  allDaySlot: false,
  selectable: true,
  selectMirror: true,
  editable: true,
  eventResizableFromStart: true,
  snapDuration: '00:15:00',        // 15-minute drag snapping
  slotDuration: '01:00:00',        // hourly time slots
  slotLabelInterval: '01:00:00',
  scrollTime: '07:00:00',          // scroll to 7 am on open
  height: 560,
  expandRows: true,
  // Show day names without date numbers
  dayHeaderContent: (args) => DAY_NAMES[args.date.getDay()],
  select:       handleSelect,
  eventClick:   handleEventClick,
  eventDrop:    handleEventDrop,
  eventResize:  handleEventResize,
}

// ─── Mount: seed events from modelValue ───────────────────────────────────────
onMounted(() => {
  nextTick(() => {
    internalShifts.value = (props.modelValue || []).map((s) => ({
      ...s,
      _tempId: s._tempId || newTempId(),
    }))
    const api = calendarRef.value?.getApi()
    if (!api) return
    internalShifts.value.forEach((shift) => api.addEvent(shiftToEvent(shift)))
  })
})

// ─── Calendar event handlers ──────────────────────────────────────────────────
function handleSelect(info) {
  const api = calendarRef.value?.getApi()
  api?.unselect()

  const dow       = info.start.getDay()
  const startTime = padTime(info.start)
  const endTime   = padTime(info.end)
  const tempId    = newTempId()

  const newShift = {
    _tempId: tempId,
    day_of_week: dow,
    start_time: startTime,
    end_time:   endTime,
    position_id: null,
    assigned_user_id: null,
    tasks: [],
  }

  internalShifts.value.push(newShift)
  api?.addEvent(shiftToEvent(newShift))
  emitUpdate()
  openDialogFor(tempId, true)
}

function handleEventClick(info) {
  openDialogFor(info.event.extendedProps.tempId, false)
}

function handleEventDrop(info) {
  const shift = findShift(info.event.extendedProps.tempId)
  if (!shift) { info.revert(); return }
  shift.day_of_week = info.event.start.getDay()
  shift.start_time  = padTime(info.event.start)
  shift.end_time    = padTime(info.event.end)
  emitUpdate()
}

function handleEventResize(info) {
  const shift = findShift(info.event.extendedProps.tempId)
  if (!shift) { info.revert(); return }
  shift.start_time = padTime(info.event.start)
  shift.end_time   = padTime(info.event.end)
  emitUpdate()
}

// ─── Dialog logic ─────────────────────────────────────────────────────────────
function openDialogFor(tempId, isNew) {
  const shift = findShift(tempId)
  if (!shift) return
  dialog.value = {
    show: true,
    isNew,
    tempId,
    day_of_week:      shift.day_of_week,
    start_time:       shift.start_time,
    end_time:         shift.end_time,
    position_id:      shift.position_id,
    assigned_user_id: shift.assigned_user_id,
    tasks: JSON.parse(JSON.stringify(shift.tasks || [])),
  }
}

function applyTimeChange() {
  // Live-update the calendar event while the user edits times in the dialog
  const api = calendarRef.value?.getApi()
  const evt = api?.getEventById(dialog.value.tempId)
  if (!evt) return
  const dateStr = DOW_TO_DATE[dialog.value.day_of_week] ?? '2024-01-01'
  evt.setStart(`${dateStr}T${dialog.value.start_time}:00`)
  evt.setEnd(`${dateStr}T${dialog.value.end_time}:00`)
}

function saveDialog() {
  const shift = findShift(dialog.value.tempId)
  if (!shift) return

  shift.position_id      = dialog.value.position_id
  shift.assigned_user_id = dialog.value.assigned_user_id
  shift.start_time       = dialog.value.start_time
  shift.end_time         = dialog.value.end_time
  shift.tasks            = dialog.value.tasks

  // Refresh calendar event appearance
  refreshCalendarEvent(shift)
  emitUpdate()
  dialog.value.show = false
}

function skipDialog() {
  // Keep the grey block on the calendar; user fills in details later
  dialog.value.show = false
}

function deleteShift() {
  const api = calendarRef.value?.getApi()
  api?.getEventById(dialog.value.tempId)?.remove()
  internalShifts.value = internalShifts.value.filter(
    (s) => s._tempId !== dialog.value.tempId
  )
  emitUpdate()
  dialog.value.show = false
}

function addTask() {
  dialog.value.tasks.push({
    taskName: '',
    taskType: 'other',
    priority: 'medium',
    taskDescription: '',
    dueTime: null,
    estimatedDuration: null,
  })
}

// Close dialog if clicking outside while it's a "skip-able" new shift
function handleDialogOutside() {
  if (dialog.value.isNew) skipDialog()
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function findShift(tempId) {
  return internalShifts.value.find((s) => s._tempId === tempId) || null
}

function refreshCalendarEvent(shift) {
  const api = calendarRef.value?.getApi()
  const evt = api?.getEventById(shift._tempId)
  if (!evt) return
  const dateStr = DOW_TO_DATE[shift.day_of_week] ?? '2024-01-01'
  evt.setProp('title',           buildTitle(shift))
  evt.setProp('backgroundColor', eventColor(shift))
  evt.setProp('borderColor',     eventColor(shift))
  evt.setStart(`${dateStr}T${shift.start_time}:00`)
  evt.setEnd(`${dateStr}T${shift.end_time}:00`)
}

function emitUpdate() {
  emit('update:modelValue', internalShifts.value.map((s) => ({ ...s })))
}
</script>

<style scoped>
.template-calendar-wrapper {
  width: 100%;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* Show multi-line event titles */
:deep(.fc-event-title) {
  white-space: pre-line;
  font-size: 0.72rem;
  line-height: 1.3;
}

/* Tighten up slot label font */
:deep(.fc-timegrid-slot-label-cushion) {
  font-size: 0.72rem;
}

/* Day header bold */
:deep(.fc-col-header-cell-cushion) {
  font-weight: 600;
  font-size: 0.85rem;
  color: rgba(0, 0, 0, 0.87);
  text-decoration: none !important;
}

/* Rounded events */
:deep(.fc-timegrid-event) {
  border-radius: 4px;
}

:deep(.fc-timegrid-col-events) {
  margin: 0 2px;
}
</style>
