<template>
  <v-app>
    <AdminSidebar ref="sidebarRef" />
    <ManagerTopNav @toggle-sidebar="toggleSidebar" />

    <v-main class="main-content">
      <v-container fluid class="role-content pa-0">
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref } from "vue";
import AdminSidebar from "../components/AdminSidebar.vue";
import ManagerTopNav from "../components/ManagerTopNav.vue";

const sidebarRef = ref(null);

const toggleSidebar = () => {
  if (sidebarRef.value) {
    sidebarRef.value.toggleRail();
  }
};
</script>

<style scoped>
.main-content {
  background-color: var(--surface-1);
  min-height: calc(100vh - 60px);
  height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.role-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
