<template>
  <div class="student-more pa-4">
    <h1 class="text-h5 font-weight-bold mb-1">More</h1>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Quick access to your tools and settings.
    </p>

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
          class="hub-card fill-height pa-4 d-flex flex-column align-center text-center"
          :aria-label="item.label"
          @click="$router.push({ name: item.routeName })"
        >
          <span class="hub-icon-chip mb-3">
            <v-icon size="26" color="#811429">{{ item.icon }}</v-icon>
          </span>
          <div class="hub-label">{{ item.label }}</div>
          <div class="hub-description">{{ item.description }}</div>
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
  min-height: 132px;
  background: #ffffff;
  border-color: #e5e7eb !important;
  transition: box-shadow 0.18s ease, transform 0.12s ease, border-color 0.18s ease;
}

.hub-card:hover {
  box-shadow: 0 4px 14px rgba(72, 17, 28, 0.08);
  border-color: #d4d7de !important;
  transform: translateY(-2px);
}

.hub-card:active {
  transform: scale(0.98);
}

/* Tonal maroon chip — restrained brand presence, not a flood of color.
   Per PLAN-student-mobile-ui-spec: icons differentiate by shape, not hue. */
.hub-icon-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(129, 20, 41, 0.08);
}

.hub-label {
  font-size: 0.95rem;
  font-weight: 600;
  color: #24242b;
  line-height: 1.2;
}

.hub-description {
  margin-top: 4px;
  font-size: 0.78rem;
  color: #6d7586;
  line-height: 1.3;
}
</style>
