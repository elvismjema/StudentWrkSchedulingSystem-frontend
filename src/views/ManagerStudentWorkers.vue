<template>
  <div class="student-workers-page">
    <!-- Header Section -->
    <div class="page-header">
      <div class="header-text">
        <h1 class="page-title">Student Workers</h1>
        <p class="page-subtitle">{{ workers.length }} student workers</p>
      </div>
      <div class="header-actions">
        <v-btn color="#8B1538" prepend-icon="mdi-account-plus" @click="openAddWorkerDialog">
          Add Worker
        </v-btn>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="search-section">
      <v-text-field
        v-model="searchQuery"
        label="Search workers..."
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        hide-details
        clearable
        class="search-input"
      />
    </div>

    <!-- Error Alert -->
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <v-progress-circular indeterminate color="#8B1538" size="40" />
      <p class="loading-text">Loading workers...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredWorkers.length === 0" class="empty-state">
      <v-icon size="48" color="#667085">mdi-account-group-outline</v-icon>
      <h3 class="empty-title">No workers in your department yet</h3>
      <p class="empty-subtitle">Start by adding student workers to your department</p>
      <v-btn color="#8B1538" variant="outlined" @click="openAddWorkerDialog">
        <v-icon start>mdi-account-plus</v-icon>
        Add Your First Worker
      </v-btn>
    </div>

    <!-- Worker Cards Grid -->
    <div v-else class="workers-grid">
      <v-card
        v-for="worker in filteredWorkers"
        :key="worker.userId || worker.id"
        class="worker-card"
        elevation="0"
        @click="openWorkerModal(worker)"
      >
        <v-card-text class="worker-card-content">
          <!-- Worker Avatar and Info -->
          <div class="worker-header">
            <v-avatar class="worker-avatar" color="#8B1538" size="48">
              <span class="avatar-text">{{ getWorkerInitials(worker) }}</span>
            </v-avatar>
            <div class="worker-info">
              <h3 class="worker-name">
                {{ `${worker.fName || ''} ${worker.lName || ''}`.trim() || 'Unknown Worker' }}
              </h3>
              <v-chip size="small" color="#8B1538" variant="outlined" class="position-chip">
                {{ getPositionName(worker) }}
              </v-chip>
            </div>
          </div>

          <!-- Availability Summary -->
          <div class="availability-section">
            <h4 class="availability-title">Weekly Availability</h4>
            <div class="availability-grid">
              <div
                v-for="day in weekDays"
                :key="day.key"
                class="availability-day"
              >
                <div class="day-label">{{ day.label }}</div>
                <div class="day-time">
                  {{ getAvailabilityForDay(worker, day.key) }}
                </div>
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <!-- Worker Detail Modal -->
    <v-dialog v-model="workerModal.open" max-width="800px" scrollable>
      <v-card v-if="workerModal.selectedWorker">
        <v-card-title class="modal-header">
          <div class="modal-worker-info">
            <v-avatar class="modal-avatar" color="#8B1538" size="56">
              <span class="avatar-text">{{ getWorkerInitials(workerModal.selectedWorker) }}</span>
            </v-avatar>
            <div>
              <h2 class="modal-worker-name">
                {{ `${workerModal.selectedWorker.fName || ''} ${workerModal.selectedWorker.lName || ''}`.trim() }}
              </h2>
              <p class="modal-worker-email">{{ workerModal.selectedWorker.email || 'No email' }}</p>
            </div>
          </div>
        </v-card-title>

        <v-card-text class="modal-content">
          <v-tabs v-model="activeTab" class="modal-tabs">
            <v-tab value="details">Worker Details</v-tab>
            <v-tab value="schedule">Class Schedule</v-tab>
          </v-tabs>

          <v-window v-model="activeTab" class="modal-window">
            <!-- Worker Details Tab -->
            <v-window-item value="details">
              <div class="details-section">
                <div class="detail-row">
                  <span class="detail-label">Position:</span>
                  <v-chip color="#8B1538" variant="outlined">
                    {{ getPositionName(workerModal.selectedWorker) }}
                  </v-chip>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Email:</span>
                  <span class="detail-value">{{ workerModal.selectedWorker.email || 'No email' }}</span>
                </div>
                
                <!-- Availability in Modal -->
                <div class="modal-availability">
                  <h4 class="section-title">Weekly Availability</h4>
                  <div class="availability-grid">
                    <div
                      v-for="day in weekDays"
                      :key="day.key"
                      class="availability-day"
                    >
                      <div class="day-label">{{ day.label }}</div>
                      <div class="day-time">
                        {{ getAvailabilityForDay(workerModal.selectedWorker, day.key) }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </v-window-item>

            <!-- Class Schedule Tab -->
            <v-window-item value="schedule">
              <div class="schedule-section">
                <div class="schedule-header">
                  <h4 class="section-title">Class Schedule</h4>
                  <v-btn
                    color="#8B1538"
                    variant="outlined"
                    :loading="loadingSchedule"
                    @click="loadClassSchedule"
                  >
                    <v-icon start>mdi-refresh</v-icon>
                    Refresh Schedule
                  </v-btn>
                </div>

                <!-- Loading Schedule -->
                <div v-if="loadingSchedule" class="schedule-loading">
                  <v-progress-circular indeterminate color="#8B1538" size="32" />
                  <p>Loading class schedule...</p>
                </div>

                <!-- Schedule Error -->
                <v-alert v-else-if="scheduleError" type="info" variant="tonal" class="mb-4">
                  {{ scheduleError }}
                </v-alert>

                <!-- No Schedule Data -->
                <div v-else-if="!classSchedule || classSchedule.length === 0" class="no-schedule">
                  <v-icon size="32" color="#667085">mdi-calendar-blank-outline</v-icon>
                  <p>No class schedule found</p>
                </div>

                <!-- Schedule List -->
                <div v-else class="schedule-list">
                  <v-card
                    v-for="course in classSchedule"
                    :key="course.CourseID"
                    class="course-card"
                    elevation="0"
                  >
                    <v-card-text>
                      <h5 class="course-name">{{ course.CourseName }}</h5>
                      <div class="course-details">
                        <div class="course-id">{{ course.CourseID }}</div>
                        <div class="course-instructors">
                          <span v-for="instructor in getCourseInstructors(course)" :key="instructor.Email || instructor.Name" class="instructor">
                            {{ instructor.Name }}
                          </span>
                        </div>
                      </div>
                      <div class="meeting-times">
                        <div
                          v-for="meeting in getCourseMeetings(course)"
                          :key="`${meeting.days.join('-')}-${meeting.start_time}`"
                          class="meeting-time"
                        >
                          <v-chip size="small" color="#8B1538" variant="outlined">
                            {{ formatMeetingDays(meeting.days) }}
                          </v-chip>
                          <span class="time-range">
                            {{ formatTime(meeting.start_time) }} – {{ formatTime(meeting.end_time) }}
                          </span>
                        </div>
                      </div>
                    </v-card-text>
                  </v-card>
                </div>
              </div>
            </v-window-item>
          </v-window>
        </v-card-text>

        <v-card-actions class="modal-actions">
          <v-btn variant="text" @click="closeWorkerModal">Close</v-btn>
          <v-btn
            color="#8B1538"
            :loading="loadingSchedule"
            @click="loadClassSchedule"
          >
            <v-icon start>mdi-calendar-search</v-icon>
            View Schedule
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add Worker Dialog (Placeholder for now) -->
    <v-dialog v-model="addWorkerDialog.open" max-width="600px">
      <v-card>
        <v-card-title>Add Worker to Department</v-card-title>
        <v-card-text>
          <p class="text-body-2 mb-4">
            This will open the user management interface to add a new student worker to your department.
          </p>
          <p class="text-caption text-grey">
            Feature: Redirect to user invitation/assignment flow (similar to admin functionality)
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="addWorkerDialog.open = false">Cancel</v-btn>
          <v-btn color="#8B1538" @click="navigateToUserManagement">
            Continue to User Management
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '../services/services.js';
import studentScheduleService from '../services/studentScheduleService.js';
import Utils from '../config/utils.js';

const router = useRouter();

// State
const loading = ref(false);
const error = ref('');
const searchQuery = ref('');
const workers = ref([]);
const workerAvailability = ref({}); // availability data keyed by worker ID
const classSchedule = ref([]);
const loadingSchedule = ref(false);
const scheduleError = ref('');
const activeTab = ref('details');

// Department context
const currentUser = Utils.getStore('user') || {};
const deptContext = Utils.getStore('currentDepartmentContext') || {};

// Modal state
const workerModal = reactive({
  open: false,
  selectedWorker: null,
});

const addWorkerDialog = reactive({
  open: false,
});

// Week days for availability display
const weekDays = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
];

