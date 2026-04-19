<template>
  <v-container fluid class="pa-4">
    <!-- Header -->
    <div class="approvals-header mb-6">
      <div class="d-flex align-center">
        <v-icon size="28" class="mr-3" color="primary">mdi-checkbox-marked-outline</v-icon>
        <div>
          <h1 class="text-h4 font-weight-bold">Approvals</h1>
          <p class="text-body-2 text-medium-emphasis mb-0">
            Review pending requests from your students.
          </p>
        </div>
        <v-spacer />
        <v-btn
          variant="tonal"
          color="primary"
          prepend-icon="mdi-refresh"
          :loading="loading || swapsLoading || ackLoading"
          @click="loadAll"
        >
          Refresh
        </v-btn>
      </div>
    </div>

    <!-- Tabs -->
    <v-tabs v-model="activeTab" color="primary" class="mb-4 approvals-tabs">
      <v-tab value="time-off">
        Time Off Requests
        <v-badge
          v-if="pendingTimeOffCount > 0"
          :content="pendingTimeOffCount"
          color="primary"
          inline
          class="ml-2"
        />
      </v-tab>
      <v-tab value="shift-swaps">
        Shift Requests
        <v-badge
          v-if="pendingSwapCount > 0"
          :content="pendingSwapCount"
          color="primary"
          inline
          class="ml-2"
        />
      </v-tab>
      <v-tab value="shift-acknowledgments">
        Shift Acknowledgments
        <v-badge
          v-if="unacknowledgedCount > 0"
          :content="unacknowledgedCount"
          color="primary"
          inline
          class="ml-2"
        />
      </v-tab>
    </v-tabs>

    <v-tabs-window v-model="activeTab">
      <!-- ─── Time Off Requests Tab ─────────────────────────────────── -->
      <v-tabs-window-item value="time-off">
        <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

        <v-alert v-if="timeOffError" type="error" variant="tonal" class="mb-4">
          {{ timeOffError }}
        </v-alert>

        <div v-if="timeOffRequests.length === 0 && !loading" class="empty-state">
          <v-icon size="56" color="grey-lighten-1">mdi-calendar-check-outline</v-icon>
          <p class="text-body-1 text-medium-emphasis mt-3 mb-0">You're all caught up.</p>
          <p class="text-caption text-medium-emphasis">No pending time off requests.</p>
        </div>

        <v-card
          v-for="req in timeOffRequests"
          :key="req.id"
          variant="outlined"
          class="approval-card mb-3"
        >
          <v-card-text>
            <div class="d-flex align-start justify-space-between flex-wrap ga-3">
              <div class="flex-grow-1 min-w-0">
                <div class="d-flex align-center flex-wrap ga-2">
                  <span class="text-subtitle-1 font-weight-bold">
                    {{ req.user?.fName }} {{ req.user?.lName }}
                  </span>
                  <span class="text-caption text-medium-emphasis">{{ req.user?.email }}</span>
                </div>
                <div class="approval-meta mt-2">
                  <span class="approval-meta-item">
                    <v-icon size="14">mdi-calendar</v-icon>
                    {{ formatDate(req.start_date) }} &rarr; {{ formatDate(req.end_date) }}
                  </span>
                </div>
                <div v-if="req.notes" class="approval-note mt-2">
                  <v-icon size="14" class="mr-1">mdi-note-text-outline</v-icon>
                  {{ req.notes }}
                </div>
              </div>

              <div class="d-flex ga-2 flex-shrink-0">
                <v-btn
                  color="success"
                  variant="tonal"
                  size="small"
                  prepend-icon="mdi-check"
                  :loading="actioning === req.id + '-approve'"
                  @click="actionTimeOff(req, 'approve')"
                >
                  Approve
                </v-btn>
                <v-btn
                  color="error"
                  variant="tonal"
                  size="small"
                  prepend-icon="mdi-close"
                  :loading="actioning === req.id + '-reject'"
                  @click="actionTimeOff(req, 'reject')"
                >
                  Deny
                </v-btn>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-tabs-window-item>

      <!-- ─── Shift Requests Tab ───────────────────────────────────── -->
      <v-tabs-window-item value="shift-swaps">
        <v-progress-linear v-if="swapsLoading" indeterminate color="primary" class="mb-4" />

        <div v-if="!hasPendingSwapActions && !swapsLoading" class="empty-state">
          <v-icon size="56" color="grey-lighten-1">mdi-checkbox-marked-circle-outline</v-icon>
          <p class="text-body-1 text-medium-emphasis mt-3 mb-0">You're all caught up.</p>
          <p class="text-caption text-medium-emphasis">No pending shift swap actions.</p>
        </div>

        <!-- ── Stage 1: Cover Requests awaiting manager approval ── -->
        <template v-if="coverRequests.length > 0">
          <div class="approval-section-header">
            <v-icon size="18" color="primary" class="mr-2">mdi-account-switch-outline</v-icon>
            <span>Cover Requests</span>
            <v-chip size="x-small" variant="tonal" color="primary" class="ml-2">
              {{ coverRequests.length }}
            </v-chip>
            <span class="approval-section-hint">
              Approving posts the shift as open for pickup.
            </span>
          </div>

          <v-card
            v-for="swap in coverRequests"
            :key="swap.id"
            variant="outlined"
            class="approval-card mb-3"
          >
            <v-card-text>
              <div class="d-flex align-start justify-space-between flex-wrap ga-3">
                <div class="flex-grow-1 min-w-0">
                  <div class="text-subtitle-1 font-weight-bold">
                    {{ swap.requestedBy }}
                  </div>
                  <div class="approval-meta mt-2">
                    <span class="approval-meta-item">
                      <v-icon size="14">mdi-calendar</v-icon>
                      {{ swap.dateLabel }}
                    </span>
                    <span class="approval-meta-item">
                      <v-icon size="14">mdi-clock-outline</v-icon>
                      {{ swap.timeRange }}
                    </span>
                    <span class="approval-meta-item">
                      <v-icon size="14">mdi-map-marker-outline</v-icon>
                      {{ swap.location }}
                    </span>
                  </div>
                  <div v-if="swap.reason" class="approval-note mt-2">
                    <v-icon size="14" class="mr-1">mdi-message-outline</v-icon>
                    {{ swap.reason }}
                  </div>
                </div>

                <div class="d-flex ga-2 flex-shrink-0">
                  <v-btn
                    color="success"
                    variant="tonal"
                    size="small"
                    prepend-icon="mdi-check"
                    :loading="actioning === `swap-${swap.id}-approve`"
                    @click="reviewSwap(swap, 'approve')"
                  >
                    Post as Open
                  </v-btn>
                  <v-btn
                    color="error"
                    variant="tonal"
                    size="small"
                    prepend-icon="mdi-close"
                    :loading="actioning === `swap-${swap.id}-reject`"
                    @click="reviewSwap(swap, 'decline')"
                  >
                    Deny
                  </v-btn>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </template>

        <!-- ── Stage 2: Pickup Requests awaiting manager approval ── -->
        <template v-if="pickupRequests.length > 0">
          <div class="approval-section-header">
            <v-icon size="18" color="primary" class="mr-2">mdi-hand-extended-outline</v-icon>
            <span>Pickup Requests</span>
            <v-chip size="x-small" variant="tonal" color="primary" class="ml-2">
              {{ pickupRequests.length }}
            </v-chip>
            <span class="approval-section-hint">
              Students volunteering to take an open shift.
            </span>
          </div>

          <v-card
            v-for="swap in pickupRequests"
            :key="swap.id"
            variant="outlined"
            class="approval-card mb-3"
          >
            <v-card-text>
              <div class="d-flex align-start justify-space-between flex-wrap ga-3">
                <div class="flex-grow-1 min-w-0">
                  <div class="text-subtitle-1 font-weight-bold">
                    {{ swap.requestedBy }}
                    <span class="text-caption text-medium-emphasis ml-1">needs cover</span>
                  </div>
                  <div class="approval-meta mt-2">
                    <span class="approval-meta-item">
                      <v-icon size="14">mdi-calendar</v-icon>
                      {{ swap.dateLabel }}
                    </span>
                    <span class="approval-meta-item">
                      <v-icon size="14">mdi-clock-outline</v-icon>
                      {{ swap.timeRange }}
                    </span>
                    <span class="approval-meta-item">
                      <v-icon size="14">mdi-map-marker-outline</v-icon>
                      {{ swap.location }}
                    </span>
                  </div>
                  <div v-if="swap.claimedBy" class="approval-volunteer mt-2">
                    <v-icon size="14" color="success" class="mr-1">mdi-account-check</v-icon>
                    <strong>Volunteer:</strong>&nbsp;{{ swap.claimedBy }}
                  </div>
                  <div v-if="swap.reason" class="approval-note mt-2">
                    <v-icon size="14" class="mr-1">mdi-message-outline</v-icon>
                    {{ swap.reason }}
                  </div>
                </div>

                <div class="d-flex ga-2 flex-shrink-0">
                  <v-btn
                    color="success"
                    variant="tonal"
                    size="small"
                    prepend-icon="mdi-check"
                    :loading="actioning === `swap-${swap.id}-approve`"
                    @click="reviewSwap(swap, 'approve')"
                  >
                    Approve
                  </v-btn>
                  <v-btn
                    color="error"
                    variant="tonal"
                    size="small"
                    prepend-icon="mdi-close"
                    :loading="actioning === `swap-${swap.id}-reject`"
                    @click="reviewSwap(swap, 'decline')"
                  >
                    Deny
                  </v-btn>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </template>

        <!-- ── Swap Requests ── -->
        <template v-if="actionableTradeRequests.length > 0">
          <div class="approval-section-header">
            <v-icon size="18" color="primary" class="mr-2">mdi-swap-horizontal</v-icon>
            <span>Swap Requests</span>
            <v-chip size="x-small" variant="tonal" color="primary" class="ml-2">
              {{ actionableTradeRequests.length }}
            </v-chip>
            <span class="approval-section-hint">
              Direct swap requests between two students.
            </span>
          </div>

          <v-card
            v-for="swap in actionableTradeRequests"
            :key="swap.id"
            variant="outlined"
            class="approval-card mb-3"
          >
            <v-card-text>
              <div class="d-flex align-start justify-space-between flex-wrap ga-3">
                <div class="flex-grow-1 min-w-0">
                  <div class="text-subtitle-1 font-weight-bold">
                    {{ swap.requestedBy }}
                  </div>
                  <div class="approval-meta mt-2">
                    <span class="approval-meta-item">
                      <v-icon size="14">mdi-calendar</v-icon>
                      {{ swap.dateLabel }}
                    </span>
                    <span class="approval-meta-item">
                      <v-icon size="14">mdi-clock-outline</v-icon>
                      {{ swap.timeRange }}
                    </span>
                    <span class="approval-meta-item">
                      <v-icon size="14">mdi-map-marker-outline</v-icon>
                      {{ swap.location }}
                    </span>
                  </div>
                  <div v-if="swap.claimedBy" class="approval-volunteer mt-2">
                    <v-icon size="14" color="primary" class="mr-1">mdi-swap-horizontal</v-icon>
                    <strong>Trading with:</strong>&nbsp;{{ swap.claimedBy }}
                  </div>
                  <div v-if="swap.reason" class="approval-note mt-2">
                    <v-icon size="14" class="mr-1">mdi-message-outline</v-icon>
                    {{ swap.reason }}
                  </div>
                </div>

                <div v-if="swap.status === 'pending'" class="d-flex flex-column align-end ga-2 flex-shrink-0">
                  <v-chip size="x-small" color="warning" variant="tonal">
                    Awaiting other student
                  </v-chip>
                  <v-btn
                    color="error"
                    variant="tonal"
                    size="small"
                    prepend-icon="mdi-close"
                    :loading="actioning === `swap-${swap.id}-reject`"
                    @click="reviewSwap(swap, 'decline')"
                  >
                    Deny
                  </v-btn>
                </div>

                <div v-else-if="swap.status === 'manager_pending'" class="d-flex ga-2 flex-shrink-0">
                  <v-btn
                    color="success"
                    variant="tonal"
                    size="small"
                    prepend-icon="mdi-check"
                    :loading="actioning === `swap-${swap.id}-approve`"
                    @click="reviewSwap(swap, 'approve')"
                  >
                    Approve
                  </v-btn>
                  <v-btn
                    color="error"
                    variant="tonal"
                    size="small"
                    prepend-icon="mdi-close"
                    :loading="actioning === `swap-${swap.id}-reject`"
                    @click="reviewSwap(swap, 'decline')"
                  >
                    Deny
                  </v-btn>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </template>
      </v-tabs-window-item>

      <!-- ─── Shift Acknowledgments Tab ──────────────────────────────── -->
      <v-tabs-window-item value="shift-acknowledgments">
        <v-progress-linear v-if="ackLoading" indeterminate color="primary" class="mb-4" />

        <v-alert v-if="ackError" type="error" variant="tonal" class="mb-4">
          {{ ackError }}
        </v-alert>

        <div v-if="activeTab === 'shift-acknowledgments' && acknowledgments.length === 0 && !ackLoading" class="empty-state">
          <v-icon size="48" color="grey-lighten-1">mdi-check-decagram</v-icon>
          <p class="text-body-1 text-medium-emphasis mt-2">No pending shift acknowledgments found.</p>
        </div>

        <v-card
          v-for="ack in acknowledgments"
          v-if="activeTab === 'shift-acknowledgments'"
          :key="ack.id"
          elevation="2"
          class="mb-3"
        >
          <v-card-text>
            <div class="d-flex align-start justify-space-between flex-wrap gap-2">
              <div>
                <div class="text-subtitle-1 font-weight-bold">
                  {{ ack.user?.fName }} {{ ack.user?.lName }}
                  <span class="text-caption text-medium-emphasis ml-1">{{ ack.user?.email }}</span>
                </div>
                <div class="d-flex align-center gap-2 mt-1 flex-wrap">
                  <v-chip size="x-small" variant="tonal">
                    {{ ack.shift?.department?.department_name || 'Department' }}
                  </v-chip>
                  <v-chip size="x-small" variant="tonal">
                    {{ formatDate(ack.shift?.shift_date) }}
                  </v-chip>
                  <v-chip
                    size="x-small"
                    :color="ack.acknowledged ? 'success' : 'warning'"
                    variant="flat"
                  >
                    {{ ack.acknowledged ? 'Acknowledged' : 'Pending' }}
                  </v-chip>
                </div>
                <div v-if="ack.acknowledgedAt" class="text-caption text-medium-emphasis mt-1">
                  Acknowledged on {{ formatDateTime(ack.acknowledgedAt) }}
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-tabs-window-item>
    </v-tabs-window>
  </v-container>

  <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3500">
    {{ snackbar.text }}
  </v-snackbar>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import apiClient from '../services/services.js'
