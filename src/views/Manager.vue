<template>

  <div>
    <TopNav @toggle-sidebar="sidebarRef?.toggleRail()" />
    <div class="d-flex">
      <Sidebar ref="sidebarRef" />
      <main class="flex-grow-1">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import TopNav from '@/components/TopNav.vue'
import Sidebar from '@/components/Sidebar.vue'

const sidebarRef = ref(null)
</script>

  <v-app>
    <AdminSidebar v-if="isAdmin" ref="sidebarRef" />
    <ManagerSidebar v-else ref="sidebarRef" />
    <ManagerTopNav @toggle-sidebar="toggleSidebar" />

    <v-main class="manager-main">
      <v-container fluid class="pa-0">
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed } from "vue";
import ManagerSidebar from "../components/ManagerSidebar.vue";
import AdminSidebar from "../components/AdminSidebar.vue";
import ManagerTopNav from "../components/ManagerTopNav.vue";
import Utils from "../config/utils";

const sidebarRef = ref(null);

const isAdmin = computed(() => {
  const context = Utils.getStore("currentDepartmentContext");
  return context?.permission_level >= 90;
});

const toggleSidebar = () => {
  if (sidebarRef.value) {
    sidebarRef.value.toggleRail();
  }
};
</script>

<style scoped>
.manager-main {
  background: #f4f5f7;
  min-height: 100vh;
}
</style>

