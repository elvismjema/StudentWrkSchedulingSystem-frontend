<!--
  StatCard.vue

  Compact metric card used on the Manager Dashboard status strip. Keeps the
  number as the star, lets an optional subtitle carry context (nearest date,
  top pending item title, etc.), and supports a mute-zero treatment so real
  data pops against empty states.

  Props:
    label       — small uppercase label above the value.
    value       — the number / string to display (can be "—" for unknown).
    subtitle    — one-line context under the value.
    icon        — optional mdi-* icon rendered next to the label.
    loading     — shows a skeleton in place of value + subtitle.
    to          — vue-router location; when provided the card becomes a
                  clickable router-link and gets hover affordance.
    muteZero    — when true (default) and value === 0, render the number in
                  text-3 and the card on surface-2.
    comingSoon  — show a small "Coming soon" chip in the header (used for
                  metrics not yet wired to backend).

  Only tokens from src/styles/tokens.css are used for color / type / spacing.
-->

<template>
  <component
    :is="to ? 'router-link' : 'div'"
    :to="to"
    class="stat-card"
    :class="{
      'stat-card--muted': isMuted,
      'stat-card--link': !!to,
    }"
  >
    <header class="stat-card__head">
      <span class="stat-card__label">
        <v-icon v-if="icon" :icon="icon" size="16" class="stat-card__icon" />
        {{ label }}
      </span>
      <span v-if="comingSoon" class="stat-card__chip">Coming soon</span>
    </header>

    <div class="stat-card__body">
      <div v-if="loading" class="stat-card__skeleton" aria-busy="true" />
      <div
        v-else
        class="stat-card__value"
        :class="{ 'stat-card__value--muted': isMuted }"
      >
        {{ displayValue }}
      </div>

      <div v-if="!loading && subtitle" class="stat-card__subtitle">
        {{ subtitle }}
      </div>

      <div v-if="!loading && $slots.subtitle" class="stat-card__subtitle">
        <slot name="subtitle" />
      </div>
    </div>
  </component>
</template>

<script>
export default {
  name: "StatCard",
};
</script>

<script setup>
import { computed } from "vue";

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [Number, String], default: 0 },
  subtitle: { type: String, default: "" },
  icon: { type: String, default: "" },
  loading: { type: Boolean, default: false },
  to: { type: [String, Object], default: null },
  muteZero: { type: Boolean, default: true },
  comingSoon: { type: Boolean, default: false },
});

const isZero = computed(() => {
  const v = props.value;
  if (typeof v === "number") return v === 0;
  // Treat "0", "0h", "$0" as zero for styling purposes only when a number
  // literally parses to 0; otherwise leave it to the caller.
  if (typeof v === "string") {
    const n = Number(v);
    return !Number.isNaN(n) && n === 0;
  }
  return false;
});

const isMuted = computed(() => props.muteZero && isZero.value && !props.loading);

const displayValue = computed(() => {
  if (props.value === null || props.value === undefined || props.value === "") {
    return "—";
  }
  return props.value;
});
</script>

<style scoped>
.stat-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  background-color: var(--surface-0);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-md);
  min-height: 116px;
  text-decoration: none;
  color: inherit;
  transition: box-shadow 120ms ease, transform 120ms ease,
    background-color 120ms ease;
}

.stat-card--muted {
  background-color: var(--surface-2);
}

.stat-card--link {
  cursor: pointer;
}

.stat-card--link:hover {
  box-shadow: var(--shadow-1);
  transform: translateY(-1px);
}

.stat-card--link:focus-visible {
  outline: 2px solid var(--brand-primary);
  outline-offset: 2px;
}

.stat-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-1);
}

.stat-card__label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-sans);
  font-size: var(--type-meta-size);
  line-height: var(--type-meta-line);
  font-weight: var(--type-meta-weight);
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stat-card__icon {
  color: var(--text-3);
}

.stat-card__chip {
  font-family: var(--font-sans);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 999px;
  background-color: var(--state-info-lt);
  color: var(--state-info);
}

.stat-card__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.stat-card__value {
  font-family: var(--font-sans);
  font-size: 32px;
  line-height: 1.1;
  font-weight: var(--type-display-weight);
  color: var(--text-1);
  letter-spacing: -0.02em;
  word-break: break-word;
}

.stat-card__value--muted {
  color: var(--text-3);
  font-weight: 500;
}

.stat-card__subtitle {
  font-family: var(--font-sans);
  font-size: var(--type-meta-size);
  line-height: var(--type-meta-line);
  color: var(--text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.stat-card__skeleton {
  height: 36px;
  width: 60%;
  border-radius: var(--radius-sm);
  background: linear-gradient(
    90deg,
    var(--surface-2),
    var(--border-1),
    var(--surface-2)
  );
  background-size: 200% 100%;
  animation: stat-card-shimmer 1.2s infinite ease-in-out;
}

@keyframes stat-card-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