import Utils from '../config/utils.js'
import { TZ } from '../utils/tz.js'

const deptContext = Utils.getStore('currentDepartmentContext') || {}
const currentDeptId = deptContext.department_id || null

const activeTab = ref('time-off')
const loading = ref(false)
const swapsLoading = ref(false)
const ackLoading = ref(false)
const actioning = ref(null)
const timeOffError = ref('')
const ackError = ref('')
const timeOffRequests = ref([])
const swapRequests = ref([])
const acknowledgments = ref([])
const snackbar = ref({ show: false, text: '', color: 'success' })

const pendingTimeOffCount = computed(() =>
  timeOffRequests.value.filter(r => r.status === 'pending').length
)

const pendingSwapCount = computed(() =>
  coverRequests.value.length +
  pickupRequests.value.length +
  tradeRequests.value.filter(s => ['pending', 'manager_pending'].includes(s.status)).length
)

// Derived sub-lists from swapRequests
// Stage 1: pending find_cover (manager needs to approve/deny the cover request itself)
const coverRequests = computed(() =>
  swapRequests.value.filter(s => s.type === 'find_cover' && s.status === 'pending')
)

// Stage 2: manager_pending find_cover (someone volunteered to pick up the approved-cover shift)
const pickupRequests = computed(() =>
  swapRequests.value.filter(s => s.type === 'find_cover' && s.status === 'manager_pending')
)

