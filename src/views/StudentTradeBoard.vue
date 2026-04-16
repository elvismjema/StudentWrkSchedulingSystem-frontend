<template>
  <!-- ═══ MOBILE LAYOUT ═══ -->
  <PullToRefresh v-if="mobile" @refresh="handlePullRefresh">
  <div class="trade-screen">

    <!-- Segmented control -->
    <div class="t-segment-wrap">
      <div class="t-segment">
        <button class="t-seg-btn" :class="{ 't-seg-btn--active': activeTab === 'open' }" @click="activeTab = 'open'">
          Open Shifts
          <span v-if="openRequests.length" class="t-seg-badge">{{ openRequests.length }}</span>
        </button>
        <button class="t-seg-btn" :class="{ 't-seg-btn--active': activeTab === 'mine' }" @click="activeTab = 'mine'">
          My Shifts
          <span v-if="myRequests.length" class="t-seg-badge t-seg-badge--grey">{{ myRequests.length }}</span>
        </button>
        <button class="t-seg-btn" :class="{ 't-seg-btn--active': activeTab === 'incoming' }" @click="activeTab = 'incoming'">
          Incoming
          <span v-if="pendingIncoming.length" class="t-seg-badge t-seg-badge--warn">{{ pendingIncoming.length }}</span>
        </button>
      </div>
    </div>

    <div class="t-content">

      <!-- OPEN REQUESTS -->
      <div v-if="activeTab === 'open'">
        <div v-if="loadingOpen" class="t-loading"><v-progress-circular indeterminate size="28" width="2" color="#80162B" /></div>
        <div v-else-if="openRequests.length" class="t-card-list">
          <div v-for="req in openRequests" :key="req.id" class="t-card">
            <div class="t-card-accent t-card-accent--open"></div>
            <div class="t-card-body">
              <div class="t-card-header">
                <div class="t-avatar">{{ getInitials(req.requester?.fName || req.requester_name) }}</div>
                <div class="t-card-meta">
                  <div class="t-card-name">{{ formatUserName(req.requester) || req.requester_name || 'Student' }}</div>
                  <div class="t-card-sub">needs coverage</div>
                </div>
              </div>
              <div class="t-card-detail">{{ req.requesterShift?.department?.department_name || req.department_name || 'Department' }}</div>
              <div class="t-card-detail">{{ formatDate(req.requesterShift?.shift_date || req.shift_date) }} · {{ formatTimeRange(req.requesterShift || req) }}</div>
              <div v-if="req.requesterShift?.position?.position_name" class="t-card-detail">{{ req.requesterShift.position.position_name }}</div>
              <button class="t-action-btn t-action-btn--primary" :disabled="req._loading" @click="pickUpRequest(req)">
                {{ req._loading ? 'Picking up...' : 'Pick Up Shift' }}
              </button>
            </div>
          </div>
        </div>
        <div v-else class="t-empty">
          <v-icon icon="mdi-swap-horizontal" size="44" color="#ccc" />
          <div class="t-empty-title">No open trades</div>
          <div class="t-empty-sub">Trade requests from coworkers will appear here</div>
        </div>
      </div>

      <!-- MY REQUESTS -->
      <div v-if="activeTab === 'mine'">
        <div v-if="loadingMine" class="t-loading"><v-progress-circular indeterminate size="28" width="2" color="#80162B" /></div>
        <div v-else-if="myRequests.length" class="t-card-list">
          <div v-for="req in myRequests" :key="req.id" class="t-card">
            <div class="t-card-accent t-card-accent--mine"></div>
            <div class="t-card-body">
              <div class="t-card-top-row">
                <div class="t-card-name">{{ req.department_name || req.shift?.department_name || 'Trade Request' }}</div>
                <span class="t-status-chip" :class="'t-status--' + (req.status || 'pending').toLowerCase()">{{ req.status || 'Pending' }}</span>
              </div>
              <div class="t-card-detail">{{ formatDate(req.shift_date || req.shift?.shift_date || req.shift?.start_time) }} · {{ formatTimeRange(req.shift || req) }}</div>
              <div v-if="req.notes" class="t-card-note">{{ req.notes }}</div>
              <div class="t-card-detail t-card-detail--muted">Posted {{ formatDate(req.createdAt || req.created_at) }}</div>
              <button
                v-if="(req.status || '').toLowerCase() === 'pending' || (req.status || '').toLowerCase() === 'open'"
                class="t-action-btn t-action-btn--danger"
                :disabled="req._loading"
                @click="cancelRequest(req)"
              >{{ req._loading ? 'Cancelling...' : 'Cancel Request' }}</button>
            </div>
          </div>
        </div>
        <div v-else class="t-empty">
          <v-icon icon="mdi-clipboard-text-outline" size="44" color="#ccc" />
          <div class="t-empty-title">No requests posted</div>
          <div class="t-empty-sub">Tap + to post a trade request for one of your shifts</div>
        </div>
      </div>

      <!-- INCOMING -->
      <div v-if="activeTab === 'incoming'">
        <div v-if="loadingIncoming" class="t-loading"><v-progress-circular indeterminate size="28" width="2" color="#80162B" /></div>
        <div v-else-if="incomingRequests.length" class="t-card-list">
          <div v-for="req in incomingRequests" :key="req.id" class="t-card">
            <div class="t-card-accent t-card-accent--incoming"></div>
            <div class="t-card-body">
              <div class="t-card-header">
                <div class="t-avatar t-avatar--blue">{{ getInitials(req.requester_name || req.user?.fName) }}</div>
                <div class="t-card-meta">
                  <div class="t-card-name">{{ req.requester_name || formatUserName(req.user) || 'Student' }}</div>
                  <div class="t-card-sub">wants to trade</div>
                </div>
                <span class="t-status-chip" :class="'t-status--' + (req.status || 'pending').toLowerCase()">{{ req.status || 'Pending' }}</span>
              </div>
              <div class="t-card-detail">{{ req.shift_details || req.shift?.department_name || 'Shift' }}</div>
              <div class="t-card-detail">{{ formatDate(req.shift_date || req.shift?.shift_date || req.shift?.start_time) }} · {{ formatTimeRange(req.shift || req) }}</div>
              <div v-if="(req.status || '').toLowerCase() === 'pending'" class="t-action-row">
                <button class="t-action-btn t-action-btn--accept" :disabled="req._accepting" @click="acceptIncoming(req)">
                  {{ req._accepting ? 'Accepting...' : 'Accept' }}
                </button>
                <button class="t-action-btn t-action-btn--decline" :disabled="req._declining" @click="declineIncoming(req)">
                  {{ req._declining ? '...' : 'Decline' }}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="t-empty">
          <v-icon icon="mdi-arrow-down-bold-circle-outline" size="44" color="#ccc" />
          <div class="t-empty-title">No incoming trades</div>
          <div class="t-empty-sub">Swap requests from coworkers will show up here</div>
        </div>
      </div>
    </div>

    <!-- FAB -->
    <button class="t-fab" @click="showPostDialog = true">
      <v-icon icon="mdi-plus" size="24" color="white" />
    </button>

    <!-- Post dialog + Snackbar (shared) -->
    <v-dialog v-model="showPostDialog" max-width="100vw" transition="dialog-bottom-transition">
      <v-card class="t-bottom-sheet">
        <div class="t-sheet-handle"></div>
        <div class="t-sheet-title">Post Trade Request</div>
        <v-alert v-if="!myShifts.length && !loadingMyShifts" type="info" variant="tonal" density="compact" class="mb-3">
          You need assigned shifts to post a trade.
        </v-alert>
        <v-select v-model="postForm.shiftId" :items="myShifts" item-title="label" item-value="id" label="Select shift to trade" variant="outlined" density="comfortable" :loading="loadingMyShifts" :disabled="!myShifts.length" class="mb-3" />
        <v-radio-group v-model="postForm.type" inline density="compact" class="mb-3">
          <v-radio label="Post to pool" value="pool" />
          <v-radio label="Specific coworker" value="specific" />
        </v-radio-group>
        <v-text-field v-if="postForm.type === 'specific'" v-model="postForm.respondentUserId" label="Coworker User ID" variant="outlined" density="comfortable" class="mb-3" />
        <v-text-field v-if="postForm.type === 'specific'" v-model="postForm.respondentShiftId" label="Coworker's Shift ID" variant="outlined" density="comfortable" class="mb-3" />
        <v-textarea v-model="postForm.notes" label="Notes (optional)" variant="outlined" density="comfortable" rows="2" class="mb-3" />
        <div class="t-sheet-actions">
          <button class="t-sheet-cancel" @click="showPostDialog = false">Cancel</button>
          <button class="t-sheet-confirm" :disabled="!postForm.shiftId || postForm.submitting" @click="submitTradeRequest">
            {{ postForm.submitting ? 'Submitting...' : 'Submit' }}
          </button>
        </div>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="bottom">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
  </PullToRefresh>

  <!-- ═══ DESKTOP LAYOUT (unchanged) ═══ -->
  <PullToRefresh v-else @refresh="handlePullRefresh">
  <div class="trade-board-page pa-6">
    <div class="d-flex align-center justify-space-between mb-6" style="gap:12px">
      <div>
        <h1 class="text-h4 font-weight-bold">Shift Trade Board</h1>
        <p class="text-body-1 text-medium-emphasis mt-1">
          Browse open requests, manage your trades, and respond to incoming swap requests
        </p>
      </div>
      <v-btn color="#8B1538" variant="flat" prepend-icon="mdi-plus" @click="showPostDialog = true">
        Post Trade Request
      </v-btn>
    </div>

    <v-tabs v-model="activeTab" color="#8B1538" class="mb-6">
      <v-tab value="open">
        Open Requests
        <v-badge v-if="openRequests.length" :content="openRequests.length" color="#8B1538" inline class="ml-1" />
      </v-tab>
      <v-tab value="mine">
        My Requests
        <v-badge v-if="myRequests.length" :content="myRequests.length" color="grey" inline class="ml-1" />
      </v-tab>
      <v-tab value="incoming">
        Incoming
        <v-badge v-if="pendingIncoming.length" :content="pendingIncoming.length" color="warning" inline class="ml-1" />
      </v-tab>
    </v-tabs>

    <!-- Tab 1: Open Requests -->
    <div v-if="activeTab === 'open'">
      <template v-if="loadingOpen">
        <v-row><v-col v-for="n in 3" :key="n" cols="12" sm="6" lg="4"><v-skeleton-loader type="card" /></v-col></v-row>
      </template>
      <template v-else-if="openRequests.length">
        <v-row>
          <v-col v-for="req in openRequests" :key="req.id" cols="12" sm="6" lg="4">
            <v-card elevation="0" rounded="lg" border class="fill-height">
              <v-card-text class="pa-4">
                <div class="d-flex align-center mb-2">
                  <v-avatar size="32" color="#8B1538" class="mr-2"><span class="text-caption text-white">{{ getInitials(req.requester?.fName || req.requester_name) }}</span></v-avatar>
                  <div>
                    <div class="text-body-1 font-weight-bold">{{ formatUserName(req.requester) || req.requester_name || 'Student' }}</div>
                    <div class="text-caption text-medium-emphasis">needs coverage</div>
                  </div>
                </div>
                <div class="text-body-2 text-medium-emphasis mb-1"><v-icon size="14" class="mr-1">mdi-briefcase-outline</v-icon>{{ req.requesterShift?.department?.department_name || req.department_name || 'Department' }}</div>
                <div class="text-body-2 text-medium-emphasis mb-1"><v-icon size="14" class="mr-1">mdi-calendar</v-icon>{{ formatDate(req.requesterShift?.shift_date || req.shift_date) }}</div>
                <div class="text-body-2 text-medium-emphasis mb-1"><v-icon size="14" class="mr-1">mdi-clock-outline</v-icon>{{ formatTimeRange(req.requesterShift || req) }}</div>
                <div v-if="req.requesterShift?.position?.position_name" class="text-body-2 text-medium-emphasis mb-1"><v-icon size="14" class="mr-1">mdi-badge-account-outline</v-icon>{{ req.requesterShift.position.position_name }}</div>
                <div v-if="req.requester_notes" class="text-caption text-medium-emphasis mb-3"><v-icon size="12" class="mr-1">mdi-note-text</v-icon>{{ req.requester_notes }}</div>
                <v-btn color="#8B1538" variant="flat" size="small" block :loading="req._loading" @click="pickUpRequest(req)" class="mt-2">Pick Up Shift</v-btn>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </template>
      <v-card v-else elevation="0" rounded="lg" border class="pa-8 text-center">
        <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-swap-horizontal</v-icon>
        <div class="text-body-1 text-medium-emphasis">No open trade requests</div>
        <div class="text-caption text-medium-emphasis">When other students post trade requests, they'll appear here</div>
      </v-card>
    </div>

    <!-- Tab 2: My Requests -->
    <div v-if="activeTab === 'mine'">
      <template v-if="loadingMine">
        <v-row><v-col v-for="n in 3" :key="n" cols="12" sm="6" lg="4"><v-skeleton-loader type="card" /></v-col></v-row>
      </template>
      <template v-else-if="myRequests.length">
        <v-row>
          <v-col v-for="req in myRequests" :key="req.id" cols="12" sm="6" lg="4">
            <v-card elevation="0" rounded="lg" border class="fill-height">
              <v-card-text class="pa-4">
                <div class="d-flex align-center justify-space-between mb-2">
                  <div class="text-body-1 font-weight-bold">{{ req.department_name || req.shift?.department_name || 'Trade Request' }}</div>
                  <v-chip size="small" :color="statusColor(req.status)" variant="tonal">{{ req.status || 'Pending' }}</v-chip>
                </div>
                <div class="text-body-2 text-medium-emphasis mb-1"><v-icon size="14" class="mr-1">mdi-calendar</v-icon>{{ formatDate(req.shift_date || req.shift?.shift_date || req.shift?.start_time) }}</div>
                <div class="text-body-2 text-medium-emphasis mb-1"><v-icon size="14" class="mr-1">mdi-clock-outline</v-icon>{{ formatTimeRange(req.shift || req) }}</div>
                <div v-if="req.notes" class="text-caption text-medium-emphasis mb-2"><v-icon size="12" class="mr-1">mdi-note-text</v-icon>{{ req.notes }}</div>
                <div class="text-caption text-medium-emphasis mb-3">Posted {{ formatDate(req.createdAt || req.created_at) }}</div>
                <v-btn v-if="(req.status || '').toLowerCase() === 'pending' || (req.status || '').toLowerCase() === 'open'" color="error" variant="outlined" size="small" block :loading="req._loading" @click="cancelRequest(req)">Cancel Request</v-btn>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </template>
      <v-card v-else elevation="0" rounded="lg" border class="pa-8 text-center">
        <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-clipboard-text-outline</v-icon>
        <div class="text-body-1 text-medium-emphasis">You haven't posted any trade requests</div>
        <div class="text-caption text-medium-emphasis">Use the "Post Trade Request" button to request coverage for a shift</div>
      </v-card>
    </div>

    <!-- Tab 3: Incoming -->
    <div v-if="activeTab === 'incoming'">
      <template v-if="loadingIncoming">
        <v-row><v-col v-for="n in 3" :key="n" cols="12" sm="6" lg="4"><v-skeleton-loader type="card" /></v-col></v-row>
      </template>
      <template v-else-if="incomingRequests.length">
        <v-row>
          <v-col v-for="req in incomingRequests" :key="req.id" cols="12" sm="6" lg="4">
            <v-card elevation="0" rounded="lg" border class="fill-height">
              <v-card-text class="pa-4">
                <div class="d-flex align-center mb-2">
                  <v-avatar size="32" color="#196CA2" class="mr-2"><span class="text-caption text-white">{{ getInitials(req.requester_name || req.user?.fName) }}</span></v-avatar>
                  <div>
                    <div class="text-body-1 font-weight-bold">{{ req.requester_name || formatUserName(req.user) || 'Student' }}</div>
                    <div class="text-caption text-medium-emphasis">wants to trade with you</div>
                  </div>
                </div>
                <div class="text-body-2 text-medium-emphasis mb-1"><v-icon size="14" class="mr-1">mdi-briefcase-outline</v-icon>{{ req.shift_details || req.shift?.department_name || 'Shift details' }}</div>
                <div class="text-body-2 text-medium-emphasis mb-1"><v-icon size="14" class="mr-1">mdi-calendar</v-icon>{{ formatDate(req.shift_date || req.shift?.shift_date || req.shift?.start_time) }}</div>
                <div class="text-body-2 text-medium-emphasis mb-1"><v-icon size="14" class="mr-1">mdi-clock-outline</v-icon>{{ formatTimeRange(req.shift || req) }}</div>
                <div v-if="req.notes" class="text-caption text-medium-emphasis mb-2"><v-icon size="12" class="mr-1">mdi-note-text</v-icon>{{ req.notes }}</div>
                <v-chip size="small" :color="statusColor(req.status)" variant="tonal" class="mb-3">{{ req.status || 'Pending' }}</v-chip>
                <div v-if="(req.status || '').toLowerCase() === 'pending'" class="d-flex ga-2">
                  <v-btn color="success" variant="flat" size="small" class="flex-grow-1" :loading="req._accepting" @click="acceptIncoming(req)">Accept</v-btn>
                  <v-btn color="error" variant="outlined" size="small" class="flex-grow-1" :loading="req._declining" @click="declineIncoming(req)">Decline</v-btn>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </template>
      <v-card v-else elevation="0" rounded="lg" border class="pa-8 text-center">
        <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-arrow-down-bold-circle-outline</v-icon>
        <div class="text-body-1 text-medium-emphasis">No incoming trade requests</div>
        <div class="text-caption text-medium-emphasis">When someone wants to trade a shift with you, it'll show up here</div>
      </v-card>
    </div>

    <!-- Post Dialog (desktop) -->
    <v-dialog v-model="showPostDialog" max-width="560">
      <v-card rounded="lg">
        <v-card-title class="pa-4 d-flex align-center"><v-icon class="mr-2">mdi-swap-horizontal</v-icon>Post Trade Request</v-card-title>
        <v-card-text class="pa-4 pt-0">
          <v-alert v-if="!myShifts.length && !loadingMyShifts" type="info" variant="tonal" class="mb-4">You need to be assigned shifts before you can post trade requests.</v-alert>
          <v-select v-model="postForm.shiftId" :items="myShifts" item-title="label" item-value="id" label="Select your shift to trade" variant="outlined" density="comfortable" :loading="loadingMyShifts" :disabled="!myShifts.length" class="mb-4" />
          <v-radio-group v-model="postForm.type" inline class="mb-4">
            <v-radio label="Post to pool (anyone can pick up)" value="pool" />
            <v-radio label="Request swap with specific coworker" value="specific" />
          </v-radio-group>
          <v-text-field v-if="postForm.type === 'specific'" v-model="postForm.respondentUserId" label="Coworker User ID" variant="outlined" density="comfortable" class="mb-4" />
          <v-text-field v-if="postForm.type === 'specific'" v-model="postForm.respondentShiftId" label="Coworker's Shift ID" variant="outlined" density="comfortable" class="mb-4" />
          <v-textarea v-model="postForm.notes" label="Reason / Notes (optional)" variant="outlined" density="comfortable" rows="3" />
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="showPostDialog = false">Cancel</v-btn>
          <v-btn color="#8B1538" variant="flat" :loading="postForm.submitting" :disabled="!postForm.shiftId" @click="submitTradeRequest">Submit Request</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="bottom">
      {{ snackbar.text }}
      <template #actions><v-btn variant="text" @click="snackbar.show = false">Close</v-btn></template>
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
.trade-board-page { width: 100%; }

