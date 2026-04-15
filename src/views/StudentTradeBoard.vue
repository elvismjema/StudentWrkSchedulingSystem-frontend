<template>
  <PullToRefresh @refresh="handlePullRefresh">
  <div :class="['trade-board-page', mobile ? 'pa-3' : 'pa-6']">
    <div :class="['d-flex', mobile ? 'flex-column' : 'align-center justify-space-between', mobile ? 'mb-3' : 'mb-6']" style="gap:12px">
      <div>
        <h1 :class="[mobile ? 'text-h5' : 'text-h4', 'font-weight-bold']">Shift Trade Board</h1>
        <p v-if="!mobile" class="text-body-1 text-medium-emphasis mt-1">
          Browse open requests, manage your trades, and respond to incoming swap requests
        </p>
      </div>
      <v-btn
        color="#8B1538"
        variant="flat"
        prepend-icon="mdi-plus"
        :block="mobile"
        :min-height="mobile ? 48 : undefined"
        @click="showPostDialog = true"
      >
        Post Trade Request
      </v-btn>
    </div>

    <v-tabs v-model="activeTab" color="#8B1538" :class="mobile ? 'mb-3' : 'mb-6'">
      <v-tab value="open">
        Open Requests
        <v-badge
          v-if="openRequests.length"
          :content="openRequests.length"
          color="#8B1538"
          inline
          class="ml-1"
        />
      </v-tab>
      <v-tab value="mine">
        My Requests
        <v-badge
          v-if="myRequests.length"
          :content="myRequests.length"
          color="grey"
          inline
          class="ml-1"
        />
      </v-tab>
      <v-tab value="incoming">
        Incoming
        <v-badge
          v-if="pendingIncoming.length"
          :content="pendingIncoming.length"
          color="warning"
          inline
          class="ml-1"
        />
      </v-tab>
    </v-tabs>

    <!-- Tab 1: Open Requests (from other students) -->
    <div v-if="activeTab === 'open'">
      <template v-if="loadingOpen">
        <v-row>
          <v-col v-for="n in 3" :key="n" cols="12" sm="6" lg="4">
            <v-skeleton-loader type="card" />
          </v-col>
        </v-row>
      </template>
      <template v-else-if="openRequests.length">
        <v-row>
          <v-col
            v-for="req in openRequests"
            :key="req.id"
            cols="12"
            sm="6"
            lg="4"
          >
            <v-card elevation="0" rounded="lg" border class="fill-height">
              <v-card-text class="pa-4">
                <div class="d-flex align-center mb-2">
                  <v-avatar size="32" color="#8B1538" class="mr-2">
                    <span class="text-caption text-white">
                      {{ getInitials(req.requester?.fName || req.requester_name) }}
                    </span>
                  </v-avatar>
                  <div>
                    <div class="text-body-1 font-weight-bold">
                      {{ formatUserName(req.requester) || req.requester_name || 'Student' }}
                    </div>
                    <div class="text-caption text-medium-emphasis">needs coverage</div>
                  </div>
                </div>
                <div class="text-body-2 text-medium-emphasis mb-1">
                  <v-icon size="14" class="mr-1">mdi-briefcase-outline</v-icon>
                  {{ req.requesterShift?.department?.department_name || req.department_name || 'Department' }}
                </div>
                <div class="text-body-2 text-medium-emphasis mb-1">
                  <v-icon size="14" class="mr-1">mdi-calendar</v-icon>
                  {{ formatDate(req.requesterShift?.shift_date || req.shift_date) }}
                </div>
                <div class="text-body-2 text-medium-emphasis mb-1">
                  <v-icon size="14" class="mr-1">mdi-clock-outline</v-icon>
                  {{ formatTimeRange(req.requesterShift || req) }}
                </div>
                <div v-if="req.requesterShift?.position?.position_name" class="text-body-2 text-medium-emphasis mb-1">
                  <v-icon size="14" class="mr-1">mdi-badge-account-outline</v-icon>
                  {{ req.requesterShift.position.position_name }}
                </div>
                <div v-if="req.requester_notes" class="text-caption text-medium-emphasis mb-3">
                  <v-icon size="12" class="mr-1">mdi-note-text</v-icon>
                  {{ req.requester_notes }}
                </div>
                <v-btn
                  color="#8B1538"
                  variant="flat"
                  :size="mobile ? 'default' : 'small'"
                  block
                  :min-height="mobile ? 48 : undefined"
                  :loading="req._loading"
                  @click="pickUpRequest(req)"
                  class="mt-2"
                >
                  Pick Up Shift
                </v-btn>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </template>
      <v-card v-else elevation="0" rounded="lg" border class="pa-8 text-center">
        <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-swap-horizontal</v-icon>
        <div class="text-body-1 text-medium-emphasis">No open trade requests</div>
        <div class="text-caption text-medium-emphasis">
          When other students post trade requests, they'll appear here
        </div>
      </v-card>
    </div>

    <!-- Tab 2: My Requests -->
    <div v-if="activeTab === 'mine'">
      <template v-if="loadingMine">
        <v-row>
          <v-col v-for="n in 3" :key="n" cols="12" sm="6" lg="4">
            <v-skeleton-loader type="card" />
          </v-col>
        </v-row>
      </template>
      <template v-else-if="myRequests.length">
        <v-row>
          <v-col
            v-for="req in myRequests"
            :key="req.id"
            cols="12"
            sm="6"
            lg="4"
          >
            <v-card elevation="0" rounded="lg" border class="fill-height">
              <v-card-text class="pa-4">
                <div class="d-flex align-center justify-space-between mb-2">
                  <div class="text-body-1 font-weight-bold">
                    {{ req.department_name || req.shift?.department_name || 'Trade Request' }}
                  </div>
                  <v-chip
                    size="small"
                    :color="statusColor(req.status)"
                    variant="tonal"
                  >
                    {{ req.status || 'Pending' }}
                  </v-chip>
                </div>
                <div class="text-body-2 text-medium-emphasis mb-1">
                  <v-icon size="14" class="mr-1">mdi-calendar</v-icon>
                  {{ formatDate(req.shift_date || req.shift?.shift_date || req.shift?.start_time) }}
                </div>
                <div class="text-body-2 text-medium-emphasis mb-1">
                  <v-icon size="14" class="mr-1">mdi-clock-outline</v-icon>
                  {{ formatTimeRange(req.shift || req) }}
                </div>
                <div v-if="req.notes" class="text-caption text-medium-emphasis mb-2">
                  <v-icon size="12" class="mr-1">mdi-note-text</v-icon>
                  {{ req.notes }}
                </div>
                <div class="text-caption text-medium-emphasis mb-3">
                  Posted {{ formatDate(req.createdAt || req.created_at) }}
                </div>
                <v-btn
                  v-if="(req.status || '').toLowerCase() === 'pending' || (req.status || '').toLowerCase() === 'open'"
                  color="error"
                  variant="outlined"
                  :size="mobile ? 'default' : 'small'"
                  block
                  :min-height="mobile ? 48 : undefined"
                  :loading="req._loading"
                  @click="cancelRequest(req)"
                >
                  Cancel Request
                </v-btn>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </template>
      <v-card v-else elevation="0" rounded="lg" border class="pa-8 text-center">
        <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-clipboard-text-outline</v-icon>
        <div class="text-body-1 text-medium-emphasis">You haven't posted any trade requests</div>
        <div class="text-caption text-medium-emphasis">
          Use the "Post Trade Request" button to request coverage for a shift
        </div>
      </v-card>
    </div>

    <!-- Tab 3: Incoming Requests -->
    <div v-if="activeTab === 'incoming'">
      <template v-if="loadingIncoming">
        <v-row>
          <v-col v-for="n in 3" :key="n" cols="12" sm="6" lg="4">
            <v-skeleton-loader type="card" />
          </v-col>
        </v-row>
      </template>
      <template v-else-if="incomingRequests.length">
        <v-row>
          <v-col
            v-for="req in incomingRequests"
            :key="req.id"
            cols="12"
            sm="6"
            lg="4"
          >
            <v-card elevation="0" rounded="lg" border class="fill-height">
              <v-card-text class="pa-4">
                <div class="d-flex align-center mb-2">
                  <v-avatar size="32" color="#196CA2" class="mr-2">
                    <span class="text-caption text-white">
                      {{ getInitials(req.requester_name || req.user?.fName) }}
                    </span>
                  </v-avatar>
                  <div>
                    <div class="text-body-1 font-weight-bold">
                      {{ req.requester_name || formatUserName(req.user) || 'Student' }}
                    </div>
                    <div class="text-caption text-medium-emphasis">wants to trade with you</div>
                  </div>
                </div>
                <div class="text-body-2 text-medium-emphasis mb-1">
                  <v-icon size="14" class="mr-1">mdi-briefcase-outline</v-icon>
                  {{ req.shift_details || req.shift?.department_name || 'Shift details' }}
                </div>
                <div class="text-body-2 text-medium-emphasis mb-1">
                  <v-icon size="14" class="mr-1">mdi-calendar</v-icon>
                  {{ formatDate(req.shift_date || req.shift?.shift_date || req.shift?.start_time) }}
                </div>
                <div class="text-body-2 text-medium-emphasis mb-1">
                  <v-icon size="14" class="mr-1">mdi-clock-outline</v-icon>
                  {{ formatTimeRange(req.shift || req) }}
                </div>
                <div v-if="req.notes" class="text-caption text-medium-emphasis mb-2">
                  <v-icon size="12" class="mr-1">mdi-note-text</v-icon>
                  {{ req.notes }}
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
                    :size="mobile ? 'default' : 'small'"
                    class="flex-grow-1"
                    :min-height="mobile ? 48 : undefined"
                    :loading="req._accepting"
                    @click="acceptIncoming(req)"
                  >
                    Accept
                  </v-btn>
                  <v-btn
                    color="error"
                    variant="outlined"
                    :size="mobile ? 'default' : 'small'"
                    class="flex-grow-1"
                    :min-height="mobile ? 48 : undefined"
                    :loading="req._declining"
                    @click="declineIncoming(req)"
                  >
                    Decline
                  </v-btn>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </template>
      <v-card v-else elevation="0" rounded="lg" border class="pa-8 text-center">
        <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-arrow-down-bold-circle-outline</v-icon>
        <div class="text-body-1 text-medium-emphasis">No incoming trade requests</div>
        <div class="text-caption text-medium-emphasis">
          When someone wants to trade a shift with you, it'll show up here
        </div>
      </v-card>
    </div>

    <!-- Post Trade Request Dialog -->
    <v-dialog v-model="showPostDialog" max-width="560">
      <v-card rounded="lg">
        <v-card-title class="pa-4 d-flex align-center">
          <v-icon class="mr-2">mdi-swap-horizontal</v-icon>
          Post Trade Request
        </v-card-title>
        <v-card-text class="pa-4 pt-0">
          <v-alert
            v-if="!myShifts.length && !loadingMyShifts"
            type="info"
            variant="tonal"
            class="mb-4"
          >
            You need to be assigned shifts before you can post trade requests.
          </v-alert>

          <v-select
            v-model="postForm.shiftId"
            :items="myShifts"
            item-title="label"
            item-value="id"
            label="Select your shift to trade"
            variant="outlined"
            density="comfortable"
            :loading="loadingMyShifts"
            :disabled="!myShifts.length"
            class="mb-4"
          />

          <v-radio-group v-model="postForm.type" inline class="mb-4">
            <v-radio label="Post to pool (anyone can pick up)" value="pool" />
            <v-radio label="Request swap with specific coworker" value="specific" />
          </v-radio-group>

          <v-text-field
            v-if="postForm.type === 'specific'"
            v-model="postForm.respondentUserId"
            label="Coworker User ID"
            variant="outlined"
            density="comfortable"
            class="mb-4"
          />

          <v-text-field
            v-if="postForm.type === 'specific'"
            v-model="postForm.respondentShiftId"
            label="Coworker's Shift ID"
            variant="outlined"
            density="comfortable"
            class="mb-4"
          />

          <v-textarea
            v-model="postForm.notes"
            label="Reason / Notes (optional)"
            variant="outlined"
            density="comfortable"
            rows="3"
          />
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="showPostDialog = false">Cancel</v-btn>
          <v-btn
            color="#8B1538"
            variant="flat"
            :loading="postForm.submitting"
            :disabled="!postForm.shiftId"
            @click="submitTradeRequest"
          >
            Submit Request
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="bottom">
      {{ snackbar.text }}
      <template #actions>
        <v-btn variant="text" @click="snackbar.show = false">Close</v-btn>
      </template>
    </v-snackbar>
  </div>
  </PullToRefresh>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useDisplay } from 'vuetify';
