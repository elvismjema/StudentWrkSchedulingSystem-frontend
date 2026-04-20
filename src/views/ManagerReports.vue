<template>
  <div class="manager-reports pa-6">
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">Reports</h1>
        <p class="text-medium-emphasis mt-1">Operational and staffing insights</p>
      </div>
    </div>

    <!-- Date range filter -->
    <v-card elevation="0" class="mb-5 pa-4" rounded="lg">
      <v-row dense align="center">
        <v-col cols="12" sm="4" md="3">
          <v-text-field
            v-model="startDate"
            label="Start Date"
            type="date"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>
        <v-col cols="12" sm="4" md="3">
          <v-text-field
            v-model="endDate"
            label="End Date"
            type="date"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>
        <v-col cols="12" sm="4" md="3">
          <v-btn color="primary" variant="flat" @click="loadAll" :loading="loading">
            Generate Reports
          </v-btn>
        </v-col>
      </v-row>
    </v-card>

    <!-- Loading -->
    <div v-if="loading && !hasData">
      <v-skeleton-loader v-for="n in 3" :key="n" type="card" class="mb-4" />
    </div>

    <!-- Error -->
    <v-alert v-if="error" type="error" variant="tonal" closable class="mb-4" @click:close="error = null">
      {{ error }}
    </v-alert>

    <!-- Shift Coverage -->
    <v-card v-if="coverage" elevation="0" class="mb-5 pa-5" rounded="lg">
      <h2 class="text-h6 font-weight-medium mb-3">Shift Coverage</h2>
      <v-row dense>
        <v-col cols="6" sm="3">
          <div class="text-h4 font-weight-bold text-primary">{{ coverage.summary.coverageRate }}%</div>
          <div class="text-caption text-medium-emphasis">Coverage Rate</div>
        </v-col>
        <v-col cols="6" sm="3">
          <div class="text-h4 font-weight-bold">{{ coverage.summary.total }}</div>
          <div class="text-caption text-medium-emphasis">Total Shifts</div>
        </v-col>
        <v-col cols="6" sm="3">
          <div class="text-h4 font-weight-bold text-success">{{ coverage.summary.filled }}</div>
          <div class="text-caption text-medium-emphasis">Filled</div>
        </v-col>
        <v-col cols="6" sm="3">
          <div class="text-h4 font-weight-bold text-error">{{ coverage.summary.unfilled }}</div>
          <div class="text-caption text-medium-emphasis">Unfilled</div>
        </v-col>
      </v-row>

      <v-divider class="my-4" />
      <h3 class="text-subtitle-2 font-weight-medium mb-2">By Department</h3>
      <v-table density="compact">
        <thead>
          <tr>
            <th>Department</th>
            <th class="text-right">Total</th>
            <th class="text-right">Filled</th>
            <th class="text-right">Unfilled</th>
            <th class="text-right">Rate</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(data, dept) in coverage.byDepartment" :key="dept">
            <td>{{ dept }}</td>
            <td class="text-right">{{ data.total }}</td>
            <td class="text-right">{{ data.filled }}</td>
            <td class="text-right">{{ data.unfilled }}</td>
            <td class="text-right">{{ data.total ? ((data.filled / data.total) * 100).toFixed(0) : 0 }}%</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- Hours Worked -->
    <v-card v-if="hours" elevation="0" class="mb-5 pa-5" rounded="lg">
      <h2 class="text-h6 font-weight-medium mb-3">Hours Worked</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">{{ hours.totalRecords }} clock records in period</p>

      <v-table v-if="hours.workers.length" density="compact">
        <thead>
          <tr>
            <th>Worker</th>
            <th class="text-right">Shifts</th>
            <th class="text-right">Total Hours</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="w in hours.workers" :key="w.userId">
            <td>{{ w.name || w.email }}</td>
            <td class="text-right">{{ w.shiftCount }}</td>
            <td class="text-right">{{ w.totalHours }}h</td>
          </tr>
        </tbody>
      </v-table>
      <p v-else class="text-body-2 text-medium-emphasis">No completed clock records in this period.</p>
    </v-card>

    <!-- Attendance -->
    <v-card v-if="attendance" elevation="0" class="mb-5 pa-5" rounded="lg">
      <h2 class="text-h6 font-weight-medium mb-3">Attendance / Discrepancies</h2>
      <v-row dense class="mb-3">
        <v-col cols="4">
          <div class="text-h5 font-weight-bold">{{ attendance.summary.total }}</div>
          <div class="text-caption text-medium-emphasis">Total Issues</div>
        </v-col>
        <v-col cols="4">
          <div class="text-h5 font-weight-bold text-success">{{ attendance.summary.resolved }}</div>
          <div class="text-caption text-medium-emphasis">Resolved</div>
        </v-col>
        <v-col cols="4">
          <div class="text-h5 font-weight-bold text-warning">{{ attendance.summary.unresolved }}</div>
          <div class="text-caption text-medium-emphasis">Unresolved</div>
        </v-col>
      </v-row>

      <div v-if="Object.keys(attendance.byType).length" class="mb-3">
        <h3 class="text-subtitle-2 font-weight-medium mb-2">By Type</h3>
        <v-chip v-for="(count, type) in attendance.byType" :key="type" class="mr-2 mb-1" size="small" label>
          {{ type }}: {{ count }}
        </v-chip>
      </div>

      <div v-if="attendance.topUsers.length">
        <h3 class="text-subtitle-2 font-weight-medium mb-2">Most Frequent</h3>
        <v-table density="compact">
          <thead>
            <tr>
              <th>Worker</th>
              <th class="text-right">Issues</th>
              <th class="text-right">Total Variance (min)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in attendance.topUsers" :key="u.userId">
              <td>{{ u.name }}</td>
              <td class="text-right">{{ u.count }}</td>
              <td class="text-right">{{ u.totalVarianceMinutes }}</td>
            </tr>
          </tbody>
        </v-table>
      </div>
    </v-card>

    <!-- Time Off -->
    <v-card v-if="timeOff" elevation="0" class="mb-5 pa-5" rounded="lg">
      <h2 class="text-h6 font-weight-medium mb-3">Time-Off Requests</h2>
      <v-row dense class="mb-3">
        <v-col cols="6" sm="3">
          <div class="text-h5 font-weight-bold">{{ timeOff.summary.total }}</div>
          <div class="text-caption text-medium-emphasis">Total</div>
        </v-col>
        <v-col cols="6" sm="3">
          <div class="text-h5 font-weight-bold text-warning">{{ timeOff.summary.pending || 0 }}</div>
          <div class="text-caption text-medium-emphasis">Pending</div>
        </v-col>
        <v-col cols="6" sm="3">
          <div class="text-h5 font-weight-bold text-success">{{ timeOff.summary.approved || 0 }}</div>
          <div class="text-caption text-medium-emphasis">Approved</div>
        </v-col>
        <v-col cols="6" sm="3">
          <div class="text-h5 font-weight-bold text-error">{{ timeOff.summary.rejected || 0 }}</div>
          <div class="text-caption text-medium-emphasis">Rejected</div>
        </v-col>
      </v-row>

      <v-table v-if="timeOff.recent.length" density="compact">
        <thead>
          <tr>
            <th>Worker</th>
            <th>Type</th>
            <th>Dates</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in timeOff.recent" :key="r.id">
            <td>{{ r.user }}</td>
            <td>{{ r.type }}</td>
            <td>{{ r.startDate }} — {{ r.endDate }}</td>
            <td>
              <v-chip :color="statusColor(r.status)" size="x-small" label>{{ r.status }}</v-chip>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- Task Completion -->
    <v-card v-if="tasks" elevation="0" class="mb-5 pa-5" rounded="lg">
      <h2 class="text-h6 font-weight-medium mb-3">Task Completion</h2>
      <v-row dense>
        <v-col cols="6" sm="3">
          <div class="text-h4 font-weight-bold text-primary">{{ tasks.summary.completionRate }}%</div>
          <div class="text-caption text-medium-emphasis">Completion Rate</div>
        </v-col>
        <v-col cols="6" sm="3">
          <div class="text-h5 font-weight-bold">{{ tasks.summary.total }}</div>
          <div class="text-caption text-medium-emphasis">Total Tasks</div>
        </v-col>
        <v-col cols="6" sm="3">
          <div class="text-h5 font-weight-bold text-success">{{ tasks.summary.completed || 0 }}</div>
          <div class="text-caption text-medium-emphasis">Completed</div>
        </v-col>
        <v-col cols="6" sm="3">
          <div class="text-h5 font-weight-bold text-blue">{{ tasks.summary.in_progress || 0 }}</div>
          <div class="text-caption text-medium-emphasis">In Progress</div>
        </v-col>
      </v-row>
    </v-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import reportService from "../services/reportService.js";

