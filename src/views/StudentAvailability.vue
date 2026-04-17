<template>
  <!-- ═══════════════════════════════════════════ -->
  <!-- MOBILE LAYOUT                               -->
  <!-- ═══════════════════════════════════════════ -->
  <div v-if="mobile" class="hours-screen">

    <!-- Segmented control -->
    <div class="m-segment-wrap">
      <div class="m-segment">
        <button
          class="m-seg-btn"
          :class="{ 'm-seg-btn--active': mobileTab === 'availability' }"
          @click="mobileTab = 'availability'"
        >My Availability</button>
        <button
          class="m-seg-btn"
          :class="{ 'm-seg-btn--active': mobileTab === 'timeoff' }"
          @click="mobileTab = 'timeoff'"
        >
          Time Off
          <span v-if="exceptions.length" class="m-seg-badge">{{ exceptions.length }}</span>
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="m-loading">
      <v-progress-circular indeterminate size="28" width="2" color="#80162B" />
    </div>

    <!-- ─── AVAILABILITY TAB ─── -->
    <div v-if="mobileTab === 'availability'" class="m-tab-content">

      <!-- Sync status card (compact) -->
      <div class="m-sync-card" :class="'m-sync-card--' + statusTone">
        <div class="m-sync-row">
          <v-icon
            :icon="statusTone === 'success' ? 'mdi-check-circle' : statusTone === 'error' ? 'mdi-alert-circle' : 'mdi-information'"
            size="18"
            :color="statusTone === 'success' ? '#0D9488' : statusTone === 'error' ? '#DC2626' : '#F59E0B'"
          />
          <span class="m-sync-label">Class sync: {{ statusLabel }}</span>
        </div>
      </div>

      <!-- View toggle: List / Calendar -->
      <div class="m-view-toggle">
        <button class="m-view-btn" :class="{ 'm-view-btn--active': mobileViewMode === 'list' }" @click="mobileViewMode = 'list'">
          <v-icon icon="mdi-format-list-bulleted" size="14" class="mr-1" />List
        </button>
        <button class="m-view-btn" :class="{ 'm-view-btn--active': mobileViewMode === 'calendar' }" @click="mobileViewMode = 'calendar'">
          <v-icon icon="mdi-calendar-month" size="14" class="mr-1" />Calendar
        </button>
      </div>

      <!-- ═══ CALENDAR VIEW ═══ -->
      <div v-if="mobileViewMode === 'calendar'" class="m-cal">
        <!-- Legend -->
        <div class="m-cal-legend">
          <span class="m-cal-legend-item"><span class="m-cal-dot m-cal-dot--class"></span>Class</span>
          <span class="m-cal-legend-item"><span class="m-cal-dot m-cal-dot--available"></span>Available</span>
          <span class="m-cal-legend-item"><span class="m-cal-dot m-cal-dot--unavailable"></span>Unavailable</span>
        </div>

        <!-- Grid -->
        <div class="m-cal-grid">
          <!-- Time gutter -->
          <div class="m-cal-gutter">
            <div class="m-cal-gutter-header"></div>
            <div v-for="hour in calGridHours" :key="hour" class="m-cal-gutter-label">
              {{ hour > 12 ? hour - 12 : hour }}{{ hour >= 12 ? 'p' : 'a' }}
            </div>
          </div>
          <!-- Day columns -->
          <div v-for="dow in [1, 2, 3, 4, 5, 6, 0]" :key="dow" class="m-cal-col">
            <div class="m-cal-col-header">{{ DOW_LABELS[dow].slice(0, 3) }}</div>
            <div class="m-cal-col-body" :style="{ height: calGridHours.length * 40 + 'px' }">
              <!-- Hour grid lines -->
              <div v-for="(hour, i) in calGridHours" :key="'line-' + hour" class="m-cal-hour-line" :style="{ top: i * 40 + 'px' }"></div>
              <!-- Blocks -->
              <div
                v-for="block in getCalBlocksForDay(dow)"
                :key="block.tempId"
                class="m-cal-block"
                :class="{
                  'm-cal-block--class': isClassScheduleBlock(block),
                  'm-cal-block--available': !isClassScheduleBlock(block) && block.availabilityType === 'available',
                  'm-cal-block--unavailable': !isClassScheduleBlock(block) && block.availabilityType === 'unavailable',
                }"
                :style="calcBlockStyle(block)"
                @click="isClassScheduleBlock(block) ? null : (editForm = { ...block }, showEditDialog = true)"
              >
                <span class="m-cal-block-label">{{ calBlockLabel(block) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ LIST VIEW ═══ -->
      <template v-if="mobileViewMode === 'list'">
        <!-- Day selector pills -->
        <div class="m-day-selector">
          <button class="m-day-pill" :class="{ 'm-day-pill--active': mobileDayIndex === -1 }" @click="mobileDayIndex = -1">All</button>
          <button
            v-for="dow in [1, 2, 3, 4, 5, 6, 0]"
            :key="dow"
            class="m-day-pill"
            :class="{ 'm-day-pill--active': mobileDayIndex === dow, 'm-day-pill--has-class': dayHasClass(dow) }"
            @click="mobileDayIndex = dow"
          >{{ DOW_LABELS[dow].slice(0, 3) }}</button>
        </div>

        <!-- Day-by-day blocks list -->
        <div v-if="mobileFilteredBlocks.length" class="m-day-list">
          <div v-for="group in mobileFilteredBlocks" :key="group.dow" class="m-day-group">
            <div class="m-day-label">{{ group.label }}</div>
            <div class="m-block-cards">
              <div
                v-for="block in group.blocks"
                :key="block.tempId"
                class="m-block-card"
                :class="{
                  'm-block-card--available': block.availabilityType === 'available' && !isClassScheduleBlock(block),
                  'm-block-card--unavailable': block.availabilityType === 'unavailable' && !isClassScheduleBlock(block),
                  'm-block-card--class': isClassScheduleBlock(block),
                }"
                @click="isClassScheduleBlock(block) ? null : (editForm = { ...block }, showEditDialog = true)"
              >
                <div class="m-block-accent"></div>
                <div class="m-block-info">
                  <div class="m-block-time">{{ formatTimeLabel(block.startTime) }} - {{ formatTimeLabel(block.endTime) }}</div>
                  <div class="m-block-type">
                    {{ isClassScheduleBlock(block) ? 'Class Time' : block.availabilityType === 'available' ? 'Available' : 'Unavailable' }}
                    <span v-if="isClassScheduleBlock(block)" class="m-block-locked">
                      <v-icon icon="mdi-lock" size="10" /> Locked
                    </span>
                  </div>
                </div>
                <v-icon v-if="!isClassScheduleBlock(block)" icon="mdi-chevron-right" size="18" color="#bbb" class="m-block-chevron" />
              </div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else-if="!loading" class="m-empty">
          <v-icon icon="mdi-calendar-blank-outline" size="48" color="#ccc" />
          <div class="m-empty-title">No availability set</div>
          <div class="m-empty-sub">Tap the + button to add your weekly hours</div>
        </div>
      </template>

      <!-- Floating Add button -->
      <button class="m-fab" @click="showMobileAddSheet = true">
        <v-icon icon="mdi-plus" size="24" color="white" />
      </button>

      <!-- Save bar (shows when changes exist) -->
      <transition name="slide-up">
        <div v-if="hasChanges" class="m-save-bar">
          <button class="m-save-btn" :disabled="saving" @click="saveChanges">
            {{ saving ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </transition>
    </div>

    <!-- ─── TIME OFF TAB ─── -->
    <div v-if="mobileTab === 'timeoff'" class="m-tab-content">

      <div v-if="exceptions.length" class="m-timeoff-list">
        <div v-for="exc in exceptions" :key="exc.id" class="m-timeoff-card">
          <div class="m-timeoff-date">{{ formatDate(exc.specificDate) }}</div>
          <div class="m-timeoff-detail">
            <span>{{ formatTimeLabel(exc.startTime) }} - {{ formatTimeLabel(exc.endTime) }}</span>
            <span class="m-timeoff-chip" :class="exc.availabilityType === 'unavailable' ? 'm-timeoff-chip--off' : 'm-timeoff-chip--on'">
              {{ exc.availabilityType === 'unavailable' ? 'Off' : 'Available' }}
            </span>
          </div>
          <button class="m-timeoff-remove" @click="removeException(exc)">
            <v-icon icon="mdi-close" size="16" color="#999" />
          </button>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="m-empty">
        <v-icon icon="mdi-calendar-check" size="48" color="#ccc" />
        <div class="m-empty-title">No time-off requests</div>
        <div class="m-empty-sub">Request specific dates off and your manager will review them</div>
      </div>

      <!-- Add time off button -->
      <button class="m-fab" @click="showExceptionDialog = true">
        <v-icon icon="mdi-plus" size="24" color="white" />
      </button>
    </div>

    <!-- ─── MOBILE ADD AVAILABILITY BOTTOM SHEET ─── -->
    <v-dialog v-model="showMobileAddSheet" :fullscreen="false" max-width="100vw" transition="dialog-bottom-transition" content-class="m-bottom-sheet-dialog">
      <v-card class="m-bottom-sheet">
        <div class="m-sheet-handle"></div>
        <div class="m-sheet-title">Add Availability Block</div>

        <div class="m-sheet-field">
          <label class="m-sheet-label">Day</label>
          <select v-model="createForm.dayOfWeek" class="m-sheet-select">
            <option v-for="(label, dow) in DOW_LABELS" :key="dow" :value="Number(dow)">{{ label }}</option>
          </select>
        </div>

        <div class="m-sheet-type-row">
          <button
            class="m-type-btn" :class="{ 'm-type-btn--active-avail': createForm.availabilityType === 'available' }"
            @click="createForm.availabilityType = 'available'"
          >Available</button>
          <button
            class="m-type-btn" :class="{ 'm-type-btn--active-unavail': createForm.availabilityType === 'unavailable' }"
            @click="createForm.availabilityType = 'unavailable'"
          >Unavailable</button>
        </div>

        <div class="m-sheet-time-row">
          <div class="m-sheet-field m-sheet-field--half">
            <label class="m-sheet-label">Start</label>
            <input v-model="createForm.startTime" type="time" class="m-sheet-input" />
          </div>
          <div class="m-sheet-field m-sheet-field--half">
            <label class="m-sheet-label">End</label>
            <input v-model="createForm.endTime" type="time" class="m-sheet-input" />
          </div>
        </div>

        <div class="m-sheet-actions">
          <button class="m-sheet-cancel" @click="showMobileAddSheet = false">Cancel</button>
          <button class="m-sheet-confirm" @click="confirmCreate(); showMobileAddSheet = false;">Add</button>
        </div>
      </v-card>
    </v-dialog>

    <!-- Shared dialogs (Edit block, Exception, Snackbar) -->
    <v-dialog v-model="showEditDialog" max-width="420">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-pencil-outline" class="mr-2" />
          Edit Block
        </v-card-title>
        <v-card-text>
          <v-btn-toggle v-model="editForm.availabilityType" mandatory density="comfortable" rounded="lg" class="mb-4">
            <v-btn value="available" :color="editForm.availabilityType === 'available' ? UI_COLORS.available : undefined">Available</v-btn>
            <v-btn value="unavailable" :color="editForm.availabilityType === 'unavailable' ? 'error' : undefined">Unavailable</v-btn>
          </v-btn-toggle>
          <v-row>
            <v-col cols="6"><v-text-field v-model="editForm.startTime" type="time" label="Start" variant="outlined" density="comfortable" /></v-col>
            <v-col cols="6"><v-text-field v-model="editForm.endTime" type="time" label="End" variant="outlined" density="comfortable" /></v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-btn variant="text" color="error" @click="deleteBlock"><v-icon start>mdi-delete</v-icon>Delete</v-btn>
          <v-spacer />
          <v-btn variant="text" @click="showEditDialog = false">Cancel</v-btn>
          <v-btn :color="UI_COLORS.available" variant="flat" @click="confirmEdit">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showExceptionDialog" max-width="480">
      <v-card>
        <v-card-title>Request Time Off</v-card-title>
        <v-card-text>
          <v-form ref="exceptionFormRef" v-model="exceptionFormValid">
            <v-text-field v-model="exceptionForm.specificDate" type="date" label="Date" variant="outlined" density="comfortable" class="mb-3" :rules="[requiredRule]" />
            <v-row>
              <v-col cols="6"><v-text-field v-model="exceptionForm.startTime" type="time" label="Start" variant="outlined" density="comfortable" :rules="[requiredRule]" /></v-col>
              <v-col cols="6"><v-text-field v-model="exceptionForm.endTime" type="time" label="End" variant="outlined" density="comfortable" :rules="[requiredRule]" /></v-col>
            </v-row>
            <v-select v-model="exceptionForm.availabilityType" :items="['available', 'unavailable']" label="Type" variant="outlined" density="comfortable" />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showExceptionDialog = false">Cancel</v-btn>
          <v-btn :color="UI_COLORS.available" variant="flat" :loading="savingException" @click="saveException">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3500">{{ snackbar.text }}</v-snackbar>
  </div>

  <!-- ═══════════════════════════════════════════ -->
  <!-- DESKTOP LAYOUT (unchanged)                  -->
  <!-- ═══════════════════════════════════════════ -->
  <div v-else class="availability-container">
    <!-- Header -->
    <div class="page-header">
      <h1 class="page-title">My Availability</h1>
      <p class="page-subtitle">
        Drag on the calendar to mark when you're available or unavailable each week. Click a block to edit or delete it.
      </p>
    </div>

    <!-- Mode Toggle + Action Buttons -->
    <div class="action-buttons">
      <v-btn-toggle v-model="gridMode" mandatory :color="UI_COLORS.available" rounded="lg" density="comfortable">
        <v-btn value="available" prepend-icon="mdi-calendar-check">
          Mark Available
        </v-btn>
        <v-btn value="unavailable" prepend-icon="mdi-calendar-remove" color="error">
          Mark Unavailable
        </v-btn>
      </v-btn-toggle>
      <v-spacer />
      <v-btn
        :color="UI_COLORS.available"
        variant="flat"
        :loading="saving"
        :disabled="!hasChanges"
        @click="saveChanges"
      >
        Save Changes
      </v-btn>
      <v-btn variant="outlined" @click="clearAll">Clear Manual Blocks</v-btn>
      <v-chip size="small" variant="tonal" color="primary">
        Class schedule auto-sync: ON
      </v-chip>
    </div>

    <!-- Legend -->
    <div class="legend-row">
      <span class="legend-item">
        <span class="legend-dot available-dot" />
        Available
      </span>
      <span class="legend-item">
        <span class="legend-dot unavailable-dot" />
        Unavailable
      </span>
      <span class="legend-item">
        <span class="legend-dot class-dot" />
        Class Time (auto-synced, locked)
      </span>
    </div>

    <v-alert
      :type="statusTone"
      variant="tonal"
      border="start"
      density="comfortable"
      class="mb-4"
    >
      <div>
        <div>
          <div class="text-body-2 font-weight-medium">Class Schedule Sync: {{ statusLabel }}</div>
          <div class="text-caption text-medium-emphasis">
            Last synced: {{ formatDateTime(syncStatus.lastSyncedAt) }}
            · Term: {{ syncStatus.termCode || 'N/A' }}
            · Class blocks: {{ syncStatus.totalClassBlocks ?? 0 }}
            · Updated this sync: {{ syncStatus.updated ?? 0 }}
            <span v-if="syncStatus.error"> · {{ syncStatus.error }}</span>
          </div>
        </div>
      </div>
    </v-alert>

    <!-- Loading Indicator -->
    <v-progress-linear v-if="loading" indeterminate :color="UI_COLORS.brand" class="mb-4" />

    <!-- FullCalendar weekly availability grid -->
    <div :class="['calendar-card', gridMode === 'unavailable' ? 'mode-unavailable' : 'mode-available']">
      <FullCalendar ref="calendarRef" :options="calendarOptions" />
    </div>

    <!-- Create Dialog -->
    <v-dialog v-model="showCreateDialog" max-width="420">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-clock-outline" class="mr-2" />
          Add Block — {{ dowLabel(createForm.dayOfWeek) }}
        </v-card-title>
        <v-card-text>
          <p class="text-body-2 text-grey mb-3">Choose the type and time range for this block.</p>
          <v-btn-toggle
            v-model="createForm.availabilityType"
            mandatory
            density="comfortable"
            rounded="lg"
            class="mb-4"
          >
            <v-btn value="available" :color="createForm.availabilityType === 'available' ? UI_COLORS.available : undefined">
              <v-icon start>mdi-calendar-check</v-icon>
              Available
            </v-btn>
            <v-btn value="unavailable" :color="createForm.availabilityType === 'unavailable' ? 'error' : undefined">
              <v-icon start>mdi-calendar-remove</v-icon>
              Unavailable
            </v-btn>
          </v-btn-toggle>
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="createForm.startTime"
                type="time"
                label="Start Time"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="createForm.endTime"
                type="time"
                label="End Time"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showCreateDialog = false">Cancel</v-btn>
          <v-btn :color="UI_COLORS.available" variant="flat" @click="confirmCreate">Add</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Dialog -->
    <v-dialog v-model="showEditDialog" max-width="420">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-pencil-outline" class="mr-2" />
          Edit Block — {{ dowLabel(editForm.dayOfWeek) }}
        </v-card-title>
        <v-card-text>
          <v-btn-toggle
            v-model="editForm.availabilityType"
            mandatory
            density="comfortable"
            rounded="lg"
            class="mb-4"
          >
            <v-btn value="available" :color="editForm.availabilityType === 'available' ? UI_COLORS.available : undefined">
              <v-icon start>mdi-calendar-check</v-icon>
              Available
            </v-btn>
            <v-btn value="unavailable" :color="editForm.availabilityType === 'unavailable' ? 'error' : undefined">
              <v-icon start>mdi-calendar-remove</v-icon>
              Unavailable
            </v-btn>
          </v-btn-toggle>
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="editForm.startTime"
                type="time"
                label="Start Time"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="editForm.endTime"
                type="time"
                label="End Time"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-btn variant="text" color="error" @click="deleteBlock">
            <v-icon start>mdi-delete</v-icon>
            Delete
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="showEditDialog = false">Cancel</v-btn>
          <v-btn :color="UI_COLORS.available" variant="flat" @click="confirmEdit">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Time Off Requests -->
    <div class="exceptions-section">
      <h2 class="exceptions-title">Time Off Requests</h2>
      <p class="exceptions-subtitle">
        Request specific dates when you are unavailable — your manager will review and approve.
      </p>

      <div v-if="exceptions.length" class="exceptions-list">
        <v-card
          v-for="exc in exceptions"
          :key="exc.id"
          variant="outlined"
          class="exception-card"
        >
          <v-card-text class="d-flex align-center justify-space-between pa-3">
            <div>
              <strong>{{ formatDate(exc.specificDate) }}</strong>
              <span class="ml-2 text-grey">
                {{ formatTimeLabel(exc.startTime) }} — {{ formatTimeLabel(exc.endTime) }}
              </span>
              <v-chip size="x-small" class="ml-2" :color="exc.availabilityType === 'unavailable' ? 'error' : 'success'" variant="tonal">
                {{ exc.availabilityType }}
              </v-chip>
            </div>
            <v-btn icon="mdi-close" size="small" variant="text" color="error" @click="removeException(exc)" />
          </v-card-text>
        </v-card>
      </div>

      <v-btn variant="outlined" size="small" class="mt-3" prepend-icon="mdi-calendar-plus" @click="showExceptionDialog = true">
        Request Time Off
      </v-btn>
    </div>

    <!-- Exception Dialog -->
    <v-dialog v-model="showExceptionDialog" max-width="480">
      <v-card>
        <v-card-title>Request Time Off</v-card-title>
        <v-card-text>
          <v-form ref="exceptionFormRef" v-model="exceptionFormValid">
            <v-text-field
              v-model="exceptionForm.specificDate"
              type="date"
              label="Date"
              variant="outlined"
              density="comfortable"
              class="mb-3"
              :rules="[requiredRule]"
            />
            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model="exceptionForm.startTime"
                  type="time"
                  label="Start Time"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="exceptionForm.endTime"
                  type="time"
                  label="End Time"
                  variant="outlined"
                  density="comfortable"
                  :rules="[requiredRule]"
                />
              </v-col>
            </v-row>
            <v-select
              v-model="exceptionForm.availabilityType"
              :items="['available', 'unavailable']"
              label="Type"
              variant="outlined"
              density="comfortable"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showExceptionDialog = false">Cancel</v-btn>
          <v-btn :color="UI_COLORS.available" variant="flat" :loading="savingException" @click="saveException">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3500">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useDisplay } from "vuetify";
import FullCalendar from "@fullcalendar/vue3";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import Utils from "../config/utils.js";
import availabilityService from "../services/availabilityService.js";
import departmentServices from "../services/departmentServices.js";
import studentService from "../services/studentService.js";

const { mobile } = useDisplay();
const currentUser = Utils.getStore("user") || {};
const userId = currentUser.userId || currentUser.id;

// --- Mobile tab toggle ---
const mobileTab = ref('availability');
const showMobileAddSheet = ref(false);
const mobileViewMode = ref('calendar'); // 'list' or 'calendar'
const mobileDayIndex = ref(-1); // -1=All, 0=Sun, 1=Mon, etc.

const UI_COLORS = Object.freeze({
  available: "#0D9488",
  unavailable: "#DC2626",
  classSchedule: "#9A3412",
  brand: "#8B1538",
});

// --- FullCalendar ref ---
const calendarRef = ref(null);

// --- State ---
const loading = ref(false);
const saving = ref(false);
const savingException = ref(false);
const syncingClassSchedule = ref(false);
const syncStatus = ref({
  status: "never_synced",
  lastSyncedAt: null,
  termCode: null,
  totalClassBlocks: 0,
  updated: 0,
  error: null,
});
const calendarHours = ref({ slotMinTime: "05:00:00", slotMaxTime: "24:00:00" });
const gridMode = ref("available");

// blocks: array of { tempId, dayOfWeek, startTime (HH:mm), endTime (HH:mm), availabilityType }
const blocks = ref([]);
const initialFingerprint = ref("");
const existingRecords = ref([]);
let tempIdCounter = 0;

// Dialog state
const showCreateDialog = ref(false);
const createForm = ref({ dayOfWeek: 1, startTime: "", endTime: "", availabilityType: "available" });
const showEditDialog = ref(false);
const editForm = ref({ tempId: "", dayOfWeek: 1, startTime: "", endTime: "", availabilityType: "available" });

// Exception form state
const showExceptionDialog = ref(false);
const exceptionFormRef = ref(null);
const exceptionFormValid = ref(false);
const exceptionForm = ref({
  specificDate: "",
  startTime: "",
  endTime: "",
  availabilityType: "unavailable",
});

const snackbar = ref({ show: false, text: "", color: "success" });

// --- Day-of-week mappings ---
// Reference week: 2024-01-01 (Mon) â€¦ 2024-01-07 (Sun)
const DOW_TO_DATE = {
  1: "2024-01-01",
  2: "2024-01-02",
  3: "2024-01-03",
  4: "2024-01-04",
  5: "2024-01-05",
  6: "2024-01-06",
  0: "2024-01-07",
};

const DOW_LABELS = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  0: "Sunday",
};

const dowLabel = (dow) => DOW_LABELS[dow] ?? "";

// --- Helpers ---
const normalizeToHHMM = (t) => (t ? String(t).slice(0, 5) : "");
const notify = (text, color = "success") => { snackbar.value = { show: true, text, color }; };
const requiredRule = (v) => (v !== null && v !== undefined && v !== "" ? true : "Required");

const isClassScheduleRecord = (record) =>
  record?.sourceType === "class_schedule"
  || record?.recurrencePattern === "class_schedule"
  || Boolean(record?.isSystemManaged);

const isClassScheduleBlock = (block) =>
  block?.sourceType === "class_schedule" || Boolean(block?.isSystemManaged);

const blocksFingerprint = (bs) =>
  JSON.stringify(
    [...bs]
      .map((b) => `${b.dayOfWeek}|${b.startTime}|${b.endTime}|${b.availabilityType}`)
      .sort()
  );

const formatTimeLabel = (value) => {
  if (!value) return "";
  const [hStr, mStr] = String(value).split(":");
  const h = parseInt(hStr, 10);
  const period = h >= 12 ? "PM" : "AM";
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${display}:${mStr} ${period}`;
};

const formatDate = (value) => {
  if (!value) return "";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const statusTone = computed(() => {
  const status = String(syncStatus.value.status || "never_synced");
  if (status === "success") return "success";
  if (status === "failed") return "error";
  return "warning";
});

const statusLabel = computed(() => {
  const status = String(syncStatus.value.status || "never_synced");
  if (status === "success") return "Synced";
  if (status === "failed") return "Sync Failed";
  return "Not Synced Yet";
});

const hasClassConflict = (candidate) => {
  if (!candidate) return false;
  const type = String(candidate.availabilityType || "available").toLowerCase();
  if (!["available", "preferred"].includes(type)) return false;
  return blocks.value
    .filter((b) => isClassScheduleBlock(b) && Number(b.dayOfWeek) === Number(candidate.dayOfWeek))
    .some((cls) =>
      candidate.startTime < cls.endTime && candidate.endTime > cls.startTime
    );
};

const pickCalendarBoundsFromHours = (hoursRows = []) => {
  const valid = hoursRows.filter((row) => row?.open_time && row?.close_time && row.open_time < row.close_time);
  if (!valid.length) return { slotMinTime: "05:00:00", slotMaxTime: "24:00:00" };
  const mins = valid.map((row) => `${String(row.open_time).slice(0, 5)}:00`).sort();
  const maxs = valid.map((row) => `${String(row.close_time).slice(0, 5)}:00`).sort();
  return {
    slotMinTime: mins[0],
    slotMaxTime: maxs[maxs.length - 1],
  };
};

// --- Computed ---
const manualBlocks = computed(() => blocks.value.filter((b) => !isClassScheduleBlock(b)));
const hasChanges = computed(() => blocksFingerprint(manualBlocks.value) !== initialFingerprint.value);

const exceptions = computed(() =>
  existingRecords.value.filter((r) => r.specificDate && !r.isRecurring)
);

// --- Mobile: group availability blocks by day ---
const mobileBlocksByDay = computed(() => {
  const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun
  const grouped = {};
  for (const dow of dayOrder) {
    grouped[dow] = blocks.value
      .filter((b) => Number(b.dayOfWeek) === dow)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }
  return dayOrder
    .filter((dow) => grouped[dow].length > 0)
    .map((dow) => ({ dow, label: DOW_LABELS[dow], blocks: grouped[dow] }));
});

const mobileFilteredBlocks = computed(() => {
  if (mobileDayIndex.value === -1) return mobileBlocksByDay.value;
  return mobileBlocksByDay.value.filter((g) => g.dow === mobileDayIndex.value);
});

// --- Calendar grid helpers ---
const CAL_GRID_START = 7; // 7 AM
const CAL_GRID_END = 22;  // 10 PM
const calGridHours = computed(() => {
  // Find earliest/latest block to auto-size the grid
  let minHour = CAL_GRID_START;
  let maxHour = CAL_GRID_END;
  for (const b of blocks.value) {
    const sh = parseInt(String(b.startTime).split(':')[0], 10);
    const eh = parseInt(String(b.endTime).split(':')[0], 10);
    if (sh < minHour) minHour = sh;
    if (eh > maxHour - 1) maxHour = eh + 1;
  }
  const hours = [];
  for (let h = minHour; h < maxHour; h++) hours.push(h);
  return hours;
});

const getCalBlocksForDay = (dow) => {
  return blocks.value
    .filter((b) => Number(b.dayOfWeek) === dow)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
};

const calcBlockStyle = (block) => {
  const startHour = calGridHours.value[0] || CAL_GRID_START;
  const [sh, sm] = String(block.startTime).split(':').map(Number);
  const [eh, em] = String(block.endTime).split(':').map(Number);
  const startMinutes = (sh - startHour) * 60 + (sm || 0);
  const endMinutes = (eh - startHour) * 60 + (em || 0);
  const pxPerMin = 40 / 60; // 40px per hour row
  return {
    top: Math.max(0, startMinutes * pxPerMin) + 'px',
    height: Math.max(12, (endMinutes - startMinutes) * pxPerMin) + 'px',
  };
};

const calBlockLabel = (block) => {
  if (isClassScheduleBlock(block)) return 'Class';
  return block.availabilityType === 'available' ? 'Avail' : 'Off';
};

const dayHasClass = (dow) => {
  return blocks.value.some((b) => Number(b.dayOfWeek) === dow && isClassScheduleBlock(b));
};

const calendarEvents = computed(() =>
  blocks.value.map((b) => {
    const isClassBlock = b.sourceType === "class_schedule";
    return {
      id: b.tempId,
      title: isClassBlock
        ? "Class Time"
        : b.availabilityType === "available"
          ? "Available"
          : "Unavailable",
      start: `${DOW_TO_DATE[b.dayOfWeek]}T${b.startTime}`,
      end: `${DOW_TO_DATE[b.dayOfWeek]}T${b.endTime}`,
      backgroundColor: isClassBlock
        ? UI_COLORS.classSchedule
        : b.availabilityType === "available"
          ? UI_COLORS.available
          : UI_COLORS.unavailable,
      borderColor: isClassBlock
        ? UI_COLORS.classSchedule
        : b.availabilityType === "available"
          ? UI_COLORS.available
          : UI_COLORS.unavailable,
      classNames: isClassBlock ? ["class-synced-event"] : [],
      editable: !isClassBlock,
      startEditable: !isClassBlock,
      durationEditable: !isClassBlock,
      extendedProps: { block: b },
    };
  })
);

// --- FullCalendar callbacks ---
const onCalendarSelect = (selectInfo) => {
  const dateStr = selectInfo.startStr.split("T")[0];
  const dow = new Date(`${dateStr}T12:00:00`).getDay();
  const startTime = selectInfo.startStr.split("T")[1].slice(0, 5);
  const endTime = selectInfo.endStr.split("T")[1].slice(0, 5);
  createForm.value = {
    dayOfWeek: dow,
    startTime,
    endTime,
    availabilityType: gridMode.value,
  };
  showCreateDialog.value = true;
  calendarRef.value?.getApi()?.unselect();
};

const confirmCreate = () => {
  const { dayOfWeek, startTime, endTime, availabilityType } = createForm.value;
  if (!startTime || !endTime) return;
  if (startTime >= endTime) {
    notify("End time must be after start time.", "error");
    return;
  }
  if (hasClassConflict({ dayOfWeek, startTime, endTime, availabilityType })) {
    notify("This block overlaps locked class time. Choose a different time.", "error");
    return;
  }
  blocks.value = [
    ...blocks.value,
    { tempId: `blk-${++tempIdCounter}`, dayOfWeek, startTime, endTime, availabilityType },
  ];
  showCreateDialog.value = false;
};

const onEventClick = (clickInfo) => {
  const block = clickInfo.event.extendedProps.block;
  if (isClassScheduleBlock(block)) {
    notify("Class-synced blocks are locked. Update your course schedule and re-sync.", "info");
    return;
  }
  editForm.value = { ...block };
  showEditDialog.value = true;
};

const confirmEdit = () => {
  const { tempId, dayOfWeek, startTime, endTime, availabilityType } = editForm.value;
  if (!startTime || !endTime) return;
  if (startTime >= endTime) {
    notify("End time must be after start time.", "error");
    return;
  }
  const idx = blocks.value.findIndex((b) => b.tempId === tempId);
  if (idx !== -1) {
    const updated = [...blocks.value];
    const candidate = { tempId, dayOfWeek, startTime, endTime, availabilityType };
    const withoutCurrent = updated.filter((b) => b.tempId !== tempId);
    const classConflict = withoutCurrent
      .filter((b) => isClassScheduleBlock(b) && Number(b.dayOfWeek) === Number(dayOfWeek))
      .some((cls) => startTime < cls.endTime && endTime > cls.startTime && ["available", "preferred"].includes(String(availabilityType || "available")));
    if (classConflict) {
      notify("This update overlaps locked class time. Choose a different time.", "error");
      return;
    }
    updated[idx] = candidate;
    blocks.value = updated;
  }
  showEditDialog.value = false;
};

const deleteBlock = () => {
  blocks.value = blocks.value.filter((b) => b.tempId !== editForm.value.tempId);
  showEditDialog.value = false;
};

const onEventDrop = (dropInfo) => {
  const tempId = dropInfo.event.id;
  const idx = blocks.value.findIndex((b) => b.tempId === tempId);
  if (idx === -1) return;

  if (isClassScheduleBlock(blocks.value[idx])) {
    dropInfo.revert();
    notify("Class-synced blocks cannot be moved.", "info");
    return;
  }

  const newDateStr = dropInfo.event.startStr.split("T")[0];
  const newDow = new Date(`${newDateStr}T12:00:00`).getDay();
  const newStart = dropInfo.event.startStr.split("T")[1].slice(0, 5);
  const newEnd = dropInfo.event.endStr.split("T")[1].slice(0, 5);

  const updated = [...blocks.value];
  updated[idx] = { ...updated[idx], dayOfWeek: newDow, startTime: newStart, endTime: newEnd };
  blocks.value = updated;
};

const onEventResize = (resizeInfo) => {
  const tempId = resizeInfo.event.id;
  const idx = blocks.value.findIndex((b) => b.tempId === tempId);
  if (idx === -1) return;

  if (isClassScheduleBlock(blocks.value[idx])) {
    resizeInfo.revert();
    notify("Class-synced blocks cannot be resized.", "info");
    return;
  }

  const newEnd = resizeInfo.event.endStr.split("T")[1].slice(0, 5);
  const updated = [...blocks.value];
  updated[idx] = { ...updated[idx], endTime: newEnd };
  blocks.value = updated;
};

// --- Calendar options ---
const calendarOptions = computed(() => ({
  plugins: [timeGridPlugin, interactionPlugin],
  initialView: "timeGridWeek",
  initialDate: "2024-01-01",
  headerToolbar: false,
  allDaySlot: false,
  firstDay: 1,
  dayHeaderFormat: { weekday: "short" },
  validRange: { start: "2024-01-01", end: "2024-01-08" },
  slotMinTime: calendarHours.value.slotMinTime,
  slotMaxTime: calendarHours.value.slotMaxTime,
  slotDuration: "00:15:00",
  slotLabelInterval: "01:00:00",
  snapDuration: "00:15:00",
  nowIndicator: false,
  selectable: true,
  selectMirror: true,
  editable: true,
  eventOverlap: false,
  selectOverlap: false,
  events: calendarEvents.value,
  select: onCalendarSelect,
  eventClick: onEventClick,
  eventDrop: onEventDrop,
  eventResize: onEventResize,
  height: 700,
  expandRows: true,
  eventTimeFormat: { hour: "numeric", minute: "2-digit", meridiem: "short" },
}));

const clearAll = () => {
  blocks.value = blocks.value.filter((b) => isClassScheduleBlock(b));
};

// --- API ---
const loadClassSyncStatus = async () => {
  try {
    const response = await availabilityService.getClassSyncStatus();
    const data = response?.data?.data || {};
    const normalized = {
      status: data.status || "never_synced",
      lastSyncedAt: data.lastSyncedAt || null,
      termCode: data.termCode || null,
      totalClassBlocks: Number(data.totalClassBlocks || 0),
      updated: Number(data.updated || 0),
      error: data.error || null,
    };

    const shouldPreserveLastSyncError =
      syncStatus.value.status === "failed"
      && Boolean(syncStatus.value.error)
      && normalized.status === "never_synced"
      && !normalized.error;

    syncStatus.value = shouldPreserveLastSyncError
      ? {
        ...normalized,
        status: "failed",
        error: syncStatus.value.error,
      }
      : normalized;
  } catch {
    syncStatus.value = {
      status: "never_synced",
      lastSyncedAt: syncStatus.value.lastSyncedAt || null,
      termCode: syncStatus.value.termCode || null,
      totalClassBlocks: Number(syncStatus.value.totalClassBlocks || 0),
      updated: Number(syncStatus.value.updated || 0),
      error: syncStatus.value.error || null,
    };
  } finally {
  }
};

const loadDepartmentCalendarHours = async () => {
  const deptContext = Utils.getStore("currentDepartmentContext") || {};
  let departmentId = Number(deptContext.department_id || 0);
  if (!departmentId) {
    try {
      const membershipsRes = await studentService.getUserDepartments();
      const memberships = membershipsRes?.data?.data || membershipsRes?.data || [];
      const activeMembership = memberships.find((m) => m.is_active || String(m.request_status || "").toLowerCase() === "approved");
      departmentId = Number(activeMembership?.department_id || activeMembership?.department?.department_id || 0);
    } catch {
      departmentId = 0;
    }
  }

  if (!departmentId) {
    calendarHours.value = { slotMinTime: "05:00:00", slotMaxTime: "24:00:00" };
    return;
  }

  try {
    const response = await departmentServices.getDepartmentHours(departmentId);
    const rows = response?.data?.data || [];
    calendarHours.value = pickCalendarBoundsFromHours(rows);
  } catch {
    calendarHours.value = { slotMinTime: "05:00:00", slotMaxTime: "24:00:00" };
  }
};

const loadAvailabilities = async () => {
  if (!userId) return;
  loading.value = true;
  try {
    const response = await availabilityService.listForUser(userId);
    const records = response.data || [];
    existingRecords.value = records;
    tempIdCounter = 0;
    const loadedBlocks = records
      .filter((r) => r.dayOfWeek != null && !r.specificDate)
      .map((r) => ({
        tempId: `loaded-${++tempIdCounter}`,
        dayOfWeek: r.dayOfWeek,
        startTime: normalizeToHHMM(r.startTime),
        endTime: normalizeToHHMM(r.endTime),
        availabilityType: r.availabilityType || "available",
        sourceType: isClassScheduleRecord(r) ? "class_schedule" : (r.sourceType || "manual"),
        sourceRef: r.sourceRef || null,
        isSystemManaged: Boolean(r.isSystemManaged || isClassScheduleRecord(r)),
      }));
    blocks.value = loadedBlocks;
    initialFingerprint.value = blocksFingerprint(loadedBlocks.filter((b) => !isClassScheduleBlock(b)));
  } catch (error) {
    notify(error?.response?.data?.message || "Failed to load availability.", "error");
  } finally {
    loading.value = false;
  }
};

const saveChanges = async () => {
  if (!userId) return;
  saving.value = true;
  try {
    const manualOnlyBlocks = blocks.value.filter((block) => !isClassScheduleBlock(block));
    const hasConflict = manualOnlyBlocks.some((block) => hasClassConflict(block));
    if (hasConflict) {
      notify("One or more manual availability blocks overlap locked class time.", "error");
      return;
    }

    // Delete only manual recurring records (preserve class-synced recurring records)
    const recurringManualRecords = existingRecords.value.filter(
      (r) => (r.isRecurring || !r.specificDate) && !isClassScheduleRecord(r)
    );
    for (const rec of recurringManualRecords) {
      await availabilityService.remove(rec.id);
    }

    // Re-create only manual blocks sequentially to avoid race conditions
    for (const block of manualOnlyBlocks) {
      await availabilityService.create({
        userId,
        dayOfWeek: block.dayOfWeek,
        startTime: block.startTime,
        endTime: block.endTime,
        availabilityType: block.availabilityType,
        isRecurring: true,
      });
    }
    notify("Availability saved successfully.");
    await loadAvailabilities();
  } catch (error) {
    notify(error?.response?.data?.message || "Failed to save availability.", "error");
  } finally {
    saving.value = false;
  }
};

const saveException = async () => {
  const valid = await exceptionFormRef.value?.validate();
  if (!valid?.valid) return;
  savingException.value = true;
  try {
    await availabilityService.create({
      userId,
      startTime: exceptionForm.value.startTime,
      endTime: exceptionForm.value.endTime,
      availabilityType: exceptionForm.value.availabilityType,
      specificDate: exceptionForm.value.specificDate,
      isRecurring: false,
    });
    notify("Exception added.");
    showExceptionDialog.value = false;
    exceptionForm.value = { specificDate: "", startTime: "", endTime: "", availabilityType: "unavailable" };
    await loadAvailabilities();
  } catch (error) {
    notify(error?.response?.data?.message || "Failed to add exception.", "error");
  } finally {
    savingException.value = false;
  }
};

const removeException = async (exc) => {
  try {
    await availabilityService.remove(exc.id);
    notify("Exception removed.");
    await loadAvailabilities();
  } catch (error) {
    notify(error?.response?.data?.message || "Failed to remove exception.", "error");
  }
};

const syncClassSchedule = async ({ silent = false, suppressErrorToast = false } = {}) => {
  syncingClassSchedule.value = true;
  try {
    const response = await availabilityService.syncClassSchedule();
    const data = response?.data?.data || {};

    syncStatus.value = {
      status: "success",
      lastSyncedAt: data.lastSyncedAt || new Date().toISOString(),
      termCode: data.termCode || syncStatus.value.termCode || null,
      totalClassBlocks: Number((data.created || 0) + (data.updated || 0) + (data.unchanged || 0)),
      updated: Number(data.updated || 0),
      error: null,
    };

    if (!silent) {
      notify(
        `Class schedule synced. Added ${data.created || 0}, updated ${data.updated || 0}, removed ${data.deleted || 0}, unchanged ${data.unchanged || 0}.`,
        "success"
      );
    }

    await Promise.all([loadAvailabilities(), loadClassSyncStatus()]);
    return data;
  } catch (error) {
    const message = error?.response?.data?.message || "Failed to sync class schedule.";

    syncStatus.value = {
      status: "failed",
      lastSyncedAt: syncStatus.value.lastSyncedAt || null,
      termCode: syncStatus.value.termCode || null,
      totalClassBlocks: Number(syncStatus.value.totalClassBlocks || 0),
      updated: Number(syncStatus.value.updated || 0),
      error: message,
    };

    if (!suppressErrorToast) {
      notify(message, "error");
    }

    return null;
  } finally {
    syncingClassSchedule.value = false;
  }
};

onMounted(async () => {
  await loadDepartmentCalendarHours();
  const autoSyncResult = await syncClassSchedule({ silent: true, suppressErrorToast: true });

  if (!autoSyncResult) {
    await Promise.all([
      loadAvailabilities(),
      loadClassSyncStatus(),
    ]);
  }
});
</script>

<style scoped>
.availability-container {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --color-text-primary: #333;
  --color-text-secondary: #666;
  --color-text-muted: #555;
  --color-surface: #fff;
  --color-border-subtle: #e0e0e0;
  --color-available: #0D9488;
  --color-unavailable: #DC2626;
  --color-class: #9A3412;
  padding: var(--space-6);
}

.page-header {
  margin-bottom: var(--space-4);
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.page-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-top: var(--space-1);
}

.action-buttons {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
  align-items: center;
  flex-wrap: wrap;
}

.legend-row {
  display: flex;
  gap: calc(var(--space-4) + var(--space-1));
  margin-bottom: var(--space-4);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-muted);
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  display: inline-block;
}

.available-dot {
  background-color: var(--color-available);
}

.unavailable-dot {
  background-color: var(--color-unavailable);
}

.class-dot {
  background-color: var(--color-class);
}

/* Calendar card */
.calendar-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-subtle);
  padding: var(--space-2) 10px var(--space-3);
  margin-bottom: calc(var(--space-6) + var(--space-2));
  overflow: visible;
}

/* FullCalendar theme overrides */
.calendar-card :deep(.fc) {
  --fc-border-color: #e5e7eb;
  --fc-page-bg-color: #ffffff;
  --fc-neutral-bg-color: #fafafa;
}

.calendar-card :deep(.fc .fc-event) {
  border-radius: 4px;
  padding: 1px 4px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.calendar-card :deep(.fc .fc-event-title) {
  font-weight: 600;
}

.calendar-card :deep(.fc .class-synced-event) {
  opacity: 0.95;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
}

/* Selection highlight and mirror — teal for available mode, red for unavailable mode */
.mode-available :deep(.fc .fc-highlight) {
  background-color: rgba(13, 148, 136, 0.15);
}

.mode-available :deep(.fc .fc-event.fc-mirror) {
  background-color: rgba(13, 148, 136, 0.75);
  border-color: var(--color-available);
}

.mode-unavailable :deep(.fc .fc-highlight) {
  background-color: rgba(220, 38, 38, 0.12);
}

.mode-unavailable :deep(.fc .fc-event.fc-mirror) {
  background-color: rgba(220, 38, 38, 0.7);
  border-color: var(--color-unavailable);
}

/* Exceptions Section */
.exceptions-section {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-subtle);
  padding: var(--space-6);
}

.exceptions-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 6px 0;
}

.exceptions-subtitle {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-3) 0;
}

.exceptions-list {
  margin-bottom: var(--space-2);
}

.exception-card {
  margin-bottom: var(--space-2);
}

/* ═══════════════════════════════════════════ */
/* MOBILE STYLES                               */
/* ═══════════════════════════════════════════ */
.hours-screen {
  background: #F7F7F8;
  min-height: 100vh;
  padding: 0 0 100px;
}

/* Segmented control */
.m-segment-wrap { padding: 16px 16px 0; }
.m-segment {
  display: flex;
  background: #EBEBEB;
  border-radius: 10px;
  padding: 3px;
}
.m-seg-btn {
  flex: 1;
  padding: 9px 0;
  border: none;
  background: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}
.m-seg-btn--active {
  background: #fff;
  color: #1a1a1a;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.m-seg-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: #80162B;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  margin-left: 4px;
  vertical-align: middle;
}

/* Loading */
.m-loading { display: flex; justify-content: center; padding: 40px 0; }

/* Tab content */
.m-tab-content { padding: 12px 16px; }

/* View toggle */
.m-view-toggle {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.m-view-btn {
  padding: 6px 16px;
  border: 1.5px solid #ddd;
  border-radius: 20px;
  background: #fff;
  font-size: 12px;
  font-weight: 600;
  color: #666;
  cursor: pointer;
  transition: all 0.15s ease;
}
.m-view-btn--active {
  border-color: #80162B;
  color: #80162B;
  background: rgba(128, 22, 43, 0.06);
}

/* Day selector pills */
.m-day-selector {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 2px;
}
.m-day-pill {
  padding: 6px 12px;
  border: none;
  border-radius: 16px;
  background: #fff;
  font-size: 12px;
  font-weight: 600;
  color: #666;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.15s ease;
}
.m-day-pill--active {
  background: #80162B;
  color: #fff;
}

/* Sync card */
.m-sync-card {
  background: #fff;
  border-radius: 12px;
  padding: 10px 14px;
  margin-bottom: 14px;
  border-left: 3px solid #ddd;
}
.m-sync-card--success { border-left-color: #0D9488; }
.m-sync-card--error { border-left-color: #DC2626; }
.m-sync-card--warning { border-left-color: #F59E0B; }
.m-sync-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.m-sync-label {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: #444;
}

/* Day groups */
.m-day-list { }
.m-day-group { margin-bottom: 16px; }
.m-day-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #9CA3AF;
  margin-bottom: 8px;
}
.m-block-cards { display: flex; flex-direction: column; gap: 8px; }
.m-block-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 12px;
  padding: 12px 14px;
  cursor: pointer;
  transition: background 0.15s;
}
.m-block-card:active { background: #f5f5f5; }
.m-block-accent {
  width: 4px;
  height: 32px;
  border-radius: 2px;
  margin-right: 12px;
  flex-shrink: 0;
}
.m-block-card--available .m-block-accent { background: #0D9488; }
.m-block-card--unavailable .m-block-accent { background: #DC2626; }
.m-block-card--class .m-block-accent { background: #9A3412; }
.m-block-card--class { cursor: default; opacity: 0.85; }
.m-block-info { flex: 1; min-width: 0; }
.m-block-time {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}
.m-block-type {
  font-size: 12px;
  color: #888;
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.m-block-locked {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 10px;
  color: #9A3412;
  background: rgba(154, 52, 18, 0.08);
  padding: 1px 6px;
  border-radius: 4px;
}
.m-block-chevron { flex-shrink: 0; }

/* Empty state */
.m-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  text-align: center;
}
.m-empty-title {
  font-size: 16px;
  font-weight: 600;
  color: #666;
  margin-top: 12px;
}
.m-empty-sub {
  font-size: 13px;
  color: #999;
  margin-top: 4px;
}

/* FAB */
.m-fab {
  position: fixed;
  bottom: calc(80px + env(safe-area-inset-bottom, 0px));
  right: 20px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #80162B;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(128, 22, 43, 0.35);
  cursor: pointer;
  z-index: 50;
  transition: transform 0.15s ease;
}
.m-fab:active { transform: scale(0.92); }

/* Save bar */
.m-save-bar {
  position: fixed;
  bottom: calc(64px + env(safe-area-inset-bottom, 0px));
  left: 0;
  right: 0;
  padding: 12px 16px;
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(8px);
  border-top: 1px solid #eee;
  z-index: 60;
}
.m-save-btn {
  width: 100%;
  padding: 13px;
  border: none;
  border-radius: 12px;
  background: #80162B;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}
.m-save-btn:disabled { opacity: 0.6; }

.slide-up-enter-active, .slide-up-leave-active { transition: transform 0.25s ease, opacity 0.25s ease; }
.slide-up-enter-from { transform: translateY(100%); opacity: 0; }
.slide-up-leave-to { transform: translateY(100%); opacity: 0; }

/* Time off list */
.m-timeoff-list { display: flex; flex-direction: column; gap: 10px; }
.m-timeoff-card {
  background: #fff;
  border-radius: 12px;
  padding: 14px 16px;
  position: relative;
}
.m-timeoff-date {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}
.m-timeoff-detail {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 13px;
  color: #888;
}
.m-timeoff-chip {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.m-timeoff-chip--off { background: rgba(220, 38, 38, 0.1); color: #DC2626; }
.m-timeoff-chip--on { background: rgba(13, 148, 136, 0.1); color: #0D9488; }
.m-timeoff-remove {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  border: none;
  background: #f5f5f5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* Bottom sheet */
.m-bottom-sheet {
  border-radius: 20px 20px 0 0 !important;
  padding: 16px 20px 24px;
}
.m-sheet-handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: #ddd;
  margin: 0 auto 16px;
}
.m-sheet-title {
  font-size: 17px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 20px;
}
.m-sheet-field { margin-bottom: 16px; }
.m-sheet-field--half { flex: 1; }
.m-sheet-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #888;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.m-sheet-select,
.m-sheet-input {
  width: 100%;
  padding: 12px;
  border: 1.5px solid #e0e0e0;
  border-radius: 10px;
  font-size: 15px;
  color: #1a1a1a;
  background: #fafafa;
  -webkit-appearance: none;
}
.m-sheet-select:focus,
.m-sheet-input:focus {
  outline: none;
  border-color: #80162B;
}
.m-sheet-type-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.m-type-btn {
  flex: 1;
  padding: 10px;
  border: 1.5px solid #e0e0e0;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #666;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s ease;
}
.m-type-btn--active-avail {
  border-color: #0D9488;
  color: #0D9488;
  background: rgba(13, 148, 136, 0.06);
}
.m-type-btn--active-unavail {
  border-color: #DC2626;
  color: #DC2626;
  background: rgba(220, 38, 38, 0.06);
}
.m-sheet-time-row { display: flex; gap: 12px; margin-bottom: 20px; }
.m-sheet-actions {
  display: flex;
  gap: 10px;
}
.m-sheet-cancel {
  flex: 1;
  padding: 13px;
  border: 1.5px solid #e0e0e0;
  border-radius: 12px;
  background: #fff;
  font-size: 15px;
  font-weight: 600;
  color: #666;
  cursor: pointer;
}
.m-sheet-confirm {
  flex: 1;
  padding: 13px;
  border: none;
  border-radius: 12px;
  background: #80162B;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

/* Day pill with class indicator dot */
.m-day-pill--has-class {
  position: relative;
}
.m-day-pill--has-class::after {
  content: '';
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #DC2626;
}
.m-day-pill--active.m-day-pill--has-class::after {
  background: #fff;
}

/* ═══════════════════════════════════════════ */
/* CALENDAR GRID VIEW                          */
/* ═══════════════════════════════════════════ */
.m-cal {
  margin-top: 4px;
}
.m-cal-legend {
  display: flex;
  gap: 14px;
  margin-bottom: 12px;
  padding: 0 2px;
}
.m-cal-legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  color: #888;
}
.m-cal-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}
.m-cal-dot--class { background: #DC2626; }
.m-cal-dot--available { background: #0D9488; }
.m-cal-dot--unavailable { background: #9CA3AF; }

.m-cal-grid {
  display: flex;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

/* Time gutter */
.m-cal-gutter {
  width: 32px;
  flex-shrink: 0;
  border-right: 1px solid #f0f0f0;
}
.m-cal-gutter-header {
  height: 28px;
  border-bottom: 1px solid #f0f0f0;
}
.m-cal-gutter-label {
  height: 40px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding-right: 4px;
  font-size: 9px;
  font-weight: 600;
  color: #bbb;
  transform: translateY(-5px);
}

/* Day columns */
.m-cal-col {
  flex: 1;
  min-width: 0;
  border-right: 1px solid #f5f5f5;
}
.m-cal-col:last-child {
  border-right: none;
}
.m-cal-col-header {
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid #f0f0f0;
  background: #FAFAFA;
}
.m-cal-col-body {
  position: relative;
  overflow: hidden;
}

/* Hour grid lines */
.m-cal-hour-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: #f5f5f5;
}

/* Blocks on the calendar */
.m-cal-block {
  position: absolute;
  left: 1px;
  right: 1px;
  border-radius: 3px;
  overflow: hidden;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 1px;
  cursor: pointer;
  transition: opacity 0.15s;
  z-index: 2;
}
.m-cal-block:active {
  opacity: 0.75;
}
.m-cal-block--class {
  background: rgba(220, 38, 38, 0.18);
  border-left: 2px solid #DC2626;
  cursor: default;
}
.m-cal-block--available {
  background: rgba(13, 148, 136, 0.15);
  border-left: 2px solid #0D9488;
}
.m-cal-block--unavailable {
  background: rgba(156, 163, 175, 0.18);
  border-left: 2px solid #9CA3AF;
}
.m-cal-block-label {
  font-size: 8px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  padding: 0 2px;
}
.m-cal-block--class .m-cal-block-label { color: #DC2626; }
.m-cal-block--available .m-cal-block-label { color: #0D9488; }
.m-cal-block--unavailable .m-cal-block-label { color: #6B7280; }
</style>
