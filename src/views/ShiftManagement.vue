<template>
  <PageFrame>
    <template #header>
      <PageHeader title="Schedule" :subtitle="headerSubtitle">
        <template #actions>
          <v-btn
            color="primary"
            variant="elevated"
            prepend-icon="mdi-plus"
            @click="openCreateDialog()"
          >
            Create Shift
          </v-btn>

          <div class="schedule-nav-group">
            <v-btn icon variant="outlined" density="comfortable" @click="previousPeriod" aria-label="Previous">
              <v-icon>mdi-chevron-left</v-icon>
            </v-btn>
            <v-btn variant="outlined" density="comfortable" class="schedule-today-btn" @click="goToToday">
              Today
            </v-btn>
            <v-btn icon variant="outlined" density="comfortable" @click="nextPeriod" aria-label="Next">
              <v-icon>mdi-chevron-right</v-icon>
            </v-btn>
          </div>
        </template>
      </PageHeader>
    </template>

    <template #filters>
      <div class="schedule-filters">
        <v-select
          v-model="filterPositionIds"
          :items="positions"
          item-title="position_name"
          item-value="position_id"
          label="Positions"
          variant="outlined"
          density="compact"
          multiple
          chips
          closable-chips
          hide-details
          class="schedule-filter-positions"
        />

        <v-btn-toggle
          v-model="filterStatus"
          mandatory
          density="comfortable"
          variant="outlined"
          color="primary"
        >
          <v-btn value="all" size="small">All</v-btn>
          <v-btn value="open" size="small">Open</v-btn>
          <v-btn value="filled" size="small">Filled</v-btn>
          <v-btn value="needs-coverage" size="small">Needs coverage</v-btn>
        </v-btn-toggle>

        <div v-if="selectedShift" class="schedule-selected-note type-meta">
          Selected: {{ selectedShift.position?.position_name }} ·
          {{ formatShiftTime(selectedShift.start_time, selectedShift.end_time) }}
        </div>
      </div>
    </template>

    <div v-if="positionsWithColor.length > 0" class="schedule-legend">
      <span class="schedule-legend__label">Key:</span>
      <div class="schedule-legend__items">
        <div
          v-for="pos in positionsWithColor"
          :key="pos.position_id"
          class="schedule-legend__item"
        >
          <span
            class="schedule-legend__swatch"
            :style="{ backgroundColor: getPositionColor(pos) }"
          ></span>
          <span class="schedule-legend__text">{{ pos.position_name }}</span>
        </div>
        <div class="schedule-legend__item">
          <span class="schedule-legend__swatch schedule-legend__swatch--unfilled"></span>
          <span class="schedule-legend__text">Unfilled</span>
        </div>
        <div class="schedule-legend__item">
          <span class="schedule-legend__swatch schedule-legend__swatch--unacknowledged"></span>
          <span class="schedule-legend__text">Not acknowledged</span>
        </div>
      </div>
    </div>

    <div v-if="!shiftsLoading" class="schedule-calendar-wrap">
      <FullCalendar ref="fullCalendarRef" :options="calendarOptions" />
    </div>

    <div v-else class="schedule-loading-wrap">
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
                          <v-btn
                            v-for="hour in hourOptions"
                            :key="`sh-${hour}`"
                            size="small"
                            variant="flat"
                            block
                            class="mb-1"
                            :color="startTimeParts.hour === hour ? 'primary' : undefined"
                            @click="updateTimePart('start', 'hour', hour)"
                          >{{ hour }}</v-btn>
                        </div>
                        <div class="time-picker-col time-picker-col-fixed">
                          <div class="time-picker-col-title">Minute</div>
                          <div class="minute-scroll-list" ref="startMinuteListRef">
                            <v-btn
                              v-for="minute in minuteOptions"
                              :key="`sm-${minute}`"
                              size="small"
                              variant="flat"
                              block
                              class="mb-1"
                              :color="startTimeParts.minute === minute ? 'primary' : undefined"
                              @click="updateTimePart('start', 'minute', minute)"
                            >{{ minute }}</v-btn>
                          </div>
                        </div>
                        <div class="time-picker-col time-picker-col-fixed">
                          <div class="time-picker-col-title">Period</div>
                          <v-btn
                            v-for="period in periodOptions"
                            :key="`sp-${period}`"
                            size="small"
                            variant="flat"
                            block
                            class="mb-1"
                            :color="startTimeParts.period === period ? 'primary' : undefined"
                            @click="updateTimePart('start', 'period', period)"
                          >{{ period }}</v-btn>
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
                          <v-btn
                            v-for="hour in hourOptions"
                            :key="`eh-${hour}`"
                            size="small"
                            variant="flat"
                            block
                            class="mb-1"
                            :color="endTimeParts.hour === hour ? 'primary' : undefined"
                            @click="updateTimePart('end', 'hour', hour)"
                          >{{ hour }}</v-btn>
                        </div>
                        <div class="time-picker-col time-picker-col-fixed">
                          <div class="time-picker-col-title">Minute</div>
                          <div class="minute-scroll-list" ref="endMinuteListRef">
                            <v-btn
                              v-for="minute in minuteOptions"
                              :key="`em-${minute}`"
                              size="small"
                              variant="flat"
                              block
                              class="mb-1"
                              :color="endTimeParts.minute === minute ? 'primary' : undefined"
                              @click="updateTimePart('end', 'minute', minute)"
                            >{{ minute }}</v-btn>
                          </div>
                        </div>
                        <div class="time-picker-col time-picker-col-fixed">
                          <div class="time-picker-col-title">Period</div>
                          <v-btn
                            v-for="period in periodOptions"
                            :key="`ep-${period}`"
                            size="small"
                            variant="flat"
                            block
                            class="mb-1"
                            :color="endTimeParts.period === period ? 'primary' : undefined"
                            @click="updateTimePart('end', 'period', period)"
                          >{{ period }}</v-btn>
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
                  :label="editShift.post_as_open ? 'Assign Worker (optional — open shift)' : 'Assign Worker (optional - leave blank for open shift)'"
                  variant="outlined"
                  clearable
                  hide-details
                  prepend-inner-icon="mdi-account-outline"
                  :disabled="editShift.post_as_open"
                />
              </v-col>
              <v-col cols="12">
                <v-card variant="outlined" class="pa-3">
                  <div class="d-flex justify-space-between align-center">
                    <div>
                      <div class="font-weight-medium">Recurring Shift</div>
                      <div class="text-caption text-grey">Repeat this shift on the same day each week</div>
                    </div>
                    <v-switch v-model="editShift.recurring" hide-details color="primary" density="compact" />
                  </div>
                  <v-expand-transition>
                    <v-text-field
                      v-if="editShift.recurring"
                      v-model="editShift.repeat_until"
                      type="date"
                      label="Repeat Until"
                      variant="outlined"
                      density="comfortable"
                      class="mt-3"
                      :min="editShift.shift_date || undefined"
                      :rules="[v => !!v || 'Repeat until is required for recurring shifts']"
                    />
                  </v-expand-transition>
                </v-card>
              </v-col>
              <v-col cols="12">
                <v-card variant="outlined" class="pa-3">
                  <div class="d-flex justify-space-between align-center">
                    <div>
                      <div class="font-weight-medium">Post as Open Shift</div>
                      <div class="text-caption text-grey">Allow workers to claim this shift</div>
                    </div>
                    <v-switch
                      v-model="editShift.post_as_open"
                      hide-details
                      color="primary"
                      density="compact"
                      @update:modelValue="onEditOpenShiftToggle"
                    />
                  </div>
                </v-card>
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
  </PageFrame>