import Utils from '../config/utils.js';
import studentService from '../services/studentService.js';
import PullToRefresh from '../components/mobile/PullToRefresh.vue';

const { mobile } = useDisplay();

const user = ref(Utils.getStore('user') || {});
const userId = computed(() => user.value?.userId || user.value?.id);

const activeTab = ref('open');
const showPostDialog = ref(false);

// Loading states
const loadingOpen = ref(false);
const loadingMine = ref(false);
const loadingIncoming = ref(false);
const loadingMyShifts = ref(false);

// Data
const allSwapRequests = ref([]);
const poolRequests = ref([]);  // cover requests from department coworkers
const openShifts = ref([]);
const myShifts = ref([]);

// Derived lists
const openRequests = computed(() => {
  // Pool cover requests from department coworkers (fetched via ?direction=pool)
  return poolRequests.value.map((r) => ({ ...r, _loading: false }));
});

const myRequests = computed(() => {
  return allSwapRequests.value
    .filter((r) => r.requester_id === userId.value || r.user_id === userId.value || r.direction === 'outgoing')
    .map((r) => ({ ...r, _loading: false }));
});

const incomingRequests = computed(() => {
  return allSwapRequests.value
    .filter((r) => {
      const isTargeted = r.target_user_id === userId.value || r.direction === 'incoming';
      const isNotMine = r.requester_id !== userId.value && r.user_id !== userId.value;
      return isTargeted && isNotMine;
    })
    .map((r) => ({ ...r, _accepting: false, _declining: false }));
});