const now = new Date();
const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

const startDate = ref(firstOfMonth.toISOString().slice(0, 10));
const endDate = ref(now.toISOString().slice(0, 10));
const loading = ref(false);
const error = ref(null);

const coverage = ref(null);
const hours = ref(null);
const attendance = ref(null);
const timeOff = ref(null);
const tasks = ref(null);

const hasData = computed(() => coverage.value || hours.value || attendance.value || timeOff.value || tasks.value);

function statusColor(s) {
  const m = { pending: "warning", approved: "success", rejected: "error", cancelled: "grey" };
  return m[s] || "grey";
}

async function loadAll() {
  loading.value = true;
  error.value = null;
  const params = { start_date: startDate.value, end_date: endDate.value };

  try {
    const [cov, hrs, att, to, tk] = await Promise.allSettled([
      reportService.getShiftCoverage(params),
      reportService.getHoursWorked(params),
      reportService.getAttendance(params),
      reportService.getTimeOff(params),
      reportService.getTaskCompletion(),
    ]);

    coverage.value = cov.status === "fulfilled" ? cov.value.data : null;
    hours.value = hrs.status === "fulfilled" ? hrs.value.data : null;
    attendance.value = att.status === "fulfilled" ? att.value.data : null;
    timeOff.value = to.status === "fulfilled" ? to.value.data : null;
    tasks.value = tk.status === "fulfilled" ? tk.value.data : null;

    const failedCount = [cov, hrs, att, to, tk].filter((r) => r.status === "rejected").length;
    if (failedCount === 5) error.value = "Failed to load all reports. Check that the backend is running.";
    else if (failedCount > 0) error.value = `${failedCount} report(s) failed to load.`;
  } catch (e) {
    error.value = e.message || "Failed to generate reports";
  } finally {
    loading.value = false;
  }
}

onMounted(loadAll);
</script>

<style scoped>
.manager-reports {
  max-width: 960px;
  margin: 0 auto;
}
</style>
