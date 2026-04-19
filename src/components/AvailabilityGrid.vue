<!--
  AvailabilityGrid.vue

  Reusable FullCalendar-backed weekly time-grid. Renders "worker available"
  windows as background events and shifts as foreground events with a
  position-colored left rail, title, time range, and state badge.

  Consumers (planned):
    - Schedule page (edit mode)
    - Create Shift overlay (readonly — shows existing shifts on that day)
    - Templates page conflict view (readonly)
    - Student Workers detail modal (readonly — today's consumer; replaces the
      wall-of-pills grid)

  Only tokens from src/styles/tokens.css are used for color. No hardcoded hex
  values inside this file.
-->

<template>
  <div
    ref="rootRef"
    class="availability-grid"
    :class="{ 'availability-grid--readonly': isReadonly }"
  >
    <FullCalendar ref="calendarRef" :options="calendarOptions" />

    <div v-if="showEmptyOverlay" class="availability-grid__empty">
      No availability or shifts in this range
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useDisplay } from "vuetify";
import FullCalendar from "@fullcalendar/vue3";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

/**
 * @typedef {Object} AvailabilitySlot
 * @property {number} [dayOfWeek]   // 0 (Sun) .. 6 (Sat)
 * @property {string} [startTime]   // "HH:mm" — paired with dayOfWeek
 * @property {string} [endTime]     // "HH:mm" — paired with dayOfWeek
 * @property {string|Date} [start]  // absolute ISO — alternative to dayOfWeek
 * @property {string|Date} [end]    // absolute ISO — alternative to dayOfWeek
 * @property {boolean} [recurring]
 * @property {boolean} [unavailable]
 *
 * @typedef {Object} ShiftEvent
 * @property {string|number} id
 * @property {string} title
 * @property {string|Date} start
 * @property {string|Date} end
 * @property {string} [positionColor]  // CSS color (token var or raw)
 * @property {string|number} [positionId]
 * @property {string} [assigneeName]
 * @property {"open"|"filled"|"needs-coverage"|"clocked-in"|"on-break"} [state]
 */

const props = defineProps({
  mode: {
    type: String,
    default: "readonly",
    validator: (v) => ["edit", "readonly"].includes(v),
  },
  range: {
    type: Object,
    default: null, // { start: Date, end: Date }
  },
  slotMinTime: { type: String, default: "06:00" },
  slotMaxTime: { type: String, default: "23:00" },
  firstDay: { type: Number, default: 1 },
  availability: { type: Array, default: () => [] },
  events: { type: Array, default: () => [] },
  positions: { type: Array, default: () => [] },
  showNowIndicator: { type: Boolean, default: true },
});

const emit = defineEmits(["event:click", "event:change", "slot:click"]);

const calendarRef = ref(null);
const rootRef = ref(null);
// FullCalendar's DateInput values need seconds.
const pad = (s) => (String(s).length === 5 ? `${s}:00` : s);

const { mobile } = useDisplay();
const isReadonly = computed(() => props.mode === "readonly");

// --- Position color lookup -------------------------------------------------
const positionColorMap = computed(() => {
  const map = new Map();
  for (const p of props.positions || []) {
    if (!p) continue;
    const id = p.id ?? p.positionId ?? p.position_id;
    if (id == null) continue;
    const color = p.color || p.positionColor;
    if (color) map.set(String(id), color);
  }
  return map;
});

const resolveShiftColor = (ev) => {
  if (ev.positionColor) return ev.positionColor;
  if (ev.positionId != null) {
    const c = positionColorMap.value.get(String(ev.positionId));
    if (c) return c;
  }
  return "var(--brand-primary)";
};

// --- Availability → background events -------------------------------------
const availabilityEvents = computed(() => {
  return (props.availability || []).map((slot, i) => {
    const unavail = Boolean(slot?.unavailable);
    const base = {
      id: `avail-${i}`,
      display: "background",
      classNames: [
        "availability-grid__bg",
        unavail ? "availability-grid__bg--unavailable" : "availability-grid__bg--available",
      ],
    };

    // Absolute start/end wins if provided.
    if (slot?.start && slot?.end) {
      return { ...base, start: slot.start, end: slot.end };
    }

    const day = Number(slot?.dayOfWeek);
    if (Number.isFinite(day) && slot?.startTime && slot?.endTime) {
      return {
        ...base,
        daysOfWeek: [day],
        startTime: pad(slot.startTime),
        endTime: pad(slot.endTime),
        // FullCalendar uses a distant startRecur by default; explicitly
        // restrict to a wide window so the background repeats each week.
        startRecur: "1970-01-01",
      };
    }

    return null;
  }).filter(Boolean);
});

