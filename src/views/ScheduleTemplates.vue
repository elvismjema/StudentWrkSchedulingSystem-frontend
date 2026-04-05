<template>
  <v-container fluid class="pa-4">
    <!-- Page header -->
    <div class="d-flex align-center mb-6">
      <v-icon size="28" class="mr-3" color="primary">mdi-text-box-multiple-outline</v-icon>
      <div>
        <h1 class="text-h4 font-weight-bold">Schedule Templates</h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Build reusable weekly patterns for {{ currentDeptName || 'your department' }}
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
      No department selected. Please choose a department from the sidebar.
    </v-alert>

    <!-- Template cards -->
    <v-row v-if="templates.length > 0">
      <v-col
        v-for="tmpl in templates"
        :key="tmpl.template_id"
        cols="12"
        md="6"
        lg="4"
      >
        <v-card elevation="2" class="template-card h-100">
          <!-- Card title row -->
          <v-card-title class="d-flex align-center justify-space-between pb-1">
            <span class="text-truncate mr-2">{{ tmpl.template_name }}</span>
            <v-chip
              :color="tmpl.is_active ? 'success' : 'grey'"
              size="x-small"
              variant="tonal"
            >
              {{ tmpl.is_active ? 'Active' : 'Inactive' }}
            </v-chip>
          </v-card-title>

          <v-card-subtitle class="d-flex align-center flex-wrap gap-2 pb-2">
            <span>
              <v-icon size="14" class="mr-1">mdi-repeat</v-icon>
              {{ recurrenceLabel(tmpl.recurrence_type) }}
            </span>
            <span>·</span>
            <span>
              <v-icon size="14" class="mr-1">mdi-calendar-clock</v-icon>
              {{ formatDate(tmpl.created_at) }}
            </span>
          </v-card-subtitle>

          <!-- Coverage / conflict badge summary -->
          <div v-if="hasConflicts(tmpl)" class="px-4 pb-1 d-flex gap-2 flex-wrap">
            <v-chip
              v-if="coverageGapCount(tmpl) > 0"
              color="error"
              size="x-small"
              variant="tonal"
              prepend-icon="mdi-account-alert"
            >
              {{ coverageGapCount(tmpl) }} unassigned
            </v-chip>
            <v-chip
              v-if="availabilityConflictCount(tmpl) > 0"
              color="warning"
              size="x-small"
              variant="tonal"
              prepend-icon="mdi-calendar-alert"
            >
              {{ availabilityConflictCount(tmpl) }} conflict{{ availabilityConflictCount(tmpl) > 1 ? 's' : '' }}
            </v-chip>
          </div>

          <v-divider />

          <!-- Shift rows preview -->
          <v-card-text class="pa-2">
            <div v-if="tmpl.templateShifts && tmpl.templateShifts.length" class="shifts-list">
              <div
                v-for="(s, i) in tmpl.templateShifts.slice(0, 4)"
                :key="i"
                class="shift-row text-body-2 d-flex align-center"
              >
                <!-- Coverage / conflict indicator -->
                <v-icon
                  v-if="!s.assigned_user_id"
                  size="14"
                  color="error"
                  class="mr-1"
                  title="No worker assigned"
                >mdi-alert-circle</v-icon>
                <v-icon
                  v-else-if="shiftHasConflict(tmpl, s)"
                  size="14"
                  color="warning"
                  class="mr-1"
                  title="Worker has unavailability conflict"
                >mdi-calendar-alert</v-icon>
                <v-icon v-else size="14" class="mr-1 text-medium-emphasis">mdi-clock-outline</v-icon>

                <span>
                  {{ dayLabel(s.day_of_week) }}
                  {{ formatTime12(s.start_time) }}–{{ formatTime12(s.end_time) }}
                </span>
                <span v-if="s.position" class="text-caption text-medium-emphasis ml-1">
                  · {{ s.position.position_name }}
                </span>
                <span v-if="s.assignedUser" class="text-caption text-medium-emphasis ml-1">
                  · {{ s.assignedUser.fName }} {{ s.assignedUser.lName }}
                </span>
              </div>
              <div v-if="tmpl.templateShifts.length > 4" class="text-caption text-medium-emphasis mt-1">
                +{{ tmpl.templateShifts.length - 4 }} more shifts
              </div>
            </div>
            <div v-else class="text-caption text-medium-emphasis pa-1">
              No shifts defined yet
            </div>
          </v-card-text>

          <v-card-actions>
            <v-btn variant="text" size="small" prepend-icon="mdi-pencil" @click="openEditDialog(tmpl)">
              Edit
            </v-btn>
            <v-tooltip
              v-if="templateUnassignedWorkerCount(tmpl) > 0"
              :text="`${templateUnassignedWorkerCount(tmpl)} shift(s) need an assigned worker before publishing`"
              location="top"
            >
              <template #activator="{ props: ttProps }">
                <span v-bind="ttProps">
                  <v-btn
                    variant="text"
                    size="small"
                    prepend-icon="mdi-calendar-export"
                    color="grey"
                    disabled
                  >
                    Publish
                  </v-btn>
                </span>
              </template>
            </v-tooltip>
            <v-btn
              v-else
              variant="text"
              size="small"
              prepend-icon="mdi-calendar-export"
              color="primary"
              @click="openPublishDialog(tmpl)"
            >
              Publish
            </v-btn>
            <v-spacer />
            <v-btn
              icon
              size="small"
              variant="text"
              color="secondary"
              title="Duplicate template"
              @click="openDuplicateDialog(tmpl)"
            >
              <v-icon>mdi-content-copy</v-icon>
            </v-btn>
            <v-btn
              icon
              size="small"
              variant="text"
              :color="tmpl.is_active ? 'warning' : 'success'"
              :title="tmpl.is_active ? 'Deactivate' : 'Activate'"
              @click="toggleActive(tmpl)"
            >
              <v-icon>{{ tmpl.is_active ? 'mdi-eye-off-outline' : 'mdi-eye-outline' }}</v-icon>
            </v-btn>
            <v-btn
              icon
              size="small"
              variant="text"
              color="error"
              title="Delete template"
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
        Create a template to quickly build recurring weekly schedules.
      </p>
      <v-btn class="mt-4" color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">
        Create First Template
      </v-btn>
    </v-card>

    <v-progress-linear v-if="loading" indeterminate color="primary" class="mt-4" />

    <!-- ─────────────────────────────────────────────────────────────────────
         CREATE / EDIT DIALOG (calendar-based shift editor)
    ───────────────────────────────────────────────────────────────────────── -->
    <v-dialog v-model="showDialog" :max-width="1300" fullscreen-breakpoint="md" persistent scrollable>
      <v-card>
        <v-card-title class="d-flex align-center pa-4 pb-2">
          <v-icon class="mr-2">{{ editingTemplate ? 'mdi-pencil' : 'mdi-calendar-plus' }}</v-icon>
          {{ editingTemplate ? 'Edit Template' : 'New Schedule Template' }}
        </v-card-title>
        <v-divider />

        <!-- Conflict banner -->
        <v-alert
          v-if="editorConflicts.length > 0"
          type="warning"
          variant="tonal"
          density="compact"
          class="ma-4 mb-0"
          icon="mdi-alert"
        >
          <strong>{{ editorConflicts.length }} issue{{ editorConflicts.length > 1 ? 's' : '' }} detected</strong>
          — click the highlighted shift blocks to review.
        </v-alert>

        <!-- Missing-position info (save is always allowed; informational only) -->
        <v-alert
          v-if="hasUnassignedPositions"
          type="info"
          variant="tonal"
          density="compact"
          class="ma-4 mb-0"
          icon="mdi-information-outline"
        >
          <strong>{{ unassignedPositionCount }} shift{{ unassignedPositionCount > 1 ? 's have' : ' has' }} no position.</strong>
          Position is optional — you can save and publish without one.
        </v-alert>

        <!-- Missing-worker warning (save is allowed; publish is blocked) -->
        <v-alert
          v-if="unassignedWorkerCount > 0"
          type="warning"
          variant="tonal"
          density="compact"
          class="ma-4 mb-0"
          icon="mdi-account-alert"
        >
          <strong>{{ unassignedWorkerCount }} shift{{ unassignedWorkerCount > 1 ? 's have' : ' has' }} no assigned worker.</strong>
          You can save this template now — assign a worker to every shift before publishing.
        </v-alert>

        <v-card-text class="pa-4 overflow-y-auto" style="max-height: calc(100vh - 180px)">
          <v-form ref="formRef">
            <!-- Template metadata row -->
            <v-row class="mb-2">
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.template_name"
                  label="Template Name"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Name is required']"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-select
                  v-model="form.recurrence_type"
                  :items="recurrenceOptions"
                  item-title="label"
                  item-value="value"
                  label="Recurrence"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Recurrence is required']"
                />
              </v-col>
              <v-col cols="12" md="3" class="d-flex align-center">
                <v-checkbox
                  v-model="form.is_active"
                  label="Active (visible on template list)"
                  hide-details
                  density="compact"
                />
              </v-col>
            </v-row>

            <v-divider class="mb-3" />

            <!-- Calendar editor — only mounted when dialog is open -->
            <TemplateCalendarEditor
              v-if="showDialog"
              v-model="form.shifts"
              :positions="positions"
              :workers="deptWorkers"
              :conflicts="editorConflicts"
            />
          </v-form>
        </v-card-text>

        <v-divider />
        <v-card-actions class="pa-4">
          <span class="text-caption text-medium-emphasis">
            {{ form.shifts.length }} shift{{ form.shifts.length !== 1 ? 's' : '' }} in template
          </span>
          <v-spacer />
          <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            :loading="saving"
            :disabled="!canSaveTemplate"
            @click="saveTemplate"
          >
          >
            {{ editingTemplate ? 'Save Changes' : 'Create Template' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ─────────────────────────────────────────────────────────────────────
         DUPLICATE DIALOG
    ───────────────────────────────────────────────────────────────────────── -->
    <v-dialog v-model="showDuplicateDialog" max-width="440px">
      <v-card>
        <v-card-title>
          <v-icon class="mr-2">mdi-content-copy</v-icon>
          Duplicate Template
        </v-card-title>
        <v-divider />
        <v-card-text>
          <p class="text-body-2 text-medium-emphasis mb-4">
            Creates a full copy of "{{ duplicateTarget?.template_name }}" including all shifts and tasks.
          </p>
          <v-text-field
            v-model="duplicateName"
            label="New template name"
            variant="outlined"
            :rules="[v => !!v || 'Name is required']"
          />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showDuplicateDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            :loading="duplicating"
            :disabled="!duplicateName"
            @click="confirmDuplicate"
          >
            Duplicate
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ─────────────────────────────────────────────────────────────────────
         PUBLISH DIALOG
    ───────────────────────────────────────────────────────────────────────── -->
    <v-dialog v-model="showPublishDialog" max-width="620px" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-calendar-export</v-icon>
          Publish Template: {{ publishTarget?.template_name }}
        </v-card-title>
        <v-divider />
        <v-card-text>
          <!-- Block banner when the template has shifts with no worker assigned -->
          <v-alert
            v-if="publishTargetUnassignedCount > 0"
            type="error"
            variant="tonal"
            class="mb-4"
            icon="mdi-account-alert"
          >
            <strong>Cannot publish yet.</strong>
            {{ publishTargetUnassignedCount }} shift{{ publishTargetUnassignedCount > 1 ? 's have' : ' has' }} no assigned worker.
            Edit the template and assign a worker to every shift, then come back to publish.
          </v-alert>

          <p class="text-body-2 text-medium-emphasis mb-4">
            Generates real shifts for the chosen week from this template's pattern.
            Workers are notified when shifts are published immediately.
          </p>

          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="publishForm.start_date"
                type="date"
                :label="publishWeekLabel"
                variant="outlined"
                :rules="[v => !!v || 'Date required', v => publishDateIsMonday(v) || 'Please pick a Monday']"
                :hint="publishDateRangeHint"
                persistent-hint
                @update:modelValue="loadPublishConflicts"
              />
            </v-col>
            <v-col cols="12" md="6" class="d-flex align-center">
              <v-checkbox
                v-model="publishForm.publish_immediately"
                label="Publish immediately & notify workers"
                hide-details
              />
            </v-col>
          </v-row>

          <!-- Conflict preview -->
          <div v-if="publishConflicts.length > 0" class="mt-2">
            <p class="text-subtitle-2 font-weight-bold mb-2 d-flex align-center">
              <v-icon size="18" color="warning" class="mr-1">mdi-alert</v-icon>
              {{ publishConflicts.length }} issue{{ publishConflicts.length > 1 ? 's' : '' }} detected for this week
            </p>
            <v-list density="compact" class="py-0">
              <v-list-item
                v-for="(c, i) in publishConflicts"
                :key="i"
                :prepend-icon="c.type === 'no_coverage' ? 'mdi-account-alert' : 'mdi-calendar-alert'"
                :base-color="c.type === 'no_coverage' ? 'error' : 'warning'"
                class="px-0"
              >
                <v-list-item-title class="text-body-2">{{ c.message }}</v-list-item-title>
              </v-list-item>
            </v-list>
            <p class="text-caption text-medium-emphasis mt-2">
              You can still publish; department managers will be notified of these issues.
            </p>
          </div>

          <div
            v-else-if="publishForm.start_date && !publishConflictsLoading"
            class="d-flex align-center mt-2 text-success"
          >
            <v-icon size="18" class="mr-1">mdi-check-circle</v-icon>
            <span class="text-body-2">No conflicts found for this week.</span>
          </div>

          <v-progress-linear v-if="publishConflictsLoading" indeterminate class="mt-2" />
        </v-card-text>

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showPublishDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            :loading="publishing"
            :disabled="!publishForm.start_date || publishTargetUnassignedCount > 0"
            @click="confirmPublish"
          >
            {{ publishForm.publish_immediately ? 'Publish & Notify' : 'Create Shifts (Draft)' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="4000">
      <v-icon start>{{ snackbar.color === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle' }}</v-icon>
      {{ snackbar.text }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import templateService from '../services/templateService.js'
import apiClient from '../services/services.js'
import Utils from '../config/utils.js'
import TemplateCalendarEditor from '../components/TemplateCalendarEditor.vue'

// ─── Context ─────────────────────────────────────────────────────────────────
const deptContext = Utils.getStore('currentDepartmentContext') || {}
const currentDeptId = deptContext.department_id || null
const currentDeptName = deptContext.department_name || ''
const currentUser = Utils.getStore('user') || {}

// ─── State ───────────────────────────────────────────────────────────────────
const loading = ref(false)
const saving = ref(false)
const duplicating = ref(false)
const publishing = ref(false)
const publishConflictsLoading = ref(false)

const templates = ref([])
const positions = ref([])
const deptWorkers = ref([])

// Per-template cached editor conflicts map: { [template_id]: [conflict, ...] }
const templateConflictsMap = ref({})

const showDialog = ref(false)
const editingTemplate = ref(null)
const formRef = ref(null)
const editorConflicts = ref([])

const showDuplicateDialog = ref(false)
const duplicateTarget = ref(null)
const duplicateName = ref('')

const showPublishDialog = ref(false)
const publishTarget = ref(null)
const publishConflicts = ref([])

const snackbar = ref({ show: false, text: '', color: 'success' })

const form = ref({
  template_name: '',
  recurrence_type: 'weekly',
  is_active: true,
  shifts: [],
})

const publishForm = ref({
  start_date: '',
  publish_immediately: false,
})

// ─── Reference data ───────────────────────────────────────────────────────────
const recurrenceOptions = [
  { label: 'Weekly',    value: 'weekly'   },
  { label: 'Bi-weekly', value: 'biweekly' },
  { label: 'Monthly',   value: 'monthly'  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────
const recurrenceLabel = (type) =>
  ({ weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly' })[type] || type

const dayLabel = (dow) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dow] ?? ''

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''

const formatTime12 = (t) => {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

// ─── Template save gate (replaces formValid — unblocks button immediately) ────
const canSaveTemplate = computed(
  () => !!(form.value.template_name?.trim()) && !!(form.value.recurrence_type)
)

// ─── Calendar-editor shift validation (informational only — does not block save or publish) ─
const unassignedPositionCount = computed(
  () => form.value.shifts.filter((s) => !s.position_id).length
)
const hasUnassignedPositions = computed(() => unassignedPositionCount.value > 0)

// ─── Worker assignment validation (save allowed; publish blocked) ─────────────
const unassignedWorkerCount = computed(
  () => form.value.shifts.filter((s) => !s.assigned_user_id).length
)
const templateUnassignedWorkerCount = (tmpl) =>
  (tmpl.templateShifts || []).filter((s) => !s.assigned_user_id).length
const publishTargetUnassignedCount = computed(
  () => templateUnassignedWorkerCount(publishTarget.value || {})
)

// ─── Publish date helpers ─────────────────────────────────────────────────────
const publishWeekLabel = computed(() => {
  const rec = publishTarget.value?.recurrence_type
  if (rec === 'biweekly') return 'Fortnight start (Monday)'
  if (rec === 'monthly')  return 'Month start (Monday)'
  return 'Week start (Monday)'
})

const publishDateIsMonday = (v) => {
  if (!v) return true
  return new Date(v + 'T00:00:00').getDay() === 1
}

const publishDateRangeHint = computed(() => {
  if (!publishForm.value.start_date || !publishDateIsMonday(publishForm.value.start_date)) return ''
  const start  = new Date(publishForm.value.start_date + 'T00:00:00')
  const end    = new Date(start)
  end.setDate(end.getDate() + 6)
  const fmt    = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `Shifts will be created: ${fmt(start)} – ${fmt(end)}`
})

// ─── Conflict helpers ─────────────────────────────────────────────────────────
const templateCachedConflicts = (tmpl) =>
  templateConflictsMap.value[tmpl.template_id] || []

const hasConflicts = (tmpl) => templateCachedConflicts(tmpl).length > 0

const coverageGapCount = (tmpl) =>
  templateCachedConflicts(tmpl).filter((c) => c.type === 'no_coverage').length

const availabilityConflictCount = (tmpl) =>
  templateCachedConflicts(tmpl).filter((c) => c.type === 'availability_conflict').length

const shiftHasConflict = (tmpl, shift) =>
  templateCachedConflicts(tmpl).some((c) => c.templateShiftId === shift.shift_id)

// ─── Data loading ─────────────────────────────────────────────────────────────
const loadTemplates = async () => {
  if (!currentDeptId) return
  loading.value = true
  try {
    const res = await templateService.listTemplates(currentDeptId)
    templates.value = res?.data?.data || []

    // Cache editor-level conflicts for each template (no date = recurring only)
    for (const tmpl of templates.value) {
      try {
        const cr = await templateService.checkConflicts(tmpl.template_id)
        templateConflictsMap.value[tmpl.template_id] = cr?.data?.conflicts || []
      } catch {
        templateConflictsMap.value[tmpl.template_id] = []
      }
    }
  } catch (err) {
    console.error('Error loading templates:', err)
  } finally {
    loading.value = false
  }
}

const loadDeptData = async () => {
  if (!currentDeptId) return
  try {
    const [posRes, workerRes] = await Promise.all([
      apiClient.get(`positions?department_id=${currentDeptId}`),
      apiClient.get(`admin/departments/${currentDeptId}/members`),
    ])
    positions.value = posRes?.data?.data || posRes?.data || []
    const members = workerRes?.data?.data || workerRes?.data || []
    // Filter to active members with user data
    deptWorkers.value = members.filter((m) => m.is_active && m.user)
  } catch (err) {
    console.error('Error loading department data:', err)
  }
}

// ─── Create / Edit dialog ─────────────────────────────────────────────────────
const openCreateDialog = () => {
  editingTemplate.value = null
  editorConflicts.value = []
  form.value = { template_name: '', recurrence_type: 'weekly', is_active: true, shifts: [] }
  showDialog.value = true
}

const openEditDialog = (tmpl) => {
  editingTemplate.value = tmpl
  form.value = {
    template_name: tmpl.template_name,
    recurrence_type: tmpl.recurrence_type,
    is_active: tmpl.is_active,
    shifts: (tmpl.templateShifts || []).map((s) => ({
      shift_id: s.shift_id,
      day_of_week: s.day_of_week,
      start_time: s.start_time?.slice(0, 5) || '09:00',
      end_time: s.end_time?.slice(0, 5) || '17:00',
      position_id: s.position_id,
      assigned_user_id: s.assigned_user_id || null,
      tasks: (s.tasks || []).map((t) => ({
        taskName: t.taskName,
        taskType: t.taskType || 'other',
        priority: t.priority || 'medium',
        taskDescription: t.taskDescription || '',
        dueTime: t.dueTime || null,
        estimatedDuration: t.estimatedDuration || null,
      })),
    })),
  }
  // Seed editor conflicts from cached map
  editorConflicts.value = templateConflictsMap.value[tmpl.template_id] || []
  showDialog.value = true
}

const closeDialog = () => {
  showDialog.value = false
  editingTemplate.value = null
  editorConflicts.value = []
}
/**
 * Re-run editor-level conflict check after the user changes worker assignments
 * (only when editing an existing template that has server-side shift IDs).
 */
const refreshEditorConflicts = async () => {
  if (!editingTemplate.value) return
  try {
    const res = await templateService.checkConflicts(editingTemplate.value.template_id)
    editorConflicts.value = res?.data?.conflicts || []
  } catch {
    // non-fatal
  }
}

const saveTemplate = async () => {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  saving.value = true
  try {
    const payload = {
      department_id: currentDeptId,
      template_name: form.value.template_name,
      recurrence_type: form.value.recurrence_type,
      is_active: form.value.is_active,
      shifts: form.value.shifts,
      created_by: currentUser.userId || currentUser.id,
    }

    let res
    if (editingTemplate.value) {
      res = await templateService.updateTemplate(editingTemplate.value.template_id, payload)
      showSnackbar('Template updated successfully!', 'success')
    } else {
      res = await templateService.createTemplate(payload)
      showSnackbar('Template created successfully!', 'success')
    }

    // Update local conflict cache with any conflicts returned in the save response
    const savedId = res?.data?.data?.template_id
    if (savedId && res?.data?.conflicts) {
      templateConflictsMap.value[savedId] = res.data.conflicts
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

// ─── Duplicate ────────────────────────────────────────────────────────────────
const openDuplicateDialog = (tmpl) => {
  duplicateTarget.value = tmpl
  duplicateName.value = `Copy of ${tmpl.template_name}`
  showDuplicateDialog.value = true
}

const confirmDuplicate = async () => {
  if (!duplicateTarget.value || !duplicateName.value) return
  duplicating.value = true
  try {
    await templateService.duplicateTemplate(duplicateTarget.value.template_id, duplicateName.value)
    showSnackbar('Template duplicated!', 'success')
    showDuplicateDialog.value = false
    loadTemplates()
  } catch (err) {
    showSnackbar('Failed to duplicate template', 'error')
    console.error(err)
  } finally {
    duplicating.value = false
  }
}

// ─── Publish ──────────────────────────────────────────────────────────────────
const openPublishDialog = (tmpl) => {
  publishTarget.value = tmpl
  publishConflicts.value = []
  publishForm.value = { start_date: '', publish_immediately: false }
  showPublishDialog.value = true
}

const loadPublishConflicts = async () => {
  if (!publishTarget.value || !publishForm.value.start_date) return
  publishConflictsLoading.value = true
  try {
    const res = await templateService.checkConflicts(
      publishTarget.value.template_id,
      publishForm.value.start_date
    )
    publishConflicts.value = res?.data?.conflicts || []
  } catch {
    publishConflicts.value = []
  } finally {
    publishConflictsLoading.value = false
  }
}

const confirmPublish = async () => {
  if (!publishTarget.value || !publishForm.value.start_date) return
  publishing.value = true
  try {
    const res = await templateService.publishTemplate(
      publishTarget.value.template_id,
      publishForm.value.start_date,
      publishForm.value.publish_immediately
    )
    const data = res?.data
    const label = publishForm.value.publish_immediately ? 'published' : 'created as drafts'
    showSnackbar(
      `${data?.shifts_created || 0} shift(s) ${label} for week of ${publishForm.value.start_date}`,
      'success'
    )
    showPublishDialog.value = false
    loadTemplates()
  } catch (err) {
    showSnackbar('Failed to publish template', 'error')
    console.error(err)
  } finally {
    publishing.value = false
  }
}

// ─── Toggle active / delete ───────────────────────────────────────────────────
const toggleActive = async (tmpl) => {
  try {
    await templateService.setActiveStatus(tmpl.template_id, !tmpl.is_active)
    tmpl.is_active = !tmpl.is_active
    showSnackbar(`Template ${tmpl.is_active ? 'activated' : 'deactivated'}`, 'success')
  } catch {
    showSnackbar('Failed to update template status', 'error')
  }
}

const deleteTemplate = async (tmpl) => {
  if (!confirm(`Delete template "${tmpl.template_name}"? This cannot be undone.`)) return
  try {
    await templateService.deleteTemplate(tmpl.template_id)
    showSnackbar('Template deleted', 'success')
    loadTemplates()
  } catch {
    showSnackbar('Failed to delete template', 'error')
  }
}

// ─── Snackbar ─────────────────────────────────────────────────────────────────
const showSnackbar = (text, color = 'success') => {
  snackbar.value = { show: true, text, color }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
onMounted(() => {
  loadTemplates()
  loadDeptData()
})
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
  color: #555;
}
.gap-2 {
  gap: 8px;
}
</style>
