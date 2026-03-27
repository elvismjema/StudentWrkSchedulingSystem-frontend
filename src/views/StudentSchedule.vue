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
            @click="toggleClock"
          >
            {{ isClockedIn ? 'Clock Out' : 'Clock In' }}
          </v-btn>
        </div>
      </v-card>
    </div>

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
                  <!-- Mock shift for Tuesday 8AM-12PM -->
                  <div
                    v-if="day.name === 'Tue' && hour === 8"
                    class="shift-block"
                  >
                    <div class="shift-block-title">Barista</div>
                    <div class="shift-block-time">8:00 AM - 12:00 PM</div>
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

const currentDate = ref(new Date())

// --- Clock In/Out ---
const isClockedIn = ref(false)
const clockInTime = ref(null)
const clockNow = ref(new Date())
let clockTimer = null

const activeDurationLabel = computed(() => {
  if (!clockInTime.value) return ''
  const diffMs = clockNow.value.getTime() - clockInTime.value.getTime()
  const totalMinutes = Math.max(0, Math.floor(diffMs / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
})

const toggleClock = () => {
  if (!isClockedIn.value) {
    clockInTime.value = new Date()
    isClockedIn.value = true
  } else {
    isClockedIn.value = false
    clockInTime.value = null
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

onMounted(() => {
  clockTimer = setInterval(() => { clockNow.value = new Date() }, 1000)
})

onBeforeUnmount(() => {
  clearInterval(clockTimer)
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
