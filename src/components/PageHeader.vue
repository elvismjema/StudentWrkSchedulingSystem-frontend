<template>
  <div class="page-header">
    <div class="page-header__titles">
      <h1 class="page-header__title type-display">{{ title }}</h1>
      <p v-if="subtitle" class="page-header__subtitle type-meta">
        {{ subtitle }}
      </p>
    </div>

    <div v-if="$slots.actions" class="page-header__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script>
export default {
  name: "PageHeader",
};
</script>

<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: "",
  },
});
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.page-header__titles {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.page-header__title {
  margin: 0;
}

.page-header__subtitle {
  margin: 0;
  color: var(--text-2);
}

.page-header__actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}
</style>
