<template>
  <v-container fluid class="pa-4">
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-icon size="28" class="mr-3" color="primary">mdi-text-box-multiple-outline</v-icon>
      <div>
        <h1 class="text-h4 font-weight-bold">Schedule Templates</h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Create reusable shift templates for {{ currentDeptName || 'your department' }}
        </p>
      </div>
      <v-spacer />
      <v-btn
        color="primary"
        variant="elevated"
        prepend-icon="mdi-plus"
        @click="openCreateDialog"
      >
        New Template
      </v-btn>
    </div>

    <v-alert v-if="!currentDeptId" type="warning" variant="tonal" class="mb-4">
      No department context set. Please select a department from the sidebar.
    </v-alert>

    <!-- Templates grid -->
    <v-row v-if="templates.length > 0">
      <v-col
        v-for="tmpl in templates"
        :key="tmpl.template_id"
        cols="12"
        md="6"
        lg="4"
      >
        <v-card elevation="2" class="template-card h-100">
          <v-card-title class="d-flex align-center justify-space-between pb-1">
            <span class="text-truncate">{{ tmpl.template_name }}</span>
            <v-chip
              :color="tmpl.is_active ? 'success' : 'grey'"
              size="x-small"
              variant="tonal"
            >
              {{ tmpl.is_active ? 'Active' : 'Inactive' }}
            </v-chip>
          </v-card-title>

          <v-card-subtitle>
            <v-icon size="14" class="mr-1">mdi-repeat</v-icon>
            {{ recurrenceLabel(tmpl.recurrence_type) }}
            &nbsp;·&nbsp;
            <v-icon size="14" class="mr-1">mdi-calendar-clock</v-icon>
            {{ formatDate(tmpl.created_at) }}
          </v-card-subtitle>

          <v-divider />

          <!-- Template shifts list -->
          <v-card-text class="pa-2">
            <div v-if="tmpl.shifts && tmpl.shifts.length" class="shifts-list">
              <div
                v-for="(s, i) in tmpl.shifts.slice(0, 3)"
                :key="i"
                class="shift-row text-body-2"
              >
                <v-icon size="14" class="mr-1 text-medium-emphasis">mdi-clock-outline</v-icon>
                {{ dayLabel(s.day_of_week) }} {{ s.start_time }} – {{ s.end_time }}
              </div>
              <div v-if="tmpl.shifts.length > 3" class="text-caption text-medium-emphasis mt-1">
                +{{ tmpl.shifts.length - 3 }} more shifts
              </div>
            </div>
            <div v-else class="text-caption text-medium-emphasis pa-1">
              No shifts defined yet
            </div>
          </v-card-text>

          <v-card-actions>
            <v-btn
              variant="text"
              size="small"
              prepend-icon="mdi-pencil"
              @click="openEditDialog(tmpl)"
            >
              Edit
            </v-btn>
            <v-btn
              variant="text"
              size="small"
              prepend-icon="mdi-calendar-export"
              color="primary"
              @click="applyTemplate(tmpl)"
            >
              Apply
            </v-btn>
            <v-spacer />
            <v-btn
              icon
              size="small"
              variant="text"
              :color="tmpl.is_active ? 'warning' : 'success'"
              @click="toggleActive(tmpl)"
            >
              <v-icon>{{ tmpl.is_active ? 'mdi-eye-off-outline' : 'mdi-eye-outline' }}</v-icon>
            </v-btn>
            <v-btn
              icon
              size="small"
              variant="text"
              color="error"
              @click="deleteTemplate(tmpl)"
            >
              <v-icon>mdi-delete-outline</v-icon>
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Empty state -->
    <v-card v-else-if="!loading" elevation="0" class="text-center pa-12">
      <v-icon size="64" color="grey-lighten-1">mdi-text-box-multiple-outline</v-icon>
      <h3 class="mt-4 text-h6 text-medium-emphasis">No templates yet</h3>
      <p class="text-body-2 text-medium-emphasis mt-2">
        Create a template to quickly generate recurring schedules.
      </p>
      <v-btn class="mt-4" color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">
        Create First Template
      </v-btn>
    </v-card>

    <v-progress-linear v-if="loading" indeterminate color="primary" class="mt-4" />

    <!-- Create / Edit Dialog -->
    <v-dialog v-model="showDialog" max-width="680px" persistent>
      <v-card>
        <v-card-title>{{ editingTemplate ? 'Edit Template' : 'New Schedule Template' }}</v-card-title>
        <v-divider />
        <v-card-text>
          <v-form ref="formRef" v-model="formValid">
            <v-row>
              <v-col cols="12" md="8">
                <v-text-field
                  v-model="form.template_name"
                  label="Template Name"
                  variant="outlined"
                  :rules="[v => !!v || 'Name is required']"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="form.recurrence_type"
                  :items="recurrenceOptions"
                  item-title="label"
                  item-value="value"
                  label="Recurrence"
                  variant="outlined"
                  :rules="[v => !!v || 'Recurrence is required']"
                />
              </v-col>
            </v-row>

            <v-divider class="my-3" />
            <div class="d-flex align-center mb-2">
              <span class="text-subtitle-2 font-weight-bold">Shifts in Template</span>
              <v-spacer />
              <v-btn size="small" variant="tonal" prepend-icon="mdi-plus" @click="addShiftRow">
                Add Shift
              </v-btn>
            </div>

            <v-card
              v-for="(shift, idx) in form.shifts"
              :key="idx"
              variant="outlined"
              class="mb-2 pa-2"
            >
              <v-row dense align="center">
                <v-col cols="12" sm="3">
                  <v-select
                    v-model="shift.day_of_week"
                    :items="dayOptions"
                    item-title="label"
                    item-value="value"
                    label="Day"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </v-col>
                <v-col cols="5" sm="3">
                  <v-text-field
                    v-model="shift.start_time"
                    type="time"
                    label="Start"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </v-col>
                <v-col cols="5" sm="3">
                  <v-text-field
                    v-model="shift.end_time"
                    type="time"
                    label="End"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </v-col>
                <v-col cols="12" sm="3">
                  <v-text-field
                    v-model="shift.notes"
                    label="Notes (opt.)"
                    variant="outlined"
                    density="compact"
                    hide-details
                    append-inner-icon="mdi-close"
                    @click:append-inner="removeShiftRow(idx)"
                  />
                </v-col>
              </v-row>
            </v-card>

            <div v-if="form.shifts.length === 0" class="text-caption text-medium-emphasis py-2">
              No shifts added yet. Click "Add Shift" to define the pattern.
            </div>

            <v-divider class="my-3" />
            <v-checkbox
              v-model="form.is_active"
              label="Active (visible to apply)"
              hide-details
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            :loading="saving"
            :disabled="!formValid"
            @click="saveTemplate"
          >
            {{ editingTemplate ? 'Save Changes' : 'Create Template' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Apply Template Dialog -->
    <v-dialog v-model="showApplyDialog" max-width="480px">
      <v-card>
        <v-card-title>Apply Template: {{ applyTarget?.template_name }}</v-card-title>
        <v-divider />
        <v-card-text>
          <p class="text-body-2 text-medium-emphasis mb-4">
            Choose the start date for this template. Shifts will be created based on the
            template's day/time pattern starting from that week.
          </p>
          <v-text-field
            v-model="applyForm.start_date"
            type="date"
            label="Start Date (Monday of target week)"
            variant="outlined"
            :rules="[v => !!v || 'Date required']"
          />
          <v-checkbox
            v-model="applyForm.publish_immediately"
            label="Publish shifts immediately"
            hide-details
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showApplyDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            :loading="applying"
            :disabled="!applyForm.start_date"
            @click="confirmApply"
          >
            Apply Template
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbars -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="4000">
      <v-icon start>{{ snackbar.color === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle' }}</v-icon>
      {{ snackbar.text }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import apiClient from '../services/services.js'
import shiftService from '../services/shiftService.js'
import Utils from '../config/utils.js'

const deptContext = Utils.getStore('currentDepartmentContext') || {}
const currentDeptId = deptContext.department_id || null
const currentDeptName = deptContext.department_name || ''
const currentUser = Utils.getStore('user') || {}

const loading = ref(false)
const saving = ref(false)
const applying = ref(false)
const templates = ref([])
const showDialog = ref(false)
const showApplyDialog = ref(false)
const editingTemplate = ref(null)
const applyTarget = ref(null)
const formRef = ref(null)
const formValid = ref(false)

const snackbar = ref({ show: false, text: '', color: 'success' })

const form = ref({
  template_name: '',
  recurrence_type: 'weekly',
  is_active: true,
  shifts: []
})

const applyForm = ref({
  start_date: '',
  publish_immediately: false
})

const recurrenceOptions = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Bi-weekly', value: 'biweekly' },
  { label: 'Monthly', value: 'monthly' }
]

const dayOptions = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 }
]

const recurrenceLabel = (type) => {
  const map = { weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly' }
  return map[type] || type
}

const dayLabel = (dow) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return days[dow] ?? ''
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const loadTemplates = async () => {
  if (!currentDeptId) return
  loading.value = true
  try {
    const response = await apiClient.get(`/schedule-templates?department_id=${currentDeptId}`)
    templates.value = response?.data?.data || []
  } catch (err) {
    console.error('Error loading templates:', err)
  } finally {
    loading.value = false
  }
}

const openCreateDialog = () => {
  editingTemplate.value = null
  form.value = { template_name: '', recurrence_type: 'weekly', is_active: true, shifts: [] }
  showDialog.value = true
}

const openEditDialog = (tmpl) => {
  editingTemplate.value = tmpl
  form.value = {
    template_name: tmpl.template_name,
    recurrence_type: tmpl.recurrence_type,
    is_active: tmpl.is_active,
    shifts: tmpl.shifts ? tmpl.shifts.map(s => ({ ...s })) : []
  }
  showDialog.value = true
}

const closeDialog = () => {
  showDialog.value = false
  editingTemplate.value = null
}

const addShiftRow = () => {
  form.value.shifts.push({ day_of_week: 1, start_time: '08:00', end_time: '12:00', notes: '' })
}

const removeShiftRow = (idx) => {
  form.value.shifts.splice(idx, 1)
}

const saveTemplate = async () => {
  if (!formValid.value) return
  saving.value = true
  try {
    const payload = {
      department_id: currentDeptId,
      template_name: form.value.template_name,
      recurrence_type: form.value.recurrence_type,
      is_active: form.value.is_active,
      shifts: form.value.shifts,
      created_by: currentUser.userId || currentUser.id
    }

    if (editingTemplate.value) {
      await apiClient.put(`/schedule-templates/${editingTemplate.value.template_id}`, payload)
      showSnackbar('Template updated successfully!', 'success')
    } else {
      await apiClient.post('/schedule-templates', payload)
      showSnackbar('Template created successfully!', 'success')
    }

    closeDialog()
    loadTemplates()
  } catch (err) {
    showSnackbar('Failed to save template', 'error')
    console.error(err)
  } finally {
    saving.value = false
  }
}

const toggleActive = async (tmpl) => {
  try {
    await apiClient.patch(`/schedule-templates/${tmpl.template_id}/active`, {
      is_active: !tmpl.is_active
    })
    tmpl.is_active = !tmpl.is_active
    showSnackbar(`Template ${tmpl.is_active ? 'activated' : 'deactivated'}`, 'success')
  } catch (err) {
    showSnackbar('Failed to update template status', 'error')
  }
}

const deleteTemplate = async (tmpl) => {
  if (!confirm(`Delete template "${tmpl.template_name}"?`)) return
  try {
    await apiClient.delete(`/schedule-templates/${tmpl.template_id}`)
    showSnackbar('Template deleted', 'success')
    loadTemplates()
  } catch (err) {
    showSnackbar('Failed to delete template', 'error')
  }
}

const applyTemplate = (tmpl) => {
  applyTarget.value = tmpl
  applyForm.value = { start_date: '', publish_immediately: false }
  showApplyDialog.value = true
}

const confirmApply = async () => {
  if (!applyTarget.value || !applyForm.value.start_date) return
  applying.value = true
  try {
    // Build shifts from template pattern and start date
    const startDate = new Date(applyForm.value.start_date)
    const shiftPromises = (applyTarget.value.shifts || []).map(s => {
      const shiftDate = new Date(startDate)
      // Advance to the correct day of week relative to the start date
      const startDay = startDate.getDay()
      let dayDiff = s.day_of_week - startDay
      if (dayDiff < 0) dayDiff += 7
      shiftDate.setDate(shiftDate.getDate() + dayDiff)

      return shiftService.createShift({
        department_id: currentDeptId,
        position_id: s.position_id || null,
        shift_date: shiftDate.toISOString().split('T')[0],
        start_time: s.start_time,
        end_time: s.end_time,
        is_published: applyForm.value.publish_immediately
      })
    })

    await Promise.all(shiftPromises)
    showSnackbar(`${(applyTarget.value.shifts || []).length} shifts created from template!`, 'success')
    showApplyDialog.value = false
  } catch (err) {
    showSnackbar('Failed to apply template', 'error')
    console.error(err)
  } finally {
    applying.value = false
  }
}

const showSnackbar = (text, color = 'success') => {
  snackbar.value = { show: true, text, color }
}

onMounted(loadTemplates)
</script>

<style scoped>
.template-card {
  transition: box-shadow 0.2s ease;
}

.template-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12) !important;
}

.shifts-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.shift-row {
  display: flex;
  align-items: center;
  color: #555;
}
</style>
