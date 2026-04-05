<template>
  <div class="trade-board-page pa-6">
    <div class="mb-6">
      <h1 class="text-h4 font-weight-bold">Shift Trade Board</h1>
      <p class="text-body-1 text-medium-emphasis mt-1">Pick up open shifts, manage swap requests, or post a swap</p>
    </div>

    <v-tabs v-model="activeTab" color="#8B1538" class="mb-6">
      <v-tab value="open">Open Shifts</v-tab>
      <v-tab value="swaps">Swap Requests</v-tab>
      <v-tab value="post">Post a Swap</v-tab>
    </v-tabs>

    <!-- Tab 1: Open Shifts -->
    <div v-if="activeTab === 'open'">
      <template v-if="loadingOpen">
        <v-row>
          <v-col v-for="n in 3" :key="n" cols="12" sm="6" lg="4">
            <v-skeleton-loader type="card" />
          </v-col>
        </v-row>
      </template>
      <template v-else-if="openShifts.length">
        <v-row>
          <v-col
            v-for="shift in openShifts"
            :key="shift.id"
            cols="12"
            sm="6"
            lg="4"
          >
            <v-card elevation="0" rounded="lg" border class="fill-height">
              <v-card-text class="pa-4">
                <div class="text-body-1 font-weight-bold mb-1">
                  {{ shift.department_name || shift.department?.department_name || 'Open Shift' }}
                </div>
                <div class="text-body-2 text-medium-emphasis mb-1">
                  <v-icon size="14" class="mr-1">mdi-calendar</v-icon>
                  {{ formatDate(shift.shift_date || shift.start_time) }}
                </div>
                <div class="text-body-2 text-medium-emphasis mb-1">
                  <v-icon size="14" class="mr-1">mdi-clock-outline</v-icon>
                  {{ formatTimeRange(shift) }}
                </div>
                <div v-if="shift.location" class="text-caption text-medium-emphasis mb-3">
                  <v-icon size="12" class="mr-1">mdi-map-marker</v-icon>
                  {{ shift.location }}
                </div>
                <v-btn
                  color="#8B1538"
                  variant="flat"
                  size="small"
                  block
                  :loading="shift._claiming"
                  @click="claimShift(shift)"
                >
                  Claim This Shift
                </v-btn>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </template>
      <v-card v-else elevation="0" rounded="lg" border class="pa-8 text-center">
        <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-briefcase-off</v-icon>
        <div class="text-body-1 text-medium-emphasis">No open shifts available</div>
        <div class="text-caption text-medium-emphasis">Check back later for new shifts</div>
      </v-card>
    </div>

    <!-- Tab 2: Swap Requests -->
    <div v-if="activeTab === 'swaps'">
      <template v-if="loadingSwaps">
        <v-row>
          <v-col v-for="n in 3" :key="n" cols="12" sm="6" lg="4">
            <v-skeleton-loader type="card" />
          </v-col>
        </v-row>
      </template>
      <template v-else>
        <!-- Incoming Requests -->
        <div v-if="incomingSwaps.length" class="mb-6">
          <div class="text-subtitle-1 font-weight-bold mb-3">
            <v-icon size="18" class="mr-1">mdi-arrow-down-bold-circle</v-icon>
            Incoming Requests
          </div>
          <v-row>
            <v-col
              v-for="req in incomingSwaps"
              :key="req.id"
              cols="12"
              sm="6"
              lg="4"
            >
              <v-card elevation="0" rounded="lg" border class="fill-height">
                <v-card-text class="pa-4">
                  <div class="text-body-1 font-weight-bold mb-1">
                    {{ req.requester_name || 'Swap Request' }}
                  </div>
                  <div class="text-body-2 text-medium-emphasis mb-1">
                    {{ req.shift_details || req.notes || 'Wants to swap shifts with you' }}
                  </div>
                  <v-chip
                    size="small"
                    :color="statusColor(req.status)"
                    variant="tonal"
                    class="mb-3"
                  >
                    {{ req.status || 'Pending' }}
                  </v-chip>
                  <div v-if="(req.status || '').toLowerCase() === 'pending'" class="d-flex ga-2">
                    <v-btn
                      color="success"
                      variant="flat"
                      size="small"
                      :loading="req._responding"
                      @click="respondSwap(req, 'accepted')"
                    >
                      Accept
                    </v-btn>
                    <v-btn
                      color="error"
                      variant="outlined"
                      size="small"
                      :loading="req._responding"
                      @click="respondSwap(req, 'declined')"
                    >
                      Decline
                    </v-btn>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <!-- Outgoing Requests -->
        <div v-if="outgoingSwaps.length" class="mb-6">
          <div class="text-subtitle-1 font-weight-bold mb-3">
            <v-icon size="18" class="mr-1">mdi-arrow-up-bold-circle</v-icon>
            Outgoing Requests
          </div>
          <v-row>
            <v-col
              v-for="req in outgoingSwaps"
              :key="req.id"
              cols="12"
              sm="6"
              lg="4"
            >
              <v-card elevation="0" rounded="lg" border class="fill-height">
                <v-card-text class="pa-4">
                  <div class="text-body-1 font-weight-bold mb-1">
                    {{ req.target_name || 'Swap Request' }}
                  </div>
                  <div class="text-body-2 text-medium-emphasis mb-2">
                    {{ req.shift_details || req.notes || 'Awaiting response' }}
                  </div>
                  <v-chip
                    size="small"
                    :color="statusColor(req.status)"
                    variant="tonal"
                  >
                    {{ req.status || 'Pending' }}
                  </v-chip>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <v-card
          v-if="!incomingSwaps.length && !outgoingSwaps.length"
          elevation="0"
          rounded="lg"
          border
          class="pa-8 text-center"
        >
          <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-swap-horizontal</v-icon>
          <div class="text-body-1 text-medium-emphasis">No swap requests</div>
          <div class="text-caption text-medium-emphasis">Post a swap from the "Post a Swap" tab</div>
        </v-card>
      </template>
    </div>

    <!-- Tab 3: Post a Swap -->
    <div v-if="activeTab === 'post'">
      <v-card elevation="0" rounded="lg" border class="pa-6">
        <div class="text-subtitle-1 font-weight-bold mb-4">Request Shift Coverage</div>

        <v-select
          v-model="postForm.shiftId"
          :items="myShifts"
          item-title="label"
          item-value="id"
          label="Select your shift"
          variant="outlined"
          density="comfortable"
          :loading="loadingMyShifts"
          class="mb-4"
        />

        <v-radio-group v-model="postForm.type" inline class="mb-4">
          <v-radio label="Post to pool (anyone can pick up)" value="pool" />
          <v-radio label="Request swap with specific coworker" value="specific" />
        </v-radio-group>

        <v-text-field
          v-if="postForm.type === 'specific'"
          v-model="postForm.coworkerId"
          label="Coworker ID or name"
          variant="outlined"
          density="comfortable"
          class="mb-4"
        />

        <v-textarea
          v-model="postForm.notes"
          label="Notes (optional)"
          variant="outlined"
          density="comfortable"
          rows="3"
          class="mb-4"
        />

        <v-btn
          color="#8B1538"
          variant="flat"
          :loading="postForm.submitting"
          :disabled="!postForm.shiftId"
          @click="submitPost"
        >
          Submit Request
        </v-btn>
      </v-card>
    </div>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="bottom">
      {{ snackbar.text }}
      <template #actions>
        <v-btn variant="text" @click="snackbar.show = false">Close</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import Utils from '../config/utils.js';
