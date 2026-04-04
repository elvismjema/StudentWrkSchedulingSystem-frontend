<template>
  <v-app>
    <!-- Sidebar navigation -->
    <Sidebar ref="sidebarRef" />

    <!-- Top navigation bar -->
    <TopNav @toggle-sidebar="toggleSidebar" />

    <!-- Main content area — fills remaining width -->
    <v-main class="main-content">
      <div class="student-content">
        <router-view />
      </div>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref } from 'vue';
import Sidebar from '../components/Sidebar.vue';
import TopNav from '../components/TopNav.vue';

const sidebarRef = ref(null);

const toggleSidebar = () => {
  if (sidebarRef.value) {
    sidebarRef.value.toggleRail();
  }
};
</script>

<style scoped>
.main-content {
  background-color: #fafafa;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.student-content {
  flex: 1;
  width: 100%;
  max-width: none;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
