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
            <v-btn
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
         CREATE / EDIT DIALOG
    ───────────────────────────────────────────────────────────────────────── -->
    <v-dialog v-model="showDialog" max-width="900px" persistent scrollable>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">{{ editingTemplate ? 'mdi-pencil' : 'mdi-plus' }}</v-icon>
          {{ editingTemplate ? 'Edit Template' : 'New Schedule Template' }}
        </v-card-title>
        <v-divider />

        <!-- Inline conflict banner shown while editing -->
        <v-alert
          v-if="editorConflicts.length > 0"
          type="warning"
          variant="tonal"
          density="compact"
          class="ma-4 mb-0"
          icon="mdi-alert"
        >
          <strong>{{ editorConflicts.length }} issue{{ editorConflicts.length > 1 ? 's' : '' }} detected</strong>
          — check the shifts below for warnings.
        </v-alert>

        <v-card-text class="overflow-y-auto" style="max-height:70vh">
          <v-form ref="formRef" v-model="formValid">
            <!-- Template meta -->
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

            <!-- Shifts section -->
            <div class="d-flex align-center mb-3">
              <span class="text-subtitle-2 font-weight-bold">
                Shifts in Template ({{ form.shifts.length }})
              </span>
              <v-spacer />
              <v-btn size="small" variant="tonal" prepend-icon="mdi-plus" @click="addShiftRow">
                Add Shift
              </v-btn>
            </div>

            <div v-if="form.shifts.length === 0" class="text-caption text-medium-emphasis py-3 text-center">
              No shifts added yet. Click "Add Shift" to define the pattern.
            </div>

            <!-- One card per template shift -->
            <v-card
              v-for="(shift, idx) in form.shifts"
              :key="idx"
              variant="outlined"
              class="mb-3"
              :color="shiftEditorConflictType(idx) === 'no_coverage' ? 'error' : shiftEditorConflictType(idx) === 'availability_conflict' ? 'warning' : undefined"
            >
              <!-- Conflict banner for this shift -->
              <v-alert
                v-if="shiftEditorConflict(idx)"
                :type="shiftEditorConflictType(idx) === 'no_coverage' ? 'error' : 'warning'"
                density="compact"
                variant="tonal"
                class="ma-2 mb-0"
                :icon="shiftEditorConflictType(idx) === 'no_coverage' ? 'mdi-account-alert' : 'mdi-calendar-alert'"
              >
                {{ shiftEditorConflict(idx).message }}
              </v-alert>

              <v-card-text class="pb-2">
                <!-- Row 1: Day, Start, End, Position -->
                <v-row dense>
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
                  <v-col cols="6" sm="2">
                    <v-text-field
                      v-model="shift.start_time"
                      type="time"
                      label="Start"
                      variant="outlined"
                      density="compact"
                      hide-details
                    />
                  </v-col>
                  <v-col cols="6" sm="2">
                    <v-text-field
                      v-model="shift.end_time"
                      type="time"
                      label="End"
                      variant="outlined"
                      density="compact"
                      hide-details
                    />
                  </v-col>
                  <v-col cols="12" sm="4">
                    <v-select
                      v-model="shift.position_id"
                      :items="positions"
                      item-title="position_name"
                      item-value="position_id"
                      label="Position"
                      variant="outlined"
                      density="compact"
                      hide-details
                      clearable
                      :rules="[v => !!v || 'Position is required']"
                    />
                  </v-col>
                  <v-col cols="12" sm="1" class="d-flex align-center justify-end">
                    <v-btn
                      icon
                      size="small"
                      variant="text"
                      color="error"
                      @click="removeShiftRow(idx)"
                    >
                      <v-icon>mdi-close</v-icon>
                    </v-btn>
                  </v-col>
                </v-row>

                <!-- Row 2: Assigned worker -->
                <v-row dense class="mt-1">
                  <v-col cols="12">
                    <v-autocomplete
                      v-model="shift.assigned_user_id"
                      :items="deptWorkers"
                      :item-title="w => `${w.user.fName} ${w.user.lName}`"
                      item-value="user_id"
                      label="Assigned Worker (optional)"
                      variant="outlined"
                      density="compact"
                      clearable
                      hide-details
                      prepend-inner-icon="mdi-account"
                      @update:modelValue="refreshEditorConflicts"
                    >
                      <template #item="{ item, props }">
                        <v-list-item v-bind="props">
                          <template #title>
                            {{ item.raw.user.fName }} {{ item.raw.user.lName }}
                          </template>
                          <template #subtitle>
                            {{ item.raw.user.email }}
                          </template>
                        </v-list-item>
                      </template>
                    </v-autocomplete>
                  </v-col>
                </v-row>

                <!-- Tasks section (collapsible) -->
                <v-expansion-panels class="mt-2" flat>
                  <v-expansion-panel>
                    <v-expansion-panel-title density="compact" class="py-1 px-2">
                      <v-icon size="16" class="mr-2">mdi-format-list-checks</v-icon>
                      Tasks ({{ shift.tasks.length }})
                    </v-expansion-panel-title>
                    <v-expansion-panel-text>
                      <div
                        v-for="(task, tIdx) in shift.tasks"
                        :key="tIdx"
                        class="d-flex align-center gap-2 mb-2"
                      >
                        <v-text-field
                          v-model="task.taskName"
                          label="Task name"
                          variant="outlined"
                          density="compact"
                          hide-details
                          class="flex-grow-1"
                        />
                        <v-select
                          v-model="task.taskType"
                          :items="taskTypeOptions"
                          item-title="label"
                          item-value="value"
                          label="Type"
                          variant="outlined"
                          density="compact"
                          hide-details
                          style="max-width:130px"
                        />
                        <v-select
                          v-model="task.priority"
                          :items="taskPriorityOptions"
                          item-title="label"
                          item-value="value"
                          label="Priority"
                          variant="outlined"
                          density="compact"
                          hide-details
                          style="max-width:110px"
                        />
                        <v-btn
                          icon
                          size="small"
                          variant="text"
                          color="error"
                          @click="removeTask(idx, tIdx)"
                        >
                          <v-icon size="16">mdi-close</v-icon>
                        </v-btn>
                      </div>

                      <v-btn
                        size="small"
                        variant="tonal"
                        prepend-icon="mdi-plus"
                        class="mt-1"
                        @click="addTask(idx)"
                      >
                        Add Task
                      </v-btn>
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                </v-expansion-panels>
              </v-card-text>
            </v-card>

            <v-divider class="my-3" />
            <v-checkbox
              v-model="form.is_active"
              label="Active (visible on template list)"
              hide-details
            />
          </v-form>
        </v-card-text>

        <v-card-actions class="pa-4">
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
          <p class="text-body-2 text-medium-emphasis mb-4">
            Generates real shifts for the chosen week from this template's pattern.
            Workers are notified when shifts are published immediately.
          </p>

          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="publishForm.start_date"
                type="date"
                label="Week start (Monday)"
                variant="outlined"
                :rules="[v => !!v || 'Date required']"
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
            :disabled="!publishForm.start_date"
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
const formValid = ref(false)
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
  { label: 'Weekly', value: 'weekly' },
  { label: 'Bi-weekly', value: 'biweekly' },
  { label: 'Monthly', value: 'monthly' },
]

