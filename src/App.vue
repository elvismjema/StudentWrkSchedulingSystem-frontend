<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import PushNotificationPrompt from './components/PushNotificationPrompt.vue';
import Utils from './config/utils.js';

const router = useRouter();
const isLoggedIn = computed(() => !!Utils.getStore('user'));
</script>

<template>
  <v-app>
    <v-main>
      <router-view />
    </v-main>
    <PushNotificationPrompt v-if="isLoggedIn" />
  </v-app>
</template>
