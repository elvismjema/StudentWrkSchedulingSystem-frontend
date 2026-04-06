<template>
  <div class="availability-container">
    <h1>My Availability</h1>
    
    <div class="availability-grid">
      <div class="time-slots-header">
        <div class="day-label">Time</div>
        <div class="day-label" v-for="day in days" :key="day.value">{{ day.label }}</div>
      </div>
      
      <div class="time-slots-grid">
        <div 
          v-for="slot in timeSlots" 
          :key="slot.time"
          class="time-row"
        >
          <div class="time-label">{{ slot.label }}</div>
          <div 
            v-for="day in days" 
            :key="`${day.value}-${slot.time}`"
            class="time-slot"
            :class="{
              'selected': isSlotSelected(day.value, slot.time),
              'selecting': isSlotSelecting(day.value, slot.time)
            }"
            @mousedown="startSelection(day.value, slot.time)"
            @mouseenter="continueSelection(day.value, slot.time)"
            @mouseup="endSelection"
            @dragstart.prevent
            @dragover.prevent
            @drop.prevent
          >
            <div class="slot-content"></div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="availability-actions">
      <button @click="saveAvailability" class="save-btn" :disabled="!hasChanges">
        Save Availability
      </button>
      <button @click="clearSelection" class="clear-btn">
        Clear Selection
      </button>
    </div>
    
    <div v-if="successMessage" class="success-message">
      {{ successMessage }}
    </div>
    
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const days = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' }
]

const generateTimeSlots = () => {
  const slots = []
  for (let hour = 0; hour < 24; hour++) {
    const timeStr = hour.toString().padStart(2, '0') + ':00'
    const label = hour === 0 ? '12:00 AM' : 
                  hour < 12 ? `${hour}:00 AM` :
                  hour === 12 ? '12:00 PM' :
                  `${hour - 12}:00 PM`
    slots.push({ time: timeStr, label, hour })
  }
  return slots
}

const timeSlots = ref(generateTimeSlots())
const selectedSlots = ref(new Set())
const currentSelection = ref(new Set())
const isSelecting = ref(false)
const selectionStart = ref(null)
const existingAvailability = ref([])
const successMessage = ref('')
const errorMessage = ref('')

const isSlotSelected = (day, time) => {
  return selectedSlots.value.has(`${day}-${time}`)
}

const isSlotSelecting = (day, time) => {
  return currentSelection.value.has(`${day}-${time}`)
}

const startSelection = (day, time) => {
  isSelecting.value = true
  selectionStart.value = { day, time }
  currentSelection.value.clear()
  currentSelection.value.add(`${day}-${time}`)
  
  document.addEventListener('mouseup', endSelection)
}

const continueSelection = (day, time) => {
  if (!isSelecting.value || !selectionStart.value) return
  
  const startDay = selectionStart.value.day
  const startTime = selectionStart.value.time
  
  currentSelection.value.clear()
  
  const minDay = Math.min(startDay, day)
  const maxDay = Math.max(startDay, day)
  
  const startHour = parseInt(startTime.split(':')[0])
  const endHour = parseInt(time.split(':')[0])
  const minHour = Math.min(startHour, endHour)
  const maxHour = Math.max(startHour, endHour)
  
  for (let d = minDay; d <= maxDay; d++) {
    for (let h = minHour; h <= maxHour; h++) {
      const timeStr = h.toString().padStart(2, '0') + ':00'
      currentSelection.value.add(`${d}-${timeStr}`)
    }
  }
}

const endSelection = () => {
  if (isSelecting.value) {
    currentSelection.value.forEach(slot => {
      if (selectedSlots.value.has(slot)) {
        selectedSlots.value.delete(slot)
      } else {
        selectedSlots.value.add(slot)
      }
    })
    currentSelection.value.clear()
  }
  
  isSelecting.value = false
  selectionStart.value = null
  document.removeEventListener('mouseup', endSelection)
}

const clearSelection = () => {
  selectedSlots.value.clear()
  currentSelection.value.clear()
  successMessage.value = ''
  errorMessage.value = ''
}

const hasChanges = computed(() => {
  const existingSlots = new Set()
  existingAvailability.value.forEach(avail => {
    const startHour = parseInt(avail.startTime.split(':')[0])
    const endHour = parseInt(avail.endTime.split(':')[0])
    
    for (let h = startHour; h < endHour; h++) {
      const timeStr = h.toString().padStart(2, '0') + ':00'
      existingSlots.add(`${avail.dayOfWeek}-${timeStr}`)
    }
  })
  
  if (selectedSlots.value.size !== existingSlots.size) return true
  
  for (const slot of selectedSlots.value) {
    if (!existingSlots.has(slot)) return true
  }
  
  return false
})

