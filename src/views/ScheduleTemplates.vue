<template>
  <PageFrame>
    <template #header>
      <PageHeader
        title="Templates/Tasks"
        :subtitle="currentDeptName ? `Reusable shift patterns and task checklists for ${currentDeptName}` : 'Reusable shift patterns and task checklists'"
      >
        <template #actions>
          <v-btn
            v-if="activeTab === 'templates'"
            color="primary"
            variant="elevated"
            prepend-icon="mdi-plus"
            :disabled="!currentDeptId"
            @click="openCreateDialog"
          >
            New template
          </v-btn>
          <v-btn
            v-else
            color="primary"
            variant="elevated"
            prepend-icon="mdi-plus"
            :disabled="!currentDeptId"
            @click="openCreateTlDialog"
          >
            New Task List
          </v-btn>
        </template>
      </PageHeader>
    </template>

    <v-alert v-if="!currentDeptId" type="warning" variant="tonal" density="compact" class="mb-4">
      No department selected. Please choose a department from the sidebar.
    </v-alert>

    <!-- ── Tab navigation ───────────────────────────────────────────────── -->
    <v-tabs v-model="activeTab" color="primary" class="mb-4">
      <v-tab value="templates">
        <v-icon size="18" class="mr-1">mdi-text-box-multiple-outline</v-icon>
        Schedule Templates
      </v-tab>
      <v-tab value="task-lists">
        <v-icon size="18" class="mr-1">mdi-clipboard-list-outline</v-icon>
        Task Lists
      </v-tab>
    </v-tabs>

    <v-window v-model="activeTab">

      <!-- ═══════════════════════════════ Schedule Templates tab ═══════════════════════════════ -->
      <v-window-item value="templates">

    <!-- Row-per-template list -->
    <div v-if="templates.length > 0" class="template-list" role="list">
      <article
        v-for="tmpl in templates"
        :key="tmpl.template_id"
        class="template-row"
        role="listitem"
      >
        <div class="template-row__main">
          <div class="template-row__title-line">
            <h2 class="template-row__title type-h3">{{ tmpl.template_name }}</h2>
            <v-chip
              :color="tmpl.is_active ? 'success' : undefined"
              size="x-small"
              variant="tonal"
              class="template-row__status-chip"
            >
              {{ tmpl.is_active ? 'Active' : 'Inactive' }}
            </v-chip>
            <v-chip
              v-if="availabilityConflictCount(tmpl) > 0"
              color="warning"
              size="x-small"
              variant="tonal"
              prepend-icon="mdi-calendar-alert"
              class="template-row__status-chip"
            >
              {{ availabilityConflictCount(tmpl) }} conflict{{ availabilityConflictCount(tmpl) > 1 ? 's' : '' }}
            </v-chip>
            <v-chip
              v-if="coverageGapCount(tmpl) > 0"
              color="error"
              size="x-small"
              variant="tonal"
              prepend-icon="mdi-account-alert"
              class="template-row__status-chip"
            >
              {{ coverageGapCount(tmpl) }} unassigned
            </v-chip>
          </div>

          <div class="template-row__meta type-meta">
            <div class="template-row__days" :aria-label="coverageAriaLabel(tmpl)">
              <span
                v-for="d in DAY_DOTS"
                :key="d.value"
                class="day-dot"
                :class="{ 'day-dot--on': templateDayCoverage(tmpl)[d.value] }"
                :title="d.full"
              >{{ d.label }}</span>
            </div>
            <span class="template-row__meta-sep" aria-hidden="true">·</span>
            <span>
              <v-icon size="12" class="template-row__meta-icon">mdi-clock-outline</v-icon>
              {{ shiftCount(tmpl) }} shift{{ shiftCount(tmpl) === 1 ? '' : 's' }}
            </span>
            <span class="template-row__meta-sep" aria-hidden="true">·</span>
            <span>
              <v-icon size="12" class="template-row__meta-icon">mdi-briefcase-outline</v-icon>
              {{ positionCount(tmpl) }} position{{ positionCount(tmpl) === 1 ? '' : 's' }}
            </span>
            <span class="template-row__meta-sep" aria-hidden="true">·</span>
            <span>
              <v-icon size="12" class="template-row__meta-icon">mdi-repeat</v-icon>
              {{ recurrenceLabel(tmpl.recurrence_type) }}
            </span>
          </div>
        </div>

        <div class="template-row__actions">
          <v-tooltip text="Apply template to a week" location="top">
            <template #activator="{ props: ttProps }">
              <span v-bind="ttProps">
                <v-btn
                  icon="mdi-calendar-export"
                  color="primary"
                  variant="text"
                  density="comfortable"
                  :aria-label="`Apply template ${tmpl.template_name}`"
                  :disabled="templateUnassignedWorkerCount(tmpl) > 0"
                  @click="openApplyDialog(tmpl)"
                />
              </span>
            </template>
          </v-tooltip>

          <v-tooltip text="Edit template" location="top">
            <template #activator="{ props: ttProps }">
              <v-btn
                v-bind="ttProps"
                icon="mdi-pencil-outline"
                variant="text"
                density="comfortable"
                :aria-label="`Edit template ${tmpl.template_name}`"
                @click="openEditDialog(tmpl)"
              />
            </template>
          </v-tooltip>

          <v-tooltip text="Delete template" location="top">
            <template #activator="{ props: ttProps }">
              <v-btn
                v-bind="ttProps"
                icon="mdi-delete-outline"
                color="error"
                variant="text"
                density="comfortable"
                :aria-label="`Delete template ${tmpl.template_name}`"
                @click="deleteTemplate(tmpl)"
              />
            </template>
          </v-tooltip>

          <v-menu location="bottom end">
            <template #activator="{ props: menuProps }">
              <v-btn
                v-bind="menuProps"
                icon="mdi-dots-vertical"
                variant="text"
                density="comfortable"
                aria-label="More actions"
              />
            </template>
            <v-list density="compact">
              <v-list-item
                prepend-icon="mdi-content-copy"
                title="Duplicate"
                @click="openDuplicateDialog(tmpl)"
              />
              <v-list-item
                :prepend-icon="tmpl.is_active ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                :title="tmpl.is_active ? 'Deactivate' : 'Activate'"
                @click="toggleActive(tmpl)"
              />
            </v-list>
          </v-menu>
        </div>
      </article>
    </div>

    <!-- Empty state -->
    <div v-else-if="!loading && currentDeptId" class="template-empty">
      <v-icon size="56" class="template-empty__icon">mdi-text-box-multiple-outline</v-icon>
      <h3 class="type-h2 template-empty__title">No templates yet</h3>
      <p class="type-body template-empty__desc">
        Create a template to quickly build recurring weekly schedules.
      </p>
      <v-btn
        class="mt-3"
        color="primary"
        variant="elevated"
        prepend-icon="mdi-plus"
        @click="openCreateDialog"
      >
        Create first template
      </v-btn>
    </div>

    <v-progress-linear v-if="loading" indeterminate color="primary" />

      </v-window-item>

      <!-- ═══════════════════════════════ Task Lists tab ═══════════════════════════════ -->
      <v-window-item value="task-lists">

        <!-- Loading -->
        <template v-if="tlLoading">
          <v-skeleton-loader v-for="n in 3" :key="n" type="card" class="mb-4" />
        </template>

        <!-- Error -->
        <v-alert
          v-else-if="tlError"
          type="error"
          variant="tonal"
          class="mb-4"
          closable
          @click:close="tlError = null"
        >
          {{ tlError }}
        </v-alert>

        <!-- Empty state -->
        <div
          v-else-if="tlTaskLists.length === 0"
          class="template-empty"
        >
          <v-icon size="56" class="template-empty__icon">mdi-clipboard-list-outline</v-icon>
          <h3 class="type-h2 template-empty__title">No task lists yet</h3>
          <p class="type-body template-empty__desc">
            Create a task list (e.g. "Opening Checklist") and apply it to shifts so workers can check off their tasks each day.
          </p>
          <v-btn class="mt-3" color="primary" variant="elevated" prepend-icon="mdi-plus" @click="openCreateTlDialog">
            Create First Task List
          </v-btn>
        </div>

        <!-- Task list cards -->
        <div v-else class="template-list" role="list">
          <article
            v-for="list in tlTaskLists"
            :key="list.id"
            class="template-row"
            role="listitem"
          >
            <div class="template-row__main">
              <div class="template-row__title-line">
                <v-icon size="16" color="primary" class="mr-1">mdi-clipboard-list-outline</v-icon>
                <h2 class="template-row__title type-h3">{{ list.name }}</h2>
                <v-chip size="x-small" variant="tonal" color="primary">
                  {{ list.items?.length || 0 }} item{{ (list.items?.length || 0) !== 1 ? 's' : '' }}
                </v-chip>
              </div>
              <div class="template-row__meta type-meta">
                <span v-if="list.description">{{ list.description }}</span>
                <span v-if="list.description" class="template-row__meta-sep" aria-hidden="true">·</span>
                <span>
                  <v-icon size="12" class="template-row__meta-icon">mdi-format-list-checks</v-icon>
                  {{ (list.items || []).slice(0, 3).map(i => i.title).join(', ') }}{{ (list.items?.length || 0) > 3 ? ` +${list.items.length - 3} more` : '' }}
                </span>
              </div>
            </div>
            <div class="template-row__actions">
              <v-tooltip text="Edit task list" location="top">
                <template #activator="{ props: ttProps }">
                  <v-btn
                    v-bind="ttProps"
                    icon="mdi-pencil-outline"
                    variant="text"
                    density="comfortable"
                    @click="openEditTlDialog(list)"
                  />
                </template>
              </v-tooltip>
              <v-tooltip text="Delete task list" location="top">
                <template #activator="{ props: ttProps }">
                  <v-btn
                    v-bind="ttProps"
                    icon="mdi-delete-outline"
                    color="error"
                    variant="text"
                    density="comfortable"
                    @click="promptTlDelete(list)"
                  />
                </template>
              </v-tooltip>
            </div>
          </article>
        </div>

        <!-- Task list Create / Edit Dialog -->
        <v-dialog v-model="tlShowDialog" max-width="600px" persistent>
          <v-card>
            <v-card-title class="d-flex align-center pa-5 pb-3">
              <v-icon color="primary" class="mr-2">mdi-clipboard-list-outline</v-icon>
              {{ tlEditingList ? 'Edit Task List' : 'New Task List' }}
            </v-card-title>
            <v-divider />
            <v-card-text class="pa-5">
              <v-text-field
                v-model="tlForm.name"
                label="List Name *"
                placeholder="e.g. Opening Checklist"
                variant="outlined"
                density="comfortable"
                :error-messages="tlFormErrors.name"
                class="mb-3"
              />
              <v-textarea
                v-model="tlForm.description"
                label="Description (optional)"
                variant="outlined"
                density="comfortable"
                rows="2"
                auto-grow
                class="mb-4"
              />
              <div class="d-flex align-center justify-space-between mb-2">
                <span class="text-subtitle-2 font-weight-medium">Tasks</span>
                <v-btn size="small" variant="outlined" prepend-icon="mdi-plus" @click="addTlItem">Add Task</v-btn>
              </div>
              <div v-if="tlForm.items.length === 0" class="text-body-2 text-medium-emphasis text-center py-4">
                No tasks added yet
              </div>
              <div
                v-for="(item, idx) in tlForm.items"
                :key="idx"
                class="d-flex align-center gap-2 mb-2"
              >
                <span class="text-caption text-medium-emphasis" style="min-width:20px">{{ idx + 1 }}.</span>
                <v-text-field
                  v-model="item.title"
                  :label="`Task ${idx + 1}`"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="flex-grow-1"
                />
                <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="removeTlItem(idx)" />
              </div>
            </v-card-text>
            <v-card-actions class="px-5 pb-5">
              <v-spacer />
              <v-btn variant="text" @click="closeTlDialog">Cancel</v-btn>
              <v-btn color="primary" variant="elevated" :loading="tlSaving" @click="saveTlList">
                {{ tlEditingList ? 'Save Changes' : 'Create List' }}
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Task list Delete Confirm Dialog -->
        <v-dialog v-model="tlShowDeleteDialog" max-width="420px">
          <v-card>
            <v-card-title class="text-h6 pa-4">Delete Task List</v-card-title>
            <v-card-text class="pa-4 pt-0">
              Are you sure you want to delete <strong>{{ tlDeletingList?.name }}</strong>?
              This cannot be undone. Any shifts using this list will lose their task list assignment.
            </v-card-text>
            <v-card-actions class="pa-4 pt-0">
              <v-spacer />
              <v-btn variant="text" @click="tlShowDeleteDialog = false">Cancel</v-btn>
              <v-btn color="error" variant="flat" :loading="tlDeleting" @click="confirmTlDelete">Delete</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

      </v-window-item>

    </v-window>

    <!-- ─────────────────────────────────────────────────────────────────────
         CREATE / EDIT DIALOG (calendar-based shift editor)
    ───────────────────────────────────────────────────────────────────────── -->
    <v-dialog v-model="showDialog" :max-width="1300" fullscreen-breakpoint="md" persistent scrollable>
      <v-card>
        <v-card-title class="d-flex align-center pa-4 pb-2">
          <v-icon class="mr-2">{{ editingTemplate ? 'mdi-pencil' : 'mdi-calendar-plus' }}</v-icon>
          {{ editingTemplate ? 'Edit template' : 'New schedule template' }}
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

        <v-alert
          v-if="unassignedWorkerCount > 0"
          type="warning"
          variant="tonal"
          density="compact"
          class="ma-4 mb-0"
          icon="mdi-account-alert"
        >
          <strong>{{ unassignedWorkerCount }} shift{{ unassignedWorkerCount > 1 ? 's have' : ' has' }} no assigned worker.</strong>
          You can save this template now — assign a worker to every shift before applying.
        </v-alert>

        <v-card-text class="pa-4 overflow-y-auto" style="max-height: calc(100vh - 180px)">
          <v-form ref="formRef">
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

            <TemplateCalendarEditor
              v-if="showDialog"
              v-model="form.shifts"
              :positions="positions"
              :workers="deptWorkers"
              :conflicts="editorConflicts"
              :departmentHours="departmentHours"
            />
          </v-form>
        </v-card-text>

        <v-divider />
        <v-card-actions class="pa-4">
          <span class="type-meta">
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
            {{ editingTemplate ? 'Save changes' : 'Create template' }}
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
          Duplicate template
        </v-card-title>
        <v-divider />
        <v-card-text>
          <p class="type-body template-dup__desc">
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
         APPLY DIALOG — date picker + conflict review via AvailabilityGrid
    ───────────────────────────────────────────────────────────────────────── -->
    <v-dialog v-model="showApplyDialog" max-width="960px" persistent scrollable>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-calendar-export</v-icon>
          Apply template: {{ applyTarget?.template_name }}
        </v-card-title>
        <v-divider />
        <v-card-text>
          <v-alert
            v-if="applyTargetUnassignedCount > 0"
            type="error"
            variant="tonal"
            class="mb-4"
            icon="mdi-account-alert"
          >
            <strong>Cannot apply yet.</strong>
            {{ applyTargetUnassignedCount }} shift{{ applyTargetUnassignedCount > 1 ? 's have' : ' has' }} no assigned worker.
            Edit the template and assign a worker to every shift, then come back to apply.
          </v-alert>

          <p class="type-body apply-intro">
            Generates real shifts for the chosen week from this template's pattern.
            Workers are notified when shifts are applied immediately.
          </p>

          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="applyForm.start_date"
                type="date"
                :label="applyWeekLabel"
                variant="outlined"
                :rules="[v => !!v || 'Date required', v => applyDateIsMonday(v) || 'Please pick a Monday']"
                :hint="applyDateRangeHint"
                persistent-hint
                @update:modelValue="loadApplyConflicts"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-checkbox
                v-model="applyForm.publish_immediately"
                label="Publish immediately & notify workers"
                hide-details
              />
              <p class="type-meta apply-immediate-hint">
                {{ applyForm.publish_immediately
                  ? 'Shifts will be visible to student workers immediately.'
                  : 'Shifts will be saved as drafts — students will not see them until you publish manually.' }}
              </p>
            </v-col>
          </v-row>

          <!-- Conflict review: AvailabilityGrid preview + per-conflict resolution -->
          <div v-if="showConflictReview" class="apply-conflict">
            <div class="apply-conflict__header">
              <v-icon color="warning" class="mr-1">mdi-alert</v-icon>
              <span class="type-h3">
                {{ applyConflicts.length }} conflict{{ applyConflicts.length > 1 ? 's' : '' }} against existing shifts
              </span>
            </div>

            <p class="type-meta apply-conflict__hint">
              The grid below shows the template's generated shifts overlaid on the chosen
              week. Review each conflict and choose how to resolve it, then apply.
            </p>

            <!--
              TODO(backend): no "dry-run apply" endpoint exists today. The grid below
              shows only the template-side projection; existing-shift overlay requires
              either (a) a new GET /schedule-templates/:id/preview?start_date=YYYY-MM-DD
              that returns both generated shifts and the already-scheduled shifts for the
              same range, or (b) the current /conflicts response extended with the
              offending existing-shift payload (shift_id, start, end, assignee) so the
              client can render both sides. Once available, wire in the existing-shift
              events alongside applyGridEvents below.
            -->
            <div class="apply-conflict__grid">
              <AvailabilityGrid
                mode="readonly"
                :range="applyGridRange"
                :events="applyGridEvents"
                :positions="positions"
                :slot-min-time="'06:00'"
                :slot-max-time="'23:00'"
              />
            </div>

            <ul class="apply-conflict__list">
              <li
                v-for="(c, i) in applyConflicts"
                :key="i"
                class="apply-conflict__item"
                :class="{ 'apply-conflict__item--coverage': c.type === 'no_coverage' }"
              >
                <v-icon
                  :color="c.type === 'no_coverage' ? 'error' : 'warning'"
                  size="18"
                  class="apply-conflict__item-icon"
                >
                  {{ c.type === 'no_coverage' ? 'mdi-account-alert' : 'mdi-calendar-alert' }}
                </v-icon>
                <div class="apply-conflict__item-body">
                  <div class="type-body">{{ c.message }}</div>
                  <div v-if="conflictResolutions[conflictKey(c, i)]" class="type-meta apply-conflict__resolution">
                    Resolution: <strong>{{ RESOLUTION_LABELS[conflictResolutions[conflictKey(c, i)]] }}</strong>
                  </div>
                </div>
                <div class="apply-conflict__item-actions">
                  <v-tooltip text="Keep the existing shift; skip this template slot" location="top">
                    <template #activator="{ props: ttProps }">
                      <v-btn
                        v-bind="ttProps"
                        size="small"
                        variant="outlined"
                        :color="conflictResolutions[conflictKey(c, i)] === 'keep' ? 'primary' : undefined"
                        @click="setResolution(c, i, 'keep')"
                      >
                        Keep existing
                      </v-btn>
                    </template>
                  </v-tooltip>
                  <v-tooltip text="Replace the existing shift with the template slot" location="top">
                    <template #activator="{ props: ttProps }">
                      <v-btn
                        v-bind="ttProps"
                        size="small"
                        variant="outlined"
                        color="warning"
                        @click="setResolution(c, i, 'overwrite')"
                      >
                        Overwrite
                      </v-btn>
                    </template>
                  </v-tooltip>
                  <v-tooltip text="Do not create this template slot" location="top">
                    <template #activator="{ props: ttProps }">
                      <v-btn
                        v-bind="ttProps"
                        size="small"
                        variant="outlined"
                        :color="conflictResolutions[conflictKey(c, i)] === 'skip' ? 'primary' : undefined"
                        @click="setResolution(c, i, 'skip')"
                      >
                        Skip
                      </v-btn>
                    </template>
                  </v-tooltip>
                </div>
              </li>
            </ul>
          </div>

          <div
            v-else-if="applyForm.start_date && !applyConflictsLoading"
            class="apply-no-conflict"
          >
            <v-icon size="18" color="success" class="mr-1">mdi-check-circle</v-icon>
            <span class="type-body">No conflicts found for this week.</span>
          </div>

          <v-progress-linear v-if="applyConflictsLoading" indeterminate class="mt-2" />
        </v-card-text>

        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showApplyDialog = false">Cancel</v-btn>
          <v-btn
            v-if="showConflictReview"
            color="warning"
            variant="outlined"
            :loading="publishing"
            :disabled="!applyForm.start_date || applyTargetUnassignedCount > 0"
            @click="confirmApply"
          >
            Apply anyway
          </v-btn>
          <v-btn
            v-else
            color="primary"
            variant="elevated"
            :loading="publishing"
            :disabled="!applyForm.start_date || applyTargetUnassignedCount > 0"
            @click="confirmApply"
          >
            {{ applyForm.publish_immediately ? 'Apply & notify' : 'Create shifts (draft)' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="4000">
      <v-icon start>{{ snackbar.color === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle' }}</v-icon>
      {{ snackbar.text }}
    </v-snackbar>
  </PageFrame>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import templateService from '../services/templateService.js'
import apiClient from '../services/services.js'
import Utils from '../config/utils.js'
import { TZ } from '../utils/tz.js'
import UserRoleServices from '../services/userRoleServices.js'
import taskListService from '../services/taskListService.js'
import TemplateCalendarEditor from '../components/TemplateCalendarEditor.vue'
import PageFrame from '../components/PageFrame.vue'
import PageHeader from '../components/PageHeader.vue'
import AvailabilityGrid from '../components/AvailabilityGrid.vue'
import departmentServices from '../services/departmentServices.js'

// ─── Context ─────────────────────────────────────────────────────────────────
const _deptCtxInit = Utils.getStore('currentDepartmentContext') || {}
const currentDeptId = ref(_deptCtxInit.department_id || null)
const currentDeptName = ref(_deptCtxInit.department_name || '')
const currentUser = Utils.getStore('user') || {}

const activeTab = ref('templates')

const loading = ref(false)
const saving = ref(false)
const duplicating = ref(false)
const publishing = ref(false)
const applyConflictsLoading = ref(false)

const templates = ref([])
const positions = ref([])
const deptWorkers = ref([])
const departmentHours = ref([])

// Per-template cached editor conflicts map: { [template_id]: [conflict, ...] }
const templateConflictsMap = ref({})

const showDialog = ref(false)
const editingTemplate = ref(null)
const formRef = ref(null)
const editorConflicts = ref([])

const showDuplicateDialog = ref(false)
const duplicateTarget = ref(null)
const duplicateName = ref('')

const showApplyDialog = ref(false)
const applyTarget = ref(null)
const applyConflicts = ref([])
const conflictResolutions = ref({})   // key -> 'keep' | 'overwrite' | 'skip'

const snackbar = ref({ show: false, text: '', color: 'success' })

const form = ref({
  template_name: '',
  recurrence_type: 'weekly',
  is_active: true,
  shifts: [],
})

const applyForm = ref({
  start_date: '',
  publish_immediately: true,
})

// ─── Reference data ───────────────────────────────────────────────────────────
const recurrenceOptions = [
  { label: 'Weekly',    value: 'weekly'   },
  { label: 'Bi-weekly', value: 'biweekly' },
  { label: 'Monthly',   value: 'monthly'  },
]

// Day-of-week dots in Mon-first order (with Sunday rolled to the end).
// `value` matches the JS getDay() convention used by templateShifts.
const DAY_DOTS = [
  { value: 1, label: 'M', full: 'Monday' },
  { value: 2, label: 'T', full: 'Tuesday' },
  { value: 3, label: 'W', full: 'Wednesday' },
  { value: 4, label: 'T', full: 'Thursday' },
  { value: 5, label: 'F', full: 'Friday' },
  { value: 6, label: 'S', full: 'Saturday' },
  { value: 0, label: 'S', full: 'Sunday' },
]

const RESOLUTION_LABELS = {
  keep: 'Keep existing',
  overwrite: 'Overwrite',
  skip: 'Skip',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const recurrenceLabel = (type) =>
  ({ weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly' })[type] || type

const templateDayCoverage = (tmpl) => {
  const cov = { 0: false, 1: false, 2: false, 3: false, 4: false, 5: false, 6: false }
  for (const s of tmpl.templateShifts || []) {
    const d = Number(s.day_of_week)
    if (Number.isFinite(d) && d >= 0 && d <= 6) cov[d] = true
  }
  return cov
}

const coverageAriaLabel = (tmpl) => {
  const cov = templateDayCoverage(tmpl)
  const covered = DAY_DOTS.filter((d) => cov[d.value]).map((d) => d.full)
  return covered.length
    ? `Covers ${covered.join(', ')}`
    : 'No days covered yet'
}

const shiftCount = (tmpl) => (tmpl.templateShifts || []).length

const positionCount = (tmpl) => {
  const seen = new Set()
  for (const s of tmpl.templateShifts || []) {
    if (s.position_id != null) seen.add(s.position_id)
  }
  return seen.size
}

// ─── Template save gate ──────────────────────────────────────────────────────
const canSaveTemplate = computed(
  () => !!(form.value.template_name?.trim()) && !!(form.value.recurrence_type)
)

// ─── Editor validation ────────────────────────────────────────────────────────
const unassignedPositionCount = computed(
  () => form.value.shifts.filter((s) => !s.position_id).length
)
const hasUnassignedPositions = computed(() => unassignedPositionCount.value > 0)

const unassignedWorkerCount = computed(
  () => form.value.shifts.filter((s) => !s.assigned_user_id).length
)
const templateUnassignedWorkerCount = (tmpl) =>
  (tmpl.templateShifts || []).filter((s) => !s.assigned_user_id).length
const applyTargetUnassignedCount = computed(
  () => templateUnassignedWorkerCount(applyTarget.value || {})
)

// ─── Apply date helpers ──────────────────────────────────────────────────────
const applyWeekLabel = computed(() => {
  const rec = applyTarget.value?.recurrence_type
  if (rec === 'biweekly') return 'Fortnight start (Monday)'
  if (rec === 'monthly')  return 'Month start (Monday)'
  return 'Week start (Monday)'
})

const applyDateIsMonday = (v) => {
  if (!v) return true
  return new Date(v + 'T00:00:00').getDay() === 1
}

const applyDateRangeHint = computed(() => {
  if (!applyForm.value.start_date || !applyDateIsMonday(applyForm.value.start_date)) return ''
  const start  = new Date(applyForm.value.start_date + 'T00:00:00')
  const end    = new Date(start)
  end.setDate(end.getDate() + 6)
  const fmt    = (d) => d.toLocaleDateString('en-US', { timeZone: TZ, month: 'short', day: 'numeric', year: 'numeric' })
  return `Shifts will be created: ${fmt(start)} – ${fmt(end)}`
})

// ─── Conflict helpers ─────────────────────────────────────────────────────────
const templateCachedConflicts = (tmpl) =>
  templateConflictsMap.value[tmpl.template_id] || []

const coverageGapCount = (tmpl) =>
  templateCachedConflicts(tmpl).filter((c) => c.type === 'no_coverage').length

const availabilityConflictCount = (tmpl) =>
  templateCachedConflicts(tmpl).filter((c) => c.type === 'availability_conflict').length

const showConflictReview = computed(
  () => applyConflicts.value.length > 0 && !applyConflictsLoading.value
)

// ─── Apply-grid projection ───────────────────────────────────────────────────
// The grid shows the template's generated shifts against the chosen week.
// Until the backend ships a dry-run apply endpoint (see TODO in template),
// existing-shift overlay is not available and the grid renders template shifts
// only — which still gives the manager a spatial view of what's about to land.
const applyGridRange = computed(() => {
  if (!applyForm.value.start_date) return null
  const start = new Date(applyForm.value.start_date + 'T00:00:00')
  const end   = new Date(start)
  end.setDate(end.getDate() + 7)
  return { start, end }
})

const toIsoForDay = (baseDate, dayOfWeek, hhmm) => {
  // baseDate is the Monday start. day_of_week uses JS convention
  // (0=Sun..6=Sat). Map to Mon-relative offset.
  const d = new Date(baseDate.getTime())
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  d.setDate(d.getDate() + offset)
  const [h, m] = (hhmm || '00:00').split(':').map(Number)
  d.setHours(h || 0, m || 0, 0, 0)
  return d
}

const applyGridEvents = computed(() => {
  const tmpl = applyTarget.value
  const range = applyGridRange.value
  if (!tmpl || !range) return []
  const base = new Date(range.start.getTime())
  const conflictShiftIds = new Set(
    applyConflicts.value.map((c) => c.templateShiftId).filter((id) => id != null)
  )
  return (tmpl.templateShifts || []).map((s) => {
    const id = s.shift_id ?? `${s.day_of_week}-${s.start_time}`
    const start = toIsoForDay(base, Number(s.day_of_week), s.start_time?.slice(0, 5))
    const end   = toIsoForDay(base, Number(s.day_of_week), s.end_time?.slice(0, 5))
    const name  = s.assignedUser
      ? `${s.assignedUser.fName || ''} ${s.assignedUser.lName || ''}`.trim()
      : (s.position?.position_name || 'Template shift')
    const inConflict = conflictShiftIds.has(s.shift_id)
    return {
      id,
      title: name,
      start,
      end,
      positionId: s.position_id,
      positionColor: s.position?.color,
      state: inConflict ? 'needs-coverage' : (s.assigned_user_id ? 'filled' : 'open'),
      assigneeName: name,
    }
  })
})

const conflictKey = (c, i) => {
  if (c.templateShiftId != null) return `t:${c.templateShiftId}`
  if (c.shift_id != null) return `s:${c.shift_id}`
  return `i:${i}`
}

const setResolution = (c, i, choice) => {
  conflictResolutions.value = {
    ...conflictResolutions.value,
    [conflictKey(c, i)]: choice,
  }
}

// ─── Data loading ─────────────────────────────────────────────────────────────
const loadTemplates = async () => {
  if (!currentDeptId.value) return
  loading.value = true
  try {
    const res = await templateService.listTemplates(currentDeptId.value)
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
  if (!currentDeptId.value) return

  // ── Positions ─────────────────────────────────────────────────────────────
  try {
    const posRes = await apiClient.get(`positions?department_id=${currentDeptId.value}`)
    positions.value = posRes?.data?.data || posRes?.data || []
  } catch (err) {
    console.error('Error loading positions:', err)
    positions.value = []
  }

  // ── Workers ───────────────────────────────────────────────────────────────
  try {
    const usersRes = await apiClient.get('user-departments/admin/users-with-roles?activeOnly=true')

    const users = usersRes?.data?.data || usersRes?.data || []
    const targetDepartmentId = Number(currentDeptId.value)

    const departmentWorkers = []
    for (const u of users) {
      const memberships = Array.isArray(u?.userDepartments) ? u.userDepartments
        : Array.isArray(u?.departments) ? u.departments
        : []
      const deptMembership = memberships.find((membership) => {
        const deptId = Number(
          membership?.department_id ??
          membership?.department?.department_id ??
          membership?.departmentId ??
          0
        )
        return deptId === targetDepartmentId
      })

      if (!deptMembership) continue
      if (deptMembership?.is_active === false) continue

      const roleName = String(
        deptMembership?.role?.role_name || deptMembership?.role_name || ''
      ).toLowerCase()
      const permissionLevel = Number(
        deptMembership?.role?.permission_level ?? deptMembership?.permission_level ?? 0
      )
      const isStudentRole = roleName.includes('student') || permissionLevel < 50
      if (!isStudentRole) continue

      const userId = u?.userId || u?.id || u?.user_id
      if (!userId) continue

      departmentWorkers.push({
        user_id: userId,
        user: {
          fName: u?.fName || '',
          lName: u?.lName || '',
          email: u?.email || '',
        },
      })
    }

    if (departmentWorkers.length > 0) {
      deptWorkers.value = departmentWorkers
      return
    }
  } catch (err) {
    console.error('Primary worker endpoint failed, trying fallback:', err)
  }

  // Fallback: department-scoped member list
  try {
    const membersRes = await apiClient.get(`admin/departments/${currentDeptId.value}/members`)
    const members = membersRes?.data?.data || membersRes?.data || []
    deptWorkers.value = members
      .filter((m) => {
        const roleName = String(m?.role?.role_name || m?.role_name || '').toLowerCase()
        const permLevel = Number(m?.role?.permission_level ?? m?.permission_level ?? 0)
        return roleName.includes('student') || permLevel < 50
      })
      .map((m) => {
        const u = m.user || m
        return {
          user_id: u?.userId || u?.id || u?.user_id,
          user: { fName: u?.fName || '', lName: u?.lName || '', email: u?.email || '' },
        }
      })
      .filter((w) => w.user_id)
  } catch (err) {
    console.error('Error loading department workers:', err)
    deptWorkers.value = []
  }

  // ── Department Hours ──────────────────────────────────────────────────────
  try {
    const hoursRes = await departmentServices.getDepartmentHours(currentDeptId.value)
    departmentHours.value = hoursRes?.data?.data || []
  } catch (err) {
    console.error('Error loading department hours:', err)
    departmentHours.value = []
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
  editorConflicts.value = templateConflictsMap.value[tmpl.template_id] || []
  showDialog.value = true
}

const closeDialog = () => {
  showDialog.value = false
  editingTemplate.value = null
  editorConflicts.value = []
}

const saveTemplate = async () => {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  saving.value = true
  try {
    const payload = {
      department_id: currentDeptId.value,
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

// ─── Apply (publish) ──────────────────────────────────────────────────────────
const openApplyDialog = (tmpl) => {
  applyTarget.value = tmpl
  applyConflicts.value = []
  conflictResolutions.value = {}
  applyForm.value = { start_date: '', publish_immediately: true }
  showApplyDialog.value = true
}

const loadApplyConflicts = async () => {
  if (!applyTarget.value || !applyForm.value.start_date) return
  applyConflictsLoading.value = true
  conflictResolutions.value = {}
  try {
    // NOTE: the current /conflicts endpoint is a *check* not a dry-run apply —
    // it returns the list of predicted issues but not the existing shifts
    // already on the calendar. That's why the conflict-review grid below only
    // renders the template-side projection. See TODO in template.
    const res = await templateService.checkConflicts(
      applyTarget.value.template_id,
      applyForm.value.start_date
    )
    applyConflicts.value = res?.data?.conflicts || []
  } catch {
    applyConflicts.value = []
  } finally {
    applyConflictsLoading.value = false
  }
}

const confirmApply = async () => {
  if (!applyTarget.value || !applyForm.value.start_date) return
  publishing.value = true
  try {
    // TODO(backend): publishTemplate currently ignores per-conflict resolutions.
    // Once the backend accepts a `conflict_resolutions` payload keyed by
    // template_shift_id (or conflicting shift_id), pass
    // `conflictResolutions.value` through here so Keep/Overwrite/Skip choices
    // actually take effect server-side. Today they're captured for UX parity
    // but the backend applies its default behaviour.
    const res = await templateService.publishTemplate(
      applyTarget.value.template_id,
      applyForm.value.start_date,
      applyForm.value.publish_immediately
    )
    const data = res?.data
    const label = applyForm.value.publish_immediately ? 'published' : 'created as drafts'
    showSnackbar(
      `${data?.shifts_created || 0} shift(s) ${label} for week of ${applyForm.value.start_date}`,
      'success'
    )
    showApplyDialog.value = false
    loadTemplates()
  } catch (err) {
    showSnackbar('Failed to apply template', 'error')
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

// ─── Task Lists state & functions ─────────────────────────────────────────────
const tlTaskLists = ref([])
const tlLoading = ref(false)
const tlError = ref(null)
const tlShowDialog = ref(false)
const tlEditingList = ref(null)
const tlSaving = ref(false)
const tlFormErrors = ref({})
const tlForm = ref(emptyTlForm())
const tlShowDeleteDialog = ref(false)
const tlDeletingList = ref(null)
const tlDeleting = ref(false)

function emptyTlForm() {
  return { name: '', description: '', items: [] }
}

async function loadTaskLists() {
  tlLoading.value = true
  tlError.value = null
  try {
    const res = await taskListService.listTaskLists(
      currentDeptId.value ? { department_id: currentDeptId.value } : {}
    )
    tlTaskLists.value = res.data || []
  } catch (e) {
    tlError.value = e.response?.data?.message || e.message || 'Failed to load task lists'
  } finally {
    tlLoading.value = false
  }
}

function openCreateTlDialog() {
  tlEditingList.value = null
  tlForm.value = emptyTlForm()
  tlFormErrors.value = {}
  tlShowDialog.value = true
}

function openEditTlDialog(list) {
  tlEditingList.value = list
  tlForm.value = {
    name: list.name,
    description: list.description || '',
    items: (list.items || []).map((item) => ({ title: item.title })),
  }
  tlFormErrors.value = {}
  tlShowDialog.value = true
}

function closeTlDialog() {
  tlShowDialog.value = false
  tlEditingList.value = null
}

function addTlItem() {
  tlForm.value.items.push({ title: '' })
}

function removeTlItem(idx) {
  tlForm.value.items.splice(idx, 1)
}

async function saveTlList() {
  tlFormErrors.value = {}
  if (!tlForm.value.name?.trim()) {
    tlFormErrors.value.name = 'List name is required'
    return
  }
  tlSaving.value = true
  try {
    const payload = {
      name: tlForm.value.name.trim(),
      description: tlForm.value.description || null,
      department_id: currentDeptId.value,
      items: tlForm.value.items.filter((i) => i.title?.trim()),
    }
    if (tlEditingList.value) {
      await taskListService.updateTaskList(tlEditingList.value.id, payload)
      showSnackbar('Task list updated')
    } else {
      await taskListService.createTaskList(payload)
      showSnackbar('Task list created')
    }
    closeTlDialog()
    await loadTaskLists()
  } catch (e) {
    showSnackbar(e.response?.data?.message || 'Could not save task list', 'error')
  } finally {
    tlSaving.value = false
  }
}

function promptTlDelete(list) {
  tlDeletingList.value = list
  tlShowDeleteDialog.value = true
}

async function confirmTlDelete() {
  tlDeleting.value = true
  try {
    await taskListService.deleteTaskList(tlDeletingList.value.id)
    showSnackbar('Task list deleted')
    tlShowDeleteDialog.value = false
    tlDeletingList.value = null
    await loadTaskLists()
  } catch (e) {
    showSnackbar(e.response?.data?.message || 'Could not delete task list', 'error')
  } finally {
    tlDeleting.value = false
  }
}

// ─── Sidebar context listener ────────────────────────────────────────────────
// If ManagerSidebar resolves the department context after this page has already
// mounted, pick it up via the custom event instead of showing "No department".
const onDeptContextReady = (e) => {
  const ctx = e.detail
  if (ctx?.department_id && !currentDeptId.value) {
    currentDeptId.value = ctx.department_id
    currentDeptName.value = ctx.department_name || ''
    loadTemplates()
    loadDeptData()
    loadTaskLists()
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
onMounted(async () => {
  window.addEventListener('departmentContextReady', onDeptContextReady)

  if (!currentDeptId.value) {
    const freshCtx = Utils.getStore('currentDepartmentContext')
    if (freshCtx?.department_id) {
      currentDeptId.value = freshCtx.department_id
      currentDeptName.value = freshCtx.department_name || ''
    }
  }

  if (!currentDeptId.value) {
    const userId = currentUser?.userId || currentUser?.id
    if (userId) {
      try {
        const response = await UserRoleServices.getUserDepartments(userId)
        const memberships = response?.data || []
        const managerMembership = memberships.find(
          (m) => m.is_active && (m.role?.permission_level || 0) >= 50
        )
        const membership =
          managerMembership ||
          memberships.find((m) => m.is_active) ||
          memberships[0]
        if (membership) {
          currentDeptId.value = membership.department_id
          currentDeptName.value = membership.department?.department_name || ''
          Utils.setStore('currentDepartmentContext', {
            department_id: membership.department_id,
            department_name: currentDeptName.value,
            role_name: membership.role?.role_name || 'Manager',
            role_id: membership.role_id,
          })
        }
      } catch {
        // Non-fatal: page will show the "No department selected" warning.
      }
    }
  }
  loadTemplates()
  loadDeptData()
  loadTaskLists()
})

onBeforeUnmount(() => {
  window.removeEventListener('departmentContextReady', onDeptContextReady)
})
</script>

<style scoped>
/* ── Template row list ────────────────────────────────────────────────── */
.template-list {
  display: flex;
  flex-direction: column;
  background: var(--surface-0);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.template-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-bottom: 1px solid var(--border-1);
  transition: background-color 0.15s ease;
}
.template-row:last-child {
  border-bottom: 0;
}
.template-row:hover {
  background-color: var(--surface-2);
}

.template-row__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.template-row__title-line {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.template-row__title {
  margin: 0;
  color: var(--text-1);
  overflow: hidden;
  text-overflow: ellipsis;
}
.template-row__status-chip {
  flex-shrink: 0;
}

.template-row__meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  color: var(--text-2);
}
.template-row__meta-sep {
  color: var(--text-3);
}
.template-row__meta-icon {
  margin-right: 2px;
  color: var(--text-3);
}

.template-row__days {
  display: inline-flex;
  gap: 4px;
}

.day-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  font-size: 10px;
  font-weight: 600;
  border-radius: 50%;
  background: var(--surface-2);
  color: var(--text-3);
  border: 1px solid var(--border-1);
  line-height: 1;
}
.day-dot--on {
  background: var(--brand-primary-lt);
  color: var(--brand-primary-dk);
  border-color: var(--brand-primary-lt);
}

.template-row__actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

/* ── Empty state ──────────────────────────────────────────────────────── */
.template-empty {
  text-align: center;
  padding: var(--space-6) var(--space-4);
  background: var(--surface-0);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
}
.template-empty__icon {
  color: var(--text-3);
}
.template-empty__title {
  margin: var(--space-2) 0 0 0;
  color: var(--text-2);
}
.template-empty__desc {
  color: var(--text-2);
  max-width: 40ch;
  margin: 0 0 var(--space-2) 0;
}

/* ── Duplicate dialog copy ────────────────────────────────────────────── */
.template-dup__desc {
  color: var(--text-2);
  margin-bottom: var(--space-3);
}

/* ── Apply dialog ─────────────────────────────────────────────────────── */
.apply-intro {
  color: var(--text-2);
  margin-bottom: var(--space-3);
}
.apply-immediate-hint {
  margin-left: 32px;
  margin-top: -4px;
  color: var(--text-2);
}
.apply-no-conflict {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin-top: var(--space-2);
  color: var(--state-active);
}

.apply-conflict {
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border-1);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.apply-conflict__header {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}
.apply-conflict__hint {
  color: var(--text-2);
  margin: 0;
}
.apply-conflict__grid {
  height: 420px;
  border: 1px solid var(--border-1);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--surface-0);
}

.apply-conflict__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.apply-conflict__item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-2);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-sm);
  background: var(--surface-0);
}
.apply-conflict__item--coverage {
  background: var(--state-alert-lt);
}
.apply-conflict__item-icon {
  margin-top: 2px;
  flex-shrink: 0;
}
.apply-conflict__item-body {
  flex: 1;
  min-width: 0;
}
.apply-conflict__resolution {
  margin-top: 2px;
  color: var(--text-2);
}
.apply-conflict__item-actions {
  display: flex;
  gap: var(--space-1);
  flex-shrink: 0;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .template-row {
    flex-direction: column;
    align-items: flex-start;
  }
  .template-row__actions {
    width: 100%;
    justify-content: flex-end;
  }
  .apply-conflict__item {
    flex-direction: column;
  }
  .apply-conflict__item-actions {
    width: 100%;
  }
}
</style>
