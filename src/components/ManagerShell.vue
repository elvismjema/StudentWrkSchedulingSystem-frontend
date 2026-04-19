<template>
  <v-app>
    <ManagerSidebar ref="sidebarRef" />
    <ManagerTopBar />

    <v-main class="main-content">
      <v-container fluid class="role-content pa-0">
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
export default {
  name: "ManagerShell",
};
</script>

<script setup>
import { ref } from "vue";
import ManagerSidebar from "./ManagerSidebar.vue";
import ManagerTopBar from "./ManagerTopBar.vue";

// Sidebar ref is exposed for future cases where the shell itself needs to
// toggle the rail (e.g. responsive breakpoints). The top bar no longer has a
// hamburger — the rail toggle lives inside the sidebar footer.
const sidebarRef = ref(null);
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