const saveAvailability = async () => {
  try {
    successMessage.value = ''
    errorMessage.value = ''
    
    const availabilityByDay = {}
    
    selectedSlots.value.forEach(slot => {
      const [day, time] = slot.split('-')
      if (!availabilityByDay[day]) {
        availabilityByDay[day] = { startHour: 24, endHour: 0 }
      }
      
      const hour = parseInt(time.split(':')[0])
      availabilityByDay[day].startHour = Math.min(availabilityByDay[day].startHour, hour)
      availabilityByDay[day].endHour = Math.max(availabilityByDay[day].endHour, hour + 1)
    })
    
    const userId = getCurrentUserId()
    
    for (const [day, timeRange] of Object.entries(availabilityByDay)) {
      const availability = {
        userId: userId,
        dayOfWeek: parseInt(day),
        startTime: `${timeRange.startHour.toString().padStart(2, '0')}:00`,
        endTime: `${timeRange.endHour.toString().padStart(2, '0')}:00`,
        availabilityType: 'available',
        isRecurring: true
      }
      
      await axios.post('/api/availability', availability)
    }
    
    await loadExistingAvailability()
    successMessage.value = 'Availability saved successfully!'
    
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
    
  } catch (error) {
    console.error('Error saving availability:', error)
    errorMessage.value = 'Error saving availability. Please try again.'
    
    setTimeout(() => {
      errorMessage.value = ''
    }, 5000)
  }
}

const getCurrentUserId = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  return user.id || 1
}

const loadExistingAvailability = async () => {
  try {
    const userId = getCurrentUserId()
    const response = await axios.get(`/api/availability/user/${userId}`)
    existingAvailability.value = response.data
    
    selectedSlots.value.clear()
    existingAvailability.value.forEach(avail => {
      const startHour = parseInt(avail.startTime.split(':')[0])
      const endHour = parseInt(avail.endTime.split(':')[0])
      
      for (let h = startHour; h < endHour; h++) {
        const timeStr = h.toString().padStart(2, '0') + ':00'
        selectedSlots.value.add(`${avail.dayOfWeek}-${timeStr}`)
      }
    })
    
  } catch (error) {
    console.error('Error loading availability:', error)
  }
}

onMounted(() => {
  loadExistingAvailability()
})
</script>

<style scoped>
.availability-container {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  color: #333;
  margin-bottom: 24px;
  text-align: center;
}

.availability-grid {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: auto;
  margin-bottom: 24px;
}

.time-slots-header {
  display: grid;
  grid-template-columns: 80px repeat(7, 1fr);
  background: #f8f9fa;
  border-bottom: 2px solid #dee2e6;
  position: sticky;
  top: 0;
  z-index: 10;
}

.day-label {
  padding: 12px 8px;
  text-align: center;
  font-weight: 600;
  color: #495057;
  border-right: 1px solid #dee2e6;
  font-size: 14px;
}

.day-label:first-child {
  background: #e9ecef;
  font-weight: 700;
}

.time-slots-grid {
  max-height: 600px;
  overflow-y: auto;
}

.time-row {
  display: grid;
  grid-template-columns: 80px repeat(7, 1fr);
  border-bottom: 1px solid #f1f3f4;
}

.time-row:hover {
  background: #f8f9fa;
}

.time-label {
  padding: 8px;
  text-align: center;
  font-size: 12px;
  color: #6c757d;
  border-right: 1px solid #dee2e6;
  background: #f8f9fa;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
}

.time-slot {
  border-right: 1px solid #e9ecef;
  border-bottom: 1px solid #e9ecef;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  min-height: 40px;
  position: relative;
}

.time-slot:hover {
  background: #e3f2fd;
}

.time-slot.selected {
  background: #2196f3;
}

.time-slot.selected:hover {
  background: #1976d2;
}

.time-slot.selecting {
  background: #64b5f6;
  opacity: 0.7;
}

.slot-content {
  width: 100%;
  height: 100%;
  min-height: 40px;
}

.availability-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 24px;
}

.save-btn, .clear-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.save-btn {
  background: #28a745;
  color: white;
}

.save-btn:hover:not(:disabled) {
  background: #218838;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);
}

.save-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
}

.clear-btn {
  background: #dc3545;
  color: white;
}

.clear-btn:hover {
  background: #c82333;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(220, 53, 69, 0.3);
}

.success-message, .error-message {
  padding: 12px 16px;
  border-radius: 6px;
  text-align: center;
  font-weight: 500;
  margin-bottom: 16px;
  animation: slideIn 0.3s ease;
}

.success-message {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
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

@media (max-width: 768px) {
  .availability-container {
    padding: 16px;
  }
  
  .time-slots-header {
    grid-template-columns: 60px repeat(7, 1fr);
  }
  
  .time-row {
    grid-template-columns: 60px repeat(7, 1fr);
  }
  
  .day-label, .time-label {
    font-size: 11px;
    padding: 6px 4px;
  }
  
  .time-slot {
    min-height: 30px;
  }
  
  .slot-content {
    min-height: 30px;
  }
}
</style>