// Computed properties
const filteredWorkers = computed(() => {
  if (!searchQuery.value) return workers.value;
  
  const query = searchQuery.value.toLowerCase();
  return workers.value.filter(worker => {
    const fullName = `${worker.fName || ''} ${worker.lName || ''}`.toLowerCase();
    const email = (worker.email || '').toLowerCase();
    return fullName.includes(query) || email.includes(query);
  });
});

// Methods
const getWorkerInitials = (worker) => {
  const first = (worker.fName || '').charAt(0).toUpperCase();
  const last = (worker.lName || '').charAt(0).toUpperCase();
  return first && last ? `${first}${last}` : first || 'U';
};

const getPositionName = (worker) => {
  return worker.position?.position_name || worker.positionName || 'Not assigned';
};

const getAvailabilityForDay = (worker, dayKey) => {
  const availability = workerAvailability.value[worker.userId || worker.id];
  if (!availability || !availability[dayKey]) {
    return '—';
  }
  
  const dayAvailability = availability[dayKey];
  if (dayAvailability.available && dayAvailability.startTime && dayAvailability.endTime) {
    return `${formatTime(dayAvailability.startTime)} – ${formatTime(dayAvailability.endTime)}`;
  }
  
  return 'Not set';
};

const formatTime = (timeString) => {
  if (!timeString) return '';
  
  // Handle various time formats
  const time = timeString.includes(':') ? timeString : `${timeString.slice(0, 2)}:${timeString.slice(2)}`;
  
  try {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const minute = parseInt(minutes);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  } catch (error) {
    return timeString;
  }
};

