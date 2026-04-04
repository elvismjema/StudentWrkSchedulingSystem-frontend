<template>
  <v-container fluid class="pa-6">
    <h1 class="text-h5 font-weight-bold mb-6">Trade Board</h1>

    <v-tabs v-model="activeTab" color="primary" class="mb-6">
      <v-tab value="open">Open Shifts</v-tab>
      <v-tab value="swaps">Swap Requests</v-tab>
      <v-tab value="post">Post a Swap</v-tab>
    </v-tabs>

    <v-window v-model="activeTab">
      <!-- TAB 1: Open Shifts -->
      <v-window-item value="open">
        <div v-if="loadingOpen">
          <v-skeleton-loader v-for="i in 3" :key="i" type="card" class="mb-4" />
        </div>
        <div v-else-if="openShifts.length === 0" class="text-center py-12 text-medium-emphasis">
          <v-icon size="64" class="mb-4">mdi-calendar-blank</v-icon>
          <div class="text-h6">No open shifts available</div>
          <div class="text-body-2">Check back later for new shifts to pick up</div>
        </div>
        <v-row v-else>
          <v-col v-for="shift in openShifts" :key="shift.id" cols="12" md="6" lg="4">
            <v-card rounded="lg" elevation="1" class="pa-4">
              <div class="d-flex align-center mb-3">
                <v-chip :color="shift.departmentColor || 'primary'" size="small" class="mr-2">
                  {{ shift.departmentName || 'Department' }}
                </v-chip>
                <v-chip size="small" variant="outlined">{{ shift.hours || 0 }}h</v-chip>
              </div>
              <div class="text-h6 mb-1">{{ formatDate(shift.startTime) }}</div>
              <div class="text-body-1 text-medium-emphasis mb-1">{{ formatTimeRange(shift.startTime, shift.endTime) }}</div>
              <div class="text-body-2 text-medium-emphasis mb-4">
                <v-icon size="16" class="mr-1">mdi-map-marker</v-icon>{{ shift.location || 'TBD' }}
              </div>
              <v-btn color="primary" block :loading="claimingId === shift.id" @click="claimShift(shift)">
                Pick Up Shift
              </v-btn>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- TAB 2: Swap Requests -->
      <v-window-item value="swaps">
        <div v-if="loadingSwaps">
          <v-skeleton-loader v-for="i in 3" :key="i" type="card" class="mb-4" />
        </div>
        <template v-else>
          <div class="text-h6 mb-3">Incoming Requests</div>
          <div v-if="incomingSwaps.length === 0" class="text-medium-emphasis mb-6 pa-4 bg-surface-variant rounded-lg text-center">
            No incoming swap requests
          </div>
          <v-card v-for="req in incomingSwaps" :key="req.id" class="mb-4 pa-4" rounded="lg" elevation="1">
            <div class="d-flex justify-space-between align-center mb-2">
              <span class="font-weight-medium">{{ req.requesterName }} wants to swap</span>
              <v-chip color="warning" size="small">Pending</v-chip>
            </div>
            <div class="text-body-2 text-medium-emphasis mb-4">
              Their shift: {{ formatDate(req.requesterShift?.startTime) }} {{ formatTimeRange(req.requesterShift?.startTime, req.requesterShift?.endTime) }}<br>
              Your shift: {{ formatDate(req.targetShift?.startTime) }} {{ formatTimeRange(req.targetShift?.startTime, req.targetShift?.endTime) }}
            </div>
            <div class="d-flex gap-2">
              <v-btn color="success" variant="tonal" :loading="respondingId === req.id" @click="respond(req, 'accepted')">Accept</v-btn>
              <v-btn color="error" variant="tonal" :loading="respondingId === req.id" @click="respond(req, 'declined')">Decline</v-btn>
            </div>
          </v-card>

          <div class="text-h6 mb-3 mt-6">My Requests</div>
          <div v-if="outgoingSwaps.length === 0" class="text-medium-emphasis pa-4 bg-surface-variant rounded-lg text-center">
            No outgoing swap requests
          </div>
          <v-card v-for="req in outgoingSwaps" :key="req.id" class="mb-4 pa-4" rounded="lg" elevation="1">
            <div class="d-flex justify-space-between align-center">
              <span class="font-weight-medium">{{ formatDate(req.shiftStartTime) }} {{ formatTimeRange(req.shiftStartTime, req.shiftEndTime) }}</span>
              <v-chip :color="statusColor(req.status)" size="small">{{ req.status }}</v-chip>
            </div>
          </v-card>
        </template>
      </v-window-item>

      <!-- TAB 3: Post a Swap -->
      <v-window-item value="post">
        <v-card max-width="600" rounded="lg" elevation="1" class="pa-6">
          <div class="text-h6 mb-4">Offer a Shift for Trade</div>
          <v-select
            v-model="selectedShiftId"
            :items="myUpcomingShifts"
            item-title="label"
            item-value="id"
            label="Select your shift"
            variant="outlined"
            class="mb-4"
            :loading="loadingMyShifts"
          />
          <v-select
            v-model="swapType"
            :items="[{ title: 'Post to open pool (anyone can pick up)', value: 'pool' }, { title: 'Request swap with specific coworker', value: 'specific' }]"
            item-title="title"
            item-value="value"
            label="Swap type"
            variant="outlined"
            class="mb-4"
          />
          <v-select
            v-if="swapType === 'specific'"
            v-model="targetUserId"
            :items="coworkers"
            item-title="name"
            item-value="id"
            label="Select coworker"
            variant="outlined"
            class="mb-4"
          />
          <v-textarea
            v-model="swapNotes"
            label="Notes (optional)"
            variant="outlined"
            rows="3"
            class="mb-4"
          />
          <v-btn color="primary" block :loading="submittingSwap" :disabled="!selectedShiftId" @click="submitSwap">
            Submit Request
          </v-btn>
        </v-card>
      </v-window-item>
    </v-window>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import studentService from '../services/studentService';