// --- Shifts → foreground events -------------------------------------------
const shiftEvents = computed(() => {
  return (props.events || []).map((ev) => {
    const color = resolveShiftColor(ev);
    return {
      id: String(ev.id),
      title: ev.title || "",
      start: ev.start,
      end: ev.end,
      classNames: ["availability-grid__shift"],
      extendedProps: {
        positionColor: color,
        state: ev.state || null,
        assigneeName: ev.assigneeName || null,
      },
    };
  });
});

const allEvents = computed(() => [
  ...availabilityEvents.value,
  ...shiftEvents.value,
]);

const showEmptyOverlay = computed(
  () => (props.availability?.length ?? 0) === 0 && (props.events?.length ?? 0) === 0
);

// --- Event rendering -------------------------------------------------------
// FullCalendar eventContent hook. Return DOM nodes so we can compose the
// rail / badge without using innerHTML.
const renderShiftContent = (arg) => {
  // Background availability events render themselves — leave default.
  if (arg.event.display === "background") return null;

  const { positionColor, state, assigneeName } = arg.event.extendedProps || {};

  const wrap = document.createElement("div");
  wrap.className = "availability-grid__shift-body";

  const rail = document.createElement("span");
  rail.className = "availability-grid__shift-rail";
  rail.style.background = positionColor || "var(--brand-primary)";
  wrap.appendChild(rail);

  const inner = document.createElement("div");
  inner.className = "availability-grid__shift-inner";
  wrap.appendChild(inner);

  const title = document.createElement("div");
  title.className = "availability-grid__shift-title";
  title.textContent = arg.event.title || (assigneeName ?? "");
  inner.appendChild(title);

  const time = document.createElement("div");
  time.className = "availability-grid__shift-time";
  time.textContent = arg.timeText || "";
  inner.appendChild(time);

  if (state && state !== "filled") {
    const badge = document.createElement("span");
    badge.className = `availability-grid__badge availability-grid__badge--${state}`;
    if (state === "open") badge.textContent = "Open";
    else if (state === "needs-coverage") badge.textContent = "Needs coverage";
    // clocked-in / on-break render as dots via CSS ::before
    wrap.appendChild(badge);
  }

  return { domNodes: [wrap] };
};

// --- Calendar options ------------------------------------------------------
const calendarOptions = computed(() => {
  const opts = {
    plugins: [timeGridPlugin, interactionPlugin],
    initialView: "timeGridWeek",
    headerToolbar: false,
    allDaySlot: false,
    firstDay: props.firstDay,
    dayHeaderFormat: mobile.value
      ? { weekday: "narrow" }
      : { weekday: "short" },
    slotMinTime: pad(props.slotMinTime),
    slotMaxTime: pad(props.slotMaxTime),
    slotDuration: "00:30:00",
    slotLabelInterval: "01:00:00",
    snapDuration: "00:15:00",
    nowIndicator: props.showNowIndicator,
    selectable: !isReadonly.value,
    selectMirror: !isReadonly.value,
    editable: !isReadonly.value,
    eventStartEditable: !isReadonly.value,
    eventDurationEditable: !isReadonly.value,
    eventOverlap: true,
    expandRows: true,
    height: "100%",
    events: allEvents.value,
    eventContent: renderShiftContent,
    eventTimeFormat: {
      hour: "numeric",
      minute: "2-digit",
      meridiem: "short",
    },
    eventClick: (info) => {
      emit("event:click", info);
    },
    select: (info) => {
      if (!isReadonly.value) emit("slot:click", info);
    },
    dateClick: (info) => {
      if (!isReadonly.value) emit("slot:click", info);
    },
    eventDrop: (info) => {
      if (!isReadonly.value) emit("event:change", info);
    },
    eventResize: (info) => {
      if (!isReadonly.value) emit("event:change", info);
    },
  };

  if (props.range?.start) {
    opts.initialDate = props.range.start;
    if (props.range.end) {
      opts.validRange = { start: props.range.start, end: props.range.end };
    }
  }

  return opts;
});

// --- Imperative API --------------------------------------------------------
const withApi = (fn) => {
  const api = calendarRef.value?.getApi?.();
  if (api) fn(api);
};

const goToDate = (date) => withApi((api) => api.gotoDate(date));
const prev = () => withApi((api) => api.prev());
const next = () => withApi((api) => api.next());
const today = () => withApi((api) => api.today());
// Public: parents can call updateSize() after a container transition (e.g.
// v-dialog enter) so FullCalendar re-measures instead of sitting at 0-height.
const updateSize = () => withApi((api) => api.updateSize?.());

// Self-heal sizing: if the host container resizes (dialog enter/exit, window
// resize, tab switch), force FullCalendar to re-measure. Without this the
// grid renders at 0-height when mounted inside an animating v-dialog.
let resizeObserver = null;
onMounted(() => {
  if (typeof ResizeObserver !== "undefined" && rootRef.value) {
    resizeObserver = new ResizeObserver(() => updateSize());
    resizeObserver.observe(rootRef.value);
  }
});
onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
});