const pendingIncoming = computed(() => {
  return incomingRequests.value.filter((r) => (r.status || '').toLowerCase() === 'pending');
});

// Post form
const postForm = reactive({
  shiftId: null,
  type: 'pool',
  respondentUserId: '',
  respondentShiftId: '',
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
  if (s === 'denied' || s === 'declined' || s === 'cancelled') return 'error';
  if (s === 'claimed') return 'info';
  return 'warning';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTimeRange(shift) {
  if (!shift) return '';
  const start = shift.start_time || shift.shift_start;
  const end = shift.end_time || shift.shift_end;
  if (!start || !end) return '';
  const fmt = (d) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${fmt(start)} – ${fmt(end)}`;
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatUserName(user) {
  if (!user) return '';
  return `${user.fName || ''} ${user.lName || ''}`.trim();
}

// Data loaders
async function loadAllSwapRequests() {
  loadingOpen.value = true;
  loadingMine.value = true;
  loadingIncoming.value = true;
  try {
    // Fetch own requests (incoming + outgoing) and pool requests in parallel
    const [ownRes, poolRes] = await Promise.allSettled([
      studentService.getSwapRequests(),
      studentService.getSwapRequests({ direction: 'pool' }),
    ]);
    allSwapRequests.value = ownRes.status === 'fulfilled'
      ? (ownRes.value?.data?.data || ownRes.value?.data || [])
      : [];
    poolRequests.value = poolRes.status === 'fulfilled'
      ? (poolRes.value?.data?.data || poolRes.value?.data || [])
      : [];
  } catch {
    showSnack('Failed to load trade requests', 'error');
  } finally {
    loadingOpen.value = false;
    loadingMine.value = false;
    loadingIncoming.value = false;
  }
}

async function loadMyShifts() {
  loadingMyShifts.value = true;
  try {
    const res = await studentService.getMySchedule();
    const shifts = res?.data?.data || res?.data || [];
    // Only show future shifts
    const now = new Date();
    myShifts.value = shifts
      .filter((s) => {
        const start = new Date(s.start_time || s.shift_start || s.shift_date);
        return start >= now;
      })
      .map((s) => ({
        id: s.id,
        label: `${s.department_name || s.department?.department_name || 'Shift'} — ${formatDate(s.shift_date || s.start_time)} ${formatTimeRange(s)}`,
      }));
  } catch {
    myShifts.value = [];
  } finally {
    loadingMyShifts.value = false;
  }
}

// Actions
async function pickUpRequest(req) {
  req._loading = true;
  try {
    await studentService.respondToSwap(req.id, { action: 'accept' });
    showSnack('Shift picked up!');
    await loadAllSwapRequests();
  } catch (err) {
    showSnack(err?.response?.data?.message || 'Failed to pick up shift', 'error');
  } finally {
    req._loading = false;
  }
}

async function cancelRequest(req) {
  req._loading = true;
  try {
    await studentService.cancelSwapRequest(req.id);
    showSnack('Request cancelled');
    await loadAllSwapRequests();
  } catch (err) {
    showSnack(err?.response?.data?.message || 'Failed to cancel request', 'error');
  } finally {
    req._loading = false;
  }
}

async function acceptIncoming(req) {
  req._accepting = true;
  try {
    await studentService.respondToSwap(req.id, { action: 'accept' });
    showSnack('Swap accepted!');
    await loadAllSwapRequests();
  } catch (err) {
    showSnack(err?.response?.data?.message || 'Failed to accept swap', 'error');
  } finally {
    req._accepting = false;
  }
}

async function declineIncoming(req) {
  req._declining = true;
  try {
    await studentService.respondToSwap(req.id, { action: 'decline' });
    showSnack('Swap declined');
    await loadAllSwapRequests();
  } catch (err) {
    showSnack(err?.response?.data?.message || 'Failed to decline swap', 'error');
  } finally {
    req._declining = false;
  }
}

async function submitTradeRequest() {
  if (postForm.type === 'specific') {
    if (!postForm.respondentUserId || !postForm.respondentShiftId) {
      showSnack('Both Coworker User ID and Shift ID are required for a specific swap', 'error');
      return;
    }
  }
  postForm.submitting = true;
  try {
    if (postForm.type === 'pool') {
      await studentService.findCover(postForm.shiftId, { notes: postForm.notes });
    } else {
      await studentService.requestSwap(postForm.shiftId, {
        respondentUserId: postForm.respondentUserId,
        respondentShiftId: postForm.respondentShiftId,
        notes: postForm.notes,
      });
    }
    showSnack('Trade request posted!');
    showPostDialog.value = false;
    postForm.shiftId = null;
    postForm.notes = '';
    postForm.respondentUserId = '';
    postForm.respondentShiftId = '';
    await loadAllSwapRequests();
  } catch (err) {
    showSnack(err?.response?.data?.message || 'Failed to submit request', 'error');
  } finally {
    postForm.submitting = false;
  }
}

// Watch for post dialog open to load shifts
watch(showPostDialog, (open) => {
  if (open && !myShifts.value.length) {
    loadMyShifts();
  }
});

async function handlePullRefresh(done) {
  await loadAllSwapRequests();
  done();
}

onMounted(() => {
  loadAllSwapRequests();
});
</script>

<style scoped>
.trade-board-page {
  width: 100%;
}
</style>