// Shift trades (swap type)
const tradeRequests = computed(() =>
  swapRequests.value.filter(s => s.type === 'swap')
)

const actionableTradeRequests = computed(() =>
  tradeRequests.value.filter(s => ['pending', 'manager_pending'].includes(s.status))
)

const hasPendingSwapActions = computed(() =>
  coverRequests.value.length > 0 ||
  pickupRequests.value.length > 0 ||
  actionableTradeRequests.value.length > 0
)

const unacknowledgedCount = computed(() =>
  acknowledgments.value.filter(a => !a.acknowledged).length
)

const loadTimeOffRequests = async () => {
  loading.value = true
  timeOffError.value = ''
  try {
    const params = new URLSearchParams()
    params.append('status', 'pending')
    const response = await apiClient.get(`/manager/time-off-requests?${params.toString()}`)
    timeOffRequests.value = response?.data?.data || response?.data || []
  } catch (err) {
    timeOffError.value = 'Failed to load time off requests.'
    console.error(err)
  } finally {
    loading.value = false
  }
}

const loadSwapRequests = async () => {
  swapsLoading.value = true
  try {
    const response = await apiClient.get('/manager/swap-requests')
    const rows = response?.data?.data || []
    swapRequests.value = rows
      .map((row) => ({
        id: row.id,
        type: row.type || 'find_cover',
        requestType: row.type === 'swap' ? 'Swap Request' : 'Cover Request',
        requestedBy: `${row.requester?.fName || ''} ${row.requester?.lName || ''}`.trim() || row.requester?.email || 'Unknown',
        claimedBy: row.respondent ? `${row.respondent?.fName || ''} ${row.respondent?.lName || ''}`.trim() : '',
        dateLabel: formatDate(row.requesterShift?.shift_date),
        timeRange: `${formatTime(row.requesterShift?.start_time)} \u2013 ${formatTime(row.requesterShift?.end_time)}`,
        location: row.requesterShift?.department?.department_name || 'Department',
        reason: row.requester_notes || row.requester_notes || '',
        status: row.status || 'pending',
      }))
  } catch (err) {
    swapRequests.value = []
    showSnackbar('Failed to load shift requests', 'error')
  } finally {
    swapsLoading.value = false
  }
}