</template>

<script setup>
import { ref, computed, onMounted, reactive, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import FullCalendar from '@fullcalendar/vue3'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import PageFrame from '../components/PageFrame.vue'
import PageHeader from '../components/PageHeader.vue'
import ShiftAssignmentForm from '../components/ShiftAssignmentForm.vue'
import shiftService from '../services/shiftService.js'
import apiClient from '../services/services.js'
import departmentServices from '../services/departmentServices.js'
import UserRoleServices from '../services/userRoleServices.js'
import Utils from '../config/utils.js'
import { TZ, localDateStr } from '../utils/tz.js'

const route = useRoute()

// Department context (auto-determined from stored context)
const deptContext = Utils.getStore('currentDepartmentContext') || {}
const currentDeptId = deptContext.department_id || null
const currentDeptName = deptContext.department_name || ''

const currentDate = ref(new Date())
const currentView = ref('timeGridWeek')
const fullCalendarRef = ref(null)
const startMinuteListRef = ref(null)
const endMinuteListRef = ref(null)
const shifts = ref([])
const positions = ref([])
const departmentWorkers = ref([])
const filters = ref({
  position_id: null,
  shift_date: null,
})
// Auto-fit hours: defaults fall back to 06:00–23:00 when department hours
// can't be resolved. Set in loadDepartmentCalendarHours().
const calendarHours = ref({ slotMinTime: '06:00:00', slotMaxTime: '23:00:00' })

// Expand calendar bounds to always cover all actual shift start/end times.
// This prevents shifts from being visually clipped when department hours are
// narrower than the actual shifts on the schedule.
const effectiveCalendarHours = computed(() => {
  const timeToMins = (t) => {
    const parts = String(t || '').split(':').map(Number)
    return (parts[0] || 0) * 60 + (parts[1] || 0)
  }
  const minsToTime = (m) => {
    const clamped = Math.max(0, Math.min(24 * 60, m))
    const h = Math.floor(clamped / 60)
    const min = clamped % 60
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`
  }

  let minMins = timeToMins(calendarHours.value.slotMinTime)
  let maxMins = timeToMins(calendarHours.value.slotMaxTime)

  for (const shift of shifts.value) {
    if (shift.start_time) {
      const s = timeToMins(shift.start_time)
      if (s < minMins) minMins = s
    }
    if (shift.end_time) {
      const e = timeToMins(shift.end_time)
      if (e > maxMins) maxMins = e
    }
  }

  // Add 30-minute padding around the earliest/latest shift
  return {
    slotMinTime: minsToTime(Math.max(0, minMins - 30)),
    slotMaxTime: minsToTime(Math.min(24 * 60, maxMins + 30)),
  }
})
const calendarHoursSource = ref('fallback') // 'department' | 'fallback'
const departmentHoursByDay = ref({})

// Filter bar state
const filterPositionIds = ref([])
const filterStatus = ref('all') // all | open | filled | needs-coverage
const filterOnlyMyApprovals = ref(false)
const currentUserId = ref(null)

const showCreateDialog = ref(false)
const showAssignDialog = ref(false)
const showEditDialog = ref(false)
const showDeleteConfirmDialog = ref(false)
const startTimeMenu = ref(false)
const endTimeMenu = ref(false)
const startTimeParts = reactive({ hour: '09', minute: '00', period: 'AM' })
const endTimeParts = reactive({ hour: '10', minute: '00', period: 'AM' })
const hourOptions = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'))
const minuteOptions = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))
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
  is_published: true,
})

const selectedShift = ref(null)
const editShift = ref({
  shift_id: null,
  position_id: null,
  shift_date: '',
  start_time: '',
  end_time: '',
  assigned_user_id: null,
  post_as_open: false,
  recurring: false,
  repeat_until: '',
  is_published: false,
  tasks: [],
})

const shiftsLoading = ref(false)
const creating = ref(false)
const editing = ref(false)
const deleting = ref(false)
const rescheduling = ref(false)

const showSuccess = ref(false)
const showError = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

const headerSubtitle = computed(() => currentDeptName || 'No department selected')

const isEditSaveDisabled = computed(() => {
  return (
    editing.value ||
    !editShift.value.shift_id ||
    !editShift.value.position_id ||
    !editShift.value.shift_date ||
    !editShift.value.start_time ||
    !editShift.value.end_time ||
    (editShift.value.recurring && !editShift.value.repeat_until)
  )
})

// --- Shift state classification -------------------------------------------
const classifyShiftState = (shift) => {
  const tradeStatus = String(shift?.trade_status || '').toLowerCase()
  const hasAssignee = !!shift?.assigned_user_id
  if (tradeStatus === 'open' && !hasAssignee) return 'open'
  if (!hasAssignee) return 'needs-coverage'
  return 'filled'
}

// --- Filtered shifts -------------------------------------------------------
const filteredShifts = computed(() => {
  return shifts.value.filter((shift) => {
    // Position filter (multi-select; empty = all)
    if (filterPositionIds.value.length > 0) {
      const pid = Number(shift.position_id)
      if (!filterPositionIds.value.map(Number).includes(pid)) return false
    }

    // Status filter
    if (filterStatus.value !== 'all') {
      if (classifyShiftState(shift) !== filterStatus.value) return false
    }

    // Only-my-approvals: shifts awaiting manager approval assigned to me.
    // Uses approved_by / approved_at flags when present on the shift record.
    if (filterOnlyMyApprovals.value) {
      const uid = currentUserId.value
      const approver = Number(shift.approved_by || shift.approver_id || 0)
      if (!uid || approver !== Number(uid)) return false
    }

    return true
  })
})

// --- Position color resolver ----------------------------------------------
// Each position carries an optional hex color (set via the Position settings
// UI). When missing, we hash the position_id into a fallback palette so each
// position still gets a stable, distinct color across sessions.
// Ordered so the four most-used positions (Front Desk / Lifeguard /
// Equipment Attendant / Gym Manager) land on the reference image's
// red · green · blue · purple respectively when position_id % 8 maps
// low integers to the first slots.
const FALLBACK_POSITION_COLORS = [
  '#B71C1C', // red     — Front Desk reference
  '#2E7D32', // green   — Equipment Attendant reference
  '#1565C0', // blue    — Lifeguard reference
  '#6A1B9A', // purple  — Gym Manager reference
  '#EF6C00', // orange
  '#00838F', // teal
  '#AD1457', // pink
  '#4E342E', // brown
]

const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

const getPositionColor = (position) => {
  const raw = position?.color
  if (typeof raw === 'string' && HEX_COLOR_RE.test(raw.trim())) {
    return raw.trim()
  }
  const id = position?.position_id ?? position?.id
  const n = Number(id)
  if (!Number.isFinite(n)) return FALLBACK_POSITION_COLORS[0]
  const idx = ((n % FALLBACK_POSITION_COLORS.length) + FALLBACK_POSITION_COLORS.length)
    % FALLBACK_POSITION_COLORS.length
  return FALLBACK_POSITION_COLORS[idx]
}

// Positions relevant to the current shift list, deduped + sorted, for the
// Key legend above the calendar.
const positionsWithColor = computed(() => {
  const byId = new Map()
  for (const shift of shifts.value) {
    const p = shift?.position
    if (!p) continue
    const id = p.position_id ?? p.id
    if (id == null || byId.has(String(id))) continue
    byId.set(String(id), p)
  }
  return Array.from(byId.values()).sort((a, b) =>
    String(a.position_name || '').localeCompare(String(b.position_name || ''))
  )
})

// --- FullCalendar events ---------------------------------------------------
// Filled shifts render as SOLID per-position color cards with white text —
// this restores the old hand-rolled grid's color-coded look. Open /
// needs-coverage stay on the amber pastel treatment so unfilled shifts
// remain visually distinct from filled ones regardless of position.
const calendarEvents = computed(() => {
  return filteredShifts.value
    .filter((shift) => !!shift.shift_date)
    .map((shift) => {
      const shiftDate = normalizeDateInput(shift.shift_date)
      const start = `${shiftDate}T${normalizeTimeInput(shift.start_time) || '00:00'}:00`
      const end = `${shiftDate}T${normalizeTimeInput(shift.end_time) || '00:00'}:00`
      const title = shift.position?.position_name || 'Shift'
      const state = classifyShiftState(shift)
      const worker = shift.assignedUser
      const assigneeName = worker
        ? `${worker.fName || ''} ${worker.lName || ''}`.trim() || null
        : null
      const assigneePhoto = worker?.avatar_url || worker?.photo_url || null
      const departmentName = shift.department?.department_name || null
      const positionColor = getPositionColor(shift.position)
      const isFilled = state === 'filled'

      // Determine if the assigned worker has acknowledged this shift.
      // A shift is unacknowledged when it has an assignee but no
      // acknowledgement record with acknowledged === true for that user.
      const acks = shift.acknowledgements || []
      const isAcknowledged = !isFilled || acks.some(
        (a) => Number(a.userId) === Number(shift.assigned_user_id) && a.acknowledged === true
      )

      return {
        id: String(shift.shift_id),
        title,
        start,
        end,
        // Solid fill for filled shifts; transparent for open/needs-coverage
        // (state CSS paints the amber pastel body).
        // Unacknowledged filled shifts use a semi-transparent version of the
        // position color so the manager can see the shift is not yet acknowledged.
        backgroundColor: isFilled ? positionColor : 'transparent',
        borderColor: positionColor,
        textColor: isFilled ? '#ffffff' : undefined,
        classNames: [
          'schedule-event',
          `schedule-event--${state}`,
          isFilled && !isAcknowledged ? 'schedule-event--unacknowledged' : null,
          selectedShift.value?.shift_id === shift.shift_id ? 'schedule-event--selected' : null,
        ].filter(Boolean),
        extendedProps: {
          shift,
          state,
          assigneeName,
          assigneePhoto,
          departmentName,
          positionColor,
          isAcknowledged,
        },
      }
    })
})

// --- Event content renderer -----------------------------------------------
// Background / border / text color are driven by the state modifier classes
// on the event (see calendarEvents and the CSS block below). This renderer
// just arranges the inner text stack: time · position title · assignee row,
// plus the open / needs-coverage pill for unfilled shifts.
const renderEventContent = (arg) => {
  const { state, assigneeName, assigneePhoto, departmentName, isAcknowledged } =
    arg.event.extendedProps || {}

  const body = document.createElement('div')
  body.className = 'schedule-event__body'

  // Line 1 — time range (muted).
  const time = document.createElement('div')
  time.className = 'schedule-event__time'
  time.textContent = arg.timeText || ''
  body.appendChild(time)

  // Line 2 — position title (bold, primary).
  const title = document.createElement('div')
  title.className = 'schedule-event__title'
  title.textContent = arg.event.title || ''
  body.appendChild(title)

  // Line 3 — assignee (filled) or department (unfilled).
  if (assigneeName) {
    const assignee = document.createElement('div')
    assignee.className = 'schedule-event__sub schedule-event__assignee'

    const avatar = document.createElement('span')
    avatar.className = 'schedule-event__avatar'
    if (assigneePhoto) {
      const img = document.createElement('img')
      img.src = assigneePhoto
      img.alt = assigneeName
      avatar.appendChild(img)
    } else {
      avatar.textContent = assigneeName.trim().charAt(0).toUpperCase()
    }
    assignee.appendChild(avatar)

    const name = document.createElement('span')
    name.className = 'schedule-event__sub-text'
    name.textContent = assigneeName
    assignee.appendChild(name)

    body.appendChild(assignee)
  } else if (departmentName) {
    const dept = document.createElement('div')
    dept.className = 'schedule-event__sub schedule-event__department'
    const text = document.createElement('span')
    text.className = 'schedule-event__sub-text'
    text.textContent = departmentName
    dept.appendChild(text)
    body.appendChild(dept)
  }

  if (state === 'open') {
    const badge = document.createElement('span')
    badge.className = 'schedule-event__badge schedule-event__badge--open'
    badge.textContent = 'Open'
    body.appendChild(badge)
  } else if (state === 'needs-coverage') {
    const badge = document.createElement('span')
    badge.className = 'schedule-event__badge schedule-event__badge--alert'
    badge.textContent = 'Needs coverage'
    body.appendChild(badge)
  }

  // Show a warning badge when a filled shift hasn't been acknowledged yet.
  if (state === 'filled' && isAcknowledged === false) {
    const badge = document.createElement('span')
    badge.className = 'schedule-event__badge schedule-event__badge--unacknowledged'
    badge.textContent = '⚠ Not acknowledged'
    body.appendChild(badge)
  }

  return { domNodes: [body] }
}

// --- Day cell hooks --------------------------------------------------------
// Today column tint: flag today via a class so scoped CSS can apply
// var(--brand-primary-lt). We also use this to render the empty-day
// + Create shift affordance on hover.
const dayHeaderClassNames = (arg) => {
  const classes = ['schedule-day-header']
  if (arg.isToday) classes.push('schedule-day-header--today')
  return classes
}

const dayCellClassNames = (arg) => {
  const classes = []
  if (arg.isToday) classes.push('schedule-day-cell--today')
  return classes
}

// --- Calendar options ------------------------------------------------------
const calendarOptions = computed(() => {
  // Compute contentHeight so each 30-min slot is exactly 48px tall
  // (= 96px per hour). This guarantees event block heights are always
  // proportional to their real duration regardless of the visible time range.
  // CSS slot-height overrides don't reliably win against FullCalendar's
  // internal layout engine, so driving height through contentHeight +
  // expandRows is the only approach that works consistently.
  const parseMins = (t) => {
    const parts = String(t || '').split(':').map(Number)
    return (parts[0] || 0) * 60 + (parts[1] || 0)
  }
  const totalMins = Math.max(60,
    parseMins(effectiveCalendarHours.value.slotMaxTime) -
    parseMins(effectiveCalendarHours.value.slotMinTime)
  )
  // slotDuration is 30 min → numSlots = totalMins / 30
  const contentHeight = Math.round((totalMins / 30) * 48)

  return {
    plugins: [timeGridPlugin, interactionPlugin, listPlugin],
    initialView: currentView.value,
    initialDate: currentDate.value,
    headerToolbar: false,
    allDaySlot: false,
    firstDay: 0,
    events: calendarEvents.value,
    slotMinTime: effectiveCalendarHours.value.slotMinTime,
    slotMaxTime: effectiveCalendarHours.value.slotMaxTime,
    slotDuration: '00:30:00',
    slotLabelInterval: '01:00:00',
    snapDuration: '00:15:00',
    nowIndicator: true,
    editable: true,
    eventStartEditable: true,
    eventDurationEditable: true,
    selectable: true,
    selectMirror: true,
    eventOverlap: true,
    expandRows: true,
    contentHeight,
    eventClick: onCalendarEventClick,
    select: onCalendarSelect,
    eventDrop: onCalendarEventChange,
    eventResize: onCalendarEventChange,
    datesSet: onCalendarDatesSet,
    eventTimeFormat: { hour: 'numeric', minute: '2-digit', meridiem: 'short' },
    // "Mon 20" — weekday AND date.
    dayHeaderFormat: { weekday: 'short', day: 'numeric' },
    dayHeaderClassNames,
    dayCellClassNames,
    eventContent: renderEventContent,
  }
})

watch(currentView, (view) => {
  const api = getCalendarApi()
  if (api && view) api.changeView(view)
})

// --- Helpers ---------------------------------------------------------------
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
  return { hour: String(hour12).padStart(2, '0'), minute, period }
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

const pickCalendarBoundsFromHours = (hoursRows = []) => {
  const valid = hoursRows.filter((row) => row?.open_time && row?.close_time && row.open_time < row.close_time)
  if (!valid.length) return null
  const mins = valid.map((row) => `${String(row.open_time).slice(0, 5)}:00`).sort()
  const maxs = valid.map((row) => `${String(row.close_time).slice(0, 5)}:00`).sort()
  return { slotMinTime: mins[0], slotMaxTime: maxs[maxs.length - 1] }
}

const getDayOfWeekFromDate = (dateValue) => {
  if (!dateValue) return null
  const date = new Date(`${dateValue}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  return date.getDay()
}

const getDepartmentHoursForDate = (dateValue) => {
  const day = getDayOfWeekFromDate(dateValue)
  if (day == null) return null
  return departmentHoursByDay.value[day] || null
}

const validateShiftWithinDepartmentHours = ({ shift_date, start_time, end_time }) => {
  const dayHours = getDepartmentHoursForDate(shift_date)
  if (!dayHours || !dayHours.open_time || !dayHours.close_time) {
    return { valid: true, message: '' }
  }

  const shiftStart = toMinutes(start_time)
  const shiftEnd = toMinutes(end_time)
  const openMins = toMinutes(dayHours.open_time)
  const closeMins = toMinutes(dayHours.close_time)

  if ([shiftStart, shiftEnd, openMins, closeMins].some((mins) => mins == null)) {
    return {
      valid: false,
      message: 'Unable to validate shift hours. Please confirm start/end times and department hours.',
    }
  }

  if (shiftStart < openMins || shiftEnd > closeMins) {
    const format = (timeValue) => formatTimeDisplay(String(timeValue).slice(0, 5))
    return {
      valid: false,
      message: `Shift must be within department hours (${format(dayHours.open_time)} - ${format(dayHours.close_time)}).`,
    }
  }

  return { valid: true, message: '' }
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

const scrollMinuteListToSelected = (listRef, selectedMinute) => {
  nextTick(() => {
    const container = listRef?.value
    if (!container) return
    const index = parseInt(selectedMinute, 10) || 0
    const itemHeight = 28
    const scrollTop = Math.max(0, index * itemHeight - container.clientHeight / 2 + itemHeight / 2)
    container.scrollTop = scrollTop
  })
}

watch(startTimeMenu, (val) => {
  if (val) scrollMinuteListToSelected(startMinuteListRef, startTimeParts.minute)
})

watch(endTimeMenu, (val) => {
  if (val) scrollMinuteListToSelected(endMinuteListRef, endTimeParts.minute)
})

const formatShiftTime = (startTime, endTime) => {
  const normalize = (timeValue) => {
    if (!timeValue) return ''
    const [h, m] = timeValue.split(':')
    const date = new Date()
    date.setHours(Number(h || 0), Number(m || 0), 0, 0)
    return date.toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' })
  }
  return `${normalize(startTime)} - ${normalize(endTime)}`
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
    post_as_open: String(shift.trade_status || '').toLowerCase() === 'open',
    recurring: !!shift.is_recurring,
    repeat_until: normalizeDateInput(shift.recurrence_end_date),
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

const onEditOpenShiftToggle = () => {
  if (editShift.value.post_as_open) {
    editShift.value.assigned_user_id = null
  }
}

const getCalendarApi = () => fullCalendarRef.value?.getApi?.()

const updateCalendarSize = async () => {
  await nextTick()
  getCalendarApi()?.updateSize()
}

// --- Calendar event handlers ----------------------------------------------
const onCalendarEventClick = async (clickInfo) => {
  const shift = clickInfo?.event?.extendedProps?.shift
  if (shift) await selectShift(shift)
}

const onCalendarDatesSet = (arg) => {
  if (arg?.view?.currentStart) {
    currentDate.value = new Date(arg.view.currentStart)
  }
}

const onCalendarSelect = (selectInfo) => {
  const start = selectInfo.start
  const end = selectInfo.end
  const isoDate = localDateStr(start)
  const startTime = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`
  const endTime = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`
  openCreateDialog(isoDate, startTime, endTime)
  getCalendarApi()?.unselect()
}

// Drag-to-move and drag-to-resize handler
const onCalendarEventChange = async (info) => {
  const shift = info?.event?.extendedProps?.shift
  if (!shift) { info.revert?.(); return }
  const start = info.event.start
  const end = info.event.end
  if (!start || !end) { info.revert?.(); return }

  const isoDate = localDateStr(start)
  const newStartTime = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`
  const newEndTime = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`

  const validation = validateShiftWithinDepartmentHours({
    shift_date: isoDate,
    start_time: newStartTime,
    end_time: newEndTime,
  })
  if (!validation.valid) {
    errorMessage.value = validation.message
    showError.value = true
    info.revert?.()
    return
  }

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
    info.revert?.()
  } finally {
    rescheduling.value = false
  }
}

// --- Create dialog helpers ------------------------------------------------
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
}

const onOpenShiftToggle = () => {
  if (newShift.value.post_as_open) {
    newShift.value.assigned_user_id = null
  }
  nextTick(() => createFormRef.value?.resetValidation())
}

const addNewTask = () => {
  newShift.value.tasks.push({ task_name: '' })
}

const removeNewTask = (index) => {
  newShift.value.tasks.splice(index, 1)
}

// --- Nav controls ----------------------------------------------------------
const previousPeriod = () => {
  const api = getCalendarApi()
  if (api) { api.prev(); return }
  const nextDate = new Date(currentDate.value)
  nextDate.setDate(nextDate.getDate() - 7)
  currentDate.value = nextDate
}

const nextPeriod = () => {
  const api = getCalendarApi()
  if (api) { api.next(); return }
  const nextDate = new Date(currentDate.value)
  nextDate.setDate(nextDate.getDate() + 7)
  currentDate.value = nextDate
}

const goToToday = () => {
  const api = getCalendarApi()
  if (api) { api.today(); return }
  currentDate.value = new Date()
}

// --- Data loading ----------------------------------------------------------
const loadDepartmentCalendarHours = async () => {
  if (!currentDeptId) {
    calendarHours.value = { slotMinTime: '06:00:00', slotMaxTime: '23:00:00' }
    calendarHoursSource.value = 'fallback'
    departmentHoursByDay.value = {}
    return
  }

  try {
    const response = await departmentServices.getDepartmentHours(currentDeptId)
    const rows = response?.data?.data || []
    const bounds = pickCalendarBoundsFromHours(rows)
    if (bounds) {
      calendarHours.value = bounds
      calendarHoursSource.value = 'department'
    } else {
      calendarHours.value = { slotMinTime: '06:00:00', slotMaxTime: '23:00:00' }
      calendarHoursSource.value = 'fallback'
    }
    departmentHoursByDay.value = rows.reduce((acc, row) => {
      const day = Number(row?.day_of_week)
      if (!Number.isNaN(day)) acc[day] = row
      return acc
    }, {})
  } catch {
    calendarHours.value = { slotMinTime: '06:00:00', slotMaxTime: '23:00:00' }
    calendarHoursSource.value = 'fallback'
    departmentHoursByDay.value = {}
  }
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
    await updateCalendarSize()
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
    await apiClient.get('/departments')
  } catch (error) {
    console.error('Error loading departments:', error)
  }
}

const loadPositions = async () => {
  if (!currentDeptId) {
    positions.value = []
    return
  }
  try {
    const response = await apiClient.get(`/positions?department_id=${currentDeptId}`)
    positions.value = response?.data?.data || []
  } catch (error) {
    console.error('Error loading positions:', error)
  }
}

const createShift = async () => {
  const { valid } = await createFormRef.value.validate()
  if (!valid) return

  const validation = validateShiftWithinDepartmentHours(newShift.value)
  if (!validation.valid) {
    errorMessage.value = validation.message
    showError.value = true
    return
  }

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

    const validTasks = newShift.value.tasks.filter((t) => String(t.task_name || '').trim())
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
            }),
          ),
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

  const validation = validateShiftWithinDepartmentHours(editShift.value)
  if (!validation.valid) {
    errorMessage.value = validation.message
    showError.value = true
    return
  }

  try {
    editing.value = true
    const response = await shiftService.updateShift(editShift.value.shift_id, {
      department_id: currentDeptId,
      position_id: editShift.value.position_id,
      shift_date: editShift.value.shift_date,
      start_time: editShift.value.start_time,
      end_time: editShift.value.end_time,
      assigned_user_id: editShift.value.post_as_open ? null : (editShift.value.assigned_user_id || null),
      trade_status: editShift.value.post_as_open ? 'open' : null,
      is_recurring: editShift.value.recurring,
      recurrence_pattern: editShift.value.recurring ? 'weekly' : null,
      recurrence_start_date: editShift.value.recurring ? editShift.value.shift_date : null,
      recurrence_end_date: editShift.value.recurring ? editShift.value.repeat_until : null,
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

onMounted(async () => {
  const scheduleToast = Utils.getStore('managerScheduleToast')
  if (scheduleToast?.message) {
    successMessage.value = scheduleToast.message
    showSuccess.value = true
    Utils.removeItem('managerScheduleToast')
  }

  const currentUser = Utils.getStore('currentUser') || Utils.getStore('user') || {}
  currentUserId.value = currentUser?.id || currentUser?.user_id || null

  await Promise.all([
    loadDepartmentCalendarHours(),
    loadShifts(),
    loadPositions(),
    loadDepartmentWorkers(),
    loadDepartments(),
  ])

  await updateCalendarSize()

  if (String(route.query?.createShift || '') === '1') {
    openCreateDialog()
  }
})
</script>

<style scoped>
/* ---- Page-level wiring ------------------------------------------------- */
.schedule-view-toggle {
  margin-left: var(--space-1);
}

.schedule-nav-group {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin-left: var(--space-2);
}

.schedule-today-btn {
  min-width: 80px;
}

/* ---- Filter bar -------------------------------------------------------- */
.schedule-filters {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.schedule-filter-positions {
  min-width: 240px;
  max-width: 360px;
}

.schedule-filter-switch {
  margin-left: auto;
}

.schedule-selected-note {
  color: var(--text-2);
  flex-basis: 100%;
}

/* ---- Key legend ------------------------------------------------------- */
/* Horizontal row of position colors (+ Unfilled) shown above the calendar
   so managers can decode the per-position color coding at a glance. */
.schedule-legend {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  padding: 10px 14px;
  margin-bottom: var(--space-2);
  background: var(--surface-0);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-md);
}

.schedule-legend__label {
  font-size: var(--type-meta-size);
  font-weight: 600;
  color: var(--text-2);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.schedule-legend__items {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.schedule-legend__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--type-meta-size);
  color: var(--text-1);
}

.schedule-legend__swatch {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
}

/* "Unfilled" swatch mirrors the amber pastel of open/needs-coverage shifts. */
.schedule-legend__swatch--unfilled {
  background: var(--block-off-bg);
  box-shadow: none;
  border: 1px dashed var(--state-break);
}

.schedule-legend__swatch--unacknowledged {
  background: #b0b0b0;
  opacity: 0.55;
  filter: saturate(0.6);
  box-shadow: none;
  border: 1px solid #ffc107;
}

/* ---- Calendar wrap ----------------------------------------------------- */
/* No fixed height — contentHeight in calendarOptions controls the inner
   time-grid height. The outer wrapper just provides the card styling. */
.schedule-calendar-wrap {
  background: var(--surface-0);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-md);
  padding: var(--space-2);
}

.schedule-loading-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  flex: 1;
}

/* ---- FullCalendar theme overrides -------------------------------------- */
.schedule-calendar-wrap :deep(.fc) {
  --fc-border-color: var(--border-1);
  --fc-page-bg-color: var(--surface-0);
  --fc-neutral-bg-color: var(--surface-1);
  --fc-now-indicator-color: var(--brand-primary);
  /* Today-column tint: subtle, surface-level; spec calls for brand-primary-lt. */
  --fc-today-bg-color: var(--brand-primary-lt);
  font-family: var(--font-sans);
  height: 100%;
}

.schedule-calendar-wrap :deep(.fc .fc-col-header-cell-cushion) {
  font-size: var(--type-meta-size);
  font-weight: 600;
  color: var(--text-2);
  padding: 8px 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.schedule-calendar-wrap :deep(.fc .schedule-day-header--today .fc-col-header-cell-cushion) {
  color: var(--brand-primary);
}

.schedule-calendar-wrap :deep(.fc .fc-timegrid-slot-label-cushion),
.schedule-calendar-wrap :deep(.fc .fc-timegrid-axis-cushion) {
  font-family: var(--font-mono);
  font-size: var(--type-meta-size);
  color: var(--text-3);
}

/* Selection mirror / drag-create ghost — brand-primary outline over a tinted
   body, rounded to match real events. The mirror renders the time label
   inside; we bump its size & color so "8:00 AM – 12:00 PM" reads clearly
   before the shift is committed. */
.schedule-calendar-wrap :deep(.fc .fc-highlight) {
  background-color: var(--brand-primary-lt);
  border: 2px solid var(--brand-primary);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-1);
}

.schedule-calendar-wrap :deep(.fc .fc-event-mirror) {
  background-color: var(--brand-primary-lt) !important;
  border: 2px solid var(--brand-primary) !important;
  border-radius: var(--radius-sm) !important;
  box-shadow: var(--shadow-1);
  color: var(--brand-primary-dk);
}

.schedule-calendar-wrap :deep(.fc .fc-event-mirror .fc-event-time),
.schedule-calendar-wrap :deep(.fc .fc-event-mirror .fc-event-title) {
  color: var(--brand-primary-dk);
  font-weight: 600;
  font-size: 11px;
  padding: 2px 6px;
}

/* ---- Event presentation -----------------------------------------------
   Per-position color rule (Manager Schedule only — Dashboard / Student /
   Availability grids still follow the 3-color pastel discipline):
   - Filled shifts   → SOLID per-position color, white text, no left rail
                       (the whole card IS the color). Background is set
                       inline by FullCalendar from event.backgroundColor.
   - Open / needs-coverage → amber pastel body, dark text, dashed amber
                       border, amber left rail, status pill top-right.
   - Selected        → 2px solid maroon outline (outline-offset: -2px). */
.schedule-calendar-wrap :deep(.fc-event.schedule-event) {
  border: none;
  border-radius: 6px;
  padding: 0;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  /* Keep event cards above the today-column tint
     (--fc-today-bg-color paints the column body). */
  position: relative;
  z-index: 1;
  /* Full-width inside the column — no inset. */
  margin: 0;
}

/* Filled: FullCalendar paints the solid position color inline on the outer
   event; we just make sure inner text is white and the card has punch. */
.schedule-calendar-wrap :deep(.fc-event.schedule-event--filled) {
  color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.18);
}