import studentService from '../services/studentService.js';

const user = ref(Utils.getStore('user') || {});
const userId = computed(() => user.value?.userId || user.value?.id);

const activeTab = ref('open');

// Open shifts state
const loadingOpen = ref(false);
const openShifts = ref([]);

// Swap requests state
const loadingSwaps = ref(false);
const allSwapRequests = ref([]);

const incomingSwaps = computed(() =>
  allSwapRequests.value
    .filter((r) => r.target_user_id === userId.value || r.direction === 'incoming')
    .map((r) => ({ ...r, _responding: false }))
);

const outgoingSwaps = computed(() =>
  allSwapRequests.value.filter((r) => r.requester_id === userId.value || r.direction === 'outgoing')
);

// Post form state
const loadingMyShifts = ref(false);
const myShifts = ref([]);

const postForm = reactive({
  shiftId: null,
  type: 'pool',
  coworkerId: '',
  notes: '',
  submitting: false,
});

// Snackbar
const snackbar = reactive({ show: false, text: '', color: 'success' });

function showSnack(text, color = 'success') {
  snackbar.text = text;
  snackbar.color = color;
  snackbar.show = true;
}

function statusColor(status) {
  const s = (status || '').toLowerCase();
  if (s === 'approved' || s === 'accepted') return 'success';
  if (s === 'denied' || s === 'declined') return 'error';
  if (s === 'claimed') return 'info';
  return 'warning';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTimeRange(shift) {
  if (!shift) return '';
  const fmt = (d) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${fmt(shift.start_time || shift.shift_start)} – ${fmt(shift.end_time || shift.shift_end)}`;
}

// Data loaders
async function loadOpenShifts() {
  loadingOpen.value = true;
  try {
    const res = await studentService.getOpenShifts();
    const data = res?.data?.data || res?.data || [];
    const shifts = Array.isArray(data) ? data : (data.shifts || data.preview || []);
    openShifts.value = shifts.map((s) => ({ ...s, _claiming: false }));
  } catch {
    showSnack('Failed to load open shifts', 'error');
  } finally {
    loadingOpen.value = false;
  }
}

async function loadSwapRequests() {
  loadingSwaps.value = true;
  try {
    const res = await studentService.getSwapRequests();
    allSwapRequests.value = res?.data?.data || res?.data || [];
  } catch {
    showSnack('Failed to load swap requests', 'error');
  } finally {
    loadingSwaps.value = false;
  }
}

async function loadMyShifts() {
  loadingMyShifts.value = true;
  try {
    const res = await studentService.getMySchedule();
    const shifts = res?.data?.data || res?.data || [];
    myShifts.value = shifts.map((s) => ({
      id: s.id,
      label: `${s.department_name || s.department?.department_name || 'Shift'} — ${formatDate(s.shift_date || s.start_time)} ${formatTimeRange(s)}`,
    }));
  } catch {
    showSnack('Failed to load your shifts', 'error');
  } finally {
    loadingMyShifts.value = false;
  }
}

async function claimShift(shift) {
  shift._claiming = true;
  try {
    await studentService.claimOpenShift(shift.id);
    openShifts.value = openShifts.value.filter((s) => s.id !== shift.id);
    showSnack('Shift claimed!');
  } catch (err) {
    showSnack(err?.response?.data?.message || 'Failed to claim shift', 'error');
  } finally {
    shift._claiming = false;
  }
}

async function respondSwap(req, action) {
  req._responding = true;
  try {
    await studentService.respondToSwap(req.id, { status: action });
    showSnack(`Swap ${action}!`);
    await loadSwapRequests();
  } catch (err) {
    showSnack(err?.response?.data?.message || `Failed to ${action} swap`, 'error');
  } finally {
    req._responding = false;
  }
}

async function submitPost() {
  postForm.submitting = true;
  try {
    if (postForm.type === 'pool') {
      await studentService.findCover(postForm.shiftId, { notes: postForm.notes });
    } else {
      await studentService.requestSwap(postForm.shiftId, {
        targetUserId: postForm.coworkerId,
        notes: postForm.notes,
      });
    }
    showSnack('Request submitted!');
    postForm.shiftId = null;
    postForm.notes = '';
    postForm.coworkerId = '';
  } catch (err) {
    showSnack(err?.response?.data?.message || 'Failed to submit request', 'error');
  } finally {
    postForm.submitting = false;
  }
}

// Load data when tab changes
watch(activeTab, (tab) => {
  if (tab === 'open' && !openShifts.value.length) loadOpenShifts();
  if (tab === 'swaps' && !allSwapRequests.value.length) loadSwapRequests();
  if (tab === 'post' && !myShifts.value.length) loadMyShifts();
});

onMounted(() => {
  loadOpenShifts();
});
</script>

<style scoped>
.trade-board-page {
  width: 100%;
}
</style>
