<!--
  WorkerAvailabilityReadonly.vue

  Pure CSS-grid weekly availability view, used inside the Manager → Student
  Workers details modal. Replaces the FullCalendar-based AvailabilityGrid
  for this specific readonly use case because FullCalendar inside a
  v-dialog repeatedly failed to render its timegrid body even after
  updateSize() / ResizeObserver plumbing.

  This component takes the same `availability` prop shape used elsewhere
  and paints each slot as a block positioned in a 7-column × 17-row grid
  (Mon..Sun × 6am..10pm). No FullCalendar, no editing, no dependencies —
  deterministic, safe inside dialogs.
-->

<template>
  <div class="worker-avail">
    <div class="worker-avail__header">
      <div class="worker-avail__corner" />
      <div
        v-for="day in DAYS"
        :key="day.key"
        class="worker-avail__day-header"
      >
        {{ day.label }}
      </div>
    </div>

    <div class="worker-avail__body">
      <div class="worker-avail__hours">
        <div
          v-for="hour in HOURS"
          :key="hour"
          class="worker-avail__hour-label"
        >
          {{ formatHourLabel(hour) }}
        </div>
      </div>

      <div class="worker-avail__grid">
        <div
          v-for="col in 7"
          :key="`col-${col}`"
          class="worker-avail__col"
        >
          <div
            v-for="hour in HOURS"
            :key="`cell-${col}-${hour}`"
            class="worker-avail__cell"
          />
        </div>

        <div
          v-for="(slot, i) in positionedSlots"
          :key="`slot-${i}`"
          class="worker-avail__slot"
          :class="{
            'worker-avail__slot--available': !slot.unavailable,
            'worker-avail__slot--unavailable': slot.unavailable,
          }"
          :style="slot.style"
        >
          <span class="worker-avail__slot-label">{{ slot.label }}</span>
        </div>
      </div>
    </div>

    <div v-if="!availability || availability.length === 0" class="worker-avail__empty">
      No availability on file
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  availability: { type: Array, default: () => [] },
  startHour: { type: Number, default: 6 },   // 6am
  endHour: { type: Number, default: 23 },    // 11pm (exclusive label)
});

// Columns always Mon → Sun to match the existing manager modal header.
const DAYS = [
  { key: "mon", label: "MON", dayOfWeek: 1 },
  { key: "tue", label: "TUE", dayOfWeek: 2 },
  { key: "wed", label: "WED", dayOfWeek: 3 },
  { key: "thu", label: "THU", dayOfWeek: 4 },
  { key: "fri", label: "FRI", dayOfWeek: 5 },
  { key: "sat", label: "SAT", dayOfWeek: 6 },
  { key: "sun", label: "SUN", dayOfWeek: 0 },
];

const HOURS = computed(() => {
  const out = [];
  for (let h = props.startHour; h < props.endHour; h += 1) out.push(h);
  return out;
});

const formatHourLabel = (hour) => {
  const h24 = ((hour % 24) + 24) % 24;
  const period = h24 >= 12 ? "pm" : "am";
  const h12 = h24 % 12 || 12;
  return `${h12}${period}`;
};

const parseMinutes = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = String(hhmm).split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

const COL_INDEX_BY_DOW = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };

const positionedSlots = computed(() => {
  const startMin = props.startHour * 60;
  const endMin = props.endHour * 60;
  const totalMin = endMin - startMin;
  if (totalMin <= 0) return [];

  return (props.availability || [])
    .map((slot) => {
      const dow = Number(slot?.dayOfWeek);
      const col = COL_INDEX_BY_DOW[dow];
      if (col == null) return null;

      const s = parseMinutes(slot?.startTime);
      const e = parseMinutes(slot?.endTime);
      if (s == null || e == null) return null;

      // Clip to the visible window so late-night / pre-dawn slots don't
      // spill out of the grid.
      const clippedStart = Math.max(s, startMin);
      const clippedEnd = Math.min(e, endMin);
      if (clippedEnd <= clippedStart) return null;

      const topPct = ((clippedStart - startMin) / totalMin) * 100;
      const heightPct = ((clippedEnd - clippedStart) / totalMin) * 100;

      const leftPct = (col / 7) * 100;
      const widthPct = 100 / 7;
      return {
        unavailable: Boolean(slot.unavailable),
        label: `${formatTimeLabel(slot.startTime)} – ${formatTimeLabel(slot.endTime)}`,
        style: {
          left: `calc(${leftPct}% + 2px)`,
          width: `calc(${widthPct}% - 4px)`,
          top: `${topPct}%`,
          height: `${heightPct}%`,
        },
      };
    })
    .filter(Boolean);
});

const formatTimeLabel = (hhmm) => {
  if (!hhmm) return "";
  const [rawH, rawM] = String(hhmm).split(":");
  const h24 = Number(rawH || 0);
  const m = String(rawM || "00").padStart(2, "0");
  const period = h24 >= 12 ? "pm" : "am";
  const h12 = h24 % 12 || 12;
  return `${h12}:${m}${period}`;
};
</script>

<style scoped>
.worker-avail {
  position: relative;
  width: 100%;
  font-family: var(--font-sans);
  color: var(--text-1);
  background: var(--surface-0);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-md);
  overflow: hidden;
}

/* ---- Header row -------------------------------------------------------- */
.worker-avail__header {
  display: grid;
  grid-template-columns: 56px repeat(7, minmax(0, 1fr));
  border-bottom: 1px solid var(--border-1);
  background: var(--surface-1);
}

.worker-avail__corner {
  border-right: 1px solid var(--border-1);
}

.worker-avail__day-header {
  font-size: var(--type-meta-size);
  font-weight: 600;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  text-align: center;
  padding: 10px 4px;
  border-right: 1px solid var(--border-1);
}

.worker-avail__day-header:last-child {
  border-right: none;
}

/* ---- Body: hours column + 7-column grid -------------------------------- */
.worker-avail__body {
  display: grid;
  grid-template-columns: 56px 1fr;
  min-height: 560px;
}

.worker-avail__hours {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-1);
}

.worker-avail__hour-label {
  flex: 1;
  min-height: 48px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-3);
  text-align: right;
  padding: 2px 8px 0 4px;
  border-bottom: 1px solid var(--border-1);
}

.worker-avail__hour-label:last-child {
  border-bottom: none;
}

.worker-avail__grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.worker-avail__col {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-1);
}

.worker-avail__col:last-child {
  border-right: none;
}

.worker-avail__cell {
  flex: 1;
  min-height: 48px;
  border-bottom: 1px solid var(--border-1);
}

.worker-avail__cell:last-child {
  border-bottom: none;
}

/* ---- Slot blocks ------------------------------------------------------- */
.worker-avail__slot {
  position: absolute;
  padding: 4px 6px;
  border-radius: var(--radius-sm);
  font-size: 11px;
  line-height: 1.2;
  overflow: hidden;
  box-sizing: border-box;
  pointer-events: none;
}

.worker-avail__slot--available {
  background: var(--block-avail-bg);
  border-left: 2px solid var(--block-avail-fg);
  color: var(--block-avail-fg);
}

.worker-avail__slot--unavailable {
  background: var(--block-off-bg);
  border-left: 2px solid var(--block-off-fg);
  color: var(--block-off-label);
}

.worker-avail__slot-label {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

/* ---- Empty overlay ----------------------------------------------------- */
.worker-avail__empty {
  position: absolute;
  inset: 56px 0 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-3);
  font-size: var(--type-body-size);
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.72),
    rgba(255, 255, 255, 0.92)
  );
}
</style>
