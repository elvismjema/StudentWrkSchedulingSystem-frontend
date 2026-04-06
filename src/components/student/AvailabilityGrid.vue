<template>
  <div class="availability-grid" role="grid" aria-label="Weekly availability grid">
    <div class="d-flex align-center justify-space-between mb-3">
      <h3 class="text-subtitle-1 font-weight-bold">Weekly Availability</h3>
      <div class="d-flex gap-2">
        <v-btn
          size="small"
          :variant="paintMode === 'available' ? 'flat' : 'outlined'"
          :color="paintMode === 'available' ? 'success' : undefined"
          @click="paintMode = 'available'"
          aria-label="Set paint mode to available"
        >
          <v-icon start size="16">mdi-check-circle</v-icon>
          Available
        </v-btn>
        <v-btn
          size="small"
          :variant="paintMode === 'unavailable' ? 'flat' : 'outlined'"
          :color="paintMode === 'unavailable' ? 'error' : undefined"
          @click="paintMode = 'unavailable'"
          aria-label="Set paint mode to unavailable"
        >
          <v-icon start size="16">mdi-close-circle</v-icon>
          Unavailable
        </v-btn>
      </div>
    </div>

    <div class="grid-wrapper">
      <table class="grid-table" role="grid">
        <thead>
          <tr role="row">
            <th class="grid-table__corner" role="columnheader" scope="col">Time</th>
            <th
              v-for="day in DAYS"
              :key="day"
              class="grid-table__day-header"
              role="columnheader"
              scope="col"
            >
              {{ day }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="hour in HOURS" :key="hour" role="row">
            <td class="grid-table__time-label" role="rowheader">{{ formatHour(hour) }}</td>
            <td
              v-for="(day, dayIdx) in DAYS"
              :key="day + hour"
              class="grid-table__cell"
              :class="{
                'grid-table__cell--available': isAvailable(dayIdx, hour),
                'grid-table__cell--unavailable': !isAvailable(dayIdx, hour),
              }"
              role="gridcell"
              tabindex="0"
              :aria-label="day + ' ' + formatHour(hour) + ', ' + (isAvailable(dayIdx, hour) ? 'available' : 'unavailable')"
              @click="toggleCell(dayIdx, hour)"
              @keydown.enter.prevent="toggleCell(dayIdx, hour)"
              @keydown.space.prevent="toggleCell(dayIdx, hour)"
              @mousedown="startDrag(dayIdx, hour)"
              @mouseenter="onDrag(dayIdx, hour)"
              @mouseup="endDrag"
            />
          </tr>
        </tbody>
      </table>
    </div>

    <div class="d-flex align-center mt-3 gap-3">
      <div class="d-flex align-center gap-1">
        <span class="legend-dot legend-dot--available" aria-hidden="true" />
        <span class="text-caption">Available</span>
      </div>
      <div class="d-flex align-center gap-1">
        <span class="legend-dot legend-dot--unavailable" aria-hidden="true" />
        <span class="text-caption">Unavailable</span>
      </div>
      <v-spacer />
      <v-btn
        size="small"
        variant="text"
        @click="clearAll"
        aria-label="Clear all availability"
      >
        Clear All
      </v-btn>
      <v-btn
        size="small"
        color="primary"
        variant="flat"
        :loading="saving"
        @click="save"
        aria-label="Save availability"
      >
        Save
      </v-btn>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import studentService from '../../services/studentService.js';

const emit = defineEmits(['saved']);

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM

const paintMode = ref('available');
const saving = ref(false);
const dragging = ref(false);

// grid[dayIndex][hour] = true (available) | false (unavailable)
const grid = reactive({});

const initGrid = () => {
  for (let d = 0; d < 7; d++) {
    if (!grid[d]) grid[d] = {};
    for (const h of HOURS) {
      if (grid[d][h] === undefined) grid[d][h] = false;
    }
  }
};

