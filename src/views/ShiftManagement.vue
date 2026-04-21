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
        <v-btn color="primary" variant="elevated" @click="router.push('/manager/create-shift')" prepend-icon="mdi-plus">
          Add to Schedule
        </v-btn>
      </div>
    </div>

    <div class="calendar-scroll-container" v-if="!shiftsLoading">
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
                <div class="day-date" :class="{ today: day.isToday }">{{ day.monthDay }}</div>
              </div>

              <div class="hour-slots">
                <div v-for="hour in timeSlots" :key="`${day.isoDate}-${hour}`" class="hour-slot">
                  <div
                    v-for="(shift, idx) in getShiftsForCell(day.isoDate, hour)"
                    :key="shift.shift_id"
                    class="shift-block"
                    :class="{ selected: selectedShift?.shift_id === shift.shift_id }"
                    :style="getShiftBlockStyle(shift, idx)"
                    @click="selectShift(shift)"
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

    <!-- Create/Edit Shift Dialog -->
    <v-dialog v-model="showCreateDialog" max-width="640px">
      <v-card>
        <v-card-title>
          <v-icon class="mr-2">mdi-plus</v-icon>
          Create New Shift
        </v-card-title>

        <!-- Department context banner -->
        <v-alert
          v-if="currentDeptName"
          type="info"
          variant="tonal"
          density="compact"
          class="mx-4 mt-2"
          icon="mdi-office-building"
        >
          Creating shift for: <span class="font-weight-bold">{{ currentDeptName }}</span>
        </v-alert>
        
        <v-divider></v-divider>

        <v-card-text>
          <v-form ref="createFormRef" v-model="createFormValid">
            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="newShift.position_id"
                  :items="positions"
                  item-title="position_name"
                  item-value="position_id"
                  label="Position"
                  variant="outlined"
                  :rules="[v => !!v || 'Position is required']"
                ></v-select>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="newShift.shift_date"
                  type="date"
                  label="Date"
                  variant="outlined"
                  :rules="[v => !!v || 'Date is required']"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="newShift.start_time"
                  type="time"
                  label="Start Time"
                  variant="outlined"
                  :rules="[v => !!v || 'Start time is required']"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="newShift.end_time"
                  type="time"
                  label="End Time"
                  variant="outlined"
                  :rules="[v => !!v || 'End time is required']"
                ></v-text-field>
              </v-col>
              <!-- Optional: Assign Worker -->
              <v-col cols="12">
                <v-select
                  v-model="newShift.assigned_user_id"
                  :items="departmentWorkers"
                  :item-title="w => `${w.fName} ${w.lName}`"
                  item-value="userId"
                  label="Assign Worker (optional)"
                  variant="outlined"
                  clearable
                  hide-details
                  prepend-inner-icon="mdi-account-outline"
                ></v-select>
              </v-col>
              <!-- Optional: Tasks -->
              <v-col cols="12">
                <v-combobox
                  v-model="newShift.tasks"
                  label="Add Tasks (optional)"
                  variant="outlined"
                  multiple
                  chips
                  closable-chips
                  hide-details
                  prepend-inner-icon="mdi-format-list-checks"
                  hint="Type a task name and press Enter to add"
                  persistent-hint
                ></v-combobox>
              </v-col>
              <v-col cols="12">
                <v-checkbox v-model="newShift.is_published" label="Publish immediately" hide-details></v-checkbox>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showCreateDialog = false" variant="text">Cancel</v-btn>
          <v-btn
            @click="createShift"
            color="primary"
            variant="elevated"
            :loading="creating"
            :disabled="!createFormValid"
          >
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import ShiftAssignmentForm from '../components/ShiftAssignmentForm.vue'
import shiftService from '../services/shiftService.js'
import apiClient from '../services/services.js'
import Utils from '../config/utils.js'

const router = useRouter()

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

const createFormRef = ref(null)
const createFormValid = ref(false)
const newShift = ref({
  department_id: currentDeptId,
  position_id: null,
  shift_date: '',
  start_time: '',
  end_time: '',
  assigned_user_id: null,
  tasks: [],
  is_published: false
})

const selectedShift = ref(null)

const shiftsLoading = ref(false)
const creating = ref(false)

const showSuccess = ref(false)
const showError = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

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
      monthDay: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
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

const selectShift = (shift) => {
  selectedShift.value = shift
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
    const response = await apiClient.get(`/user-departments?departmentId=${currentDeptId}&status=approved`)
    const assignments = response?.data?.data || response?.data || []
    departmentWorkers.value = assignments
      .map(a => a.user || a)
      .filter(u => u && u.userId)
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
      assigned_user_id: newShift.value.assigned_user_id || null,
      is_published: newShift.value.is_published
    }
    
    const response = await shiftService.createShift(shiftPayload)
    const createdShift = response.data

    // Create tasks if any were specified
    if (newShift.value.tasks && newShift.value.tasks.length > 0) {
      const shiftId = createdShift?.shift_id || createdShift?.data?.shift_id
      if (shiftId) {
        await Promise.all(
          newShift.value.tasks.map(taskName =>
            apiClient.post('/shift-tasks', { shiftId, taskName })
          )
        )
      }
    }
    
    successMessage.value = 'Shift created successfully!'
    showSuccess.value = true

    newShift.value = {
      department_id: currentDeptId,
      position_id: null,
      shift_date: '',
      start_time: '',
      end_time: '',
      assigned_user_id: null,
      tasks: [],
      is_published: false
    }
    showCreateDialog.value = false

    loadShifts()
  } catch (error) {
    console.error('Error creating shift:', error)
    errorMessage.value = 'Failed to create shift'
    showError.value = true
  } finally {
    creating.value = false
  }
}

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
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-top: 4px;
}

.day-date.today {
  color: #8B1538;
  background-color: #f8e6ea;
  padding: 2px 8px;
  border-radius: 12px;
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
  cursor: pointer;
  border: 2px solid transparent;
}

.shift-block.selected {
  border-color: #00c853;
  box-shadow: 0 0 0 2px rgba(0, 200, 83, 0.25);
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