// Keep the calendar in sync when the range prop changes after mount.
watch(
  () => props.range?.start,
  (start) => {
    if (start) goToDate(start);
  }
);

defineExpose({ goToDate, prev, next, today, updateSize });
</script>

<style scoped>
.availability-grid {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 420px;
  font-family: var(--font-sans);
  color: var(--text-1);
}

/* ---- Empty overlay ----------------------------------------------------- */
.availability-grid__empty {
  position: absolute;
  inset: 0;
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

/* ---- FullCalendar theme overrides -------------------------------------- */
.availability-grid :deep(.fc) {
  --fc-border-color: var(--border-1);
  --fc-page-bg-color: var(--surface-0);
  --fc-neutral-bg-color: var(--surface-1);
  --fc-now-indicator-color: var(--brand-primary);
  --fc-today-bg-color: var(--brand-primary-lt);
  font-family: var(--font-sans);
  height: 100%;
}

.availability-grid :deep(.fc .fc-col-header-cell-cushion) {
  font-size: var(--type-meta-size);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-2);
  padding: 8px 4px;
}

.availability-grid :deep(.fc .fc-timegrid-slot-label-cushion) {
  font-family: var(--font-mono);
  font-size: var(--type-meta-size);
  color: var(--text-3);
}

.availability-grid :deep(.fc .fc-timegrid-axis-cushion) {
  font-size: var(--type-meta-size);
  color: var(--text-3);
}

/* Readonly: no hover affordances on slots. */
.availability-grid--readonly :deep(.fc .fc-timegrid-slot:hover),
.availability-grid--readonly :deep(.fc .fc-daygrid-day:hover) {
  cursor: default;
}
.availability-grid--readonly :deep(.fc .fc-event) {
  cursor: default;
}

/* ---- Availability background events ------------------------------------ */
.availability-grid :deep(.availability-grid__bg) {
  border: 0;
  opacity: 0.9;
}
.availability-grid :deep(.availability-grid__bg--available) {
  background: var(--block-avail-bg) !important;
  border-left: 2px solid var(--block-avail-fg) !important;
}
.availability-grid :deep(.availability-grid__bg--unavailable) {
  background: var(--block-off-bg) !important;
  border-left: 2px solid var(--block-off-fg) !important;
}

/* ---- Shift event presentation ----------------------------------------- */
.availability-grid :deep(.availability-grid__shift) {
  background: var(--surface-0);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-sm);
  padding: 0;
  overflow: hidden;
  box-shadow: var(--shadow-1);
}

.availability-grid :deep(.availability-grid__shift .fc-event-main) {
  padding: 0;
}

.availability-grid :deep(.availability-grid__shift-body) {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 8px;
  padding: 6px 8px 6px 0;
  height: 100%;
  min-height: 32px;
}

.availability-grid :deep(.availability-grid__shift-rail) {
  flex: 0 0 4px;
  width: 4px;
  min-height: 100%;
  background: var(--brand-primary);
  border-top-left-radius: var(--radius-sm);
  border-bottom-left-radius: var(--radius-sm);
}

.availability-grid :deep(.availability-grid__shift-inner) {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.availability-grid :deep(.availability-grid__shift-title) {
  font-size: var(--type-h3-size);
  line-height: var(--type-h3-line);
  font-weight: var(--type-h3-weight);
  color: var(--text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.availability-grid :deep(.availability-grid__shift-time) {
  font-family: var(--font-mono);
  font-size: var(--type-meta-size);
  color: var(--text-2);
}

/* ---- State badges ----------------------------------------------------- */
.availability-grid :deep(.availability-grid__badge) {
  align-self: flex-start;
  margin-top: 4px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.02em;
  padding: 2px 6px;
  border-radius: 999px;
  white-space: nowrap;
}

.availability-grid :deep(.availability-grid__badge--open) {
  color: var(--text-2);
  background: var(--surface-0);
  border: 1px solid var(--border-1);
}

.availability-grid :deep(.availability-grid__badge--needs-coverage) {
  color: var(--surface-0);
  background: var(--state-alert);
  border: 1px solid var(--state-alert);
}

.availability-grid :deep(.availability-grid__badge--clocked-in),
.availability-grid :deep(.availability-grid__badge--on-break) {
  width: 8px;
  height: 8px;
  padding: 0;
  border-radius: 999px;
  font-size: 0;
  line-height: 0;
  margin-top: 6px;
  margin-right: 4px;
}

.availability-grid :deep(.availability-grid__badge--clocked-in) {
  background: var(--state-active);
}

.availability-grid :deep(.availability-grid__badge--on-break) {
  background: var(--state-break);
}
</style>