const isAvailable = (dayIdx, hour) => !!grid[dayIdx]?.[hour];

const toggleCell = (dayIdx, hour) => {
  if (!grid[dayIdx]) grid[dayIdx] = {};
  grid[dayIdx][hour] = paintMode.value === 'available';
};

const startDrag = (dayIdx, hour) => {
  dragging.value = true;
  toggleCell(dayIdx, hour);
};

const onDrag = (dayIdx, hour) => {
  if (dragging.value) toggleCell(dayIdx, hour);
};

const endDrag = () => {
  dragging.value = false;
};

const clearAll = () => {
  for (let d = 0; d < 7; d++) {
    for (const h of HOURS) {
      grid[d][h] = false;
    }
  }
};

const parseHour = (t) => parseInt(t.split(':')[0]);

const formatHour = (h) => {
  if (h === 0) return '12 AM';
  if (h < 12) return h + ' AM';
  if (h === 12) return '12 PM';
  return (h - 12) + ' PM';
};

const save = async () => {
  saving.value = true;
  try {
    // Convert grid to array of { dayOfWeek, startHour, endHour }
    const slots = [];
    for (let d = 0; d < 7; d++) {
      let blockStart = null;
      for (const h of [...HOURS, HOURS[HOURS.length - 1] + 1]) {
        if (grid[d]?.[h]) {
          if (blockStart === null) blockStart = h;
        } else {
          if (blockStart !== null) {
            slots.push({ dayOfWeek: d, startHour: blockStart, endHour: h });
            blockStart = null;
          }
        }
      }
    }
    await studentService.updateAvailability({ slots });
    emit('saved');
  } catch {
    // error handled by caller via snackbar
  } finally {
    saving.value = false;
  }
};

const loadAvailability = async () => {
  try {
    const res = await studentService.getAvailability();
    const data = res?.data?.data || res?.data || [];
    initGrid();
    // Expect array of { dayOfWeek, startHour/startTime, endHour/endTime } or similar
    for (const slot of data) {
      const d = slot.dayOfWeek ?? slot.day_of_week;
      const start = slot.startTime ? parseHour(slot.startTime) : (slot.startHour ?? slot.start_hour ?? 0);
      const end = slot.endTime ? parseHour(slot.endTime) : (slot.endHour ?? slot.end_hour ?? 0);
      if (d !== undefined) {
        for (let h = start; h < end; h++) {
          if (grid[d]) grid[d][h] = true;
        }
      }
    }
  } catch {
    initGrid();
  }
};

onMounted(() => {
  initGrid();
  loadAvailability();
});
</script>

<style scoped>
.grid-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.grid-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 400px;
  user-select: none;
}
.grid-table__corner {
  width: 60px;
  font-size: 11px;
  font-weight: 600;
  color: #757575;
  text-align: left;
  padding: 6px 4px;
}
.grid-table__day-header {
  font-size: 12px;
  font-weight: 600;
  color: #424242;
  text-align: center;
  padding: 6px 2px;
}
.grid-table__time-label {
  font-size: 11px;
  color: #757575;
  padding: 2px 4px;
  white-space: nowrap;
}
.grid-table__cell {
  height: 28px;
  min-width: 36px;
  border: 1px solid #e0e0e0;
  cursor: pointer;
  transition: background-color 0.1s;
}
.grid-table__cell:focus-visible {
  outline: 2px solid #80162B;
  outline-offset: -2px;
}
.grid-table__cell--available {
  background: #C8E6C9;
}
.grid-table__cell--unavailable {
  background: #fafafa;
}
.grid-table__cell:hover {
  opacity: 0.8;
}
.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  display: inline-block;
}
.legend-dot--available {
  background: #C8E6C9;
  border: 1px solid #81C784;
}
.legend-dot--unavailable {
  background: #fafafa;
  border: 1px solid #e0e0e0;
}
.gap-1 { gap: 4px; }
.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
</style>
