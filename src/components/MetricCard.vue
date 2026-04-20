<template>
  <v-card elevation="0" class="metric-card">
    <v-card-title class="text-subtitle-1">{{ title }}</v-card-title>
    <v-card-text class="text-h5">{{ value }}</v-card-text>
  </v-card>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  value: {
    type: [Number, String],
    default: 0,
  },
});
</script>

<style scoped>
.metric-card {
  border: 1px solid var(--border-1);
}
</style>

