<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="420">
    <v-card rounded="lg">
      <v-card-title class="pa-4 off-sched-title">
        <v-icon class="mr-2" color="warning">mdi-alert-circle-outline</v-icon>
        {{ action === 'in' ? 'Clock in off-schedule?' : 'Clock out off-schedule?' }}
      </v-card-title>
      <v-card-text class="pa-4 pt-0 off-sched-body">
        <p class="text-body-1 mb-2">
          You have no shift within 15 minutes of right now.
        </p>
        <p class="text-body-2 text-medium-emphasis mb-3">
          Are you sure you want to {{ action === 'in' ? 'clock in' : 'clock out' }}?
          <strong>Your manager will be notified.</strong>
        </p>
        <div v-if="reason" class="off-sched-reason">
          <v-icon size="14" class="mr-1">mdi-information-outline</v-icon>
          {{ reason }}
        </div>
      </v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" :disabled="loading" @click="$emit('cancel')">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="loading"
          @click="$emit('confirm')"
        >
          {{ action === 'in' ? 'Clock In Anyway' : 'Clock Out Anyway' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
  action:     { type: String,  required: true, validator: v => ['in', 'out'].includes(v) },
  reason:     { type: String,  default: '' },
  loading:    { type: Boolean, default: false },
});

defineEmits(['update:modelValue', 'confirm', 'cancel']);
</script>

<style scoped>
.off-sched-title {
  font-size: 17px;
  font-weight: 700;
  color: #48111C;
  display: flex;
  align-items: center;
}
.off-sched-body p { margin: 0; }
.off-sched-reason {
  background: #FFF7ED; /* soft warning tint */
  color: #9A3412;
  border: 1px solid #FED7AA;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 12px;
  display: flex;
  align-items: center;
}
</style>
