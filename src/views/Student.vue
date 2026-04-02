<template>
  <v-app>
    <Sidebar ref="sidebarRef" />
    <TopNav @toggle-sidebar="toggleSidebar" />

    <v-main class="main-content">
      <v-container fluid class="student-content pa-0">
        <router-view />
      </v-container>
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
  min-height: calc(100vh - 60px);
  height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.student-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