const dayOptions = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
]

const taskTypeOptions = [
  { label: 'Opening', value: 'opening' },
  { label: 'Closing', value: 'closing' },
  { label: 'Maintenance', value: 'maintenance' },
  { label: 'Customer Service', value: 'customer_service' },
  { label: 'Inventory', value: 'inventory' },
  { label: 'Cleaning', value: 'cleaning' },
  { label: 'Training', value: 'training' },
  { label: 'Administrative', value: 'administrative' },
  { label: 'Other', value: 'other' },
]

const taskPriorityOptions = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Urgent', value: 'urgent' },
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

// Conflict for the shift at `idx` in the editor (using editorConflicts + shift_id / index matching)
const shiftEditorConflict = (idx) => {
  // After saving, we match by shift_id; during new creation we use index-based approach
  const shift = form.value.shifts[idx]
  if (!shift) return null
  if (shift.shift_id) {
    return editorConflicts.value.find((c) => c.templateShiftId === shift.shift_id) || null
  }
  return null
}

const shiftEditorConflictType = (idx) => shiftEditorConflict(idx)?.type || null

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

const addShiftRow = () => {
  form.value.shifts.push({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00',
    position_id: null,
    assigned_user_id: null,
    tasks: [],
  })
}

const removeShiftRow = (idx) => {
  form.value.shifts.splice(idx, 1)
}

const addTask = (shiftIdx) => {
  form.value.shifts[shiftIdx].tasks.push({
    taskName: '',
    taskType: 'other',
    priority: 'medium',
    taskDescription: '',
    dueTime: null,
    estimatedDuration: null,
  })
}

const removeTask = (shiftIdx, taskIdx) => {
  form.value.shifts[shiftIdx].tasks.splice(taskIdx, 1)
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