.schedule-calendar-wrap
  :deep(.fc-event.schedule-event--open),
.schedule-calendar-wrap
  :deep(.fc-event.schedule-event--needs-coverage) {
  background: var(--block-off-bg);
  color: var(--text-1);
}

.schedule-calendar-wrap :deep(.fc-event.schedule-event--selected) {
  outline: 2px solid var(--brand-primary);
  outline-offset: -2px;
}

.schedule-calendar-wrap :deep(.schedule-event .fc-event-main) {
  padding: 0;
  color: inherit;
}

.schedule-calendar-wrap :deep(.schedule-event__body) {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 3px;
  /* Left padding leaves room for the 3px accent rail + breathing room; vertical
     padding is generous so the 3-line stack (time · title · assignee) has room
     to breathe like the old hand-rolled blocks. */
  padding: 7px 10px 7px 13px;
  height: 100%;
  min-height: 40px;
  color: inherit;
  border-radius: var(--radius-sm);
}

/* Filled blocks are solid color end-to-end — no left rail, no hairline
   border. Padding drops back to symmetric so text starts flush. */
.schedule-calendar-wrap
  :deep(.schedule-event--filled .schedule-event__body) {
  padding: 8px 10px;
  min-height: 44px;
  border: none;
}

.schedule-calendar-wrap
  :deep(.schedule-event--filled .schedule-event__title) {
  font-size: 13px;
  font-weight: 700;
}

