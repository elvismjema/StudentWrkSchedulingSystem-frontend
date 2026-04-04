<template>
  <div class="week-strip" role="navigation" aria-label="Week navigation">
    <v-btn
      icon
      size="small"
      variant="text"
      aria-label="Previous week"
      @click="prevWeek"
    >
      <v-icon>mdi-chevron-left</v-icon>
    </v-btn>

    <div class="week-strip__days">
      <button
        v-for="day in weekDays"
        :key="day.dateStr"
        class="week-strip__day"
        :class="{
          'week-strip__day--today': day.isToday,
          'week-strip__day--selected': day.dateStr === selectedDate,
          'week-strip__day--has-shift': day.hasShift,
        }"
        :aria-label="day.ariaLabel"
        :aria-current="day.isToday ? 'date' : undefined"
        :aria-pressed="day.dateStr === selectedDate ? 'true' : 'false'"
        @click="selectDay(day.dateStr)"
      >
        <span class="week-strip__day-label">{{ day.label }}</span>
        <span class="week-strip__day-number">{{ day.number }}</span>
        <span
          class="week-strip__dot"
          :class="{ 'week-strip__dot--filled': day.hasShift }"
          aria-hidden="true"
        />
      </button>
    </div>

    <v-btn
      icon
      size="small"
      variant="text"
      aria-label="Next week"
      @click="nextWeek"
    >
      <v-icon>mdi-chevron-right</v-icon>
    </v-btn>
  </div>

  <div class="week-strip__label text-center text-caption text-medium-emphasis mt-1">
    {{ weekLabel }}
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  selectedDate: { type: String, default: null },
  shiftDates: { type: Array, default: () => [] },
});

const emit = defineEmits(['select-day', 'change-week']);

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const FULL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const weekOffset = ref(0);

const getMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const toDateStr = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
};

const todayStr = computed(() => toDateStr(new Date()));

const mondayOfWeek = computed(() => {
  const today = new Date();
  const mon = getMonday(today);
  mon.setDate(mon.getDate() + weekOffset.value * 7);
  return mon;
});

const weekDays = computed(() => {
  const shiftSet = new Set(props.shiftDates);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mondayOfWeek.value);
    d.setDate(d.getDate() + i);
    const dateStr = toDateStr(d);
    return {
      label: DAY_LABELS[i],
      number: d.getDate(),
      dateStr,
      isToday: dateStr === todayStr.value,
      hasShift: shiftSet.has(dateStr),
      ariaLabel: FULL_DAYS[i] + ', ' + d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) + (shiftSet.has(dateStr) ? ', has shifts' : ''),
    };
  });
});

const weekLabel = computed(() => {
  const start = mondayOfWeek.value;
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const opts = { month: 'short', day: 'numeric' };
  return start.toLocaleDateString('en-US', opts) + ' – ' + end.toLocaleDateString('en-US', opts);
});

const selectDay = (dateStr) => {
  emit('select-day', dateStr);
};

const prevWeek = () => {
  weekOffset.value--;
  emit('change-week', { offset: weekOffset.value, monday: toDateStr(mondayOfWeek.value) });
};

const nextWeek = () => {
  weekOffset.value++;
  emit('change-week', { offset: weekOffset.value, monday: toDateStr(mondayOfWeek.value) });
};

watch(weekOffset, () => {
  const dates = weekDays.value.map(d => d.dateStr);
  if (!dates.includes(props.selectedDate)) {
    const today = todayStr.value;
    const inWeek = dates.includes(today) ? today : dates[0];
    emit('select-day', inWeek);
  }
});
</script>

<style scoped>
.week-strip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
}
.week-strip__days {
  display: flex;
  flex: 1;
  justify-content: space-around;
  gap: 2px;
}
.week-strip__day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  border-radius: 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.15s;
  min-width: 36px;
}
.week-strip__day:hover {
  background: rgba(128, 22, 43, 0.06);
}
.week-strip__day:focus-visible {
  outline: 2px solid #80162B;
  outline-offset: 2px;
}
.week-strip__day--today {
  background: rgba(128, 22, 43, 0.08);
}
.week-strip__day--selected {
  background: #80162B;
  color: white;
}
.week-strip__day--selected .week-strip__day-label,
.week-strip__day--selected .week-strip__day-number {
  color: white;
}
.week-strip__day-label {
  font-size: 11px;
  font-weight: 600;
  color: #757575;
  text-transform: uppercase;
}
.week-strip__day-number {
  font-size: 14px;
  font-weight: 600;
  color: #212121;
}
.week-strip__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: transparent;
}
.week-strip__dot--filled {
  background: #80162B;
}
.week-strip__day--selected .week-strip__dot--filled {
  background: white;
}
.week-strip__label {
  font-size: 12px;
}
</style>
