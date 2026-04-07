<template>
  <v-dialog v-model="dialogOpen" max-width="500" persistent>
    <v-card rounded="lg">
      <v-card-title class="d-flex align-center pa-4">
        <v-icon class="mr-2" color="primary">{{ mode === 'cover' ? 'mdi-account-switch' : 'mdi-swap-horizontal' }}</v-icon>
        {{ mode === 'cover' ? 'Find Cover' : 'Trade Shift' }}
        <v-spacer />
        <v-btn icon size="small" variant="text" aria-label="Close" @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <!-- Shift being covered/traded -->
        <div v-if="shift" class="mb-4 pa-3 rounded-lg" style="background: #fafafa; border: 1px solid #e0e0e0">
          <div class="text-caption font-weight-bold text-medium-emphasis mb-1">YOUR SHIFT</div>
          <div class="text-body-1 font-weight-medium">
            {{ shift.department_name || shift.departmentName }}
          </div>
          <div class="text-body-2">
            <v-icon size="14" class="mr-1">mdi-clock-outline</v-icon>
            {{ formatShiftTime(shift) }}
          </div>
          <div v-if="shift.location" class="text-body-2 text-medium-emphasis">
            <v-icon size="14" class="mr-1">mdi-map-marker-outline</v-icon>
            {{ shift.location }}
          </div>
        </div>

        <!-- Find Cover: just post to pool -->
        <div v-if="mode === 'cover'">
          <v-textarea
            v-model="notes"
            label="Notes (optional)"
            placeholder="Any context for potential covers..."
            rows="3"
            variant="outlined"
            density="comfortable"
            aria-label="Notes for cover request"
          />
        </div>

        <!-- Trade: select coworker -->
        <div v-else>
          <v-autocomplete
            v-model="selectedCoworker"
            :items="coworkers"
            :loading="loadingCoworkers"
            item-title="name"
            item-value="id"
            label="Trade with"
            placeholder="Search coworkers..."
            variant="outlined"
            density="comfortable"
            no-data-text="No eligible coworkers found"
            aria-label="Select coworker to trade with"
          />
          <v-textarea
            v-model="notes"
            label="Message (optional)"
            placeholder="Include a note with your trade request..."
            rows="2"
            variant="outlined"
            density="comfortable"
            class="mt-3"
            aria-label="Message for trade request"
          />
        </div>

        <v-alert
          v-if="errorMsg"
          type="error"
          variant="tonal"
          density="compact"
          class="mt-3"
          closable
          @click:close="errorMsg = ''"
        >
          {{ errorMsg }}
        </v-alert>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="close" :disabled="submitting">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="submitting"
          :disabled="mode === 'trade' && !selectedCoworker"
          @click="submit"
        >
          {{ mode === 'cover' ? 'Post for Cover' : 'Send Request' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import studentService from '../../services/studentService.js';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  shift: { type: Object, default: null },
  mode: { type: String, default: 'cover' }, // 'cover' | 'trade'
});

const emit = defineEmits(['update:modelValue', 'submitted']);

const dialogOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const notes = ref('');
const selectedCoworker = ref(null);
const coworkers = ref([]);
const loadingCoworkers = ref(false);
const submitting = ref(false);
const errorMsg = ref('');

watch(() => props.modelValue, async (open) => {
  if (open) {
    notes.value = '';
    selectedCoworker.value = null;
    errorMsg.value = '';
    if (props.mode === 'trade' && props.shift) {
      await loadCoworkers();
    }
  }
});

const loadCoworkers = async () => {
  loadingCoworkers.value = true;
  try {
    const res = await studentService.getCoworkers(props.shift.shift_id || props.shift.id);
    const data = res?.data?.data || res?.data || [];
    coworkers.value = data.map(c => ({
      id: c.id || c.userId,
      name: c.name || ((c.fName || '') + ' ' + (c.lName || '')).trim(),
    }));
  } catch {
    coworkers.value = [];
  } finally {
    loadingCoworkers.value = false;
  }
};

const buildDT = (shift, field) => {
  const time = shift[field];
  if (!time) return null;
  if (typeof time === 'string' && (time.includes('T') || (time.includes('-') && time.length > 10))) return time;
  const date = shift.shift_date || shift.date;
  if (date) return String(date).slice(0, 10) + 'T' + time;
  return null;
};

const formatShiftTime = (s) => {
  const fmt = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt)) return '';
    return dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };
  const start = buildDT(s, 'start_time') || s.start_time || s.startTime || s.shift_start;
  const end = buildDT(s, 'end_time') || s.end_time || s.endTime || s.shift_end;
  return fmt(start) + ' – ' + fmt(end);
};

const submit = async () => {
  submitting.value = true;
  errorMsg.value = '';
  try {
    if (props.mode === 'cover') {
      const sid = props.shift.shift_id || props.shift.id;
      await studentService.findCover(sid, { notes: notes.value });
    } else {
      const sid = props.shift.shift_id || props.shift.id;
      await studentService.requestSwap(sid, {
        targetUserId: selectedCoworker.value,
        notes: notes.value,
      });
    }
    emit('submitted', { mode: props.mode, shiftId: props.shift.shift_id || props.shift.id });
    close();
  } catch (err) {
    errorMsg.value = err?.response?.data?.message || err?.message || 'Request failed. Please try again.';
  } finally {
    submitting.value = false;
  }
};

const close = () => {
  dialogOpen.value = false;
};
</script>
