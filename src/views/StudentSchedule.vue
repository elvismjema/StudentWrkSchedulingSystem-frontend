<template>
  <div class="schedule-container">
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

    <!-- Next Shift Card -->
    <v-card class="next-shift-card" elevation="2">
      <div class="shift-header">
        <div class="shift-badges">
          <v-chip size="small" color="success" class="shift-badge">Open</v-chip>
          <v-chip size="small" color="warning" class="shift-badge">Needs Acknowledgement</v-chip>
        </div>
        <v-btn icon="mdi-dots-vertical" variant="text" size="small"></v-btn>
      </div>
      
      <div class="shift-content">
        <h3 class="shift-title">Barista</h3>
        <div class="shift-details">
          <div class="detail-item">
            <v-icon size="16" class="detail-icon">mdi-calendar</v-icon>
            <span>Tomorrow, Feb 11, 2026</span>
          </div>
          <div class="detail-item">
            <v-icon size="16" class="detail-icon">mdi-clock</v-icon>
            <span>8:00 AM - 12:00 PM</span>
          </div>
          <div class="detail-item">
            <v-icon size="16" class="detail-icon">mdi-map-marker</v-icon>
            <span>Campus Coffee Shop</span>
          </div>
        </div>
      </div>
      
      <div class="shift-actions">
        <v-btn
          variant="outlined"
          prepend-icon="mdi-calendar-plus"
          class="action-btn"
        >
          Add to Calendar
        </v-btn>
        <v-btn
          variant="flat"
          color="#8B1538"
          @click="acknowledgeShift"
          class="action-btn"
        >
          Acknowledge
        </v-btn>
      </div>
    </v-card>

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

const acknowledgeShift = () => {
  console.log('Shift acknowledged')
}
</script>

<style scoped>
.schedule-container {
  padding: 24px;
  background-color: #fafafa;
  height: 100vh;
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
  font-size: 28px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.header-controls {
  display: flex;
  gap: 12px;
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

/* Next Shift Card */
.next-shift-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 32px;
  border: 1px solid #e0e0e0;
}

.shift-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.shift-badges {
  display: flex;
  gap: 8px;
}

.shift-badge {
  font-size: 12px;
  font-weight: 500;
}

.shift-content {
  margin-bottom: 20px;
}

.shift-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0 0 12px 0;
}

.shift-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
  font-size: 14px;
}

.detail-icon {
  color: #8B1538;
}

.shift-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  flex: 1;
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
  min-height: 600px;
}

.calendar-grid {
  display: flex;
  min-height: 600px;
}

.time-column {
  width: 80px;
  border-right: 1px solid #e0e0e0;
  background-color: #fafafa;
}

.time-slot {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #666;
  border-bottom: 1px solid #f0f0f0;
}

.days-container {
  flex: 1;
  display: flex;
}

.day-column {
  flex: 1;
  border-right: 1px solid #e0e0e0;
}

.day-column:last-child {
  border-right: none;
}

.day-header {
  height: 80px;
  padding: 16px 8px;
  text-align: center;
  border-bottom: 1px solid #e0e0e0;
  background-color: #fafafa;
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
  height: calc(100% - 80px);
}

.hour-slot {
  height: 40px;
  border-bottom: 1px solid #f0f0f0;
  position: relative;
}

.shift-block {
  position: absolute;
  left: 4px;
  right: 4px;
  top: 0;
  height: 160px; /* 4 hours * 40px per hour */
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
</style>
