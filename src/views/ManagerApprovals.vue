<template>
  <v-container fluid class="pa-4">
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-icon size="28" class="mr-3" color="primary">mdi-checkbox-marked-outline</v-icon>
      <div>
        <h1 class="text-h4 font-weight-bold">Approvals</h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Review time off requests and shift swap requests
        </p>
      </div>
      <v-spacer />
      <v-btn variant="text" prepend-icon="mdi-refresh" :loading="loading" @click="loadAll">
        Refresh
      </v-btn>
    </div>

    <!-- Tabs -->
    <v-tabs v-model="activeTab" color="#8B1538" class="mb-4">
      <v-tab value="time-off">
        Time Off Requests
        <v-badge
          v-if="pendingTimeOffCount > 0"
          :content="pendingTimeOffCount"
          color="error"
          inline
          class="ml-2"
        />
      </v-tab>
      <v-tab value="shift-swaps">
        Shift Swaps
        <v-badge
          v-if="pendingSwapCount > 0"
          :content="pendingSwapCount"
          color="error"
          inline
          class="ml-2"
        />
      </v-tab>
      <v-tab value="shift-acknowledgments">
        Shift Acknowledgments
        <v-badge
          v-if="unacknowledgedCount > 0"
          :content="unacknowledgedCount"
          color="warning"
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

        <!-- Filter row -->
        <div class="d-flex gap-3 mb-4 flex-wrap">
          <v-select
            v-model="timeOffFilter"
            :items="statusOptions"
            item-title="label"
            item-value="value"
            label="Status Filter"
            variant="outlined"
            density="compact"
            hide-details
            style="max-width:200px"
            @update:model-value="loadTimeOffRequests"
          />
        </div>

        <div v-if="timeOffRequests.length === 0 && !loading" class="empty-state">
          <v-icon size="48" color="grey-lighten-1">mdi-calendar-check-outline</v-icon>
          <p class="text-body-1 text-medium-emphasis mt-2">No time off requests found.</p>
        </div>

        <v-card
          v-for="req in timeOffRequests"
          :key="req.id"
          elevation="2"
          class="mb-3"
        >
          <v-card-text>
            <div class="d-flex align-start justify-space-between flex-wrap gap-2">
              <div>
                <div class="text-subtitle-1 font-weight-bold">
                  {{ req.user?.fName }} {{ req.user?.lName }}
                  <span class="text-caption text-medium-emphasis ml-1">{{ req.user?.email }}</span>
                </div>
                <div class="d-flex align-center gap-2 mt-1 flex-wrap">
                  <v-chip size="x-small" color="primary" variant="tonal">
                    <v-icon start size="12">mdi-calendar</v-icon>
                    {{ formatDate(req.start_date) }} → {{ formatDate(req.end_date) }}
                  </v-chip>
                  <v-chip
                    size="x-small"
                    :color="statusColor(req.status)"
                    variant="tonal"
                  >
                    {{ req.status }}
                  </v-chip>
                </div>
                <div v-if="req.notes" class="text-body-2 text-medium-emphasis mt-2">
                  <v-icon size="14" class="mr-1">mdi-note-text-outline</v-icon>
                  {{ req.notes }}
                </div>
              </div>

              <div v-if="req.status === 'pending'" class="d-flex gap-2">
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

              <v-chip
                v-else
                size="small"
                :color="statusColor(req.status)"
                variant="flat"
              >
                {{ req.status }}
              </v-chip>
            </div>
          </v-card-text>
        </v-card>
      </v-tabs-window-item>

      <!-- ─── Shift Swaps Tab ──────────────────────────────────────── -->
      <v-tabs-window-item value="shift-swaps">
        <v-progress-linear v-if="swapsLoading" indeterminate color="primary" class="mb-4" />

        <div v-if="swapRequests.length === 0 && !swapsLoading" class="empty-state">
          <v-icon size="48" color="grey-lighten-1">mdi-swap-horizontal</v-icon>
          <p class="text-body-1 text-medium-emphasis mt-2">No shift swap requests to review.</p>
        </div>

        <v-card
          v-for="swap in swapRequests"
          :key="swap.id"
          elevation="2"
          class="mb-3"
        >
          <v-card-text>
            <div class="d-flex align-start justify-space-between flex-wrap gap-2">
              <div>
                <div class="text-subtitle-1 font-weight-bold">
                  {{ swap.requestedBy }}
                  <v-chip size="x-small" class="ml-2" variant="tonal" color="primary">
                    {{ swap.requestType }}
                  </v-chip>
                </div>
                <div class="d-flex align-center gap-2 mt-1 flex-wrap text-body-2">
                  <v-icon size="14">mdi-calendar</v-icon>
                  {{ swap.dateLabel }}
                  &nbsp;·&nbsp;
                  <v-icon size="14">mdi-clock-outline</v-icon>
                  {{ swap.timeRange }}
                  &nbsp;·&nbsp;
                  <v-icon size="14">mdi-map-marker-outline</v-icon>
                  {{ swap.location }}
                </div>
                <div v-if="swap.reason" class="text-body-2 text-medium-emphasis mt-1">
                  {{ swap.reason }}
                </div>
                <div v-if="swap.claimedBy" class="text-body-2 mt-1">
                  <strong>Claimed by:</strong> {{ swap.claimedBy }}
                </div>
              </div>

              <div v-if="swap.status === 'pending'" class="d-flex gap-2">
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

              <v-chip
                v-else
                size="small"
                :color="swap.status === 'approved' ? 'success' : swap.status === 'denied' ? 'error' : 'grey'"
                variant="flat"
              >
                {{ swap.status }}
              </v-chip>
            </div>
          </v-card-text>
        </v-card>

        <v-divider class="my-5" />

        <div class="text-subtitle-1 font-weight-bold mb-2">Open Shift Claims</div>
        <div v-if="openShiftClaims.length === 0 && !claimsLoading" class="empty-state">
          <v-icon size="40" color="grey-lighten-1">mdi-account-clock-outline</v-icon>
          <p class="text-body-2 text-medium-emphasis mt-2">No open shift claims waiting for approval.</p>
        </div>

        <v-card
          v-for="claim in openShiftClaims"
          :key="`claim-${claim.id}`"
          elevation="2"
          class="mb-3"
        >
          <v-card-text>
            <div class="d-flex align-start justify-space-between flex-wrap gap-2">
              <div>
                <div class="text-subtitle-1 font-weight-bold">
                  {{ claim.requesterName }}
                  <span class="text-caption text-medium-emphasis ml-1">{{ claim.requesterEmail }}</span>
                </div>
                <div class="d-flex align-center gap-2 mt-1 flex-wrap text-body-2">
                  <v-icon size="14">mdi-briefcase-outline</v-icon>
                  {{ claim.positionName }}
                  &nbsp;·&nbsp;
                  <v-icon size="14">mdi-calendar</v-icon>
                  {{ claim.dateLabel }}
                  &nbsp;·&nbsp;
                  <v-icon size="14">mdi-clock-outline</v-icon>
                  {{ claim.timeRange }}
                </div>
              </div>

              <div v-if="claim.status === 'manager_pending' || claim.status === 'pending'" class="d-flex gap-2">
                <v-btn
                  color="success"
                  variant="tonal"
                  size="small"
                  prepend-icon="mdi-check"
                  :loading="actioning === `claim-${claim.id}-approve`"
                  @click="reviewOpenClaim(claim, 'approve')"
                >
                  Approve
                </v-btn>
                <v-btn
                  color="error"
                  variant="tonal"
                  size="small"
                  prepend-icon="mdi-close"
                  :loading="actioning === `claim-${claim.id}-reject`"
                  @click="reviewOpenClaim(claim, 'reject')"
                >
                  Deny
                </v-btn>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-tabs-window-item>

      <!-- ─── Shift Acknowledgments Tab ──────────────────────────────── -->
      <v-tabs-window-item value="shift-acknowledgments">
        <v-progress-linear v-if="ackLoading" indeterminate color="primary" class="mb-4" />

        <v-alert v-if="ackError" type="error" variant="tonal" class="mb-4">
          {{ ackError }}
        </v-alert>

        <div class="d-flex gap-3 mb-4 flex-wrap">
          <v-select
            v-model="ackFilter"
            :items="ackStatusOptions"
            item-title="label"
            item-value="value"
            label="Status Filter"
            variant="outlined"
            density="compact"
            hide-details
            style="max-width:200px"
            @update:model-value="loadAcknowledgments"
          />
        </div>

        <div v-if="acknowledgments.length === 0 && !ackLoading" class="empty-state">
          <v-icon size="48" color="grey-lighten-1">mdi-check-decagram</v-icon>
          <p class="text-body-1 text-medium-emphasis mt-2">No shift acknowledgments found.</p>
        </div>

        <v-card
          v-for="ack in acknowledgments"
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

              <div v-if="!ack.acknowledged" class="text-caption text-warning">
                <v-icon size="16" class="mr-1">mdi-alert</v-icon>
                Awaiting acknowledgment
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
const claimsLoading = ref(false)
const ackLoading = ref(false)
const actioning = ref(null)
const timeOffError = ref('')
const ackError = ref('')
const timeOffFilter = ref('pending')
const ackFilter = ref('all')
const timeOffRequests = ref([])
const swapRequests = ref([])
const openShiftClaims = ref([])
const acknowledgments = ref([])
const snackbar = ref({ show: false, text: '', color: 'success' })

