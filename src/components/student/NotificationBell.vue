<template>
  <v-btn
    icon
    variant="text"
    size="small"
    :aria-label="'Notifications' + (unreadCount > 0 ? ', ' + unreadCount + ' unread' : '')"
    @click="$emit('click')"
  >
    <v-badge
      v-if="unreadCount > 0"
      :content="unreadCount > 99 ? '99+' : unreadCount"
      color="error"
      floating
    >
      <v-icon size="24">mdi-bell-outline</v-icon>
    </v-badge>
    <v-icon v-else size="24">mdi-bell-outline</v-icon>
  </v-btn>
</template>

<script setup>
defineProps({
  unreadCount: { type: Number, default: 0 },
});
defineEmits(['click']);
</script>
