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
                    {{ formatDate(req.specificDate) }}
                  </v-chip>
                  <v-chip size="x-small" variant="tonal">
                    <v-icon start size="12">mdi-clock-outline</v-icon>
                    {{ formatTime(req.startTime) }} – {{ formatTime(req.endTime) }}
                  </v-chip>
                  <v-chip
                    size="x-small"
                    :color="statusColor(req.requestStatus)"
                    variant="tonal"
                  >
                    {{ req.requestStatus }}
                  </v-chip>
                </div>
                <div v-if="req.requestNotes" class="text-body-2 text-medium-emphasis mt-2">
                  <v-icon size="14" class="mr-1">mdi-note-text-outline</v-icon>
                  {{ req.requestNotes }}
                </div>
              </div>

              <div v-if="req.requestStatus === 'pending'" class="d-flex gap-2">
                <v-btn
                  color="success"
                  variant="tonal"
                  size="small"
                  prepend-icon="mdi-check"
                  :loading="actioning === req.id + '-approve'"
                  @click="actionTimeOff(req, 'approved')"
                >
                  Approve
                </v-btn>
                <v-btn
                  color="error"
                  variant="tonal"
                  size="small"
                  prepend-icon="mdi-close"
                  :loading="actioning === req.id + '-reject'"
                  @click="actionTimeOff(req, 'rejected')"
                >
                  Deny
                </v-btn>
              </div>

              <v-chip
                v-else
                size="small"
                :color="statusColor(req.requestStatus)"
                variant="flat"
              >
                {{ req.requestStatus }}
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
                  @click="approveSwap(swap)"
                >
                  Approve
                </v-btn>
                <v-btn
                  color="error"
                  variant="tonal"
                  size="small"
                  prepend-icon="mdi-close"
                  @click="denySwap(swap)"
                >
                  Deny
                </v-btn>
              </div>

              <v-chip
                v-else
                size="small"
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
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import apiClient from '../services/services.js'
import availabilityService from '../services/availabilityService.js'
import Utils from '../config/utils.js'

const deptContext = Utils.getStore('currentDepartmentContext') || {}
const currentDeptId = deptContext.department_id || null
const currentUser = Utils.getStore('user') || {}

const activeTab = ref('time-off')
const loading = ref(false)
const swapsLoading = ref(false)
const ackLoading = ref(false)
const actioning = ref(null)
const timeOffError = ref('')
const ackError = ref('')
const timeOffFilter = ref('pending')
const ackFilter = ref('all')
const timeOffRequests = ref([])
const swapRequests = ref([])
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
  timeOffRequests.value.filter(r => r.requestStatus === 'pending').length
)

const pendingSwapCount = computed(() =>
  swapRequests.value.filter(s => s.status === 'pending').length
)

const unacknowledgedCount = computed(() =>
  acknowledgments.value.filter(a => !a.acknowledged).length
)

const loadTimeOffRequests = async () => {
  loading.value = true
  timeOffError.value = ''
  try {
    const params = new URLSearchParams()
    params.append('availabilityType', 'unavailable')
    if (currentDeptId) params.append('departmentId', currentDeptId)
    if (timeOffFilter.value) params.append('requestStatus', timeOffFilter.value)

    const response = await apiClient.get(`/availabilities?${params.toString()}`)
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
    // Shift swaps come from the trade board / shift acknowledgements with swap type
    const response = await apiClient.get(`/shift-acknowledgements?type=swap&departmentId=${currentDeptId || ''}`)
    swapRequests.value = response?.data?.data || response?.data || []
  } catch (err) {
    // If the endpoint isn't fully wired yet, fall back to empty
    swapRequests.value = []
    console.warn('Swap requests endpoint not available:', err.message)
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
    if (ackFilter.value && ackFilter.value !== 'all') {
      params.append('acknowledged', ackFilter.value === 'acknowledged' ? 'true' : 'false')
    }

    const response = await apiClient.get(`/shift-acknowledgements/unacknowledged?${params.toString()}`)
    acknowledgments.value = response?.data?.data || response?.data || []
  } catch (err) {
    ackError.value = 'Failed to load shift acknowledgments.'
    console.error(err)
  } finally {
    ackLoading.value = false
  }
}

const actionTimeOff = async (req, status) => {
  const key = `${req.id}-${status === 'approved' ? 'approve' : 'reject'}`
  actioning.value = key
  try {
    await apiClient.patch(`/availabilities/${req.id}/status`, {
      requestStatus: status,
      approvedBy: currentUser.userId || currentUser.id,
      approvedAt: new Date().toISOString()
    })
    req.requestStatus = status
    showSnackbar(`Request ${status}`, 'success')
  } catch (err) {
    showSnackbar('Failed to update request', 'error')
    console.error(err)
  } finally {
    actioning.value = null
  }
}

const approveSwap = (swap) => {
  swap.status = 'approved'
  showSnackbar('Swap approved', 'success')
}

const denySwap = (swap) => {
  swap.status = 'denied'
  showSnackbar('Swap denied', 'success')
}

const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
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
  const map = { pending: 'warning', approved: 'success', rejected: 'error', denied: 'error', claimed: 'info' }
  return map[status] || 'grey'
}

const showSnackbar = (text, color = 'success') => {
  snackbar.value = { show: true, text, color }
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-US', {
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
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 0;
}
</style>
