<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useDisplay } from 'vuetify';

const emit = defineEmits(['refresh']);
const { mobile } = useDisplay();

const container = ref(null);
const pulling = ref(false);
const refreshing = ref(false);
const pullDistance = ref(0);

const THRESHOLD = 64;
let startY = 0;
let currentY = 0;

function isAtTop() {
  let el = container.value;
  while (el) {
    if (el.scrollTop > 0) return false;
    el = el.parentElement;
  }
  return window.scrollY === 0;
}

function onTouchStart(e) {
  if (!mobile.value || refreshing.value) return;
  if (!isAtTop()) return;
  startY = e.touches[0].clientY;
  pulling.value = true;
}

function onTouchMove(e) {
  if (!pulling.value || refreshing.value) return;
  currentY = e.touches[0].clientY;
  const diff = currentY - startY;
  if (diff < 0) {
    pullDistance.value = 0;
    return;
  }
  // Dampen the pull distance for a natural feel
  pullDistance.value = Math.min(diff * 0.5, THRESHOLD * 1.5);
}

function onTouchEnd() {
  if (!pulling.value) return;
  pulling.value = false;
  if (pullDistance.value >= THRESHOLD) {
    refreshing.value = true;
    emit('refresh', done);
  } else {
    pullDistance.value = 0;
  }
}

function done() {
  refreshing.value = false;
  pullDistance.value = 0;
}

onMounted(() => {
  const el = container.value;
  if (el) {
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
  }
});

onUnmounted(() => {
  const el = container.value;
  if (el) {
    el.removeEventListener('touchstart', onTouchStart);
    el.removeEventListener('touchmove', onTouchMove);
    el.removeEventListener('touchend', onTouchEnd);
  }
});
</script>

<template>
  <div ref="container" class="pull-to-refresh-wrapper">
    <!-- Pull indicator — only rendered on mobile -->
    <div
      v-if="mobile"
      class="pull-indicator"
      :style="{ height: pullDistance + 'px', opacity: pullDistance / THRESHOLD }"
    >
      <v-progress-circular
        v-if="refreshing"
        indeterminate
        size="24"
        width="2"
        color="#80162B"
      />
      <v-icon
        v-else
        size="24"
        color="#80162B"
        :style="{ transform: `rotate(${Math.min(pullDistance / THRESHOLD, 1) * 180}deg)`, transition: pulling ? 'none' : 'transform 0.2s ease' }"
      >
        mdi-arrow-down
      </v-icon>
    </div>
    <slot />
  </div>
</template>

<style scoped>
.pull-to-refresh-wrapper {
  position: relative;
}

.pull-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: height 0.2s ease, opacity 0.2s ease;
}
</style>