const formatMeetingDays = (days) => {
  const dayMap = {
    'M': 'Mon',
    'T': 'Tue', 
    'W': 'Wed',
    'TH': 'Thu',
    'F': 'Fri',
    'S': 'Sat',
    'SU': 'Sun'
  };
  
  return days.map(day => dayMap[day] || day).join(', ');
};

const getCourseInstructors = (course) => {
  return Array.isArray(course?.Instructors) ? course.Instructors : [];
};

const getCourseMeetings = (course) => {
  return Array.isArray(course?.meeting_times) ? course.meeting_times : [];
};

const openWorkerModal = (worker) => {
  workerModal.selectedWorker = worker;
  workerModal.open = true;
  activeTab.value = 'details';
  classSchedule.value = [];
  scheduleError.value = '';
};

const closeWorkerModal = () => {
  workerModal.open = false;
  workerModal.selectedWorker = null;
  classSchedule.value = [];
  scheduleError.value = '';
};

const openAddWorkerDialog = () => {
  addWorkerDialog.open = true;
};

const navigateToUserManagement = () => {
  // Navigate to admin user management with query params for manager context
  router.push({
    path: '/manager/admin/users',
    query: { 
      mode: 'add',
      departmentId: deptContext.department_id 
    }
  });
};

const loadWorkers = async () => {
  if (!deptContext.department_id) {
    error.value = 'No department context found. Please select a department.';
    return;
  }

  loading.value = true;
  error.value = '';
  
  try {
    // Get department workers
    const response = await apiClient.get(`/user-departments?departmentId=${deptContext.department_id}&status=approved`);
    const assignments = response?.data?.data || response?.data || [];
    
    // Filter for student workers only and map user data
    workers.value = assignments
      .filter((assignment) => {
        const roleName = String(assignment?.role?.role_name || assignment?.role_name || '').toLowerCase();
        const permissionLevel = Number(assignment?.role?.permission_level || 0);
        return roleName.includes('student') || permissionLevel < 50;
      })
      .map((assignment) => assignment.user || assignment)
      .filter((worker) => worker && (worker.userId || worker.id));

    // Load availability for each worker
    await loadWorkersAvailability();
    
  } catch (err) {
    error.value = err?.response?.data?.message || 'Failed to load workers.';
    console.error('Error loading workers:', err);
  } finally {
    loading.value = false;
  }
};

const loadWorkersAvailability = async () => {
  const availabilityPromises = workers.value.map(async (worker) => {
    try {
      const response = await apiClient.get(`/availabilities/user/${worker.userId || worker.id}`);
      const availabilityData = response?.data?.data || response?.data || [];
      
      // Convert availability array to object keyed by day
      const availabilityMap = {};
      availabilityData.forEach((availability) => {
        if (availability.day_of_week) {
          availabilityMap[availability.day_of_week.toLowerCase()] = {
            available: availability.is_available,
            startTime: availability.start_time,
            endTime: availability.end_time,
          };
        }
      });
      
      workerAvailability.value[worker.userId || worker.id] = availabilityMap;
    } catch (err) {
      console.warn(`No availability data for worker ${worker.userId || worker.id}:`, err);
      // Set empty availability for this worker
      workerAvailability.value[worker.userId || worker.id] = {};
    }
  });

  await Promise.allSettled(availabilityPromises);
};

