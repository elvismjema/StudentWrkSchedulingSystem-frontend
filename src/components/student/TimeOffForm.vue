<template>
  <v-card elevation="0" rounded="lg" class="time-off-form" style="border: 1px solid #e0e0e0">
    <v-card-title class="text-h6 pa-4">
      <v-icon class="mr-2" color="primary">mdi-calendar-remove</v-icon>
      Request Time Off
    </v-card-title>

    <v-divider />

    <v-card-text class="pa-4">
      <v-select
        v-model="form.type"
        :items="timeOffTypes"
        item-title="label"
        item-value="value"
        label="Type"
        variant="outlined"
        density="comfortable"
        :rules="[v => !!v || 'Type is required']"
        aria-label="Time off type"
        class="mb-3"
      />

      <v-row>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="form.startDate"
            type="date"
            label="Start Date"
            variant="outlined"
            density="comfortable"
            :rules="[v => !!v || 'Start date is required']"
            aria-label="Start date"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="form.endDate"
            type="date"
            label="End Date"
            variant="outlined"
            density="comfortable"
            :min="form.startDate"
            :rules="[v => !!v || 'End date is required', v => v >= form.startDate || 'End must be after start']"
            aria-label="End date"
          />
        </v-col>
      </v-row>

      <v-textarea
        v-model="form.notes"
        label="Notes"
        :placeholder="notesPlaceholder"
        rows="3"
        variant="outlined"
        density="comfortable"
        class="mt-1"
        aria-label="Additional notes"
      />

      <v-alert
        v-if="errorMsg"
        type="error"
        variant="tonal"
        density="compact"
        class="mt-2"
        closable
        @click:close="errorMsg = ''"
      >
        {{ errorMsg }}
      </v-alert>

      <v-alert
        v-if="successMsg"
        type="success"
        variant="tonal"
        density="compact"
        class="mt-2"
      >
        {{ successMsg }}
      </v-alert>
    </v-card-text>

    <v-divider />

    <v-card-actions class="pa-4">
      <v-spacer />
      <v-btn variant="text" @click="reset" :disabled="submitting">Clear</v-btn>
      <v-btn
        color="primary"
        variant="flat"
        :loading="submitting"
        :disabled="!isValid"
        @click="submit"
      >
        Submit Request
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import studentService from '../../services/studentService.js';

const emit = defineEmits(['submitted']);

const timeOffTypes = [
  { label: 'Sick', value: 'sick' },
  { label: 'Personal', value: 'personal' },
  { label: 'Academic Conflict', value: 'academic_conflict' },
  { label: 'Vacation', value: 'vacation' },
  { label: 'Other', value: 'other' },
];

const form = reactive({
  type: null,
  startDate: '',
  endDate: '',
  notes: '',
});

const submitting = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

const notesPlaceholder = computed(() => {
  if (form.type === 'academic_conflict') return 'e.g. Final exam, class presentation...';
  if (form.type === 'sick') return 'Optional details...';
  return 'Any additional context...';
});

const isValid = computed(() => {
  return form.type && form.startDate && form.endDate && form.endDate >= form.startDate;
});

const submit = async () => {
  submitting.value = true;
  errorMsg.value = '';
  successMsg.value = '';
  try {
    await studentService.submitTimeOff({
      type: form.type,
      startDate: form.startDate,
      endDate: form.endDate,
      notes: form.notes,
    });
    successMsg.value = 'Time off request submitted successfully!';
    emit('submitted');
    setTimeout(() => {
      successMsg.value = '';
      reset();
    }, 2000);
  } catch (err) {
    errorMsg.value = err?.response?.data?.message || err?.message || 'Failed to submit request.';
  } finally {
    submitting.value = false;
  }
};

const reset = () => {
  form.type = null;
  form.startDate = '';
  form.endDate = '';
  form.notes = '';
  errorMsg.value = '';
  successMsg.value = '';
};
</script>