const activeTab = ref('open');

// Open shifts
const openShifts = ref([]);
const loadingOpen = ref(false);
const claimingId = ref(null);

// Swap requests
const swapRequests = ref([]);
const loadingSwaps = ref(false);
const respondingId = ref(null);

// Post swap
const myUpcomingShifts = ref([]);
const coworkers = ref([]);
const loadingMyShifts = ref(false);
const selectedShiftId = ref(null);
const swapType = ref('pool');
const targetUserId = ref(null);
const swapNotes = ref('');
const submittingSwap = ref(false);

const snackbar = ref({ show: false, message: '', color: 'success' });

const incomingSwaps = computed(() => swapRequests.value.filter(r => r.type === 'incoming' || r.targetUserId === getCurrentUserId()));
const outgoingSwaps = computed(() => swapRequests.value.filter(r => r.type === 'outgoing' || r.requesterId === getCurrentUserId()));

function getCurrentUserId() {
  try { return JSON.parse(localStorage.getItem('user'))?.userId || JSON.parse(localStorage.getItem('user'))?.id; } catch { return null; }
}

function formatDate(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
function formatTimeRange(start, end) {
  if (!start) return '';
  const fmt = (d) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return end ? `${fmt(start)} – ${fmt(end)}` : fmt(start);
}
function statusColor(s) {
  return { pending: 'warning', accepted: 'success', declined: 'error' }[s] || 'default';
}
function showSnack(message, color = 'success') {
  snackbar.value = { show: true, message, color };
}

async function loadOpenShifts() {
  loadingOpen.value = true;
  try {
    const res = await studentService.getOpenShifts();
    openShifts.value = res.data || res || [];
  } catch { showSnack('Failed to load open shifts', 'error'); }
  finally { loadingOpen.value = false; }
}

async function loadSwapRequests() {
  loadingSwaps.value = true;
  try {
    const res = await studentService.getSwapRequests();
    swapRequests.value = res.data || res || [];
  } catch { showSnack('Failed to load swap requests', 'error'); }
  finally { loadingSwaps.value = false; }
}

async function loadMyShifts() {
  loadingMyShifts.value = true;
  try {
    const res = await studentService.getMySchedule({ startDate: new Date().toISOString().split('T')[0], endDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0] });
    const shifts = res.data || res || [];
    myUpcomingShifts.value = shifts.map(s => ({
      ...s,
      label: `${formatDate(s.startTime)} ${formatTimeRange(s.startTime, s.endTime)}`
    }));
  } catch { } finally { loadingMyShifts.value = false; }
}

async function claimShift(shift) {
  claimingId.value = shift.id;
  try {
    await studentService.claimOpenShift(shift.id);
    showSnack('Shift claimed! Check My Schedule.');
    openShifts.value = openShifts.value.filter(s => s.id !== shift.id);
  } catch (e) {
    showSnack(e?.response?.data?.message || 'Could not claim shift', 'error');
  } finally { claimingId.value = null; }
}

async function respond(req, decision) {
  respondingId.value = req.id;
  try {
    await studentService.respondToSwap(req.id, decision);
    showSnack(`Request ${decision}`);
    await loadSwapRequests();
  } catch { showSnack('Failed to respond', 'error'); }
  finally { respondingId.value = null; }
}

async function submitSwap() {
  if (!selectedShiftId.value) return;
  submittingSwap.value = true;
  try {
    if (swapType.value === 'pool') {
      await studentService.findCover(selectedShiftId.value, { notes: swapNotes.value });
    } else {
      await studentService.requestSwap(selectedShiftId.value, { targetUserId: targetUserId.value, notes: swapNotes.value });
    }
    showSnack('Swap request submitted!');
    selectedShiftId.value = null; swapNotes.value = ''; targetUserId.value = null;
    activeTab.value = 'swaps';
    await loadSwapRequests();
  } catch (e) {
    showSnack(e?.response?.data?.message || 'Failed to submit', 'error');
  } finally { submittingSwap.value = false; }
}

onMounted(async () => {
  await Promise.all([loadOpenShifts(), loadSwapRequests(), loadMyShifts()]);
});
</script>
