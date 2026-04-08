<template>
  <div class="schedule-container">
    <div class="greeting-banner">
      <h2 class="greeting-title">Manager Schedule</h2>
      <p class="greeting-date">{{ currentGreetingDate }}</p>
    </div>

    <!-- Calendar Header -->
    <div class="calendar-header">
      <div>
        <p class="selected-shift-note" v-if="selectedShift">
          Selected: {{ selectedShift.position?.position_name }} – {{ formatShiftTime(selectedShift.start_time, selectedShift.end_time) }}
        </p>
      </div>
      <div class="header-controls">
        <v-btn variant="outlined" class="nav-btn" @click="previousWeek">
          <v-icon>mdi-chevron-left</v-icon>
        </v-btn>
        <v-btn variant="outlined" class="today-btn" @click="goToToday">Today</v-btn>
        <v-btn variant="outlined" class="nav-btn" @click="nextWeek">
          <v-icon>mdi-chevron-right</v-icon>
        </v-btn>
        <v-btn color="primary" variant="elevated" @click="openCreateDialog()" prepend-icon="mdi-plus">
          Create Shift
        </v-btn>
      </div>
    </div>

    <div class="calendar-scroll-container" v-if="!shiftsLoading" @mouseup="endDragCreate">
      <div class="calendar-container">
        <div class="calendar-grid">
          <div class="time-column">
            <div v-for="hour in timeSlots" :key="hour" class="time-slot">
              {{ formatTime(hour) }}
            </div>
          </div>

          <div class="days-container">
            <div v-for="day in weekDays" :key="day.isoDate" class="day-column">
              <div class="day-header">
                <div class="day-name">{{ day.name }}</div>
                <div class="day-date" :class="{ today: day.isToday }">{{ day.date }}</div>
              </div>

              <div class="hour-slots">
                <div
                  v-for="hour in timeSlots"
                  :key="`${day.isoDate}-${hour}`"
                  class="hour-slot"
                  :class="{
                    'drag-highlight': isDragHighlight(day.isoDate, hour),
                    'drag-over-cell': dragOverCell?.isoDate === day.isoDate && dragOverCell?.hour === hour
                  }"
                  @mousedown.prevent="startDragCreate(day.isoDate, hour, $event)"
                  @mouseenter="continueDragCreate(day.isoDate, hour)"
                  @dragover.prevent="onShiftDragOver(day.isoDate, hour)"
                  @drop.prevent="onShiftDrop(day.isoDate, hour)"
                >
                  <div
                    v-for="(shift, idx) in getShiftsForCell(day.isoDate, hour)"
                    :key="shift.shift_id"
                    class="shift-block"
                    :class="{
                      selected: selectedShift?.shift_id === shift.shift_id,
                      dragging: draggingShift?.shift_id === shift.shift_id
                    }"
                    :style="getShiftBlockStyle(shift, idx)"
                    draggable="true"
                    @click.stop="selectShift(shift)"
                    @mousedown.stop
                    @dragstart="onShiftDragStart(shift, $event)"
                    @dragend="onShiftDragEnd"
                  >
                    <div class="shift-block-title">{{ shift.position?.position_name || 'Shift' }}</div>
                    <div class="shift-block-sub">{{ shift.department?.department_name || 'Department' }}</div>
                    <div class="shift-block-time">{{ formatShiftTime(shift.start_time, shift.end_time) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="loading-wrap">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <!-- Create Shift Dialog -->
    <v-dialog v-model="showCreateDialog" max-width="680px">
      <v-card>
        <v-card-title class="d-flex align-center gap-2 pa-5 pb-3">
          <v-icon color="primary" start>mdi-calendar-plus</v-icon>
          Create New Shift
        </v-card-title>

        <v-alert
          v-if="currentDeptName"
          type="info"
          variant="tonal"
          density="compact"
          class="mx-4 mb-0"
          icon="mdi-office-building"
        >
          Creating shift for: <span class="font-weight-bold">{{ currentDeptName }}</span>
        </v-alert>

        <v-divider class="mt-3" />

        <v-card-text class="pa-5">
          <v-form ref="createFormRef" v-model="createFormValid">
            <v-row dense>
              <!-- Position -->
              <v-col cols="12">
                <v-select
                  v-model="newShift.position_id"
                  :items="positions"
                  item-title="position_name"
                  item-value="position_id"
                  label="Position *"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-briefcase-outline"
                  :rules="[v => !!v || 'Position is required']"
                />
              </v-col>

              <!-- Date -->
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="newShift.shift_date"
                  type="date"
                  label="Date *"
                  variant="outlined"
                  density="comfortable"
                  :rules="[v => !!v || 'Date is required']"
                />
              </v-col>

              <!-- Start Time -->
              <v-col cols="12" md="4">
                <v-menu v-model="startTimeMenu" :close-on-content-click="false" location="bottom" offset="8">
                  <template #activator="{ props }">
                    <v-text-field
                      v-bind="props"
                      :model-value="formatTimeDisplay(newShift.start_time)"
                      placeholder="Start Time *"
                      variant="outlined"
                      density="comfortable"
                      readonly
                      prepend-inner-icon="mdi-clock-outline"
                      persistent-placeholder
                      :rules="[v => !!v || 'Start time is required']"
                    />
                  </template>
                  <v-card class="time-picker-card" min-width="320">
                    <v-card-text class="pa-3">
                      <div class="time-picker-grid">
                        <div class="time-picker-col time-picker-col-hour">
                          <div class="time-picker-col-title">Hour</div>
                          <v-btn v-for="hour in hourOptions" :key="`sh-${hour}`" size="small" variant="flat" block class="mb-1" :color="startTimeParts.hour === hour ? '#1976d2' : undefined" @click="updateTimePart('start', 'hour', hour)">{{ hour }}</v-btn>
                        </div>
                        <div class="time-picker-col time-picker-col-fixed">
                          <div class="time-picker-col-title">Minute</div>
                          <v-btn v-for="minute in minuteOptions" :key="`sm-${minute}`" size="small" variant="flat" block class="mb-1" :color="startTimeParts.minute === minute ? '#1976d2' : undefined" @click="updateTimePart('start', 'minute', minute)">{{ minute }}</v-btn>
                        </div>
                        <div class="time-picker-col time-picker-col-fixed">
                          <div class="time-picker-col-title">Period</div>
                          <v-btn v-for="period in periodOptions" :key="`sp-${period}`" size="small" variant="flat" block class="mb-1" :color="startTimeParts.period === period ? '#1976d2' : undefined" @click="updateTimePart('start', 'period', period)">{{ period }}</v-btn>
                        </div>
                      </div>
                      <div class="time-picker-actions">
                        <v-btn variant="text" size="small" @click="clearTime('start')">Clear</v-btn>
                        <v-btn variant="text" size="small" @click="startTimeMenu = false">Done</v-btn>
                      </div>
                    </v-card-text>
                  </v-card>
                </v-menu>
              </v-col>

              <!-- End Time -->
              <v-col cols="12" md="4">
                <v-menu v-model="endTimeMenu" :close-on-content-click="false" location="bottom" offset="8" :disabled="!newShift.start_time">
                  <template #activator="{ props }">
                    <v-text-field
                      v-bind="props"
                      :model-value="formatTimeDisplay(newShift.end_time)"
                      placeholder="End Time *"
                      variant="outlined"
                      density="comfortable"
                      readonly
                      prepend-inner-icon="mdi-clock-outline"
                      :disabled="!newShift.start_time"
                      persistent-placeholder
                      :rules="[v => !!v || 'End time is required']"
                    />
                  </template>
                  <v-card class="time-picker-card" min-width="320">
                    <v-card-text class="pa-3">
                      <div class="time-picker-grid">
                        <div class="time-picker-col time-picker-col-hour">
                          <div class="time-picker-col-title">Hour</div>
                          <v-btn v-for="hour in hourOptions" :key="`eh-${hour}`" size="small" variant="flat" block class="mb-1" :color="endTimeParts.hour === hour ? '#1976d2' : undefined" @click="updateTimePart('end', 'hour', hour)">{{ hour }}</v-btn>
                        </div>
                        <div class="time-picker-col time-picker-col-fixed">
                          <div class="time-picker-col-title">Minute</div>
                          <v-btn v-for="minute in minuteOptions" :key="`em-${minute}`" size="small" variant="flat" block class="mb-1" :color="endTimeParts.minute === minute ? '#1976d2' : undefined" @click="updateTimePart('end', 'minute', minute)">{{ minute }}</v-btn>
                        </div>
                        <div class="time-picker-col time-picker-col-fixed">
                          <div class="time-picker-col-title">Period</div>
                          <v-btn v-for="period in periodOptions" :key="`ep-${period}`" size="small" variant="flat" block class="mb-1" :color="endTimeParts.period === period ? '#1976d2' : undefined" @click="updateTimePart('end', 'period', period)">{{ period }}</v-btn>
                        </div>
                      </div>
                      <div class="time-picker-actions">
                        <v-btn variant="text" size="small" @click="clearTime('end')">Clear</v-btn>
                        <v-btn variant="text" size="small" @click="endTimeMenu = false">Done</v-btn>
                      </div>
                    </v-card-text>
                  </v-card>
                </v-menu>
              </v-col>

              <!-- Recurring Shift toggle -->
              <v-col cols="12">
                <v-card variant="outlined" class="pa-3">
                  <div class="d-flex justify-space-between align-center">
                    <div>
                      <div class="font-weight-medium">Recurring Shift</div>
                      <div class="text-caption text-grey">Repeat this shift on the same day each week</div>
                    </div>
                    <v-switch v-model="newShift.recurring" hide-details color="primary" density="compact" />
                  </div>
                </v-card>
              </v-col>

              <!-- Post as Open Shift toggle -->
              <v-col cols="12">
                <v-card variant="outlined" class="pa-3">
                  <div class="d-flex justify-space-between align-center">
                    <div>
                      <div class="font-weight-medium">Post as Open Shift</div>
                      <div class="text-caption text-grey">Allow workers to claim this shift</div>
                    </div>
                    <v-switch
                      v-model="newShift.post_as_open"
                      hide-details
                      color="primary"
                      density="compact"
                      @update:modelValue="onOpenShiftToggle"
                    />
                  </div>
                  <v-expand-transition>
                    <v-text-field
                      v-if="newShift.post_as_open"
                      v-model.number="newShift.workers_needed"
                      type="number"
                      label="Workers Needed"
                      min="1"
                      variant="outlined"
                      density="comfortable"
                      class="mt-3"
                      hide-details
                    />
                  </v-expand-transition>
                </v-card>
              </v-col>

              <!-- Assign To: required unless open shift -->
              <v-col cols="12">
                <v-select
                  v-model="newShift.assigned_user_id"
                  :items="departmentWorkers"
                  item-title="title"
                  item-value="value"
                  :label="newShift.post_as_open ? 'Assign To (optional — open shift)' : 'Assign To *'"
                  variant="outlined"
                  density="comfortable"
                  clearable
                  prepend-inner-icon="mdi-account-outline"
                  :disabled="newShift.post_as_open"
                  :rules="newShift.post_as_open ? [] : [v => !!v || 'Please assign a worker or toggle Post as Open Shift']"
                />
              </v-col>

              <!-- Tasks -->
              <v-col cols="12">
                <div class="tasks-section">
                  <div class="tasks-header">
                    <h4 class="tasks-title">Tasks</h4>
                    <v-btn size="small" variant="outlined" prepend-icon="mdi-plus" @click="addNewTask">
                      + ADD TASK
                    </v-btn>
                  </div>
                  <div v-if="newShift.tasks.length === 0" class="empty-tasks text-center py-3">
                    No tasks added yet. Click "+ ADD TASK" to create checkpoint tasks.
                  </div>
                  <div v-for="(task, ti) in newShift.tasks" :key="ti" class="task-item-row">
                    <v-text-field
                      v-model="task.task_name"
                      :label="`Task ${ti + 1}`"
                      variant="outlined"
                      hide-details
                      density="compact"
                      class="flex-grow-1"
                    />
                    <v-btn icon variant="text" color="error" @click="removeNewTask(ti)">
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </div>
                </div>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-card-actions class="px-5 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="closeCreateDialog">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            :loading="creating"
            :disabled="!createFormValid"
            @click="createShift"
          >
            <v-icon start>mdi-calendar-check</v-icon>
            Create Shift
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showAssignDialog" max-width="800px">
      <ShiftAssignmentForm
        v-if="selectedShift"
        :shift-info="selectedShift"
        @close="showAssignDialog = false"
        @assigned="onShiftAssigned"
      />
    </v-dialog>

    <v-dialog v-model="showEditDialog" max-width="640px">
      <v-card>
        <v-card-title>
          <v-icon class="mr-2">mdi-pencil</v-icon>
          Edit Shift
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text>
          <v-form ref="editFormRef" v-model="editFormValid">
            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="editShift.position_id"
                  :items="positions"
                  item-title="position_name"
                  item-value="position_id"
                  label="Position"
                  variant="outlined"
                  :rules="[v => !!v || 'Position is required']"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="editShift.shift_date"
                  type="date"
                  label="Date"
                  variant="outlined"
                  :rules="[v => !!v || 'Date is required']"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="editShift.start_time"
                  type="time"
                  label="Start Time"
                  variant="outlined"
                  :rules="[v => !!v || 'Start time is required']"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="editShift.end_time"
                  type="time"
                  label="End Time"
                  variant="outlined"
                  :rules="[v => !!v || 'End time is required']"
                />
              </v-col>
              <v-col cols="12">
                <v-select
                  v-model="editShift.assigned_user_id"
                  :items="departmentWorkers"
                  item-title="title"
                  item-value="value"
                  label="Assign Worker (optional - leave blank for open shift)"
                  variant="outlined"
                  clearable
                  hide-details
                  prepend-inner-icon="mdi-account-outline"
                />
              </v-col>
              <v-col cols="12">
                <v-checkbox
                  v-model="editShift.is_published"
                  label="Published"
                  hide-details
                />
              </v-col>
              <v-col cols="12">
                <div class="tasks-section">
                  <div class="tasks-header">
                    <h4 class="tasks-title">Tasks</h4>
                    <v-btn size="small" variant="outlined" prepend-icon="mdi-plus" @click="addEditTask">
                      Add Task
                    </v-btn>
                  </div>

                  <div v-if="editShift.tasks.length === 0" class="empty-tasks">
                    No tasks added.
                  </div>

                  <div v-for="(task, index) in editShift.tasks" :key="task.id" class="task-item-row">
                    <v-text-field
                      v-model="task.text"
                      :label="`Task ${index + 1}`"
                      variant="outlined"
                      hide-details
                    />
                    <v-btn icon variant="text" color="error" @click="removeEditTask(index)">
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </div>
                </div>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-btn color="error" variant="text" @click="showDeleteConfirmDialog = true">
            Delete Shift
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showEditDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            :loading="editing"
            :disabled="isEditSaveDisabled"
            @click="saveShiftEdits"
          >
            Save Changes
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showDeleteConfirmDialog" max-width="420px">
      <v-card>
        <v-card-title>Delete Shift?</v-card-title>
        <v-card-text>
          This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showDeleteConfirmDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="elevated" :loading="deleting" @click="deleteSelectedShift">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="showSuccess" color="success" timeout="4000">
      <v-icon start>mdi-check-circle</v-icon>
      {{ successMessage }}
    </v-snackbar>

    <v-snackbar v-model="showError" color="error" timeout="6000">
      <v-icon start>mdi-alert-circle</v-icon>
      {{ errorMessage }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ShiftAssignmentForm from '../components/ShiftAssignmentForm.vue'
import shiftService from '../services/shiftService.js'
import apiClient from '../services/services.js'
import UserRoleServices from '../services/userRoleServices.js'
import Utils from '../config/utils.js'

const router = useRouter()
const route = useRoute()

// Department context (auto-determined from stored context)
const deptContext = Utils.getStore('currentDepartmentContext') || {}
const currentDeptId = deptContext.department_id || null
const currentDeptName = deptContext.department_name || ''

const currentDate = ref(new Date())
const shifts = ref([])
const departments = ref([])
const positions = ref([])
const departmentWorkers = ref([])
const filters = ref({
  position_id: null,
  shift_date: null
})

const showCreateDialog = ref(false)
const showAssignDialog = ref(false)
const showEditDialog = ref(false)
const showDeleteConfirmDialog = ref(false)
const startTimeMenu = ref(false)
const endTimeMenu = ref(false)
const startTimeParts = reactive({ hour: '09', minute: '00', period: 'AM' })
const endTimeParts = reactive({ hour: '10', minute: '00', period: 'AM' })
const hourOptions = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'))
const minuteOptions = ['00', '30']
const periodOptions = ['AM', 'PM']

const createFormRef = ref(null)
const createFormValid = ref(false)
const editFormRef = ref(null)
const editFormValid = ref(false)
const newShift = ref({
  department_id: currentDeptId,
  position_id: null,
  shift_date: '',
  start_time: '',
  end_time: '',
  assigned_user_id: null,
  post_as_open: false,
  workers_needed: 1,
  recurring: false,
  tasks: [],
  is_published: true
})

const selectedShift = ref(null)
const editShift = ref({
  shift_id: null,
  position_id: null,
  shift_date: '',
  start_time: '',
  end_time: '',
  assigned_user_id: null,
  is_published: false,
  tasks: [],
})

const shiftsLoading = ref(false)
const creating = ref(false)
const editing = ref(false)
const deleting = ref(false)

// Drag-to-create state
const dragCreate = ref(null)
const isDragCreating = ref(false)
// Drag-to-reschedule state
const draggingShift = ref(null)
const dragOverCell = ref(null)
const rescheduling = ref(false)

const showSuccess = ref(false)
const showError = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

const isEditSaveDisabled = computed(() => {
  return (
    editing.value ||
    !editShift.value.shift_id ||
    !editShift.value.position_id ||
    !editShift.value.shift_date ||
    !editShift.value.start_time ||
    !editShift.value.end_time
  )
})

// Data table
const headers = [
  { title: 'Date', key: 'shift_date', sortable: true },
  { title: 'Time', key: 'time', sortable: false },
  { title: 'Position', key: 'position', sortable: false },
  { title: 'Assigned To', key: 'assigned_user', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, width: 120 }
]

// Computed
const weekDays = computed(() => {
  const today = new Date()
  const todayIso = today.toISOString().split('T')[0]
  const startOfWeek = new Date(currentDate.value)
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    const isoDate = d.toISOString().split('T')[0]
    return {
      isoDate,
      name: d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: d.getDate(),
      isToday: isoDate === todayIso
    }
  })
})

const timeSlots = computed(() => Array.from({ length: 19 }, (_, i) => i + 5))

const currentGreetingDate = computed(() => {
  if (!weekDays.value.length) return ''
  const first = new Date(weekDays.value[0].isoDate)
  const last = new Date(weekDays.value[6].isoDate)
  return `${first.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${last.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
})

const filteredShifts = computed(() => {
  return shifts.value
})

const formatTime = (hour) => {
  const normalizedHour = hour === 24 ? 0 : hour
  const period = normalizedHour >= 12 ? 'PM' : 'AM'
  const displayHour = normalizedHour > 12 ? normalizedHour - 12 : normalizedHour === 0 ? 12 : normalizedHour
  return `${displayHour}:00 ${period}`
}

const parseHour = (timeValue) => {
  if (!timeValue || typeof timeValue !== 'string') return null
  const [rawHour, rawMinute] = timeValue.split(':')
  const hour = Number(rawHour)
  const minute = Number(rawMinute || 0)
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null
  return hour + minute / 60
}

const toMinutes = (timeValue) => {
  if (!timeValue) return null
  const [hour, minute] = String(timeValue).split(':').map(Number)
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null
  return hour * 60 + minute
}

const parseTimeToParts = (timeValue) => {
  if (!timeValue) return { hour: '09', minute: '00', period: 'AM' }
  const [rawHour, rawMinute] = String(timeValue).split(':')
  const hour24 = Number(rawHour || 0)
  const minute = String(rawMinute || '00').padStart(2, '0')
  const period = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 || 12
  return {
    hour: String(hour12).padStart(2, '0'),
    minute,
    period,
  }
}

const partsToTime = (parts) => {
  const hour12 = Number(parts.hour)
  const minute = Number(parts.minute)
  if (Number.isNaN(hour12) || Number.isNaN(minute)) return ''

  let hour24 = hour12 % 12
  if (parts.period === 'PM') hour24 += 12

  return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

const formatTimeDisplay = (timeValue) => {
  if (!timeValue) return ''
  const [rawHour, rawMinute] = String(timeValue).split(':')
  const hour = Number(rawHour || 0)
  const minute = String(rawMinute || '00').padStart(2, '0')
  const period = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${String(hour12).padStart(2, '0')}:${minute} ${period}`
}

const normalizeDateInput = (dateValue) => {
  if (!dateValue) return ''
  const value = String(dateValue)

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 10)
}

const normalizeTimeInput = (timeValue) => {
  if (!timeValue) return ''
  const value = String(timeValue)
  const parts = value.split(':')
  if (parts.length < 2) return ''
  const hour = Number(parts[0])
  const minute = Number(parts[1])
  if (Number.isNaN(hour) || Number.isNaN(minute)) return ''
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

const normalizeUserId = (value) => {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  return Number.isNaN(numeric) ? null : numeric
}

const syncTimePartsFromForm = (target, timeValue) => {
  const next = parseTimeToParts(timeValue)
  if (target === 'start') {
    startTimeParts.hour = next.hour
    startTimeParts.minute = next.minute
    startTimeParts.period = next.period
    return
  }
  endTimeParts.hour = next.hour
  endTimeParts.minute = next.minute
  endTimeParts.period = next.period
}

const updateTimePart = (target, part, value) => {
  const parts = target === 'start' ? startTimeParts : endTimeParts
  parts[part] = value
  const nextTime = partsToTime(parts)
  if (target === 'start') {
    newShift.value.start_time = nextTime
    return
  }
  newShift.value.end_time = nextTime
}

const clearTime = (target) => {
  if (target === 'start') {
    newShift.value.start_time = ''
    startTimeMenu.value = false
    return
  }
  newShift.value.end_time = ''
  endTimeMenu.value = false
}

const getShiftDurationHours = (shift) => {
  const start = parseHour(shift.start_time)
  const end = parseHour(shift.end_time)
  if (start == null || end == null) return 1

  let duration = end - start
  if (duration <= 0) duration += 24
  return Math.max(1, duration)
}

const formatShiftTime = (startTime, endTime) => {
  const normalize = (timeValue) => {
    if (!timeValue) return ''
    const [h, m] = timeValue.split(':')
    const date = new Date()
    date.setHours(Number(h || 0), Number(m || 0), 0, 0)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  return `${normalize(startTime)} - ${normalize(endTime)}`
}

const getShiftsForCell = (isoDate, hour) => {
  return shifts.value.filter((shift) => {
    if (shift.shift_date !== isoDate) return false
    const start = parseHour(shift.start_time)
    if (start == null) return false
    return Math.floor(start) === hour
  })
}

const getShiftBlockStyle = (shift, idx) => {
  const duration = getShiftDurationHours(shift)
  return {
    top: `${idx * 6}px`,
    height: `calc(var(--calendar-hour-height) * ${duration} - 8px)`
  }
}

const loadShiftTasks = async (shiftId) => {
  if (!shiftId) return []
  try {
    const response = await apiClient.get(`/shift-tasks/shift/${shiftId}`)
    const rows = response?.data || []
    return rows.map((task) => ({
      id: task.id || `${shiftId}-${Math.random().toString(36).slice(2, 9)}`,
      taskId: task.id || null,
      text: String(task.taskName || '').trim(),
    }))
  } catch (error) {
    return []
  }
}

const selectShift = async (shift) => {
  selectedShift.value = shift
  const existingTasks = await loadShiftTasks(shift.shift_id)
  editShift.value = {
    shift_id: shift.shift_id,
    position_id: shift.position_id || null,
    shift_date: normalizeDateInput(shift.shift_date),
    start_time: normalizeTimeInput(shift.start_time),
    end_time: normalizeTimeInput(shift.end_time),
    assigned_user_id: normalizeUserId(shift.assigned_user_id),
    is_published: !!shift.is_published,
    tasks: existingTasks,
  }
  showEditDialog.value = true
}

const addEditTask = () => {
  editShift.value.tasks.push({
    id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    taskId: null,
    text: '',
  })
}

const removeEditTask = (index) => {
  editShift.value.tasks.splice(index, 1)
}

// --- Create dialog helpers ---
const openCreateDialog = (isoDate = '', startTime = '', endTime = '') => {
  newShift.value = {
    department_id: currentDeptId,
    position_id: null,
    shift_date: isoDate,
    start_time: startTime,
    end_time: endTime,
    assigned_user_id: null,
    post_as_open: false,
    workers_needed: 1,
    recurring: false,
    tasks: [],
    is_published: true,
  }
  if (startTime) syncTimePartsFromForm('start', startTime)
  if (endTime) syncTimePartsFromForm('end', endTime)
  showCreateDialog.value = true
}

const closeCreateDialog = () => {
  showCreateDialog.value = false
  isDragCreating.value = false
  dragCreate.value = null
}

const onOpenShiftToggle = () => {
  if (newShift.value.post_as_open) {
    newShift.value.assigned_user_id = null
  }
}

const addNewTask = () => {
  newShift.value.tasks.push({ task_name: '' })
}

const removeNewTask = (index) => {
  newShift.value.tasks.splice(index, 1)
}

// --- Drag-to-create ---
const startDragCreate = (isoDate, hour, event) => {
  if (event.target.closest && event.target.closest('.shift-block')) return
  isDragCreating.value = true
  const startMinute = Math.floor((event.offsetY || 0) / 15) * 15
  dragCreate.value = { isoDate, startHour: hour, startMinute, currentHour: hour }
}

const continueDragCreate = (isoDate, hour) => {
  if (!isDragCreating.value || !dragCreate.value) return
  if (dragCreate.value.isoDate !== isoDate) return
  dragCreate.value = { ...dragCreate.value, currentHour: hour }
}

const endDragCreate = () => {
  if (!isDragCreating.value || !dragCreate.value) {
    isDragCreating.value = false
    dragCreate.value = null
    return
  }
  const { isoDate, startHour, startMinute, currentHour } = dragCreate.value
  const fromHour = Math.min(startHour, currentHour)
  const toHour = Math.max(startHour, currentHour) + 1
  isDragCreating.value = false
  dragCreate.value = null
  const startTime = `${String(fromHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`
  const endHour = Math.min(toHour, 23)
  const endTime = `${String(endHour).padStart(2, '0')}:00`
  openCreateDialog(isoDate, startTime, endTime)
}

const isDragHighlight = (isoDate, hour) => {
  if (!dragCreate.value || dragCreate.value.isoDate !== isoDate) return false
  const minH = Math.min(dragCreate.value.startHour, dragCreate.value.currentHour)
  const maxH = Math.max(dragCreate.value.startHour, dragCreate.value.currentHour)
  return hour >= minH && hour <= maxH
}

// --- Drag-to-reschedule ---
const onShiftDragStart = (shift, event) => {
  draggingShift.value = shift
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', String(shift.shift_id))
}

const onShiftDragEnd = () => {
  draggingShift.value = null
  dragOverCell.value = null
}

const onShiftDragOver = (isoDate, hour) => {
  if (!draggingShift.value) return
  dragOverCell.value = { isoDate, hour }
}

const onShiftDrop = async (isoDate, hour) => {
  const shift = draggingShift.value
  draggingShift.value = null
  dragOverCell.value = null
  if (!shift) return
  const oldStartMin = toMinutes(shift.start_time)
  const oldEndMin = toMinutes(shift.end_time)
  const duration = (oldEndMin != null && oldStartMin != null && oldEndMin > oldStartMin) ? (oldEndMin - oldStartMin) : 60
  const newStartMin = hour * 60
  const newEndMin = newStartMin + duration
  const newStartTime = `${String(Math.floor(newStartMin / 60)).padStart(2, '0')}:${String(newStartMin % 60).padStart(2, '0')}`
  const newEndTime = `${String(Math.min(Math.floor(newEndMin / 60), 23)).padStart(2, '0')}:${String(newEndMin % 60).padStart(2, '0')}`
  if (shift.shift_date === isoDate && normalizeTimeInput(shift.start_time) === newStartTime) return
  try {
    rescheduling.value = true
    await shiftService.updateShift(shift.shift_id, {
      shift_date: isoDate,
      start_time: newStartTime,
      end_time: newEndTime,
    })
    successMessage.value = 'Shift rescheduled. The assigned worker has been notified.'
    showSuccess.value = true
    await loadShifts()
  } catch (err) {
    errorMessage.value = err?.response?.data?.message || 'Failed to reschedule shift'
    showError.value = true
  } finally {
    rescheduling.value = false
  }
}

const previousWeek = () => {
  const nextDate = new Date(currentDate.value)
  nextDate.setDate(nextDate.getDate() - 7)
  currentDate.value = nextDate
}

const nextWeek = () => {
  const nextDate = new Date(currentDate.value)
  nextDate.setDate(nextDate.getDate() + 7)
  currentDate.value = nextDate
}

const goToToday = () => {
  currentDate.value = new Date()
}

const openAddToSchedule = () => {
  if (!selectedShift.value) {
    errorMessage.value = 'Select a shift first, then click Add to Schedule.'
    showError.value = true
    return
  }
  showAssignDialog.value = true
}

const loadShifts = async () => {
  try {
    shiftsLoading.value = true
    const params = { ...filters.value }
    if (currentDeptId) params.department_id = currentDeptId
    const response = await shiftService.listShifts(params)
    shifts.value = response.data || []
  } catch (error) {
    console.error('Error loading shifts:', error)
    errorMessage.value = 'Failed to load shifts'
    showError.value = true
  } finally {
    shiftsLoading.value = false
  }
}

const loadDepartmentWorkers = async () => {
  if (!currentDeptId) return
  try {
    const response = await UserRoleServices.getAllUsersWithRoles(true)
    const users = response?.data || []

    const departmentMembers = users.filter((user) =>
      (user.userDepartments || []).some(
        (membership) => Number(membership.department_id) === Number(currentDeptId),
      ),
    )

    const studentMembers = departmentMembers.filter((user) =>
      (user.userDepartments || []).some(
        (membership) =>
          Number(membership.department_id) === Number(currentDeptId) &&
          String(membership?.role?.role_name || '').toLowerCase().includes('student'),
      ),
    )

    const candidateUsers = studentMembers.length > 0 ? studentMembers : departmentMembers
    departmentWorkers.value = candidateUsers.map((user) => ({
      title: `${user.fName || ''} ${user.lName || ''}`.trim() || user.email || 'Unnamed Worker',
      value: Number(user.id),
      email: user.email,
    }))
  } catch (error) {
    console.error('Error loading department workers:', error)
  }
}

const loadDepartments = async () => {
  try {
    const response = await apiClient.get('/departments')
    departments.value = response?.data?.data || []
  } catch (error) {
    console.error('Error loading departments:', error)
  }
}

const loadPositions = async () => {
  try {
    const response = await apiClient.get('/positions')
    positions.value = response?.data?.data || []
  } catch (error) {
    console.error('Error loading positions:', error)
  }
}

const createShift = async () => {
  if (!createFormValid.value) return

  try {
    creating.value = true

    const shiftPayload = {
      department_id: currentDeptId,
      position_id: newShift.value.position_id,
      shift_date: newShift.value.shift_date,
      start_time: newShift.value.start_time,
      end_time: newShift.value.end_time,
      assigned_user_id: newShift.value.post_as_open ? null : (newShift.value.assigned_user_id || null),
      is_published: true,
      is_recurring: newShift.value.recurring,
      recurrence_pattern: newShift.value.recurring ? 'weekly' : null,
      recurrence_start_date: newShift.value.recurring ? newShift.value.shift_date : null,
      workers_needed: newShift.value.post_as_open ? Number(newShift.value.workers_needed) : null,
      trade_status: newShift.value.post_as_open ? 'open' : null,
    }

    const response = await shiftService.createShift(shiftPayload)
    const createdShift = response.data
    const warningMessage = createdShift?.warning_message || ''

    // Create tasks if any were added
    const validTasks = newShift.value.tasks.filter(t => String(t.task_name || '').trim())
    if (validTasks.length > 0) {
      const shiftId = createdShift?.shift_id || createdShift?.data?.shift_id
      if (shiftId) {
        await Promise.all(
          validTasks.map((t, i) =>
            apiClient.post('/shift-tasks', {
              shiftId,
              taskName: t.task_name.trim(),
              sortOrder: i + 1,
              isRequired: true,
              status: 'pending',
            })
          )
        )
      }
    }

    successMessage.value = warningMessage
      ? `Shift created and published. Note: ${warningMessage}`
      : 'Shift created and published!'
    showSuccess.value = true

    closeCreateDialog()
    await loadShifts()
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || 'Failed to create shift'
    showError.value = true
  } finally {
    creating.value = false
  }
}

const saveShiftEdits = async () => {
  if (isEditSaveDisabled.value) return

  try {
    editing.value = true
    const response = await shiftService.updateShift(editShift.value.shift_id, {
      department_id: currentDeptId,
      position_id: editShift.value.position_id,
      shift_date: editShift.value.shift_date,
      start_time: editShift.value.start_time,
      end_time: editShift.value.end_time,
      assigned_user_id: editShift.value.assigned_user_id || null,
      is_published: editShift.value.is_published,
    })
    const warningMessage = response?.data?.warning_message || ''

    const currentTasksResponse = await apiClient.get(`/shift-tasks/shift/${editShift.value.shift_id}`)
    const currentTasks = currentTasksResponse?.data || []
    await Promise.all(
      currentTasks.map((task) => apiClient.delete(`/shift-tasks/${task.id}`)),
    )

    const nextTasks = editShift.value.tasks
      .map((task) => String(task.text || '').trim())
      .filter(Boolean)

    if (nextTasks.length > 0) {
      await Promise.all(
        nextTasks.map((taskName, index) =>
          apiClient.post('/shift-tasks', {
            shiftId: editShift.value.shift_id,
            taskName,
            sortOrder: index + 1,
            isRequired: true,
            status: 'pending',
          }),
        ),
      )
    }

    successMessage.value = warningMessage
      ? `Shift updated successfully. Warning: ${warningMessage}`
      : 'Shift updated successfully!'
    showSuccess.value = true
    showEditDialog.value = false
    await loadShifts()
  } catch (error) {
    console.error('Error updating shift:', error)
    errorMessage.value = error?.response?.data?.message || 'Failed to update shift'
    showError.value = true
  } finally {
    editing.value = false
  }
}

const deleteSelectedShift = async () => {
  if (!editShift.value.shift_id) return

  try {
    deleting.value = true
    await shiftService.deleteShift(editShift.value.shift_id)
    showDeleteConfirmDialog.value = false
    showEditDialog.value = false
    selectedShift.value = null
    successMessage.value = 'Shift deleted successfully!'
    showSuccess.value = true
    await loadShifts()
  } catch (error) {
    console.error('Error deleting shift:', error)
    errorMessage.value = error?.response?.data?.message || 'Failed to delete shift'
    showError.value = true
  } finally {
    deleting.value = false
  }
}

watch(
  () => newShift.value.start_time,
  (start) => {
    syncTimePartsFromForm('start', start)
    if (!start) {
      newShift.value.end_time = ''
      return
    }
    if (newShift.value.end_time && toMinutes(newShift.value.end_time) <= toMinutes(start)) {
      newShift.value.end_time = ''
    }
  },
)

watch(
  () => newShift.value.end_time,
  (end) => {
    syncTimePartsFromForm('end', end)
  },
)

const onShiftAssigned = (assignmentData) => {
  successMessage.value = `Shift assigned to ${assignmentData.userName} successfully!`
  showSuccess.value = true
  showAssignDialog.value = false
  loadShifts()
}

onMounted(() => {
  const scheduleToast = Utils.getStore('managerScheduleToast')
  if (scheduleToast?.message) {
    successMessage.value = scheduleToast.message
    showSuccess.value = true
    Utils.removeItem('managerScheduleToast')
  }

  Promise.all([
    loadShifts(),
    loadPositions(),
    loadDepartmentWorkers()
  ])

  if (String(route.query?.createShift || '') === '1') {
    openCreateDialog()
  }
})
</script>

<style scoped>
.schedule-container,
.schedule-container * {
  box-sizing: border-box;
}

.schedule-container {
  --calendar-time-column-width: 88px;
  --calendar-header-height: 80px;
  --calendar-hour-height: 60px;
  --calendar-row-count: 19;
  padding: 20px;
  background-color: #fafafa;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  gap: 12px;
}

.month-year {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.selected-shift-note {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 13px;
}

.header-controls {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.time-picker-card {
  border: 1px solid #d0d5dd;
}

.time-picker-grid {
  display: grid;
  grid-template-columns: 1.1fr 1fr 1fr;
  gap: 14px;
  max-height: 320px;
}

.time-picker-col {
  max-height: 250px;
}

.time-picker-col-title {
  position: sticky;
  top: 0;
  background: #fff;
  font-size: 12px;
  color: #667085;
  padding-bottom: 6px;
}

.time-picker-col-hour {
  overflow-y: auto;
  padding-right: 8px;
  border-right: 1px solid #e4e7ec;
}

.time-picker-col-fixed {
  overflow: hidden;
}

.time-picker-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 8px;
}

.nav-btn {
  border-color: #e0e0e0;
  color: #666;
}

.today-btn {
  background-color: #8B1538;
  color: white;
}

.greeting-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.greeting-title {
  font-size: 32px;
  font-weight: 700;
  color: #333;
  margin: 0;
}

.greeting-date {
  font-size: 18px;
  font-weight: 500;
  color: #64748b;
  margin: 0;
  text-align: right;
}

.calendar-scroll-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.calendar-container {
  background: white;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
  overflow: hidden;
}

.calendar-grid {
  display: flex;
  align-items: flex-start;
  background: white;
}

.time-column {
  width: var(--calendar-time-column-width);
  flex: 0 0 var(--calendar-time-column-width);
  border-right: 1px solid #e0e0e0;
  background-color: #fafafa;
}

.time-column::before {
  content: '';
  display: block;
  height: var(--calendar-header-height);
  border-bottom: 1px solid #e0e0e0;
}

.time-slot {
  height: var(--calendar-hour-height);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #666;
  border-bottom: 1px solid #f0f0f0;
}

.days-container {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.day-column {
  min-width: 0;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
}

.day-column:last-child {
  border-right: none;
}

.day-header {
  height: var(--calendar-header-height);
  padding: 16px 8px;
  text-align: center;
  border-bottom: 1px solid #e0e0e0;
  background-color: #fafafa;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.day-name {
  font-size: 12px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.day-date {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-top: 4px;
}

.day-date.today {
  color: #8B1538;
  background-color: #f8e6ea;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

.hour-slots {
  display: grid;
  grid-template-rows: repeat(var(--calendar-row-count), var(--calendar-hour-height));
}

.hour-slot {
  border-bottom: 1px solid #f0f0f0;
  position: relative;
  cursor: crosshair;
}

.hour-slot.drag-highlight {
  background-color: rgba(139, 21, 56, 0.10);
}

.hour-slot.drag-over-cell {
  background-color: rgba(139, 21, 56, 0.20);
  outline: 2px dashed rgba(139, 21, 56, 0.50);
  outline-offset: -2px;
}

.shift-block {
  position: absolute;
  left: 4px;
  right: 4px;
  background-color: #8B1538;
  color: white;
  border-radius: 6px;
  padding: 8px;
  font-size: 12px;
  overflow: hidden;
  cursor: grab;
  border: 2px solid transparent;
}

.shift-block.selected {
  border-color: #00c853;
  box-shadow: 0 0 0 2px rgba(0, 200, 83, 0.25);
}

.shift-block.dragging {
  opacity: 0.35;
  border: 2px dashed rgba(255, 255, 255, 0.7);
}

.shift-block-title {
  font-weight: 600;
  margin-bottom: 2px;
}

.shift-block-sub {
  opacity: 0.95;
  font-size: 11px;
}

.shift-block-time {
  opacity: 0.9;
  font-size: 11px;
}

.tasks-section {
  border: 1px solid #e3e5e8;
  border-radius: 12px;
  padding: 12px;
}

.tasks-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.tasks-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #101828;
}

.empty-tasks {
  color: #667085;
  font-size: 14px;
}

.task-item-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.loading-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
}

@media (max-width: 900px) {
  .calendar-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-controls {
    justify-content: flex-start;
  }
}

@media (max-width: 768px) {
  .greeting-banner {
    flex-direction: column;
    align-items: flex-start;
  }

  .greeting-date {
    text-align: left;
  }
}
</style>