const loadAcknowledgments = async () => {
  ackLoading.value = true
  ackError.value = ''
  try {
    const params = new URLSearchParams()
    if (currentDeptId) params.append('departmentId', currentDeptId)
    params.append('acknowledged', 'false')

    const response = await apiClient.get(`/shift-acknowledgements?${params.toString()}`)
    acknowledgments.value = response?.data?.data || response?.data || []
  } catch (err) {
    ackError.value = 'Failed to load shift acknowledgments.'
    console.error(err)
  } finally {
    ackLoading.value = false
  }
}

const actionTimeOff = async (req, status) => {
  const key = `${req.id}-${status}`
  actioning.value = key
  try {
    await apiClient.put(`/manager/time-off-requests/${req.id}`, {
      action: status,
    })
    showSnackbar(`Request ${status === 'approve' ? 'approved' : 'rejected'}`, 'success')
    await loadTimeOffRequests()
  } catch (err) {
    showSnackbar('Failed to update request', 'error')
    console.error(err)
  } finally {
    actioning.value = null
  }
}

const reviewSwap = async (swap, action) => {
  actioning.value = `swap-${swap.id}-${action === 'approve' ? 'approve' : 'reject'}`
  try {
    await apiClient.put(`/manager/swap-requests/${swap.id}`, { action })
    showSnackbar(`Swap ${action === 'approve' ? 'approved' : 'rejected'}`, 'success')
    await loadSwapRequests()
  } catch (err) {
    showSnackbar('Failed to review swap', 'error')
    console.error(err)
  } finally {
    actioning.value = null
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    timeZone: TZ,
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  })
}

