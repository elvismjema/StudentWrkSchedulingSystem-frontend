<template>
  <div
    class="clock-banner"
    :class="bannerClass"
    role="status"
    :aria-label="ariaLabel"
  >
    <!-- Left: icon + status text + elapsed timer -->
    <v-icon :color="iconColor" size="20" class="mr-2">{{ icon }}</v-icon>
    <div class="clock-banner__content">
      <span class="clock-banner__label">{{ label }}</span>
      <span v-if="elapsed" class="clock-banner__elapsed">{{ elapsed }}</span>
    </div>

    <!-- On Break chip (informational only, shown alongside End Break button) -->
    <v-chip
      v-if="onBreak"
      size="x-small"
      color="warning"
      variant="flat"
      class="mr-2"
    >
      On Break
    </v-chip>

    <!-- Right: contextual action buttons -->
    <div class="clock-banner__actions">
      <!-- State: not clocked in → Clock In -->
      <v-btn
        v-if="!clockedIn"
        size="small"
        variant="flat"
        color="primary"
        :loading="loading"
        :disabled="loading"
        prepend-icon="mdi-login"
        aria-label="Clock in"
        @click.stop="$emit('clock-in')"
      >
        Clock In
      </v-btn>

      <!-- State: clocked in, not on break → Start Break + Clock Out -->
      <!-- Both actions get the same outlined-white treatment on the maroon
           banner so they read with equal weight. The maroon banner itself
           is the dominant visual; the buttons are secondary affordances. -->
      <template v-if="clockedIn && !onBreak">
        <v-btn
          size="small"
          variant="outlined"
          color="white"
          :loading="loading"
          :disabled="loading"
          prepend-icon="mdi-coffee-outline"
          aria-label="Start break"
          class="clock-banner-btn mr-2"
          @click.stop="$emit('start-break')"
        >
          Start Break
        </v-btn>
        <v-btn
          size="small"
          variant="outlined"
          color="white"
          :loading="loading"
          :disabled="loading"
          prepend-icon="mdi-logout"
          aria-label="Clock out"
          class="clock-banner-btn clock-banner-btn--emphasis"
          @click.stop="$emit('clock-out')"
        >
          Clock Out
        </v-btn>
      </template>

      <!-- State: on break → End Break -->
      <v-btn
        v-if="onBreak"
        size="small"
        variant="flat"
        color="warning"
        :loading="loading"
        :disabled="loading"
        prepend-icon="mdi-play-circle-outline"
        aria-label="End break"
        @click.stop="$emit('end-break')"
      >
        End Break
      </v-btn>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  clockedIn:   { type: Boolean, default: false },
  clockInTime: { type: String,  default: null  },
  onBreak:     { type: Boolean, default: false },
  shiftName:   { type: String,  default: ''    },
  /** Set to true while a clock action is in-flight to disable all buttons */
  loading:     { type: Boolean, default: false },
});

defineEmits(['clock-in', 'clock-out', 'start-break', 'end-break']);

// ── Live elapsed timer ────────────────────────────────────────────────────────
const now = ref(Date.now());
let timer = null;

onMounted(()   => { timer = setInterval(() => { now.value = Date.now(); }, 1000); });
onUnmounted(() => { clearInterval(timer); });

const elapsed = computed(() => {
  if (!props.clockedIn || !props.clockInTime) return null;
  const diff = now.value - new Date(props.clockInTime).getTime();
  if (diff < 0) return null;
  const hours   = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000)   / 1000);
  return (
    String(hours).padStart(2, '0')   + ':' +
    String(minutes).padStart(2, '0') + ':' +
    String(seconds).padStart(2, '0')
  );
});

// ── Visual state ─────────────────────────────────────────────────────────────
const bannerClass = computed(() => ({
  'clock-banner--active': props.clockedIn && !props.onBreak,
  'clock-banner--break':  props.onBreak,
  'clock-banner--idle':   !props.clockedIn,
}));

const icon = computed(() => {
  if (props.onBreak)   return 'mdi-coffee-outline';
  if (props.clockedIn) return 'mdi-clock-check-outline';
  return 'mdi-clock-outline';
});

const iconColor = computed(() =>
  (props.clockedIn || props.onBreak) ? 'white' : undefined
);

const label = computed(() => {
  if (props.onBreak)   return 'On break';
  if (props.clockedIn) return 'Clocked in' + (props.shiftName ? ' – ' + props.shiftName : '');
  return 'Not clocked in';
});

const ariaLabel = computed(() => {
  let text = label.value;
  if (elapsed.value) text += ', elapsed ' + elapsed.value;
  return text;
});

// (Button colors are now handled declaratively in the template; both
// actions on the active maroon banner use an outlined-white treatment
// so they read with equal weight.)
</script>

<style scoped>
.clock-banner {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  padding: 10px 16px;
  border-radius: 12px;
  transition: background-color 0.3s;
  gap: 8px;
}
.clock-banner--active {
  /* Keep student mobile clock banner in the maroon family */
  background: var(--brand-primary, #811429);
  color: white;
}
.clock-banner--break {
  background: var(--state-break);
  color: white;
}
.clock-banner--idle {
  background: var(--surface-2);
  color: var(--text-2);
}
.clock-banner__content {
  display: flex;
  flex-direction: column;
  flex: 1;
}
.clock-banner__label {
  font-size: 13px;
  font-weight: 600;
}
.clock-banner__elapsed {
  font-size: 20px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 1px;
}
.clock-banner__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-left: auto;
}

/* Prevent button labels from being cut mid-word on narrow viewports */
.clock-banner__actions :deep(.v-btn) {
  white-space: nowrap;
  min-width: max-content;
}

/* Clock-banner action buttons: equal-weight outlined-white pills on the
   maroon banner. The emphasis variant (Clock Out) gets a thicker border
   so the primary action still reads first without switching to a loud
   fill that would fight the maroon background. */
.clock-banner-btn :deep(.v-btn__overlay) { opacity: 0; }
.clock-banner-btn {
  letter-spacing: 0.3px;
  text-transform: none;
  font-weight: 600;
}
.clock-banner-btn--emphasis :deep(.v-btn__content) {
  font-weight: 700;
}
.clock-banner-btn--emphasis {
  /* A whisker heavier border + subtle halo makes Clock Out the primary CTA
     without introducing a fourth color. */
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.55);
}
</style>
