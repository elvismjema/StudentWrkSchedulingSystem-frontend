<template>
  <v-app>
    <Sidebar ref="sidebarRef" />
    <TopNav @toggle-sidebar="toggleSidebar" />
    
    <v-main class="main-content">
      <v-container fluid class="pa-0">
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref } from 'vue'
import Sidebar from '../components/Sidebar.vue'
import TopNav from '../components/TopNav.vue'

const sidebarRef = ref(null)

const toggleSidebar = () => {
  if (sidebarRef.value) {
    sidebarRef.value.toggleRail()
  }
}
</script>

<style scoped>
.main-content {
  background-color: #fafafa;
  min-height: 100vh;
}
</style>
