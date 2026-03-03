<template>
  <div class="schedule-container">
    <div class="greeting-banner">
      <h2 class="greeting-title">Hi There</h2>
      <p class="greeting-date">{{ currentGreetingDate }}</p>
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
          @click="previousMonth"
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
          @click="nextMonth"
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
                    <div class="shift-block-time">8 AM - 12 PM</div>
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
import { ref, computed } from 'vue'

const currentDate = ref(new Date())

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

const timeSlots = Array.from({ length: 15 }, (_, i) => i + 6) // 6 AM to 8 PM

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
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${displayHour} ${period}`
}

const previousMonth = () => {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1)
}

const nextMonth = () => {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1)
}

const goToToday = () => {
  currentDate.value = new Date()
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
  grid-template-rows: repeat(15, var(--calendar-hour-height));
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
