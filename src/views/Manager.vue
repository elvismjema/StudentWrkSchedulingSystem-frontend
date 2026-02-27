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