const formatTime = (timeStr) => {
  if (!timeStr) return '—'
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h, 10)
  const period = hour >= 12 ? 'PM' : 'AM'
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${display}:${m} ${period}`
}

const showSnackbar = (text, color = 'success') => {
  snackbar.value = { show: true, text, color }
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-US', {
    timeZone: TZ,
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit'
  })
}

const loadAll = () => {
  loadTimeOffRequests()
  loadSwapRequests()
  loadAcknowledgments()
}

onMounted(loadAll)
</script>

<style scoped>
.approvals-header {
  border: 1px solid var(--border-1);
  border-radius: 14px;
  background: #fff;
  padding: 16px 18px;
}

.approvals-tabs {
  border-bottom: 1px solid var(--border-1);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 52px 0;
  border: 1px dashed var(--border-1);
  border-radius: 12px;
  background: var(--surface-1);
}

.approval-card {
  border-color: var(--border-1) !important;
  border-radius: 12px;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.approval-card:hover {
  border-color: var(--border-1) !important;
  box-shadow: 0 6px 16px rgba(16, 24, 40, 0.08);
}

.approval-section-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0 10px;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-1);
}

.approval-section-hint {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-2);
  font-weight: 500;
}

.approval-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.approval-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-2);
  background: var(--surface-2);
  border: 1px solid var(--border-1);
  border-radius: 999px;
  padding: 4px 9px;
}

.approval-note {
  display: inline-flex;
  align-items: center;
  color: var(--text-2);
  font-size: 13px;
}

.approval-volunteer {
  display: inline-flex;
  align-items: center;
  color: var(--text-1);
  font-size: 13px;
}

.min-w-0 {
  min-width: 0;
}

@media (max-width: 960px) {
  .approval-section-hint {
    width: 100%;
    margin-left: 0;
    margin-top: 2px;
  }

  .approval-card :deep(.v-card-text) {
    padding: 14px;
  }
}
</style>