/* ═══ MOBILE STYLES ═══ */
.trade-screen {
  background: #F7F7F8;
  min-height: 100vh;
  padding: 0 0 100px;
}

.t-segment-wrap { padding: 16px 16px 0; }
.t-segment { display: flex; background: #EBEBEB; border-radius: 10px; padding: 3px; }
.t-seg-btn {
  flex: 1; padding: 9px 0; border: none; background: none; border-radius: 8px;
  font-size: 13px; font-weight: 600; color: #666; cursor: pointer; transition: all 0.2s ease;
}
.t-seg-btn--active { background: #fff; color: #1a1a1a; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.t-seg-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px;
  background: #80162B; color: #fff; font-size: 9px; font-weight: 700; margin-left: 4px; vertical-align: middle;
}
.t-seg-badge--grey { background: #999; }
.t-seg-badge--warn { background: #F59E0B; }

.t-content { padding: 14px 16px; }
.t-loading { display: flex; justify-content: center; padding: 40px 0; }

/* Cards */
.t-card-list { display: flex; flex-direction: column; gap: 10px; }
.t-card {
  display: flex; background: #fff; border-radius: 12px; overflow: hidden;
}
.t-card-accent { width: 4px; flex-shrink: 0; }
.t-card-accent--open { background: #80162B; }
.t-card-accent--mine { background: #196CA2; }
.t-card-accent--incoming { background: #F59E0B; }
.t-card-body { flex: 1; padding: 14px 16px; }
.t-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.t-card-top-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.t-avatar {
  width: 32px; height: 32px; border-radius: 50%; background: #80162B; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; flex-shrink: 0;
}
.t-avatar--blue { background: #196CA2; }
.t-card-meta { flex: 1; min-width: 0; }
.t-card-name { font-size: 14px; font-weight: 600; color: #1a1a1a; }
.t-card-sub { font-size: 11px; color: #999; }
.t-card-detail { font-size: 13px; color: #666; margin-bottom: 2px; }
.t-card-detail--muted { color: #aaa; font-size: 11px; margin-top: 4px; }
.t-card-note { font-size: 12px; color: #888; font-style: italic; margin: 4px 0; }

/* Status chips */
.t-status-chip {
  font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px;
  text-transform: uppercase; letter-spacing: 0.04em;
}
.t-status--pending { background: rgba(245, 158, 11, 0.12); color: #D97706; }
.t-status--open { background: rgba(245, 158, 11, 0.12); color: #D97706; }
.t-status--approved, .t-status--accepted, .t-status--claimed { background: rgba(13, 148, 136, 0.12); color: #0D9488; }
.t-status--denied, .t-status--declined, .t-status--cancelled { background: rgba(220, 38, 38, 0.1); color: #DC2626; }

/* Action buttons */
.t-action-btn {
  width: 100%; padding: 11px; border: none; border-radius: 10px;
  font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 10px; transition: opacity 0.15s;
}
.t-action-btn:disabled { opacity: 0.5; }
.t-action-btn--primary { background: #80162B; color: #fff; }
.t-action-btn--danger { background: none; border: 1.5px solid #DC2626; color: #DC2626; }
.t-action-row { display: flex; gap: 8px; margin-top: 10px; }
.t-action-btn--accept { flex: 1; background: #0D9488; color: #fff; margin-top: 0; }
.t-action-btn--decline { flex: 1; background: none; border: 1.5px solid #DC2626; color: #DC2626; margin-top: 0; }

/* Empty states */
.t-empty {
  display: flex; flex-direction: column; align-items: center; padding: 48px 24px; text-align: center;
}
.t-empty-title { font-size: 16px; font-weight: 600; color: #666; margin-top: 12px; }
.t-empty-sub { font-size: 13px; color: #999; margin-top: 4px; }

/* FAB */
.t-fab {
  position: fixed; bottom: calc(80px + env(safe-area-inset-bottom, 0px)); right: 20px;
  width: 52px; height: 52px; border-radius: 50%; background: #80162B; border: none;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 14px rgba(128, 22, 43, 0.35); cursor: pointer; z-index: 50;
}
.t-fab:active { transform: scale(0.92); }

/* Bottom sheet */
.t-bottom-sheet { border-radius: 20px 20px 0 0 !important; padding: 16px 20px 24px; }
.t-sheet-handle { width: 36px; height: 4px; border-radius: 2px; background: #ddd; margin: 0 auto 16px; }
.t-sheet-title { font-size: 17px; font-weight: 700; color: #1a1a1a; margin-bottom: 16px; }
.t-sheet-actions { display: flex; gap: 10px; margin-top: 8px; }
.t-sheet-cancel {
  flex: 1; padding: 13px; border: 1.5px solid #e0e0e0; border-radius: 12px;
  background: #fff; font-size: 15px; font-weight: 600; color: #666; cursor: pointer;
}
.t-sheet-confirm {
  flex: 1; padding: 13px; border: none; border-radius: 12px;
  background: #80162B; color: #fff; font-size: 15px; font-weight: 600; cursor: pointer;
}
.t-sheet-confirm:disabled { opacity: 0.5; }
</style>
