<template>
  <div class="schedule-container">
    <div class="greeting-banner">
      <div>
        <h2 class="greeting-title">Hi There</h2>
        <p class="greeting-date">{{ currentGreetingDate }}</p>
      </div>

      <!-- Clock In/Out Widget -->
      <v-card class="clock-widget" elevation="0" rounded="lg">
        <div class="clock-widget-inner">
          <div class="clock-widget-info">
            <div class="clock-widget-label">Today's Status</div>
            <div v-if="isClockedIn" class="clock-widget-time">
              <v-icon size="14" color="success" class="mr-1">mdi-circle</v-icon>
              Clocked in · {{ activeDurationLabel }}
            </div>
            <div v-else class="clock-widget-time text-medium-emphasis">Not clocked in</div>
          </div>
          <v-btn
            :color="isClockedIn ? 'error' : 'success'"
            variant="flat"
            rounded="lg"
            size="small"
            :prepend-icon="isClockedIn ? 'mdi-clock-out' : 'mdi-clock-in'"
            :loading="loading"
            :disabled="!nextShift && !isClockedIn"
            @click="toggleClock"
          >
            {{ isClockedIn ? 'Clock Out' : 'Clock In' }}
          </v-btn>
        </div>
      </v-card>
    </div>

    <!-- Next Shift Card -->
    <v-card v-if="nextShift" class="next-shift-card" elevation="0" rounded="lg">
      <v-card-text>
        <div class="d-flex justify-space-between align-center mb-2">
          <h3 class="text-h6">Next Shift</h3>
          <v-chip size="small" color="primary">Upcoming</v-chip>
        </div>
        <div class="shift-details">
          <div class="d-flex align-center mb-1">
            <v-icon size="18" class="mr-2">mdi-briefcase</v-icon>
            <span class="font-weight-medium">{{ nextShift.Position?.name || 'Position' }}</span>
          </div>
          <div class="d-flex align-center mb-1">
            <v-icon size="18" class="mr-2">mdi-clock-outline</v-icon>
            <span>{{ formatShiftTime(nextShift) }}</span>
          </div>
          <div v-if="nextShift.Department" class="d-flex align-center">
            <v-icon size="18" class="mr-2">mdi-map-marker</v-icon>
            <span>{{ nextShift.Department.name }}</span>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Pending Acknowledgements -->
    <v-card v-if="pendingAcknowledgements.length > 0" class="acknowledgements-card" elevation="0" rounded="lg">
      <v-card-text>
        <h3 class="text-h6 mb-3">Shifts Requiring Acknowledgement</h3>
        <div v-for="ack in pendingAcknowledgements" :key="ack.id" class="acknowledgement-item">
          <div class="d-flex justify-space-between align-center">
            <div>
              <div class="font-weight-medium">{{ ack.Shift?.Position?.name }}</div>
              <div class="text-caption">{{ formatShiftTime(ack.Shift) }}</div>
            </div>
            <v-btn
              color="primary"
              size="small"
              @click="acknowledgeShift(ack.shift_id)"
            >
              Acknowledge
            </v-btn>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Tasks Section -->
    <v-card v-if="userTasks.length > 0" class="tasks-card" elevation="0" rounded="lg">
      <v-card-text>
        <h3 class="text-h6 mb-3">My Tasks</h3>
        <v-list dense>
          <v-list-item v-for="task in userTasks" :key="task.id">
            <template v-slot:prepend>
              <v-checkbox
                :model-value="task.is_completed"
                hide-details
                density="compact"
              ></v-checkbox>
            </template>
            <v-list-item-title>{{ task.title }}</v-list-item-title>
            <v-list-item-subtitle>{{ task.description }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <!-- Header with Month/Year Navigation -->
    <div class="calendar-header">
      <div class="header-left">
        <h1 class="month-year">{{ currentMonthYear }}</h1>
      </div>
      <div class="header-controls">
        <v-btn
          variant="outlined"
          prepend-icon="mdi-chevron-left"
          @click="previousWeek"
          class="nav-btn"
        >
          Previous
        </v-btn>
        <v-btn
          variant="flat"
          color="#8B1538"
          @click="goToToday"
          class="today-btn"
        >
          Today
        </v-btn>
        <v-btn
          variant="outlined"
          append-icon="mdi-chevron-right"
          @click="nextWeek"
          class="nav-btn"
        >
          Next
        </v-btn>
      </div>
    </div>

    <!-- Calendar Grid -->
    <div class="calendar-scroll-container">
      <div class="calendar-container">
        <div class="calendar-grid">
          <!-- Time labels on left -->
          <div class="time-column">
            <div v-for="hour in timeSlots" :key="hour" class="time-slot">
              {{ formatTime(hour) }}
            </div>
          </div>
          
          <!-- Day columns -->
          <div class="days-container">
            <div v-for="day in weekDays" :key="day.date" class="day-column">
              <div class="day-header">
                <div class="day-name">{{ day.name }}</div>
                <div class="day-date" :class="{ 'today': day.isToday }">
                  {{ day.date }}
                </div>
              </div>
              
              <!-- Hour slots for this day -->
              <div class="hour-slots">
                <div v-for="hour in timeSlots" :key="`${day.date}-${hour}`" class="hour-slot">
                  <!-- Display user shifts -->
                  <div
                    v-for="shift in getShiftsForDayHour(day, hour)"
                    :key="shift.id"
                    class="shift-block"
                    :style="getShiftStyle(shift)"
                  >
                    <div class="shift-block-title">{{ shift.Position?.name || 'Shift' }}</div>
                    <div class="shift-block-time">{{ formatShiftTime(shift) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount, onMounted } from 'vue'
import shiftService from '../services/shiftService'
import clockRecordService from '../services/clockRecordService'
import shiftTaskService from '../services/shiftTaskService'
import shiftAcknowledgementService from '../services/shiftAcknowledgementService'
import Utils from '../config/utils'

const currentDate = ref(new Date())
const user = ref(Utils.getStore('user') || {})

// --- Clock In/Out ---
const isClockedIn = ref(false)
const clockInTime = ref(null)
const clockNow = ref(new Date())
const currentClockRecord = ref(null)
const nextShift = ref(null)
const userShifts = ref([])
const userTasks = ref([])
const pendingAcknowledgements = ref([])
const loading = ref(false)
let clockTimer = null

const activeDurationLabel = computed(() => {
  if (!clockInTime.value) return ''
  const diffMs = clockNow.value.getTime() - clockInTime.value.getTime()
  const totalMinutes = Math.max(0, Math.floor(diffMs / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
})

const toggleClock = async () => {
  loading.value = true
  try {
    if (!isClockedIn.value) {
      // Clock In
      const payload = {
        shift_id: nextShift.value?.id,
        department_id: nextShift.value?.department_id
      }
      const response = await clockRecordService.clockIn(payload)
      currentClockRecord.value = response.data
      clockInTime.value = new Date(response.data.clock_in_time)
      isClockedIn.value = true
    } else {
      // Clock Out
      if (currentClockRecord.value?.id) {
        await clockRecordService.clockOut(currentClockRecord.value.id)
        isClockedIn.value = false
        clockInTime.value = null
        currentClockRecord.value = null
      }
    }
  } catch (error) {
    console.error('Clock operation failed:', error)
  } finally {
    loading.value = false
  }
}

const currentMonthYear = computed(() => {
  return currentDate.value.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  })
})

const currentGreetingDate = computed(() => {
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date())

  return `It's ${formattedDate}`
})

const timeSlots = Array.from({ length: 19 }, (_, i) => i + 6) // 6 AM to 12 AM

const weekDays = computed(() => {
  const days = []
  const startOfWeek = new Date(currentDate.value)
  const day = startOfWeek.getDay()
  const diff = startOfWeek.getDate() - day
  startOfWeek.setDate(diff)

  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek)
    date.setDate(startOfWeek.getDate() + i)
    
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()
    
    days.push({
      name: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
      date: date.getDate(),
      isToday
    })
  }
  
  return days
})

