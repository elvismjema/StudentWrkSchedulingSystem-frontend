<template>
  <div
    class="clock-banner"
    :class="bannerClass"
    role="status"
    :aria-label="ariaLabel"
  >
    <v-icon :color="iconColor" size="20" class="mr-2">{{ icon }}</v-icon>
    <div class="clock-banner__content">
      <span class="clock-banner__label">{{ label }}</span>
      <span v-if="elapsed" class="clock-banner__elapsed">{{ elapsed }}</span>
    </div>
    <v-chip
      v-if="onBreak"
      size="x-small"
      color="warning"
      variant="flat"
      class="ml-2"
    >
      On Break
    </v-chip>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  clockedIn: { type: Boolean, default: false },
  clockInTime: { type: String, default: null },
  onBreak: { type: Boolean, default: false },
  shiftName: { type: String, default: '' },
});

const now = ref(Date.now());
let timer = null;

onMounted(() => {
  timer = setInterval(() => { now.value = Date.now(); }, 1000);
});

onUnmounted(() => {
  clearInterval(timer);
});

const elapsed = computed(() => {
  if (!props.clockedIn || !props.clockInTime) return null;
  const diff = now.value - new Date(props.clockInTime).getTime();
  if (diff < 0) return null;
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
});

const bannerClass = computed(() => ({
  'clock-banner--active': props.clockedIn && !props.onBreak,
  'clock-banner--break': props.onBreak,
  'clock-banner--idle': !props.clockedIn,
}));

const icon = computed(() => {
  if (props.onBreak) return 'mdi-coffee-outline';
  return props.clockedIn ? 'mdi-clock-check-outline' : 'mdi-clock-outline';
});

const iconColor = computed(() => (props.clockedIn || props.onBreak) ? 'white' : '#757575');

const label = computed(() => {
  if (props.onBreak) return 'On break';
  if (props.clockedIn) return 'Clocked in' + (props.shiftName ? ' – ' + props.shiftName : '');
  return 'Not clocked in';
});

const ariaLabel = computed(() => {
  let text = label.value;
  if (elapsed.value) text += ', elapsed ' + elapsed.value;
  return text;
});
</script>

<style scoped>
.clock-banner {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  border-radius: 12px;
  transition: background-color 0.3s;
}
.clock-banner--active {
  background: #811429;
  color: white;
}
.clock-banner--break {
  background: #C67B3C;
  color: white;
}
.clock-banner--idle {
  background: #F4E6EA;
  color: #48111C;
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
</style>