const loadClassSchedule = async () => {
  if (!workerModal.selectedWorker) return;

  loadingSchedule.value = true;
  scheduleError.value = '';

  try {
    const workerEmail = workerModal.selectedWorker.email;
    if (!workerEmail) {
      scheduleError.value = 'Worker email not found. Cannot fetch class schedule.';
      return;
    }

    const scheduleData = await studentScheduleService.getStudentSchedule(workerEmail);
    
    if (scheduleData && scheduleData.Courses && Array.isArray(scheduleData.Courses)) {
      classSchedule.value = scheduleData.Courses.map((course) =>
        studentScheduleService.formatCourseData(course)
      );
    } else {
      classSchedule.value = [];
      scheduleError.value = 'No class schedule data available.';
    }
    
  } catch (err) {
    console.error('Error loading class schedule:', err);
    scheduleError.value = 'Failed to load class schedule. Please try again later.';
    classSchedule.value = [];
  } finally {
    loadingSchedule.value = false;
  }
};

// Lifecycle
onMounted(() => {
  loadWorkers();
});

watch(activeTab, (nextTab) => {
  if (
    nextTab === 'schedule' &&
    !loadingSchedule.value &&
    !scheduleError.value &&
    classSchedule.value.length === 0
  ) {
    loadClassSchedule();
  }
});
</script>

<style scoped>
.student-workers-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.header-text {
  flex: 1;
}

.page-title {
  margin: 0;
  font-size: 40px;
  font-weight: 700;
  color: #101828;
  line-height: 1.1;
}

.page-subtitle {
  margin: 4px 0 0;
  color: #667085;
  font-size: 16px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.search-section {
  margin-bottom: 24px;
}

.search-input {
  max-width: 400px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.loading-text {
  margin-top: 16px;
  color: #667085;
  font-size: 16px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-title {
  margin: 16px 0 8px;
  font-size: 20px;
  font-weight: 600;
  color: #101828;
}

.empty-subtitle {
  margin: 0 0 24px;
  color: #667085;
  font-size: 16px;
}

.workers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

.worker-card {
  border: 1px solid #e3e5e8;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.worker-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.worker-card-content {
  padding: 20px;
}

.worker-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.worker-avatar {
  flex-shrink: 0;
}

.avatar-text {
  font-weight: 600;
  font-size: 18px;
}

.worker-info {
  flex: 1;
  min-width: 0;
}

.worker-name {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: #101828;
  line-height: 1.2;
}

.position-chip {
  font-size: 12px;
}

.availability-section {
  margin-top: 16px;
}

.availability-title {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: #667085;
}

.availability-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(60px, 1fr));
  gap: 8px;
}

.availability-day {
  text-align: center;
  padding: 8px 4px;
  border-radius: 6px;
  background: #f9fafb;
}

.day-label {
  font-size: 11px;
  font-weight: 600;
  color: #667085;
  margin-bottom: 2px;
}

.day-time {
  font-size: 10px;
  color: #1f2937;
  line-height: 1.1;
}

/* Modal Styles */
.modal-header {
  padding: 24px 24px 0;
}

.modal-worker-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.modal-avatar {
  flex-shrink: 0;
}

.modal-worker-name {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #101828;
}

.modal-worker-email {
  margin: 4px 0 0;
  color: #667085;
  font-size: 14px;
}

.modal-content {
  padding: 24px;
}

.modal-tabs {
  margin-bottom: 20px;
}

.modal-window {
  min-height: 300px;
}

.details-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-label {
  font-weight: 600;
  color: #374151;
  min-width: 80px;
}

.detail-value {
  color: #1f2937;
}

.modal-availability {
  border-top: 1px solid #e3e5e8;
  padding-top: 20px;
}

.section-title {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: #101828;
}

.schedule-section {
  min-height: 300px;
}

.schedule-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.schedule-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
  color: #667085;
}

.no-schedule {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
  color: #667085;
}

.schedule-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.course-card {
  border: 1px solid #e3e5e8;
  border-radius: 8px;
}

.course-name {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: #101828;
}

.course-details {
  margin-bottom: 12px;
}

.course-id {
  font-size: 12px;
  color: #667085;
  margin-bottom: 4px;
}

.course-instructors {
  font-size: 13px;
  color: #374151;
}

.instructor {
  display: block;
}

.meeting-times {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.meeting-time {
  display: flex;
  align-items: center;
  gap: 8px;
}

.time-range {
  font-size: 13px;
  color: #374151;
}

.modal-actions {
  padding: 16px 24px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

/* Responsive Design */
@media (max-width: 768px) {
  .student-workers-page {
    padding: 16px;
  }

  .page-title {
    font-size: 32px;
  }

  .workers-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .availability-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .modal-worker-info {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }

  .schedule-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .availability-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