/* Open / needs-coverage keep the pastel body + amber rail + dashed border
   treatment so unfilled shifts stay instantly recognizable. */
.schedule-calendar-wrap
  :deep(.schedule-event--open .schedule-event__body),
.schedule-calendar-wrap
  :deep(.schedule-event--needs-coverage .schedule-event__body) {
  border: 1px dashed var(--state-break);
  background: var(--block-off-bg);
}

.schedule-calendar-wrap
  :deep(.schedule-event--open .schedule-event__body)::before,
.schedule-calendar-wrap
  :deep(.schedule-event--needs-coverage .schedule-event__body)::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  border-radius: var(--radius-sm) 0 0 var(--radius-sm);
  background: var(--state-break);
}

/* Filled-card text — white across the whole stack so it reads against the
   saturated position color. */
.schedule-calendar-wrap
  :deep(.schedule-event--filled .schedule-event__time),
.schedule-calendar-wrap
  :deep(.schedule-event--filled .schedule-event__title),
.schedule-calendar-wrap
  :deep(.schedule-event--filled .schedule-event__sub),
.schedule-calendar-wrap
  :deep(.schedule-event--filled .schedule-event__sub-text) {
  color: #ffffff;
}

/* Avatar bubble on a colored card: translucent white. */
.schedule-calendar-wrap
  :deep(.schedule-event--filled .schedule-event__avatar) {
  background: rgba(255, 255, 255, 0.22);
  color: #ffffff;
}

