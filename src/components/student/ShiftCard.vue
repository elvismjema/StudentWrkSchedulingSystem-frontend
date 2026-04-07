<template>
  <v-card
    class="shift-card"
    :class="{ 'shift-card--current': isCurrent }"
    elevation="0"
    rounded="lg"
    @click="$emit('click', shift)"
    role="article"
    :aria-label="ariaLabel"
    tabindex="0"
    @keydown.enter="$emit('click', shift)"
  >
    <div class="shift-card__color-bar" :style="{ backgroundColor: departmentColor }" />

    <v-card-text class="pa-4">
      <div class="d-flex align-center justify-space-between mb-1">
        <span class="shift-card__department text-caption font-weight-bold" :style="{ color: departmentColor }">
          {{ shift.department_name || shift.departmentName || 'Department' }}
        </span>
        <v-chip
          v-if="statusLabel"
          size="x-small"
          :color="statusColor"
          variant="tonal"
          :aria-label="'Status: ' + statusLabel"
        >
          {{ statusLabel }}
        </v-chip>
      </div>

      <div class="shift-card__time text-body-1 font-weight-medium mb-1">
        <v-icon size="16" class="mr-1">mdi-clock-outline</v-icon>
        {{ formattedTime }}
      </div>

      <div v-if="shift.location" class="shift-card__location text-body-2 text-medium-emphasis mb-1">
        <v-icon size="14" class="mr-1">mdi-map-marker-outline</v-icon>
        {{ shift.location }}
      </div>

      <div v-if="shift.supervisor_name || shift.supervisorName" class="text-body-2 text-medium-emphasis">
        <v-icon size="14" class="mr-1">mdi-account-outline</v-icon>
        {{ shift.supervisor_name || shift.supervisorName }}
      </div>

      <!-- Expandable details -->
      <v-expand-transition>
        <div v-if="expanded" class="mt-3 pt-3" style="border-top: 1px solid #e0e0e0">
          <div v-if="shift.coworkers && shift.coworkers.length" class="mb-2">
            <span class="text-caption font-weight-bold">Also working:</span>
            <div class="d-flex flex-wrap gap-1 mt-1">
              <v-chip
                v-for="cw in shift.coworkers"
                :key="cw.id || cw"
                size="x-small"
                variant="outlined"
              >
                {{ typeof cw === 'string' ? cw : cw.name || (cw.fName + ' ' + cw.lName) }}
              </v-chip>
            </div>
          </div>

          <div v-if="shift.notes" class="mb-2">
            <span class="text-caption font-weight-bold">Notes:</span>
            <p class="text-body-2 text-medium-emphasis ma-0">{{ shift.notes }}</p>
          </div>

          <!-- Action buttons -->
          <div v-if="showActions" class="d-flex gap-2 mt-3">
            <v-btn
              v-if="canFindCover"
              size="small"
              variant="outlined"
              color="primary"
              prepend-icon="mdi-account-switch"
              aria-label="Find cover for this shift"
              @click.stop="$emit('find-cover', shift)"
            >
              Find Cover
            </v-btn>
            <v-btn
              v-if="canTrade"
              size="small"
              variant="outlined"
              prepend-icon="mdi-swap-horizontal"
              aria-label="Trade this shift"
              @click.stop="$emit('trade', shift)"
            >
              Trade
            </v-btn>
            <v-btn
              v-if="canClockIn"
              size="small"
              variant="flat"
              color="success"
              prepend-icon="mdi-login"
              aria-label="Clock in for this shift"
              @click.stop="$emit('clock-in', shift)"
            >
              Clock In
            </v-btn>
            <v-btn
              v-if="canPickUp"
              size="small"
              variant="flat"
              color="primary"
              prepend-icon="mdi-plus-circle"
              aria-label="Pick up this shift"
              @click.stop="$emit('pick-up', shift)"
            >
              Pick Up
            </v-btn>
          </div>
        </div>
      </v-expand-transition>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed } from 'vue';
import { buildDateTime } from '../../utils/shiftDateTime.js';

const props = defineProps({
  shift: { type: Object, required: true },
  expanded: { type: Boolean, default: false },
  showActions: { type: Boolean, default: true },
  isCurrent: { type: Boolean, default: false },
  isOpenShift: { type: Boolean, default: false },
});

defineEmits(['click', 'find-cover', 'trade', 'clock-in', 'pick-up']);

const DEPARTMENT_COLORS = {
  default: '#80162B',
  dining: '#2E7D32',
  library: '#1565C0',
  athletics: '#E65100',
  maintenance: '#4E342E',
  it: '#6A1B9A',
  admissions: '#00838F',
};

const departmentColor = computed(() => {
  const dept = (props.shift.department_name || props.shift.departmentName || '').toLowerCase();
  for (const [key, color] of Object.entries(DEPARTMENT_COLORS)) {
    if (key !== 'default' && dept.includes(key)) return color;
  }
  return props.shift.department_color || props.shift.departmentColor || DEPARTMENT_COLORS.default;
});

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const formattedTime = computed(() => {
  const s = props.shift;
  const startDT = buildDateTime(s, 'start_time') || buildDateTime(s, 'startTime') || s.start_time || s.startTime || s.shift_start;
  const endDT = buildDateTime(s, 'end_time') || buildDateTime(s, 'endTime') || s.end_time || s.endTime || s.shift_end;
  return formatTime(startDT) + ' – ' + formatTime(endDT);
});

const statusLabel = computed(() => {
  if (props.isOpenShift) return 'Open';
  if (props.shift.status === 'pending_acknowledgement') return 'Unacknowledged';
  if (props.shift.swap_requested) return 'Cover Requested';
  return null;
});

const statusColor = computed(() => {
  if (props.isOpenShift) return 'success';
  if (props.shift.status === 'pending_acknowledgement') return 'warning';
  if (props.shift.swap_requested) return 'info';
  return 'default';
});

const canFindCover = computed(() => !props.isOpenShift && props.showActions);
const canTrade = computed(() => !props.isOpenShift && props.showActions);
const canClockIn = computed(() => props.isCurrent && !props.isOpenShift);
const canPickUp = computed(() => props.isOpenShift);

const ariaLabel = computed(() => {
  const dept = props.shift.department_name || props.shift.departmentName || 'Shift';
  return dept + ' shift, ' + formattedTime.value + (props.shift.location ? ', at ' + props.shift.location : '');
});
</script>

<style scoped>
.shift-card {
  border: 1px solid #e0e0e0;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.15s;
}
.shift-card:hover,
.shift-card:focus-visible {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  transform: translateY(-1px);
}
.shift-card:focus-visible {
  outline: 2px solid #80162B;
  outline-offset: 2px;
}
.shift-card--current {
  border-color: #80162B;
  border-width: 2px;
}
.shift-card__color-bar {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 4px;
}
.shift-card__department {
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.gap-1 { gap: 4px; }
.gap-2 { gap: 8px; }
</style>
