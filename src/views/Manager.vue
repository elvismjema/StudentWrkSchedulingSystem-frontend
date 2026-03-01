<template>
  <v-app>
    <ManagerSidebar ref="sidebarRef" />
    <ManagerTopNav @toggle-sidebar="toggleSidebar" />

    <v-main class="manager-main">
      <v-container fluid class="manager-content pa-0">
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref } from "vue";
import ManagerSidebar from "../components/ManagerSidebar.vue";
import ManagerTopNav from "../components/ManagerTopNav.vue";

const sidebarRef = ref(null);

const toggleSidebar = () => {
  if (sidebarRef.value) {
    sidebarRef.value.toggleRail();
  }
};
</script>

<style scoped>
.manager-main {
  background: #f4f5f7;
  min-height: calc(100vh - 76px);
  height: calc(100vh - 76px);
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.manager-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
