<template>
  <div class="student-more pa-4">
    <h1 class="text-h5 font-weight-bold mb-1">More</h1>
    <p class="text-body-2 text-medium-emphasis mb-4">Quick access to all your tools and settings.</p>

    <v-row dense>
      <v-col
        v-for="item in menuItems"
        :key="item.routeName"
        cols="6"
        sm="4"
      >
        <v-card
          elevation="0"
          rounded="lg"
          border
          class="hub-card fill-height pa-4 text-center d-flex flex-column align-center justify-center"
          @click="$router.push({ name: item.routeName })"
        >
          <v-icon size="36" :color="item.color" class="mb-2">{{ item.icon }}</v-icon>
          <div class="text-body-2 font-weight-bold">{{ item.label }}</div>
          <div class="text-caption text-medium-emphasis mt-1">{{ item.description }}</div>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { studentMoreItems as menuItems } from '../config/studentMobileNavigation.js';
</script>

<style scoped>
.student-more {
  width: 100%;
}

.hub-card {
  cursor: pointer;
  min-height: 120px;
  transition: box-shadow 0.2s ease, transform 0.15s ease;
}

.hub-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.hub-card:active {
  transform: scale(0.97);
}
</style>