const formatTime = (hour) => {
  const normalizedHour = hour === 24 ? 0 : hour
  const period = normalizedHour >= 12 ? 'PM' : 'AM'
  const displayHour = normalizedHour > 12 ? normalizedHour - 12 : normalizedHour === 0 ? 12 : normalizedHour
  return `${displayHour}:00 ${period}`
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

// Fetch user's shifts
const fetchUserShifts = async () => {
  try {
    const today = new Date()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay())
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    const response = await shiftService.listShifts({
      assigned_user_id: user.value.id
    })

    userShifts.value = response.data || []
    
    // Find next shift
    const now = new Date()
    const upcomingShifts = userShifts.value
      .filter(shift => new Date(shift.start_time) > now)
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    
    nextShift.value = upcomingShifts[0] || null
  } catch (error) {
    console.error('Failed to fetch shifts:', error)
  }
}

// Fetch current clock status
const fetchClockStatus = async () => {
  try {
    const response = await clockRecordService.getMyOpenRecord()
    if (response.data) {
      currentClockRecord.value = response.data
      clockInTime.value = new Date(response.data.clock_in_time)
      isClockedIn.value = true
    }
  } catch (error) {
    // No open clock record
    isClockedIn.value = false
  }
}

// Fetch user tasks
const fetchUserTasks = async () => {
  try {
    const response = await shiftTaskService.getUserTasks(user.value.id)
    userTasks.value = response.data?.filter(task => !task.is_completed) || []
  } catch (error) {
    console.error('Failed to fetch tasks:', error)
  }
}