const statusOptions = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Denied', value: 'rejected' },
  { label: 'All', value: '' }
]

const ackStatusOptions = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Acknowledged', value: 'acknowledged' }
]

const pendingTimeOffCount = computed(() =>
  timeOffRequests.value.filter(r => r.status === 'pending').length
)

const pendingSwapCount = computed(() =>
  [
    ...swapRequests.value.filter(s => String(s.status || '').toLowerCase() === 'manager_pending'),
    ...openShiftClaims.value.filter(c => String(c.status || '').toLowerCase() === 'manager_pending')
  ].length
)

const unacknowledgedCount = computed(() =>
  acknowledgments.value.filter(a => !a.acknowledged).length
)

const loadTimeOffRequests = async () => {
  loading.value = true
  timeOffError.value = ''
  try {
    const params = new URLSearchParams()
    if (timeOffFilter.value) params.append('status', timeOffFilter.value)
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
      .filter((row) => !!row.respondentShift || (row.requesterShift?.assigned_user_id != null))
      .map((row) => ({
        id: row.id,
        requestType: row.type === 'swap' ? 'Swap' : 'Find Cover',
        requestedBy: `${row.requester?.fName || ''} ${row.requester?.lName || ''}`.trim() || row.requester?.email || 'Unknown',
        claimedBy: row.respondent ? `${row.respondent?.fName || ''} ${row.respondent?.lName || ''}`.trim() : '',
        dateLabel: formatDate(row.requesterShift?.shift_date),
        timeRange: `${formatTime(row.requesterShift?.start_time)} – ${formatTime(row.requesterShift?.end_time)}`,
        location: row.requesterShift?.department?.department_name || 'Department',
        reason: row.requester_notes || row.manager_notes || '',
        status: row.status || 'pending',
      }))
  } catch (err) {
    swapRequests.value = []
    showSnackbar('Failed to load shift swaps', 'error')
  } finally {
    swapsLoading.value = false
  }
}

