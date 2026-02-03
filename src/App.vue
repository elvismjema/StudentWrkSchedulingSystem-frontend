<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import MenuBar from "./components/MenuBar.vue";

const route = useRoute();
const showMenuBar = computed(() => route.name !== "login");
</script>

<template>
  <v-app>
    <MenuBar v-if="showMenuBar" :key="$route.fullPath" />
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>
