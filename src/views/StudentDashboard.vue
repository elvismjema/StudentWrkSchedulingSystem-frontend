<template>
  <PullToRefresh @refresh="handlePullRefresh">

    <!-- ═══════════════════════════════════════════════════
         MOBILE LAYOUT  (phone width)
    ════════════════════════════════════════════════════ -->
    <div v-if="mobile" class="home-screen">

      <!-- ── Greeting ─────────────────────────────────── -->
      <div class="home-greeting">
        <div class="home-greeting-name">Hi, {{ firstName }} 👋</div>
        <div class="home-greeting-date">{{ todayLabel }}</div>
      </div>

      <!-- ── Shift Acknowledgements (priority 0) ────────── -->
      <div v-if="pendingAcknowledgements.length" class="home-section">
        <div class="ack-banner">
          <div class="ack-banner-head">
            <v-icon size="16" color="#EA580C">mdi-bell-ring-outline</v-icon>
            <span>{{ pendingAcknowledgements.length }} shift{{ pendingAcknowledgements.length === 1 ? '' : 's' }} {{ pendingAcknowledgements.length === 1 ? 'needs' : 'need' }} your response</span>
          </div>
          <div v-for="ack in pendingAcknowledgements" :key="ack.id" class="ack-item">
            <div class="ack-item-info">
              <div class="ack-item-dept">{{ ack.shift?.department?.department_name || 'New Shift' }}</div>
              <div class="ack-item-time">
                {{ formatShiftDate(ack.shift) }} &middot; {{ ack.shift?.start_time?.slice(0,5) }} – {{ ack.shift?.end_time?.slice(0,5) }}
              </div>
            </div>
            <div class="ack-item-actions">
              <button
                class="ack-btn ack-btn--accept"
                :disabled="acknowledgingId !== null"
                @click="acknowledgeShift(ack)"
              >Accept</button>
              <button
                class="ack-btn ack-btn--cover"
                :disabled="acknowledgingId !== null"
                @click="acknowledgeAndFindCover(ack)"
              >Cover</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Clock Status Banner (priority 1) ──────────── -->
      <!--
        Render order matters here. The banner is the most prominent piece
        of state on the dashboard and must never lie. We hold a neutral
        skeleton until `clockStatus.resolved` flips true on the first load
        so we don't flash "Not clocked in" (the reactive default) and
        then snap over to "Clocked in" once the network resolves. When
        the backend reports an open record that's clearly a forgotten
        clock-out from a previous session, we render the dedicated stale
        variant below instead of the green active-shift banner.
      -->
      <div class="home-section">
        <div v-if="!clockStatus.resolved" class="clock-banner clock-banner--skeleton" aria-hidden="true">
          <div class="clock-banner__skeleton-dot"></div>
          <div class="clock-banner__skeleton-bar"></div>
        </div>
        <div
          v-else-if="clockStatus.stale"
          class="clock-banner clock-banner--stale"
          role="alert"
          :aria-label="`Stale clock-in: ${clockStatus.staleReason}`"
        >
          <v-icon color="#b26a00" size="20" class="mr-2">mdi-alert-circle-outline</v-icon>
          <div class="clock-banner__content">
            <span class="clock-banner__label">Looks like you forgot to clock out</span>
            <span class="clock-banner__elapsed">{{ clockStatus.staleReason }}</span>
          </div>
          <div class="clock-banner__actions">
            <v-btn
              size="small"
              variant="flat"
              color="#811429"
              :loading="clockingIn"
              :disabled="clockingIn"
              prepend-icon="mdi-logout"
              @click.stop="handleClockOut"
            >
              Clock Out
            </v-btn>
          </div>
        </div>
        <ClockStatusBanner
          v-else
          :clocked-in="clockStatus.isClockedIn"
          :clock-in-time="clockStatus.clockInTime"
          :on-break="clockStatus.onBreak"
          :loading="clockingIn"
          @clock-in="handleClockIn"
          @clock-out="handleClockOut"
          @start-break="handleStartBreak"
          @end-break="handleEndBreak"
        />
      </div>

      <!-- ── Active Shift Tasks ────────────────────────── -->
      <div v-if="showActiveShiftTasks" class="home-section">
        <div class="active-tasks-card">
          <div class="active-tasks-head">
            <div>
              <div class="section-eyebrow" style="margin-bottom: 2px">SHIFT TASKS</div>
              <div class="active-tasks-title">{{ activeShiftTaskListName }}</div>
            </div>
            <span class="active-tasks-count">{{ activeShiftTaskProgress }}</span>
          </div>
          <v-progress-linear
            v-if="activeShiftTaskItems.length"
            :model-value="activeShiftTaskPercent"
            color="#811429"
            rounded
            height="6"
            class="active-tasks-progress"
          />
          <div v-if="activeShiftTasksLoading" class="active-tasks-loading">
            <v-skeleton-loader type="list-item-two-line" />
          </div>
          <div v-else-if="activeShiftTasksError" class="active-tasks-error">
            <span>{{ activeShiftTasksError }}</span>
            <button class="section-link" @click="loadActiveShiftTasks">Retry</button>
          </div>
          <div v-else class="active-tasks-list">
            <button
              v-for="item in activeShiftTaskItems"
              :key="item.id"
              class="active-task-row"
              :class="{ 'active-task-row--done': isActiveTaskCompleted(item.id) }"
              :disabled="activeShiftTaskPendingIds.has(item.id)"
              @click="toggleActiveShiftTask(item.id, !isActiveTaskCompleted(item.id))"
            >
              <v-icon size="22" :color="isActiveTaskCompleted(item.id) ? '#15803D' : '#9CA3AF'">
                {{ isActiveTaskCompleted(item.id) ? 'mdi-checkbox-marked-circle' : 'mdi-checkbox-blank-circle-outline' }}
              </v-icon>
              <span class="active-task-copy">
                <span class="active-task-title">{{ item.title }}</span>
                <span v-if="item.description" class="active-task-description">{{ item.description }}</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- ── Loading ────────────────────────────────────── -->
      <template v-if="loading">
        <div class="home-section">
          <v-skeleton-loader type="card" rounded="lg" />
        </div>
        <div class="home-section">
          <v-skeleton-loader type="sentences" rounded="lg" />
        </div>
      </template>

      <!-- ── Error ──────────────────────────────────────── -->
      <div v-else-if="error" class="home-section">
        <div class="error-card">
          <span>{{ error }}</span>
          <button class="error-retry" @click="loadDashboard">Retry</button>
        </div>
      </div>

      <template v-else>
        <!-- ── Next Shift (priority 2) ───────────────────── -->
        <div class="home-section">
          <div class="section-eyebrow">{{ (nextShiftLabel || 'Up Next').toUpperCase() }}</div>
          <div
            v-if="nextShift"
            class="shift-hero-card"
          >
            <div class="shift-hero-body">
              <div class="shift-hero-date" aria-hidden="true">
                <div class="shift-hero-date__month">{{ nextShiftMonth }}</div>
                <div class="shift-hero-date__day">{{ nextShiftDay }}</div>
              </div>
              <div class="shift-hero-info">
                <div class="shift-hero-dept">
                  {{ nextShift.department_name || nextShift.department?.department_name || 'Shift' }}
                </div>
                <div class="shift-hero-subtitle">
                  {{ nextShiftWeekday }} &middot; {{ formatTimeRange(nextShift) }}
                </div>
                <div v-if="nextShiftPosition" class="shift-hero-position">
                  <v-icon size="13" class="mr-1">mdi-badge-account-outline</v-icon>
                  {{ nextShiftPosition }}
                </div>
                <button class="shift-hero-cta" @click="openSwapDialog(nextShift)">
                  <v-icon size="15" class="mr-1">mdi-account-switch</v-icon>
                  Request Cover
                </button>
              </div>
            </div>
          </div>
          <div v-else class="empty-card">
            <v-icon size="36" color="#D1D5DB">mdi-calendar-blank-outline</v-icon>
            <div class="empty-card-text">No upcoming shifts</div>
            <div class="empty-card-sub">Check the Schedule tab for open shifts</div>
          </div>

          <!-- Additional accepted shifts (not just tomorrow) -->
          <div v-if="laterShifts.length" class="later-shifts-list">
            <div
              v-for="shift in laterShifts"
              :key="shift.id || shift.shift_id"
              class="later-shift-row"
              @click="openSwapDialog(shift)"
            >
              <div class="later-shift-date" aria-hidden="true">
                <div class="later-shift-date__month">{{ formatLaterMonth(shift) }}</div>
                <div class="later-shift-date__day">{{ formatLaterDay(shift) }}</div>
              </div>
              <div class="later-shift-info">
                <div class="later-shift-dept">{{ shift.department?.department_name || shift.department_name || 'Shift' }}</div>
                <div class="later-shift-time">{{ formatLaterWeekday(shift) }} &middot; {{ formatTimeRange(shift) }}</div>
                <div v-if="shift.position?.position_name || shift.position_name" class="later-shift-position">
                  <v-icon size="11" class="mr-1">mdi-badge-account-outline</v-icon>{{ shift.position?.position_name || shift.position_name }}
                </div>
              </div>
              <v-icon size="16" color="#D1D5DB">mdi-chevron-right</v-icon>
            </div>
          </div>
        </div>

        <!-- ── This Week Stats (priority 3) ──────────────── -->
        <div class="home-section">
          <div class="section-eyebrow">THIS WEEK</div>
          <div class="stats-strip">
            <div class="stat-cell">
              <div class="stat-value" style="color: #811429">{{ weeklyHours }}h</div>
              <div class="stat-label">Hours</div>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-cell">
              <div class="stat-value" style="color: #48111C">{{ weeklyShifts }}</div>
              <div class="stat-label">Shifts</div>
            </div>
          </div>
        </div>

        <!-- ── Open Shifts Preview (priority 4) ──────────── -->
        <div v-if="openShiftsCount > 0 || topOpenShifts.length" class="home-section">
          <div class="section-header">
            <div class="section-eyebrow" style="margin-bottom:0">OPEN SHIFTS</div>
            <button
              class="section-link"
              @click="$router.push({ name: 'student-schedule', query: { tab: 'open' } })"
            >
              See all<span v-if="openShiftsCount > 0"> ({{ openShiftsCount }})</span>
            </button>
          </div>
          <div class="open-shifts-list">
            <div
              v-for="shift in topOpenShifts"
              :key="shift.id || shift.shift_id"
              class="open-shift-row"
              @click="goToOpenShiftsForDept(shift)"
            >
              <div class="open-shift-bar"></div>
              <div class="open-shift-info">
                <div class="open-shift-dept">{{ shift.department?.department_name || shift.department_name }}</div>
                <div class="open-shift-time">{{ formatTimeRange(shift) }} &middot; {{ formatShiftDate(shift) }}</div>
              </div>
              <v-icon size="16" color="#D1D5DB">mdi-chevron-right</v-icon>
            </div>
            <div v-if="!topOpenShifts.length" class="open-shift-row">
              <div class="open-shift-info">
                <div class="open-shift-time">No shifts visible right now</div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Pending Requests (priority 5) ─────────────── -->
        <div v-if="pendingRequests.length" class="home-section">
          <div class="section-eyebrow">PENDING REQUESTS</div>
          <div class="requests-list">
            <div v-for="req in pendingRequests" :key="req.id" class="request-row">
              <v-icon size="16" :color="req.iconColor" class="request-icon">{{ req.icon }}</v-icon>
              <div class="request-info">
                <span class="request-label">{{ req.label }}</span>
              </div>
              <v-chip :color="req.statusColor" size="x-small" variant="tonal" class="flex-shrink-0">
                {{ req.statusLabel }}
              </v-chip>
              <v-btn
                v-if="req.type === 'time_off' && req.status === 'pending'"
                size="x-small"
                variant="text"
                color="error"
                :loading="req.cancelling"
                icon="mdi-close"
                aria-label="Cancel request"
                class="flex-shrink-0"
                @click.stop="cancelRequest(req)"
              />
            </div>
          </div>
        </div>
      </template><!-- /v-else -->
    </div><!-- /mobile -->


    <!-- ═══════════════════════════════════════════════════
         DESKTOP LAYOUT  (tablet / desktop)
    ════════════════════════════════════════════════════ -->
    <div v-else class="student-dashboard pa-6">
      <!-- Header -->
      <div class="dashboard-header mb-6">
        <div class="text-h4 font-weight-bold">Hi, {{ firstName }}!</div>
        <div class="text-body-1 text-medium-emphasis">{{ todayLabel }}</div>
      </div>

      <!-- Ack Alert (desktop) -->
      <v-alert
        v-if="pendingAcknowledgements.length > 0"
        type="warning"
        variant="tonal"
        prominent
        border="start"
        class="mb-6 ack-alert"
      >
        <template #title>
          <span class="text-subtitle-1 font-weight-bold">
            {{ pendingAcknowledgements.length }} new shift{{ pendingAcknowledgements.length === 1 ? '' : 's' }} assigned to you
          </span>
        </template>
        <template #text>
          <div class="mt-2">
            <v-card
              v-for="ack in pendingAcknowledgements"
              :key="ack.id"
              class="mb-2 ack-card"
              elevation="0"
              rounded="lg"
              color="white"
            >
              <div class="ack-card__bar"></div>
              <div class="pa-4 d-flex align-center justify-space-between flex-wrap" style="gap: 12px; flex: 1">
                <div>
                  <div class="text-subtitle-2 font-weight-bold mb-1">
                    {{ ack.shift?.department?.department_name || 'New Shift Assigned' }}
                  </div>
                  <div class="d-flex align-center flex-wrap text-body-2 text-medium-emphasis" style="gap: 12px">
                    <span v-if="ack.shift?.shift_date">
                      <v-icon size="14" class="mr-1">mdi-calendar</v-icon>
                      {{ new Date(ack.shift.shift_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) }}
                    </span>
                    <span v-if="ack.shift?.start_time && ack.shift?.end_time">
                      <v-icon size="14" class="mr-1">mdi-clock-outline</v-icon>
                      {{ ack.shift.start_time.slice(0, 5) }} – {{ ack.shift.end_time.slice(0, 5) }}
                    </span>
                  </div>
                </div>
                <div class="d-flex ga-2">
                  <v-btn color="success" variant="flat" size="small" :loading="acknowledgingId === ack.id" :disabled="acknowledgingId !== null" prepend-icon="mdi-check-circle" @click="acknowledgeShift(ack)">Acknowledge</v-btn>
                  <v-btn color="primary" variant="outlined" size="small" :loading="acknowledgingId === ack.id + '-cover'" :disabled="acknowledgingId !== null" prepend-icon="mdi-account-switch" @click="acknowledgeAndFindCover(ack)">Request Cover</v-btn>
                </div>
              </div>
            </v-card>
          </div>
        </template>
      </v-alert>

      <!-- Clock Status Banner (desktop) — same three-state render as mobile -->
      <div v-if="!clockStatus.resolved" class="clock-banner clock-banner--skeleton mb-6" aria-hidden="true">
        <div class="clock-banner__skeleton-dot"></div>
        <div class="clock-banner__skeleton-bar"></div>
      </div>
      <div
        v-else-if="clockStatus.stale"
        class="clock-banner clock-banner--stale mb-6"
        role="alert"
        :aria-label="`Stale clock-in: ${clockStatus.staleReason}`"
      >
        <v-icon color="#b26a00" size="20" class="mr-2">mdi-alert-circle-outline</v-icon>
        <div class="clock-banner__content">
          <span class="clock-banner__label">Looks like you forgot to clock out</span>
          <span class="clock-banner__elapsed">{{ clockStatus.staleReason }}</span>
        </div>
        <div class="clock-banner__actions">
          <v-btn
            size="small"
            variant="flat"
            color="#811429"
            :loading="clockingIn"
            :disabled="clockingIn"
            prepend-icon="mdi-logout"
            @click.stop="handleClockOut"
          >
            Clock Out
          </v-btn>
        </div>
      </div>
      <ClockStatusBanner
        v-else
        :clocked-in="clockStatus.isClockedIn"
        :clock-in-time="clockStatus.clockInTime"
        :on-break="clockStatus.onBreak"
        :loading="clockingIn"
        class="mb-6"
        @clock-in="handleClockIn"
        @clock-out="handleClockOut"
        @start-break="handleStartBreak"
        @end-break="handleEndBreak"
      />

      <v-card v-if="showActiveShiftTasks" class="mb-6" elevation="0" rounded="lg" border>
        <v-card-text class="pa-4">
          <div class="d-flex align-center justify-space-between mb-3" style="gap:12px">
            <div style="min-width:0">
              <div class="text-subtitle-1 font-weight-bold d-flex align-center">
                <v-icon size="20" class="mr-1">mdi-clipboard-check-outline</v-icon>
                Shift Tasks
              </div>
              <div class="text-body-2 text-medium-emphasis text-truncate">{{ activeShiftTaskListName }}</div>
            </div>
            <v-chip size="small" :color="activeShiftTaskPercent === 100 ? 'success' : 'primary'" variant="tonal">
              {{ activeShiftTaskProgress }}
            </v-chip>
          </div>
          <v-progress-linear
            v-if="activeShiftTaskItems.length"
            :model-value="activeShiftTaskPercent"
            color="primary"
            rounded
            height="6"
            class="mb-3"
          />
          <v-skeleton-loader v-if="activeShiftTasksLoading" type="list-item-two-line, list-item-two-line" />
          <v-alert v-else-if="activeShiftTasksError" type="error" variant="tonal" density="compact">
            {{ activeShiftTasksError }}
            <template #append>
              <v-btn variant="text" size="small" @click="loadActiveShiftTasks">Retry</v-btn>
            </template>
          </v-alert>
          <v-list v-else density="compact" class="pa-0">
            <v-list-item
              v-for="item in activeShiftTaskItems"
              :key="item.id"
              class="px-0"
            >
              <template #prepend>
                <v-checkbox-btn
                  :model-value="isActiveTaskCompleted(item.id)"
                  :loading="activeShiftTaskPendingIds.has(item.id)"
                  color="primary"
                  @update:model-value="(val) => toggleActiveShiftTask(item.id, val)"
                />
              </template>
              <v-list-item-title :class="{ 'text-decoration-line-through text-medium-emphasis': isActiveTaskCompleted(item.id) }">
                {{ item.title }}
              </v-list-item-title>
              <v-list-item-subtitle v-if="item.description">{{ item.description }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>

      <!-- Loading (desktop) -->
      <template v-if="loading">
        <v-row>
          <v-col cols="12"><v-skeleton-loader type="card" class="mb-4" /></v-col>
          <v-col cols="12"><v-skeleton-loader type="chip, chip, chip, chip, chip, chip, chip" class="mb-4" /></v-col>
          <v-col cols="12" md="4"><v-skeleton-loader type="card" /></v-col>
          <v-col cols="12" md="4"><v-skeleton-loader type="card" /></v-col>
          <v-col cols="12" md="4"><v-skeleton-loader type="card" /></v-col>
        </v-row>
      </template>

      <v-alert v-else-if="error" type="error" variant="tonal" class="mb-4" closable>
        {{ error }}
        <template #append><v-btn variant="text" size="small" @click="loadDashboard">Retry</v-btn></template>
      </v-alert>

      <template v-else>
        <!-- Next Shift (desktop) -->
        <div class="next-shift-section mb-6">
          <div class="section-eyebrow next-shift-eyebrow">{{ (nextShiftLabel || 'Up Next').toUpperCase() }}</div>
          <div v-if="nextShift" class="next-shift-card">
            <div class="next-shift-card__body">
              <div class="next-shift-date" aria-hidden="true">
                <div class="next-shift-date__month">{{ nextShiftMonth }}</div>
                <div class="next-shift-date__day">{{ nextShiftDay }}</div>
              </div>
              <div class="next-shift-info">
                <div class="next-shift-dept">{{ nextShift.department_name || nextShift.department?.department_name || 'Shift' }}</div>
                <div class="next-shift-subtitle">{{ nextShiftWeekday }} &middot; {{ formatTimeRange(nextShift) }}</div>
                <div v-if="nextShiftPosition" class="next-shift-position">
                  <v-icon size="14" class="mr-1">mdi-badge-account-outline</v-icon>{{ nextShiftPosition }}
                </div>
                <v-btn variant="outlined" color="primary" class="mt-3" @click="openSwapDialog(nextShift)">
                  <v-icon start>mdi-account-switch</v-icon>Request Cover
                </v-btn>
              </div>
            </div>
          </div>
          <v-card v-else class="pa-8 text-center" elevation="0" rounded="lg" border>
            <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-calendar-blank</v-icon>
            <div class="text-body-1 text-medium-emphasis">No upcoming shifts</div>
            <div class="text-caption text-medium-emphasis">Check the Open Shifts tab for available shifts</div>
          </v-card>
        </div>

        <!-- Week Strip (desktop only) -->
        <WeekStrip :selected-date="selectedDate" :shift-dates="shiftDates" class="mb-6" @select-day="selectedDate = $event" @change-week="onWeekChange" />

        <!-- 3-column grid (desktop) -->
        <v-row>
          <v-col cols="12" sm="6" md="4" :order="2">
            <v-card class="fill-height" elevation="0" rounded="lg" border>
              <v-card-text class="pa-4">
                <div class="text-subtitle-1 font-weight-bold mb-3"><v-icon size="20" class="mr-1">mdi-chart-bar</v-icon>This Week</div>
                <div class="d-flex flex-column ga-4">
                  <div class="text-center"><div class="text-h5 font-weight-bold" style="color:#80162B">{{ weeklyHours }}</div><div class="text-caption text-medium-emphasis">Hours</div></div>
                  <v-divider />
                  <div class="text-center"><div class="text-h5 font-weight-bold" style="color:#196CA2">{{ weeklyShifts }}</div><div class="text-caption text-medium-emphasis">Shifts</div></div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" sm="6" md="4" :order="0">
            <v-card class="fill-height" elevation="0" rounded="lg" border>
              <v-card-text class="pa-4">
                <div class="d-flex align-center justify-space-between mb-2">
                  <div class="text-subtitle-1 font-weight-bold"><v-icon size="20" class="mr-1">mdi-briefcase-plus</v-icon>Open Shifts</div>
                  <v-btn variant="text" color="primary" size="small" @click="$router.push({ name: 'student-schedule', query: { tab: 'open' } })">See All ({{ openShiftsCount }})</v-btn>
                </div>
                <template v-if="topOpenShifts.length">
                  <div v-for="shift in topOpenShifts" :key="shift.id" class="open-shift-item mb-2" @click="goToOpenShiftsForDept(shift)">
                    <ShiftCard :shift="shift" :show-actions="false" :is-open-shift="true" />
                  </div>
                </template>
                <div v-else class="text-body-2 text-medium-emphasis text-center pa-3">No open shifts available right now</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" sm="6" md="4" :order="1">
            <v-card class="fill-height" elevation="0" rounded="lg" border>
              <v-card-text class="pa-4">
                <div class="text-subtitle-1 font-weight-bold mb-2"><v-icon size="20" class="mr-1">mdi-clipboard-text-clock</v-icon>Pending Requests</div>
                <template v-if="pendingRequests.length">
                  <div v-for="req in pendingRequests" :key="req.id" class="d-flex align-center justify-space-between py-2" style="gap:8px">
                    <div class="d-flex align-center flex-grow-1" style="min-width:0"><v-icon size="18" :color="req.iconColor" class="mr-2 flex-shrink-0">{{ req.icon }}</v-icon><span class="text-body-2 text-truncate">{{ req.label }}</span></div>
                    <v-chip :color="req.statusColor" size="x-small" variant="tonal" class="flex-shrink-0">{{ req.statusLabel }}</v-chip>
                    <v-btn v-if="req.type === 'time_off' && req.status === 'pending'" size="x-small" variant="text" color="error" :loading="req.cancelling" icon="mdi-close" @click.stop="cancelRequest(req)" />
                  </div>
                </template>
                <div v-else class="text-body-2 text-medium-emphasis text-center pa-3">No pending requests</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </template>
    </div><!-- /desktop -->

    <!-- ─── Shared Dialogs ───────────────────────────────── -->
    <SwapDialog v-model="swapDialogOpen" :shift="swapShift" mode="cover" :coworkers="[]" @submitted="handleSwapSubmit" />

    <!-- Off-schedule clock-in/out warning (±15 min rule, same as /student/clock) -->
    <OffScheduleClockDialog
      v-model="offScheduleDialog"
      :action="offScheduleAction"
      :reason="offScheduleReason"
      :loading="clockingIn"
      @confirm="confirmOffSchedule"
      @cancel="offScheduleDialog = false"
    />

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="bottom">
      {{ snackbar.text }}
      <template #actions><v-btn variant="text" @click="snackbar.show = false">Close</v-btn></template>
    </v-snackbar>

  </PullToRefresh>
</template>

<script setup>
import { ref, computed, reactive, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useDisplay } from "vuetify";
import Utils from "../config/utils.js";
import studentService from "../services/studentService.js";
import shiftTaskCompletionService from "../services/shiftTaskCompletionService.js";
import taskListService from "../services/taskListService.js";

import { shiftStartDT, shiftEndDT, formatTimeRange, formatShiftDate as _formatShiftDate, shiftDateStr } from "../utils/shiftDateTime.js";
import { TZ, localDateStr } from "../utils/tz.js";

import ClockStatusBanner from "../components/student/ClockStatusBanner.vue";
import WeekStrip from "../components/student/WeekStrip.vue";
import ShiftCard from "../components/student/ShiftCard.vue";
import SwapDialog from "../components/student/SwapDialog.vue";
import PullToRefresh from "../components/mobile/PullToRefresh.vue";
import OffScheduleClockDialog from "../components/student/OffScheduleClockDialog.vue";
import { evaluateClockAction } from "../composables/useClockWindow.js";

const { mobile } = useDisplay();

const router = useRouter();
const user = ref(Utils.getStore("user") || {});

// State
const loading = ref(true);
const error = ref(null);
const selectedDate = ref(localDateStr());
const clockingIn = ref(false);

// Off-schedule warning (±15 min rule). Mirrors /student/clock so the
// dashboard’s Clock In / Clock Out run through the same confirmation flow.
const offScheduleDialog = ref(false);
const offScheduleAction = ref("in"); // 'in' | 'out'
const offScheduleReason = ref("");

// Dashboard data
const nextShift = ref(null);
const upcomingShifts = ref([]); // all accepted future shifts (sorted, nextShift is [0])
const todayShifts = ref([]);
const weekShifts = ref([]);
const openShiftsCount = ref(0);
const topOpenShifts = ref([]);
const pendingRequests = ref([]);
const pendingAcknowledgements = ref([]);
const acknowledgingId = ref(null);
const weeklyHours = ref(0);
const weeklyShifts = ref(0);
const activeClockShift = ref(null);
const activeShiftTaskItems = ref([]);
const activeShiftCompletedIds = ref(new Set());
const activeShiftTaskPendingIds = ref(new Set());
const activeShiftTasksLoading = ref(false);
const activeShiftTasksError = ref("");
// The banner's rendered shape is driven by four separate pieces of state
// so the dashboard never "flips" between Not clocked in → Clocked in as
// the network settles. `resolved` stays false until the first load (or
// fallback) returns; the banner renders a quiet loading strip in the
// meantime instead of guessing. `stale` is set when the backend reports
// an open record that clearly belongs to a forgotten clock-out from a
// previous session — in that case we surface a recovery affordance
// ("Clock Out") rather than green "Clocked in", because claiming the
// student is actively working right now would be a lie.
const clockStatus = reactive({
  resolved: false,
  isClockedIn: false,
  clockInTime: null,
  onBreak: false,
  clockRecordId: null,
  stale: false,
  staleReason: null,
  shiftEndAt: null,
});

// A clock-in is considered stale (forgotten clock-out) when either of
// these is true. Shared between the happy-path and fallback mappers.
const STALE_CLOCK_IN_HOURS = 16;   // no one works a 16h+ shift
const STALE_SHIFT_END_HOURS = 4;    // record's shift ended 4h+ ago

function deriveStaleness(clockInISO, shiftEndISO) {
  const now = Date.now();
  const clockInMs = clockInISO ? new Date(clockInISO).getTime() : NaN;
  if (Number.isFinite(clockInMs)) {
    const hoursOpen = (now - clockInMs) / 3600000;
    if (hoursOpen >= STALE_CLOCK_IN_HOURS) {
      return { stale: true, reason: `Open for ${Math.round(hoursOpen)}h — likely a missed clock-out` };
    }
  }
  const shiftEndMs = shiftEndISO ? new Date(shiftEndISO).getTime() : NaN;
  if (Number.isFinite(shiftEndMs)) {
    const hoursSince = (now - shiftEndMs) / 3600000;
    if (hoursSince >= STALE_SHIFT_END_HOURS) {
      return { stale: true, reason: `Shift ended ${Math.round(hoursSince)}h ago — please clock out` };
    }
  }
  return { stale: false, reason: null };
}

function applyClockStatus({ isClockedIn, clockInTime, onBreak, clockRecordId, shiftEndAt, shift }) {
  clockStatus.isClockedIn = Boolean(isClockedIn);
  clockStatus.clockInTime = clockInTime || null;
  clockStatus.onBreak = Boolean(onBreak);
  clockStatus.clockRecordId = clockRecordId || null;
  clockStatus.shiftEndAt = shiftEndAt || null;
  if (isClockedIn) {
    const { stale, reason } = deriveStaleness(clockInTime, shiftEndAt);
    clockStatus.stale = stale;
    clockStatus.staleReason = reason;
  } else {
    clockStatus.stale = false;
    clockStatus.staleReason = null;
  }
  activeClockShift.value = Boolean(isClockedIn) && !clockStatus.stale ? shift || null : null;
  clockStatus.resolved = true;
}

function resetClockStatus() {
  applyClockStatus({ isClockedIn: false });
}

// Swap dialog
const swapDialogOpen = ref(false);
const swapShift = ref(null);

// Snackbar
const snackbar = reactive({ show: false, text: "", color: "success" });

const firstName = computed(() => user.value?.fName || "Student");

const todayLabel = computed(() => {
  return new Date().toLocaleDateString("en-US", {
    timeZone: TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
  });
});

const shiftDates = computed(() => {
  return [...new Set(weekShifts.value.map((s) => {
    if (s.shift_date) return s.shift_date;
    const d = shiftStartDT(s);
    if (!d) return null;
    const dt = new Date(d);
    return isNaN(dt) ? null : localDateStr(dt);
  }).filter(Boolean))];
});

const nextShiftLabel = computed(() => {
  if (!nextShift.value) return "";
  const start = new Date(shiftStartDT(nextShift.value));
  const now = new Date();
  if (!isNaN(start) && start <= now) return "Current Shift";
  return "Up Next";
});

// Additional upcoming accepted shifts shown below the hero card on the
// dashboard. Cap at 4 secondary rows so the home view stays scannable;
// the full list still lives in the Schedule tab.
const laterShifts = computed(() => {
  const list = upcomingShifts.value || [];
  if (list.length <= 1) return [];
  return list.slice(1, 5);
});

const nextShiftPosition = computed(() => {
  if (!nextShift.value) return '';
  return nextShift.value.position_name
    || nextShift.value.position?.position_name
    || '';
});

const showActiveShiftTasks = computed(() => (
  clockStatus.resolved
  && clockStatus.isClockedIn
  && !clockStatus.stale
  && (activeShiftTasksLoading.value || activeShiftTaskItems.value.length > 0 || activeShiftTasksError.value)
));

const activeShiftTaskListName = computed(() => (
  activeClockShift.value?.taskList?.name
  || activeClockShift.value?.department?.department_name
  || activeClockShift.value?.department_name
  || "Current Shift"
));

const activeShiftCompletedCount = computed(() => (
  activeShiftTaskItems.value.filter((item) => activeShiftCompletedIds.value.has(Number(item.id))).length
));

const activeShiftTaskProgress = computed(() => (
  `${activeShiftCompletedCount.value}/${activeShiftTaskItems.value.length || 0}`
));

const activeShiftTaskPercent = computed(() => {
  if (!activeShiftTaskItems.value.length) return 0;
  return Math.round((activeShiftCompletedCount.value / activeShiftTaskItems.value.length) * 100);
});

const isActiveTaskCompleted = (itemId) => activeShiftCompletedIds.value.has(Number(itemId));

async function loadActiveShiftTasks() {
  const shift = activeClockShift.value;
  const shiftId = shift?.shift_id || shift?.id;
  const taskListId = shift?.task_list_id || shift?.taskList?.id;

  activeShiftTasksError.value = "";
  activeShiftTaskPendingIds.value = new Set();

  if (!shiftId || !taskListId) {
    activeShiftTaskItems.value = [];
    activeShiftCompletedIds.value = new Set();
    activeShiftTasksLoading.value = false;
    return;
  }

  activeShiftTasksLoading.value = true;
  try {
    let items = Array.isArray(shift.taskList?.items) ? shift.taskList.items : [];
    if (!items.length) {
      const listRes = await taskListService.getTaskList(taskListId);
      items = listRes?.data?.data?.items || listRes?.data?.items || [];
    }

    activeShiftTaskItems.value = [...items].sort((a, b) => (
      Number(a.sort_order || 0) - Number(b.sort_order || 0) || Number(a.id || 0) - Number(b.id || 0)
    ));

    const compRes = await shiftTaskCompletionService.getShiftCompletions(shiftId);
    const completions = Array.isArray(compRes?.data?.data)
      ? compRes.data.data
      : Array.isArray(compRes?.data)
        ? compRes.data
        : [];
    activeShiftCompletedIds.value = new Set(completions.map((c) => Number(c.task_list_item_id)));
  } catch (err) {
    console.error("Failed to load active shift tasks:", err);
    activeShiftTaskItems.value = [];
    activeShiftCompletedIds.value = new Set();
    activeShiftTasksError.value = "Could not load this shift's tasks.";
  } finally {
    activeShiftTasksLoading.value = false;
  }
}

async function toggleActiveShiftTask(itemId, checked) {
  const shiftId = activeClockShift.value?.shift_id || activeClockShift.value?.id;
  if (!shiftId || activeShiftTaskPendingIds.value.has(itemId)) return;

  activeShiftTaskPendingIds.value = new Set([...activeShiftTaskPendingIds.value, itemId]);
  try {
    if (checked) {
      await shiftTaskCompletionService.completeTask(shiftId, itemId);
      activeShiftCompletedIds.value = new Set([...activeShiftCompletedIds.value, Number(itemId)]);
    } else {
      await shiftTaskCompletionService.uncompleteTask(shiftId, itemId);
      const next = new Set(activeShiftCompletedIds.value);
      next.delete(Number(itemId));
      activeShiftCompletedIds.value = next;
    }
  } catch (err) {
    showSnack(err?.response?.data?.message || "Could not update task status.", "error");
  } finally {
    const nextPending = new Set(activeShiftTaskPendingIds.value);
    nextPending.delete(itemId);
    activeShiftTaskPendingIds.value = nextPending;
  }
}

// Split the next-shift date into the When-I-Work-style components: a
// month/day bubble on the left and a weekday-prefix on the time row. Keeps
// the existing tz-aware formatter in utils as source of truth.
function nextShiftDateObj() {
  if (!nextShift.value) return null;
  const raw = nextShift.value.shift_date || shiftDateStr(nextShift.value);
  if (!raw) return null;
  const d = raw instanceof Date
    ? raw
    : new Date(typeof raw === "string" && raw.length === 10 ? raw + "T00:00:00" : raw);
  return isNaN(d) ? null : d;
}

const nextShiftMonth = computed(() => {
  const d = nextShiftDateObj();
  if (!d) return "";
  return d.toLocaleDateString("en-US", { timeZone: TZ, month: "short" }).toUpperCase();
});

const nextShiftDay = computed(() => {
  const d = nextShiftDateObj();
  if (!d) return "";
  return d.toLocaleDateString("en-US", { timeZone: TZ, day: "numeric" });
});

const nextShiftWeekday = computed(() => {
  const d = nextShiftDateObj();
  if (!d) return "";
  return d.toLocaleDateString("en-US", { timeZone: TZ, weekday: "short" });
});


// Mini date-part helpers for the secondary upcoming shift rows. Same tz-safe
// extraction as nextShiftDateObj so dates don’t drift by one across
// DST / UTC boundaries.
function laterShiftDateObj(shift) {
  if (!shift) return null;
  const raw = shift.shift_date || shiftDateStr(shift);
  if (!raw) return null;
  const d = raw instanceof Date ? raw : new Date(String(raw).includes('T') ? raw : raw + 'T00:00:00');
  return isNaN(d) ? null : d;
}
function formatLaterMonth(shift) {
  const d = laterShiftDateObj(shift);
  return d ? d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : '';
}
function formatLaterDay(shift) {
  const d = laterShiftDateObj(shift);
  return d ? d.getDate() : '';
}
function formatLaterWeekday(shift) {
  const d = laterShiftDateObj(shift);
  return d ? d.toLocaleDateString('en-US', { weekday: 'short' }) : '';
}

function formatShiftDate(shift) {
  if (!shift) return '';
  const dateStr = shift.shift_date || shiftDateStr(shift);
  return _formatShiftDate(dateStr);
}

function showSnack(text, color = "success") {
  snackbar.text = text;
  snackbar.color = color;
  snackbar.show = true;
}

/**
 * Map a raw request object (time-off or swap) from the API into the
 * display shape used by the Pending Requests card.
 */
function mapRequest(r) {
  const statusLabelMap = {
    pending:          "Pending",
    manager_pending:  "Awaiting Manager",
    approved:         "Approved",
    declined:         "Declined",
    rejected:         "Rejected",
    cancelled:        "Cancelled",
    accepted:         "Accepted",
  };
  const statusColorMap = {
    pending:          "warning",
    manager_pending:  "orange",
    approved:         "success",
    declined:         "error",
    rejected:         "error",
    cancelled:        "grey",
    accepted:         "info",
  };
  const status = r.status || "pending";
  return {
    id:          r.id,
    type:        r.type || "time_off",
    label:       r.type === "time_off"
                   ? `Time off: ${r.startDate ?? r.start_date} – ${r.endDate ?? r.end_date}`
                   : r.type === "find_cover"
                     ? `Cover Request - ${r.shiftDate ?? r.shift_date ?? ""}`
                     : r.label || "Swap Request",
    icon:        r.type === "time_off" ? "mdi-calendar-remove" : "mdi-swap-horizontal",
    iconColor:   r.type === "time_off" ? "orange" : "blue",
    status,
    statusLabel: statusLabelMap[status] || status,
    statusColor: statusColorMap[status] || "warning",
    cancelling:  false,
  };
}

/**
 * Cancel a pending time-off request from the Pending Requests card.
 * Uses the DELETE /student/time-off/:id endpoint.
 */
async function cancelRequest(req) {
  req.cancelling = true;
  try {
    await studentService.cancelTimeOff(req.id);
    pendingRequests.value = pendingRequests.value.filter((r) => r.id !== req.id);
    showSnack("Time-off request cancelled.");
  } catch (err) {
    showSnack(err?.response?.data?.message || "Failed to cancel request.", "error");
  } finally {
    req.cancelling = false;
  }
}

function normalizeOpenShiftPayload(payload) {
  if (Array.isArray(payload)) {
    return {
      count: payload.length,
      shifts: payload,
    };
  }

  if (payload && typeof payload === "object") {
    const shifts = Array.isArray(payload.preview)
      ? payload.preview
      : Array.isArray(payload.shifts)
        ? payload.shifts
        : [];

    return {
      count: Number(payload.count ?? shifts.length ?? 0),
      shifts,
    };
  }

  return {
    count: 0,
    shifts: [],
  };
}

async function loadDashboard() {
  loading.value = true;
  error.value = null;

  try {
    // Try the aggregated dashboard endpoint first
    const res = await studentService.getDashboard();
    const data = res?.data?.data || res?.data || {};
    const openShiftData = normalizeOpenShiftPayload(data.openShifts);

    nextShift.value = data.nextShift || null;
    todayShifts.value = data.todayShifts || [];
    weekShifts.value = data.weekShifts || [];

    // Derive upcoming accepted shifts for the dashboard 'Up Next' stack.
    // Prefer an explicit upcomingShifts payload if the backend provides one;
    // otherwise combine nextShift + weekShifts, dedupe, and drop anything
    // already started more than an hour ago. nextShift is ALWAYS upcoming[0]
    // so it renders as the hero.
    const upcomingPool = Array.isArray(data.upcomingShifts) && data.upcomingShifts.length
      ? data.upcomingShifts
      : [
          ...(data.nextShift ? [data.nextShift] : []),
          ...(Array.isArray(data.weekShifts) ? data.weekShifts : []),
        ];
    const seen = new Set();
    const cutoff = new Date(Date.now() - 3600000);
    upcomingShifts.value = upcomingPool
      .filter((s) => {
        const key = String(s.id || s.shift_id || `${s.shift_date}-${s.start_time}-${s.department_id || ''}`);
        if (seen.has(key)) return false;
        seen.add(key);
        const d = new Date(shiftStartDT(s));
        return !isNaN(d) && d >= cutoff;
      })
      .sort((a, b) => new Date(shiftStartDT(a)) - new Date(shiftStartDT(b)));
    openShiftsCount.value = openShiftData.count;
    topOpenShifts.value = openShiftData.shifts.slice(0, 3);
    weeklyHours.value = data.estimatedWeeklyHours ?? 0;
    weeklyShifts.value = weekShifts.value.length;

    // Map pending requests — build display rows directly from counts
    // (acknowledgements are shown in the dedicated alert above, not here)
    const rawRequests = [];
    if (Array.isArray(data.pendingRequests)) {
      rawRequests.push(
        ...data.pendingRequests
          .filter((r) => r.type !== 'acknowledgement' && r.type !== 'acknowledgements')
          .map((r) => mapRequest(r))
      );
    } else if (data.pendingCounts && typeof data.pendingCounts === "object") {
      const { timeOff, swapRequests } = data.pendingCounts;
      if (Number(timeOff) > 0) {
        rawRequests.push({
          id: 'pending_time_off', type: 'time_off',
          label: `${timeOff} pending time-off request${timeOff > 1 ? 's' : ''}`,
          icon: 'mdi-calendar-remove', iconColor: 'orange',
          status: 'pending', statusLabel: 'Pending', statusColor: 'warning',
          cancelling: false,
        });
      }
      if (Number(swapRequests) > 0) {
        rawRequests.push({
          id: 'pending_swaps', type: 'swap',
          label: `${swapRequests} pending swap request${swapRequests > 1 ? 's' : ''}`,
          icon: 'mdi-swap-horizontal', iconColor: 'blue',
          status: 'pending', statusLabel: 'Pending', statusColor: 'warning',
          cancelling: false,
        });
      }
    }
    pendingRequests.value = rawRequests;

    // Clock status. Run through applyClockStatus so the staleness guard
    // catches forgotten clock-outs even on the happy path — the backend
    // today still returns isClockedIn: true whenever an open record
    // exists, without checking how old it is.
    const bcs = data.clockStatus || {};
    const shiftEndAt = bcs.shift?.end_time && bcs.shift?.shift_date
      ? `${bcs.shift.shift_date}T${bcs.shift.end_time}`
      : bcs.shiftEndAt || null;
    applyClockStatus({
      isClockedIn: bcs.isClockedIn,
      clockInTime: bcs.clockInTime,
      onBreak: bcs.onBreak,
      clockRecordId: bcs.clockRecordId,
      shiftEndAt,
      shift: bcs.shift || null,
    });

    // Pending shift acknowledgements (fetched separately — dashboard only returns count)
    try {
      const ackRes = await studentService.getPendingAcknowledgements();
      // Handle both wrapped ({ data: [...] }) and unwrapped ([...]) response shapes
      const ackPayload = ackRes?.data;
      pendingAcknowledgements.value = Array.isArray(ackPayload)
        ? ackPayload
        : Array.isArray(ackPayload?.data)
          ? ackPayload.data
          : [];
    } catch {
      pendingAcknowledgements.value = [];
    }
  } catch (dashErr) {
    // Fallback: load data from individual endpoints
    try {
      await loadFromIndividualEndpoints();
    } catch (fallbackErr) {
      error.value = "Failed to load dashboard. Please try again.";
      console.error("Dashboard load failed:", fallbackErr);
    }
  } finally {
    loading.value = false;
  }
}

async function loadFromIndividualEndpoints() {
  const userId = user.value?.userId || user.value?.id;

  const [shiftsRes, clockRes, openRes] = await Promise.allSettled([
    studentService.getShifts({ assigned_user_id: userId, is_published: true }),
    studentService.getOpenClockRecord(),
    studentService.getOpenShifts(),
  ]);

  // Parse shifts
  if (shiftsRes.status === "fulfilled") {
    const allShifts = shiftsRes.value?.data?.data || shiftsRes.value?.data || [];
    const now = new Date();
    const weekStart = getWeekStart(now);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    weekShifts.value = allShifts.filter((s) => {
      const d = new Date(shiftStartDT(s) || s.shift_date);
      return !isNaN(d) && d >= weekStart && d < weekEnd;
    });

    const upcoming = allShifts
      .filter((s) => {
        const d = new Date(shiftStartDT(s));
        return !isNaN(d) && d >= new Date(now.getTime() - 3600000);
      })
      .sort((a, b) => new Date(shiftStartDT(a)) - new Date(shiftStartDT(b)));
    nextShift.value = upcoming[0] || null;
    upcomingShifts.value = upcoming;

    weeklyShifts.value = weekShifts.value.length;
    weeklyHours.value = weekShifts.value.reduce((sum, s) => {
      const start = new Date(shiftStartDT(s));
      const end = new Date(shiftEndDT(s));
      if (isNaN(start) || isNaN(end)) return sum;
      return sum + Math.max(0, (end - start) / 3600000);
    }, 0).toFixed(1);
  }

  // Clock status — field names match ClockRecord model: clock_in, clock_out, clock_id
  //
  // Defensive unwrap: the /clock-records/me/open endpoint returns two
  // different shapes today — a raw ClockRecord when one is open, and a
  // { success, data: null, message } wrapper when none is. The old
  // "data.data || data" unwrap would fall through to the wrapper itself,
  // and since the wrapper has no clock_out field, the check below used
  // to evaluate to "isClockedIn = true" on fresh login. Require a real
  // clock_in timestamp to treat the record as open.
  if (clockRes.status === "fulfilled") {
    const body = clockRes.value?.data;
    const record =
      body && typeof body === "object" && "data" in body ? body.data : body;
    if (record && record.clock_in && !record.clock_out) {
      const breaks = record.breaks || record.breakRecords || [];
      const shiftEndAt = record.shift?.end_time && record.shift?.shift_date
        ? `${record.shift.shift_date}T${record.shift.end_time}`
        : null;
      applyClockStatus({
        isClockedIn: true,
        clockInTime: record.clock_in,
        onBreak: Array.isArray(breaks) && breaks.some((b) => !b.break_end),
        clockRecordId: record.clock_id,
        shiftEndAt,
        shift: record.shift || null,
      });
    } else {
      resetClockStatus();
    }
  } else {
    resetClockStatus();
  }

  // Open shifts
  if (openRes.status === "fulfilled") {
    const openShiftData = normalizeOpenShiftPayload(openRes.value?.data?.data || openRes.value?.data);
    topOpenShifts.value = openShiftData.shifts.slice(0, 3);
    openShiftsCount.value = openShiftData.count;
  }

  // Pending acknowledgements (always fetch separately)
  try {
    const ackRes = await studentService.getPendingAcknowledgements();
    const ackPayload = ackRes?.data;
    pendingAcknowledgements.value = Array.isArray(ackPayload)
      ? ackPayload
      : Array.isArray(ackPayload?.data)
        ? ackPayload.data
        : [];
  } catch {
    pendingAcknowledgements.value = [];
  }
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

// Route dashboard Clock In through the same ±15-min window check
// used on /student/clock. On-schedule → proceed. Off-schedule → open
// the shared warning dialog (manager-will-be-notified).
function handleClockIn() {
  const decision = evaluateClockAction({
    action: "in",
    activeShift: nextShift.value,
    now: Date.now(),
  });
  if (decision.offSchedule) {
    offScheduleAction.value = "in";
    offScheduleReason.value = decision.reason;
    offScheduleDialog.value = true;
  } else {
    doClockIn({ offSchedule: false });
  }
}

function handleClockOut() {
  // Stale fast-path: the banner is showing the amber "forgot to clock
  // out" state. Skip the ±15-min dialog — it was designed around an
  // in-progress shift, and the shift the record points at already
  // ended hours ago. We go straight to a forced off-schedule clock-out
  // with the staleness reason attached so the manager log has context.
  if (clockStatus.stale) {
    offScheduleReason.value = clockStatus.staleReason || "Auto-closed stale clock-in";
    doClockOut({ offSchedule: true });
    return;
  }

  const decision = evaluateClockAction({
    action: "out",
    activeShift: nextShift.value,
    now: Date.now(),
  });
  if (decision.offSchedule) {
    offScheduleAction.value = "out";
    offScheduleReason.value = decision.reason;
    offScheduleDialog.value = true;
  } else {
    doClockOut({ offSchedule: false });
  }
}

async function doClockIn({ offSchedule = false } = {}) {
  const shiftId = nextShift.value?.shift_id;
  // On-schedule clock-in still requires a shift id to bind to. Off-schedule
  // clock-in is allowed without one — manager will review.
  if (!offSchedule && !shiftId) {
    showSnack("No upcoming shift to clock into. Please acknowledge your shift first.", "warning");
    return;
  }
  clockingIn.value = true;
  try {
    const payload = shiftId ? { shiftId } : {};
    if (offSchedule) {
      payload.offSchedule = true;
      payload.offScheduleReason = offScheduleReason.value || "No scheduled shift within 15 minutes";
    }
    const res = await studentService.clockIn(payload);
    // Pull the authoritative clock_id from the response so later
    // actions (break, clock-out) have a handle. The controller
    // returns the created record in res.data.data (ok() envelope).
    const created = res?.data?.data || res?.data || {};
    const shiftEndAt = created.shift?.end_time && created.shift?.shift_date
      ? `${created.shift.shift_date}T${created.shift.end_time}`
      : nextShift.value ? `${nextShift.value.shift_date}T${nextShift.value.end_time}` : null;
    applyClockStatus({
      isClockedIn: true,
      clockInTime: created.clock_in || new Date().toISOString(),
      onBreak: false,
      clockRecordId: created.clock_id,
      shiftEndAt,
      shift: created.shift || nextShift.value || null,
    });
    offScheduleDialog.value = false;
    showSnack(offSchedule ? "Clocked in — manager notified." : "Clocked in successfully!");
  } catch (err) {
    showSnack(err?.response?.data?.message || "Failed to clock in", "error");
  } finally {
    clockingIn.value = false;
  }
}

async function doClockOut({ offSchedule = false } = {}) {
  clockingIn.value = true;
  try {
    const payload = offSchedule
      ? { offSchedule: true, offScheduleReason: offScheduleReason.value || "Clocking out outside the 15-minute window" }
      : {};
    await studentService.clockOut(payload);
    resetClockStatus();
    offScheduleDialog.value = false;
    showSnack(offSchedule ? "Clocked out — manager notified." : "Clocked out successfully!");
  } catch (err) {
    showSnack(err?.response?.data?.message || "Failed to clock out", "error");
  } finally {
    clockingIn.value = false;
  }
}

// Off-schedule dialog confirm → route to the right doClockIn/Out.
async function confirmOffSchedule() {
  if (offScheduleAction.value === "in") await doClockIn({ offSchedule: true });
  else                                    await doClockOut({ offSchedule: true });
}

async function handleStartBreak() {
  clockingIn.value = true;
  try {
    await studentService.startBreak(clockStatus.clockRecordId);
    clockStatus.onBreak = true;
    showSnack("Break started!");
  } catch (err) {
    showSnack(err?.response?.data?.message || "Failed to start break", "error");
  } finally {
    clockingIn.value = false;
  }
}

async function handleEndBreak() {
  clockingIn.value = true;
  try {
    await studentService.endBreak(clockStatus.clockRecordId);
    clockStatus.onBreak = false;
    showSnack("Break ended!");
  } catch (err) {
    showSnack(err?.response?.data?.message || "Failed to end break", "error");
  } finally {
    clockingIn.value = false;
  }
}


async function acknowledgeShift(ack) {
  acknowledgingId.value = ack.id;
  try {
    await studentService.acknowledgeShift(ack.id);
    pendingAcknowledgements.value = pendingAcknowledgements.value.filter((a) => a.id !== ack.id);
    showSnack("Shift acknowledged! You can now clock in when your shift starts.");
    // Reload the full dashboard so next shift / clock status reflect the newly acknowledged shift
    await loadDashboard();
  } catch (err) {
    showSnack(err?.response?.data?.message || "Failed to acknowledge shift.", "error");
  } finally {
    acknowledgingId.value = null;
  }
}

async function acknowledgeAndFindCover(ack) {
  acknowledgingId.value = ack.id + '-cover';
  try {
    // Step 1: Acknowledge the shift (accept it into the schedule)
    await studentService.acknowledgeShift(ack.id);
    pendingAcknowledgements.value = pendingAcknowledgements.value.filter((a) => a.id !== ack.id);

    // Step 2: Open the cover request dialog for this shift
    const shift = ack.shift || {};
    swapShift.value = {
      ...shift,
      shift_id: shift.shift_id || shift.id,
      department_name: shift.department?.department_name || shift.department_name,
    };
    swapDialogOpen.value = true;
    showSnack("Shift acknowledged. Now submit a cover request.");
  } catch (err) {
    showSnack(err?.response?.data?.message || "Failed to acknowledge shift.", "error");
  } finally {
    acknowledgingId.value = null;
  }
}

function goToOpenShiftsForDept(shift) {
  // Use the department_id that the backend understands for server-side filtering
  const deptId = shift.department_id || shift.department?.department_id || shift.department?.id || '';
  router.push({
    name: 'student-schedule',
    query: { tab: 'open', departmentId: deptId },
  });
}

function openSwapDialog(shift) {
  swapShift.value = shift;
  swapDialogOpen.value = true;
}

function onWeekChange({ monday }) {
  selectedDate.value = monday;
}

function handleSwapSubmit() {
  swapDialogOpen.value = false;
  showSnack("Request submitted!");
  loadDashboard();
}


async function handlePullRefresh(done) {
  await loadDashboard();
  done();
}

onMounted(loadDashboard);

watch(
  () => [
    activeClockShift.value?.shift_id || activeClockShift.value?.id || null,
    activeClockShift.value?.task_list_id || activeClockShift.value?.taskList?.id || null,
  ],
  ([shiftId, taskListId]) => {
    if (shiftId && taskListId) loadActiveShiftTasks();
    else {
      activeShiftTaskItems.value = [];
      activeShiftCompletedIds.value = new Set();
      activeShiftTasksError.value = "";
      activeShiftTasksLoading.value = false;
    }
  },
);
</script>

<style scoped>
/* ─── Shared (desktop) ─── */
.student-dashboard { width: 100%; }

/* ─── Clock banner skeleton + stale variants ───
   These render in the same slot as <ClockStatusBanner>. We keep the
   base .clock-banner shape local because the component itself is
   scoped — duplicating the minimal shell here is cheaper than
   plumbing a "loading" / "stale" mode through the component props
   and risking regressions in the happy-path banner. */
.clock-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--border-1, #e5e7eb);
  background: var(--surface-1, #f7f7f8);
}
.clock-banner__content {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}
.clock-banner__label { font-weight: 600; color: var(--text-1, #1f2328); }
.clock-banner__elapsed { font-size: 12px; color: var(--text-3, #6a737d); }
.clock-banner__actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

.clock-banner--skeleton {
  min-height: 52px;
  background: linear-gradient(90deg, #f3f4f6 25%, #eceef0 37%, #f3f4f6 63%);
  background-size: 400% 100%;
  animation: clock-banner-shimmer 1.4s ease-in-out infinite;
  border-color: transparent;
}
.clock-banner__skeleton-dot {
  width: 16px; height: 16px; border-radius: 50%;
  background: rgba(0,0,0,0.08);
}
.clock-banner__skeleton-bar {
  height: 10px; border-radius: 5px;
  background: rgba(0,0,0,0.08);
  flex: 1;
  max-width: 220px;
}
@keyframes clock-banner-shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: 0 0; }
}

.clock-banner--stale {
  background: #fff8e6;
  border-color: #f1c47a;
}
.clock-banner--stale .clock-banner__label { color: #7a4a00; }
.clock-banner--stale .clock-banner__elapsed { color: #8a5a12; }

/* Desktop 'Up Next' card — When-I-Work style: date bubble + stacked text,
   3px maroon left rail. Mirrors the mobile hero card below. */
.next-shift-section { width: 100%; }
.next-shift-eyebrow {
  font-size: var(--type-meta-size);
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--text-3);
  text-transform: uppercase;
  margin-bottom: 10px;
}
.next-shift-card {
  position: relative;
  background: var(--surface-0);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-1);
  overflow: hidden;
}
.next-shift-card::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--brand-primary);
}
.next-shift-card__body {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px 20px 20px 23px;
}
.next-shift-date {
  flex-shrink: 0;
  width: 64px;
  padding: 10px 8px;
  background: var(--brand-primary-lt);
  border-radius: var(--radius-sm);
  text-align: center;
}
.next-shift-date__month {
  font-size: var(--type-meta-size);
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--brand-primary);
  line-height: 1;
}
.next-shift-date__day {
  font-size: 28px;
  font-weight: 700;
  color: var(--brand-primary);
  line-height: 1.1;
  margin-top: 4px;
}
.next-shift-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.next-shift-dept {
  font-size: var(--type-h3-size);
  font-weight: var(--type-h3-weight);
  color: var(--text-1);
  line-height: var(--type-h3-line);
}
.next-shift-subtitle {
  font-size: var(--type-body-size);
  color: var(--text-2);
  margin-top: 4px;
}
.next-shift-position {
  display: flex;
  align-items: center;
  font-size: var(--type-meta-size);
  color: var(--text-3);
  margin-top: 6px;
}

.ack-card { overflow: hidden; display: flex; }
.ack-card__bar { width: 5px; flex-shrink: 0; background: #F57C00; }
.ack-alert { border-left-width: 4px !important; }
.open-shift-item { cursor: pointer; }

/* ─── Mobile Home Screen ──────────────────────────────────── */
.home-screen {
  background: #F7F7F8;
  min-height: 100%;
  padding: 20px 16px 32px;
}

/* ── Greeting ── */
.home-greeting {
  margin-bottom: 24px;
}
.home-greeting-name {
  font-size: 22px;
  font-weight: 700;
  color: #1A1A1A;
  line-height: 1.2;
}
.home-greeting-date {
  font-size: 13px;
  color: #6B7280;
  margin-top: 3px;
}

/* ── Section rhythm ── */
.home-section {
  margin-bottom: 24px;
}
.section-eyebrow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #9CA3AF;
  text-transform: uppercase;
  margin-bottom: 10px;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.section-link {
  font-size: 13px;
  color: #80162B;
  font-weight: 600;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}

/* ── Ack Banner ── */
.ack-banner {
  background: #FFF7ED;
  border: 1px solid #FED7AA;
  border-radius: 14px;
  padding: 14px;
}
.ack-banner-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #EA580C;
  margin-bottom: 12px;
}
.ack-item {
  background: #ffffff;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.ack-item:last-child { margin-bottom: 0; }
.ack-item-info { flex: 1; min-width: 0; }
.ack-item-dept {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ack-item-time {
  font-size: 12px;
  color: #6B7280;
  margin-top: 2px;
}
.ack-item-actions { display: flex; gap: 6px; flex-shrink: 0; }
.ack-btn {
  padding: 7px 13px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  -webkit-tap-highlight-color: transparent;
}
.ack-btn:disabled { opacity: 0.5; }
.ack-btn--accept { background: #80162B; color: #fff; }
.ack-btn--cover  { background: #F3F4F6; color: #374151; }

/* ── Next Shift Hero Card (mobile) ──
   When-I-Work style: date bubble (month + day, maroon-tinted) on the left,
   stacked text in the center (department · weekday + time · position),
   3px maroon accent rail on the card's left edge. Same structure as the
   desktop .next-shift-card so the two variants read as one component. */
.shift-hero-card {
  position: relative;
  background: var(--surface-0);
  border: 1px solid var(--border-1);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-1);
  overflow: hidden;
  transition: box-shadow 0.15s ease;
}
.shift-hero-card::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--brand-primary);
}
.shift-hero-card:active { box-shadow: var(--shadow-2); }
.shift-hero-body {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 16px 14px 19px;
}
.shift-hero-date {
  flex-shrink: 0;
  width: 60px;
  padding: 8px 6px;
  background: var(--brand-primary-lt);
  border-radius: var(--radius-sm);
  text-align: center;
}
.shift-hero-date__month {
  font-size: var(--type-meta-size);
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--brand-primary);
  line-height: 1;
}
.shift-hero-date__day {
  font-size: 26px;
  font-weight: 700;
  color: var(--brand-primary);
  line-height: 1.1;
  margin-top: 3px;
}
.shift-hero-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.shift-hero-dept {
  font-size: var(--type-h3-size);
  font-weight: var(--type-h3-weight);
  color: var(--text-1);
  line-height: var(--type-h3-line);
}
.shift-hero-subtitle {
  font-size: var(--type-body-size);
  color: var(--text-2);
  margin-top: 4px;
}
.shift-hero-position {
  display: flex;
  align-items: center;
  font-size: var(--type-meta-size);
  color: var(--text-3);
  margin-top: 6px;
}
.shift-hero-cta {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  margin-top: 12px;
  background: var(--brand-primary);
  color: var(--surface-0);
  border: none;
  border-radius: var(--radius-sm);
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

/* ── Empty Card ── */
.empty-card {
  background: #ffffff;
  border: 1px solid #EBEBEB;
  border-radius: 14px;
  padding: 32px 16px;
  text-align: center;
}
.empty-card-text {
  font-size: 14px;
  color: #6B7280;
  margin-top: 10px;
  font-weight: 500;
}
.empty-card-sub {
  font-size: 12px;
  color: #9CA3AF;
  margin-top: 4px;
}

/* ── Stats Strip ── */
.stats-strip {
  background: #ffffff;
  border: 1px solid #EBEBEB;
  border-radius: 14px;
  display: flex;
  align-items: center;
  padding: 16px 0;
}
.stat-cell {
  flex: 1;
  text-align: center;
}
.stat-value {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.1;
}
.stat-label {
  font-size: 11px;
  color: #9CA3AF;
  margin-top: 3px;
  font-weight: 500;
  letter-spacing: 0.02em;
}
.stat-divider {
  width: 1px;
  height: 34px;
  background: #EBEBEB;
  flex-shrink: 0;
}

/* ── Open Shifts Preview ── */
.open-shifts-list {
  background: #ffffff;
  border: 1px solid #EBEBEB;
  border-radius: 14px;
  overflow: hidden;
}
.open-shift-row {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  gap: 10px;
  cursor: pointer;
  border-bottom: 1px solid #F3F4F6;
  -webkit-tap-highlight-color: transparent;
}
.open-shift-row:last-child { border-bottom: none; }
.open-shift-bar {
  width: 3px;
  height: 30px;
  border-radius: 2px;
  background: #0277BD;
  flex-shrink: 0;
}
.open-shift-info { flex: 1; min-width: 0; }
.open-shift-dept {
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.open-shift-time {
  font-size: 12px;
  color: #6B7280;
  margin-top: 2px;
}

/* ── Additional upcoming accepted shifts (below hero) ── */
.later-shifts-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}
.later-shift-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: #ffffff;
  border: 1px solid #EBEBEB;
  border-radius: 12px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background-color 0.15s;
}
.later-shift-row:active {
  background: #FAFAFA;
}
.later-shift-date {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  background: #F4E6EA; /* brand-primary-lt */
  border-radius: 10px;
  line-height: 1;
}
.later-shift-date__month {
  font-size: 9px;
  font-weight: 700;
  color: #811429;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.later-shift-date__day {
  font-size: 18px;
  font-weight: 700;
  color: #48111C;
  margin-top: 2px;
}
.later-shift-info {
  flex: 1;
  min-width: 0;
}
.later-shift-dept {
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.later-shift-time {
  font-size: 12px;
  color: #52525B;
  margin-top: 2px;
}
.later-shift-position {
  font-size: 11px;
  color: #6B7280;
  margin-top: 2px;
  display: inline-flex;
  align-items: center;
}

/* ── Active Shift Tasks ── */
.active-tasks-card {
  background: #ffffff;
  border: 1px solid #EBEBEB;
  border-radius: 14px;
  padding: 14px;
}
.active-tasks-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}
.active-tasks-title {
  font-size: 14px;
  font-weight: 700;
  color: #1A1A1A;
  line-height: 1.25;
}
.active-tasks-count {
  flex-shrink: 0;
  color: #811429;
  background: #F4E6EA;
  border-radius: 999px;
  padding: 4px 9px;
  font-size: 12px;
  font-weight: 700;
}
.active-tasks-progress {
  margin-bottom: 10px;
}
.active-tasks-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.active-task-row {
  width: 100%;
  min-height: 48px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  border: 1px solid #F3F4F6;
  border-radius: 10px;
  background: #FAFAFA;
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.active-task-row:disabled {
  opacity: 0.7;
  cursor: wait;
}
.active-task-row--done {
  background: #F0FDF4;
  border-color: #BBF7D0;
}
.active-task-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.active-task-title {
  color: #27272A;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
}
.active-task-row--done .active-task-title {
  color: #6B7280;
  text-decoration: line-through;
}
.active-task-description {
  color: #6B7280;
  font-size: 12px;
  line-height: 1.3;
}
.active-tasks-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: #B91C1C;
  font-size: 13px;
}

/* ── Pending Requests ── */
.requests-list {
  background: #ffffff;
  border: 1px solid #EBEBEB;
  border-radius: 14px;
  overflow: hidden;
}
.request-row {
  display: flex;
  align-items: center;
  padding: 11px 14px;
  gap: 8px;
  border-bottom: 1px solid #F3F4F6;
}
.request-row:last-child { border-bottom: none; }
.request-icon { flex-shrink: 0; }
.request-info { flex: 1; min-width: 0; }
.request-label {
  font-size: 13px;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

/* ── Error ── */
.error-card {
  background: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: 14px;
  padding: 14px 16px;
  color: #DC2626;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
}
.error-retry {
  background: none;
  border: none;
  color: #80162B;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
}
</style>