const loadOpenShiftClaims = async () => {
  claimsLoading.value = true
  try {
    const response = await apiClient.get('/manager/open-shift-claims')
    const rows = response?.data?.data || []
    openShiftClaims.value = rows.map((row) => ({
      id: row.id,
      requesterName: `${row.requester?.fName || ''} ${row.requester?.lName || ''}`.trim() || 'Unknown',
      requesterEmail: row.requester?.email || '',
      positionName: row.requesterShift?.position?.position_name || 'Shift',
      dateLabel: formatDate(row.requesterShift?.shift_date),
      timeRange: `${formatTime(row.requesterShift?.start_time)} – ${formatTime(row.requesterShift?.end_time)}`,
      status: row.status || 'manager_pending',
    }))
  } catch (err) {
    openShiftClaims.value = []
    showSnackbar('Failed to load open shift claims', 'error')
  } finally {
    claimsLoading.value = false
  }
}

const loadAcknowledgments = async () => {
  ackLoading.value = true
  ackError.value = ''
  try {
    const params = new URLSearchParams()
    if (currentDeptId) params.append('departmentId', currentDeptId)
    if (ackFilter.value && ackFilter.value !== 'all') {
      params.append('acknowledged', ackFilter.value === 'acknowledged' ? 'true' : 'false')
    }

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

const reviewOpenClaim = async (claim, action) => {
  actioning.value = `claim-${claim.id}-${action === 'approve' ? 'approve' : 'reject'}`
  try {
    await apiClient.put(`/manager/open-shift-claims/${claim.id}`, { action })
    showSnackbar(`Open shift claim ${action === 'approve' ? 'approved' : 'rejected'}`, 'success')
    await loadOpenShiftClaims()
  } catch (err) {
    showSnackbar('Failed to review open shift claim', 'error')
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

const statusColor = (status) => {
  const normalized = String(status || '').toLowerCase()
  const map = {
    pending: 'warning',
    manager_pending: 'warning',
    approved: 'success',
    rejected: 'error',
    denied: 'error',
    declined: 'error',
    claimed: 'info'
  }
  return map[normalized] || 'grey'
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
  loadOpenShiftClaims()
  loadAcknowledgments()
}

onMounted(loadAll)
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 0;
}
</style>
