<template>
  <div class="student-more pa-6">
    <h1 class="text-h4 font-weight-bold mb-2">More</h1>
    <p class="text-body-1 text-medium-emphasis mb-6">Quick access to your availability and account settings.</p>

    <v-row>
      <!-- Availability & Time Off -->
      <v-col cols="12" sm="6">
        <v-card
          elevation="0"
          rounded="lg"
          border
          class="hub-card fill-height pa-6 text-center"
          @click="$router.push({ name: 'student-availability' })"
        >
          <v-icon size="48" color="#0D9488" class="mb-3">mdi-calendar-edit</v-icon>
          <div class="text-h6 font-weight-bold mb-1">Availability & Time Off</div>
          <div class="text-body-2 text-medium-emphasis">
            Manage your weekly availability and request time off
          </div>
        </v-card>
      </v-col>

      <!-- Settings & Profile -->
      <v-col cols="12" sm="6">
        <v-card
          elevation="0"
          rounded="lg"
          border
          class="hub-card fill-height pa-6 text-center"
          @click="$router.push({ name: 'student-settings' })"
        >
          <v-icon size="48" color="#8B1538" class="mb-3">mdi-cog-outline</v-icon>
          <div class="text-h6 font-weight-bold mb-1">Settings & Profile</div>
          <div class="text-body-2 text-medium-emphasis">
            View your profile, notification preferences, and account settings
          </div>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
</script>

<style scoped>
.student-more {
  width: 100%;
}

.hub-card {
  cursor: pointer;
  transition: box-shadow 0.2s ease, transform 0.15s ease;
}

.hub-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}
</style>