// Fetch pending shift acknowledgements
const fetchPendingAcknowledgements = async () => {
  try {
    const response = await shiftAcknowledgementService.getPendingAcknowledgements()
    pendingAcknowledgements.value = response.data || []
  } catch (error) {
    console.error('Failed to fetch acknowledgements:', error)
  }
}

// Acknowledge shift
const acknowledgeShift = async (shiftId) => {
  try {
    await shiftAcknowledgementService.acknowledgeShift(shiftId)
    pendingAcknowledgements.value = pendingAcknowledgements.value.filter(
      ack => ack.shift_id !== shiftId
    )
  } catch (error) {
    console.error('Failed to acknowledge shift:', error)
  }
}

// Format shift time
const formatShiftTime = (shift) => {
  if (!shift) return ''
  const start = new Date(shift.start_time)
  const end = new Date(shift.end_time)
  const options = { hour: 'numeric', minute: '2-digit' }
  return `${start.toLocaleTimeString('en-US', options)} - ${end.toLocaleTimeString('en-US', options)}`
}

onMounted(async () => {
  clockTimer = setInterval(() => { clockNow.value = new Date() }, 1000)
  
  // Fetch all data
  await Promise.all([
    fetchUserShifts(),
    fetchClockStatus(),
    fetchUserTasks(),
    fetchPendingAcknowledgements()
  ])
})

onBeforeUnmount(() => {
  clearInterval(clockTimer)
})

// Get shifts for a specific day and hour
const getShiftsForDayHour = (day, hour) => {
  return userShifts.value.filter(shift => {
    const shiftStart = new Date(shift.start_time)
    const shiftDate = shiftStart.getDate()
    const shiftHour = shiftStart.getHours()
    
    // Check if shift starts on this day and hour
    const currentWeekDay = new Date(currentDate.value)
    currentWeekDay.setDate(currentWeekDay.getDate() - currentWeekDay.getDay() + ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(day.name))
    
    return shiftDate === currentWeekDay.getDate() && 
           shiftStart.getMonth() === currentWeekDay.getMonth() &&
           shiftStart.getFullYear() === currentWeekDay.getFullYear() &&
           shiftHour === hour
  })
}

// Calculate shift block height
const getShiftStyle = (shift) => {
  const start = new Date(shift.start_time)
  const end = new Date(shift.end_time)
  const durationHours = (end - start) / (1000 * 60 * 60)
  const height = Math.ceil(durationHours) * 60 // 60px per hour
  
  return {
    height: `${height}px`
  }
}

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

/* Calendar Header */
.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.month-year {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.header-controls {
  display: flex;
  gap: 10px;
  align-items: center;
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
  flex-wrap: wrap;
}

.clock-widget {
  border: 1px solid #e3e5e8;
  background: white;
  min-width: 220px;
}

.clock-widget-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
}

.clock-widget-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #8B1538;
  margin-bottom: 2px;
}

.clock-widget-time {
  font-size: 13px;
  color: #555;
  display: flex;
  align-items: center;
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

/* Additional Cards */
.next-shift-card,
.acknowledgements-card,
.tasks-card {
  margin-top: 16px;
  border: 1px solid #e3e5e8;
}

.shift-details {
  font-size: 14px;
  color: #555;
}

.acknowledgement-item {
  padding: 12px 0;
  border-bottom: 1px solid #e0e0e0;
}

.acknowledgement-item:last-child {
  border-bottom: none;
}

/* Calendar Scroll Container */
.calendar-scroll-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0; /* Important for flexbox scrolling */
}

/* Calendar Grid */
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
  content: "";
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
}

.shift-block {
  position: absolute;
  left: 4px;
  right: 4px;
  top: 0;
  height: calc(var(--calendar-hour-height) * 4);
  background-color: #8B1538;
  color: white;
  border-radius: 6px;
  padding: 8px;
  font-size: 12px;
  overflow: hidden;
}

.shift-block-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.shift-block-time {
  opacity: 0.9;
  font-size: 11px;
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
