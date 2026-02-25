<template>
  <div class="placeholder-page">
    <v-card class="placeholder-card" elevation="0">
      <h1 class="placeholder-title">{{ title }}</h1>
      <p class="placeholder-description">{{ description }}</p>
    </v-card>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: "This manager section is ready for feature wiring."
  }
});
</script>

<style scoped>
.placeholder-page {
  padding: 28px 36px;
  min-height: calc(100vh - 76px);
  background: #f4f5f7;
}

.placeholder-card {
  border: 1px solid #d8dade;
  border-radius: 14px;
  background: #fff;
  padding: 28px;
}

.placeholder-title {
  margin: 0;
  font-size: 34px;
  font-weight: 700;
  color: #1f2328;
}

.placeholder-description {
  margin: 12px 0 0;
  font-size: 19px;
  color: #667085;
}
</style>