/* Title is the prominent line — bold, primary-text color. */
.schedule-calendar-wrap :deep(.schedule-event__title) {
  font-size: var(--type-h3-size);
  line-height: 1.25;
  font-weight: 700;
  color: var(--text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  /* Leave room for corner badge so title doesn't collide with it. */
  padding-right: 4px;
}

/* Time sits above the title, monospace + muted. */
.schedule-calendar-wrap :deep(.schedule-event__time) {
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.3;
  color: var(--text-2);
  letter-spacing: 0.01em;
}

/* Sub row — assignee (with avatar) or department name. */
.schedule-calendar-wrap :deep(.schedule-event__sub) {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--type-meta-size);
  line-height: 1.3;
  color: var(--text-2);
  overflow: hidden;
  min-width: 0;
}

.schedule-calendar-wrap :deep(.schedule-event__sub-text) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.schedule-calendar-wrap :deep(.schedule-event__avatar) {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--text-1);
  font-size: 10px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.schedule-calendar-wrap :deep(.schedule-event__avatar img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* On very short blocks (<40min) the third line wraps the card; hide the sub
   row but keep time + title so the event is still readable. */
.schedule-calendar-wrap :deep(.fc-timegrid-event-short .schedule-event__sub) {
  display: none;
}

/* ---- State badges (top-right) ----------------------------------------- */
.schedule-calendar-wrap :deep(.schedule-event__badge) {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.02em;
  padding: 2px 6px;
  border-radius: 999px;
  white-space: nowrap;
}

.schedule-calendar-wrap :deep(.schedule-event__badge--open) {
  color: var(--text-1);
  background: var(--surface-0);
  border: 1px solid var(--border-1);
}

.schedule-calendar-wrap :deep(.schedule-event__badge--alert) {
  color: var(--surface-0);
  background: var(--state-alert);
  border: 1px solid var(--state-alert);
}

.schedule-calendar-wrap :deep(.schedule-event__badge--unacknowledged) {
  color: #7a4f00;
  background: #fff3cd;
  border: 1px solid #ffc107;
}

/* Unacknowledged filled shifts: reduced opacity so managers immediately notice
   they differ from fully-confirmed shifts. Once the worker acknowledges, the
   class is removed and the card returns to full opacity. */
.schedule-calendar-wrap :deep(.fc-event.schedule-event--unacknowledged) {
  opacity: 0.55;
  filter: saturate(0.6);
}

/* ---- Empty-day "+ Create shift" affordance ---------------------------- */
/* Renders on hover over any empty day-cell; delegates to the calendar
   select flow by letting FullCalendar's built-in dateClick fire naturally. */
.schedule-calendar-wrap :deep(.fc .fc-timegrid-col) {
  position: relative;
}

.schedule-calendar-wrap :deep(.fc .fc-timegrid-col-frame)::after {
  content: "+ Create shift";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: var(--type-meta-size);
  font-weight: 500;
  color: var(--text-3);
  background: var(--surface-0);
  border: 1px dashed var(--border-1);
  border-radius: var(--radius-sm);
  padding: 4px 10px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 120ms ease;
}

.schedule-calendar-wrap :deep(.fc .fc-timegrid-col:hover .fc-timegrid-col-frame)::after {
  opacity: 0.85;
}

/* Hide affordance if the column actually has events (non-empty day). */
.schedule-calendar-wrap :deep(.fc .fc-timegrid-col:has(.fc-event) .fc-timegrid-col-frame)::after {
  content: none;
}

/* ---- Dialog support styles (tasks, time picker) ----------------------- */
.time-picker-card {
  border: 1px solid var(--border-1);
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
  background: var(--surface-0);
  font-size: var(--type-meta-size);
  color: var(--text-2);
  padding-bottom: 6px;
}

.time-picker-col-hour {
  overflow-y: auto;
  padding-right: 8px;
  border-right: 1px solid var(--border-1);
}

.time-picker-col-fixed {
  overflow: hidden;
}

.minute-scroll-list {
  max-height: 200px;
  overflow-y: auto;
}

.time-picker-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 8px;
}

.tasks-section {
  border: 1px solid var(--border-1);
  border-radius: var(--radius-md);
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
  color: var(--text-1);
}

.empty-tasks {
  color: var(--text-3);
  font-size: 14px;
}

.task-item-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

@media (max-width: 900px) {
  .schedule-filters {
    flex-direction: column;
    align-items: stretch;
  }

  .schedule-filter-switch {
    margin-left: 0;
  }
}
</style>
