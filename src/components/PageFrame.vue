<template>
  <div class="page-frame">
    <div class="page-frame__inner">
      <header v-if="$slots.header" class="page-frame__header">
        <slot name="header" />
      </header>

      <div v-if="$slots.filters" class="page-frame__filters">
        <slot name="filters" />
      </div>

      <section class="page-frame__body">
        <slot />
      </section>
    </div>
  </div>
</template>

<script>
export default {
  name: "PageFrame",
};
</script>

<script setup>
// PageFrame is the single page wrapper every manager view should render into.
// It owns page padding, max content width, sticky filter bar, and the
// background surface token. Views drop their per-page .page-header scoped
// blocks and use the #header slot + PageHeader primitive instead.
</script>

<style scoped>
.page-frame {
  background-color: var(--surface-1);
  min-height: 100%;
  width: 100%;
}

.page-frame__inner {
  max-width: 1440px;
  margin: 0 auto;
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.page-frame__header {
  /* PageHeader controls its own internal layout; this wrapper only
     contributes vertical rhythm. */
}

.page-frame__filters {
  position: sticky;
  top: 0;
  z-index: 2;
  background-color: var(--surface-1);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border-1);
  /* Counteract the inner container's horizontal padding so the hairline
     spans the full content column. */
  margin: 0;
}

.page-frame__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

@media (max-width: 768px) {
  .page-frame__inner {
    padding: var(--space-3);
    gap: var(--space-3);
  }
}
</style>
