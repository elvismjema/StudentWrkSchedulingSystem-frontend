<template>
  <v-app>
    <!-- Desktop: sidebar + top nav (screens >= 960px) -->
    <template v-if="!isMobile">
      <Sidebar ref="sidebarRef" />
      <TopNav @toggle-sidebar="toggleSidebar" />
    </template>

    <!-- Mobile: top app bar -->
    <v-app-bar
      v-if="isMobile"
      flat
      density="compact"
      class="mobile-app-bar"
    >
      <v-app-bar-title class="text-subtitle-1 font-weight-bold" style="color: #80162B">
        {{ pageTitle }}
      </v-app-bar-title>
    </v-app-bar>

    <v-main class="main-content" :class="{ 'main-content--mobile': isMobile }">
      <v-container fluid class="student-content pa-0">
        <router-view />
      </v-container>
    </v-main>

    <!-- Mobile bottom navigation -->
    <v-bottom-navigation
      v-if="isMobile"
      v-model="activeTab"
      grow
      color="primary"
      class="bottom-nav"
      role="navigation"
      aria-label="Main navigation"
    >
      <v-btn value="dashboard" :to="{ name: 'student-dashboard' }" aria-label="Home">
        <v-icon>mdi-home-outline</v-icon>
        <span>Home</span>
      </v-btn>

      <v-btn value="schedule" :to="{ name: 'student-schedule' }" aria-label="Schedule">
        <v-icon>mdi-calendar-outline</v-icon>
        <span>Schedule</span>
      </v-btn>

      <v-btn value="clock" :to="{ name: 'student-clock' }" aria-label="Clock">
        <v-icon>mdi-clock-outline</v-icon>
        <span>Clock</span>
      </v-btn>

      <v-btn value="more" :to="{ name: 'student-more' }" aria-label="More">
        <v-icon>mdi-dots-horizontal</v-icon>
        <span>More</span>
      </v-btn>
    </v-bottom-navigation>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import Sidebar from '../components/Sidebar.vue';
import TopNav from '../components/TopNav.vue';

const route = useRoute();
const sidebarRef = ref(null);
const windowWidth = ref(window.innerWidth);

const onResize = () => { windowWidth.value = window.innerWidth; };
onMounted(() => window.addEventListener('resize', onResize));
onUnmounted(() => window.removeEventListener('resize', onResize));

const isMobile = computed(() => windowWidth.value < 960);

const activeTab = computed(() => {
  const name = route.name || '';
  if (name.includes('dashboard')) return 'dashboard';
  if (name.includes('schedule') || name.includes('trade')) return 'schedule';
  if (name.includes('clock')) return 'clock';
  if (name.includes('more') || name.includes('profile') || name.includes('settings') || name.includes('availability')) return 'more';
  return 'dashboard';
});

const pageTitle = computed(() => {
  const titles = {
    'student-dashboard': 'Home',
    'student-schedule': 'Schedule',
    'student-clock': 'Clock',
    'student-more': 'More',
    'student-notifications': 'Notifications',
  };
  return titles[route.name] || 'OC Scheduling';
});

const toggleSidebar = () => {
  if (sidebarRef.value) {
    sidebarRef.value.toggleRail();
  }
};
</script>

<style scoped>
.main-content {
  background-color: #fafafa;
  min-height: calc(100vh - 60px);
  height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.main-content--mobile {
  min-height: calc(100vh - 56px - 56px); /* app-bar + bottom-nav */
  height: auto;
  padding-bottom: 56px; /* space for bottom nav */
}

.student-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.mobile-app-bar {
  border-bottom: 1px solid #e0e0e0 !important;
}

.bottom-nav {
  border-top: 1px solid #e0e0e0;
}

/* Vuetify bottom navigation label styling */
.bottom-nav .v-btn span {
  font-size: 11px;
  margin-top: 2px;
}
</style>
