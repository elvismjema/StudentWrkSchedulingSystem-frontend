<template>
  <v-container fluid class="pa-4">
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-icon size="28" class="mr-3" color="primary">mdi-account-check</v-icon>
      <div>
        <h1 class="text-h4 font-weight-bold">Student Qualifications</h1>
        <p class="text-subtitle-1 text-medium-emphasis">View and manage student qualifications</p>
      </div>
    </div>

    <!-- Access Denied Message -->
    <v-alert
      v-if="accessDenied"
      type="error"
      prominent
      class="mb-4"
    >
      <v-alert-title>Access Denied</v-alert-title>
      You don't have permission to view student qualifications. This feature requires manager access.
    </v-alert>

    <div v-else>
      <!-- Search and Filter Section -->
      <v-card class="mb-4" elevation="2">
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="searchQuery"
                label="Search by name or email"
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                density="compact"
                clearable
                hide-details
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="4">
              <v-select
                v-model="selectedQualification"
                :items="qualifications"
                item-title="qualification_name"
                item-value="qualification_id"
                label="Filter by Qualification"
                variant="outlined"
                density="compact"
                clearable
                hide-details
                :loading="qualificationsLoading"
              ></v-select>
            </v-col>
            <v-col cols="12" md="2">
              <v-btn
                @click="loadStudents"
                color="primary"
                variant="elevated"
                block
                height="40"
                :loading="studentsLoading"
              >
                <v-icon left>mdi-refresh</v-icon>
                Refresh
              </v-btn>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <v-row>
        <!-- Students List Panel -->
        <v-col cols="12" lg="6">
          <v-card elevation="2" class="h-100">
            <v-card-title class="d-flex align-center">
              <v-icon class="mr-2">mdi-account-group</v-icon>
              Students
              <v-spacer></v-spacer>
              <v-chip
                v-if="filteredStudents.length > 0"
                color="primary"
                size="small"
              >
                {{ filteredStudents.length }} students
              </v-chip>
            </v-card-title>
            
            <v-divider></v-divider>

            <!-- Students List -->
            <v-card-text class="pa-0" style="max-height: 600px; overflow-y: auto;">
              <v-list>
                <v-list-item
                  v-for="student in filteredStudents"
                  :key="student.user_id"
                  @click="selectStudent(student)"
                  :active="selectedStudent?.user_id === student.user_id"
                  class="student-item"
                >
                  <template v-slot:prepend>
                    <v-avatar size="40" color="primary" class="mr-3">
                      <span class="text-white font-weight-medium">
                        {{ getInitials(student.first_name, student.last_name) }}
                      </span>
                    </v-avatar>
                  </template>
                  
                  <v-list-item-title class="font-weight-medium">
                    {{ student.first_name }} {{ student.last_name }}
                  </v-list-item-title>
                  
                  <v-list-item-subtitle class="text-caption">
                    {{ student.email }}
                  </v-list-item-subtitle>
                  
                  <template v-slot:append>
                    <div class="text-right">
                      <div class="text-caption text-medium-emphasis">
                        {{ student.qualifications?.length || 0 }} qualifications
                      </div>
                      <div v-if="student.qualifications?.length > 0" class="text-caption">
                        {{ getQualificationsSummary(student.qualifications) }}
                      </div>
                    </div>
                  </template>
                </v-list-item>
              </v-list>

              <!-- Empty State -->
              <div v-if="!studentsLoading && filteredStudents.length === 0" class="text-center pa-8">
                <v-icon size="64" color="grey-lighten-2">mdi-account-search</v-icon>
                <div class="text-h6 mt-2 text-medium-emphasis">No students found</div>
                <div class="text-body-2 text-medium-emphasis">
                  Try adjusting your search or filter criteria
                </div>
              </div>

              <!-- Loading State -->
              <div v-if="studentsLoading" class="text-center pa-8">
                <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
                <div class="text-body-2 mt-2 text-medium-emphasis">Loading students...</div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Student Details Panel -->
        <v-col cols="12" lg="6">
          <v-card elevation="2" class="h-100">
            <v-card-title class="d-flex align-center">
              <v-icon class="mr-2">mdi-account-details</v-icon>
              Qualification Details
              <v-spacer></v-spacer>
              <v-btn
                v-if="selectedStudent"
                @click="refreshStudentQualifications"
                icon="mdi-refresh"
                size="small"
                variant="text"
                :loading="studentQualificationsLoading"
              ></v-btn>
            </v-card-title>
            
            <v-divider></v-divider>

            <v-card-text v-if="selectedStudent">
              <!-- Student Info -->
              <div class="mb-4">
                <div class="d-flex align-center mb-2">
                  <v-avatar size="48" color="primary" class="mr-3">
                    <span class="text-white font-weight-medium text-h6">
                      {{ getInitials(selectedStudent.first_name, selectedStudent.last_name) }}
                    </span>
                  </v-avatar>
                  <div>
                    <div class="text-h6 font-weight-medium">
                      {{ selectedStudent.first_name }} {{ selectedStudent.last_name }}
                    </div>
                    <div class="text-body-2 text-medium-emphasis">
                      {{ selectedStudent.email }}
                    </div>
                  </div>
                </div>
              </div>

              <v-divider class="mb-4"></v-divider>

              <!-- Qualifications List -->
              <div v-if="!studentQualificationsLoading">
                <div v-if="studentQualifications.length > 0">
                  <div class="text-subtitle-2 font-weight-medium mb-3">
                    Qualifications ({{ studentQualifications.length }})
                  </div>
                  
                  <v-card
                    v-for="qual in studentQualifications"
                    :key="qual.user_qualification_id"
                    variant="outlined"
                    class="mb-3"
                  >
                    <v-card-text class="pa-4">
                      <div class="d-flex align-start justify-space-between">
                        <div class="flex-grow-1">
                          <div class="d-flex align-center mb-2">
                            <div class="font-weight-medium">{{ qual.qualification_name }}</div>
                            <v-chip
                              :color="getStatusColor(qual.approval_status)"
                              size="x-small"
                              class="ml-2"
                            >
                              {{ qual.approval_status }}
                            </v-chip>
                          </div>
                          
                          <div v-if="qual.description" class="text-body-2 text-medium-emphasis mb-2">
                            {{ qual.description }}
                          </div>
                          
                          <div class="d-flex flex-wrap gap-2">
                            <v-chip
                              v-if="qual.requires_document"
                              size="x-small"
                              color="info"
                              variant="outlined"
                            >
                              <v-icon start size="x-small">mdi-file-document</v-icon>
                              Document Required
                            </v-chip>
                            
                            <v-chip
                              v-if="qual.document_name"
                              size="x-small"
                              color="success"
                              variant="outlined"
                            >
                              <v-icon start size="x-small">mdi-check-circle</v-icon>
                              {{ qual.document_name }}
                            </v-chip>
                            
                            <v-chip
                              v-if="qual.approved_at"
                              size="x-small"
                              color="grey"
                              variant="outlined"
                            >
                              <v-icon start size="x-small">mdi-calendar-check</v-icon>
                              {{ formatDate(qual.approved_at) }}
                            </v-chip>
                          </div>
                        </div>

                        <div
                          v-if="qual.approval_status?.toLowerCase() === 'pending'"
                          class="ml-4 d-flex flex-column gap-2"
                        >
                          <v-btn
                            color="success"
                            size="small"
                            variant="elevated"
                            :loading="reviewingQualificationId === qual.user_qualification_id && reviewAction === 'approved'"
                            @click="approveQualification(qual)"
                          >
                            Approve
                          </v-btn>
                          <v-btn
                            color="error"
                            size="small"
                            variant="outlined"
                            :loading="reviewingQualificationId === qual.user_qualification_id && reviewAction === 'rejected'"
                            @click="openRejectDialog(qual)"
                          >
                            Reject
                          </v-btn>
                        </div>
                      </div>

                      <div
                        v-if="qual.approval_status?.toLowerCase() === 'rejected' && qual.rejection_reason"
                        class="text-body-2 text-error mt-3"
                      >
                        Rejection reason: {{ qual.rejection_reason }}
                      </div>
                    </v-card-text>
                  </v-card>
                </div>
                
                <!-- No Qualifications State -->
                <div v-else class="text-center pa-8">
                  <v-icon size="64" color="grey-lighten-2">mdi-certificate-off</v-icon>
                  <div class="text-h6 mt-2 text-medium-emphasis">No Qualifications</div>
                  <div class="text-body-2 text-medium-emphasis">
                    This student has no qualifications on record
                  </div>
                </div>
              </div>

              <!-- Loading State -->
              <div v-else class="text-center pa-8">
                <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
                <div class="text-body-2 mt-2 text-medium-emphasis">Loading qualifications...</div>
              </div>
            </v-card-text>

            <!-- No Student Selected -->
            <v-card-text v-else class="text-center pa-8">
              <v-icon size="64" color="grey-lighten-2">mdi-account-arrow-left</v-icon>
              <div class="text-h6 mt-2 text-medium-emphasis">Select a Student</div>
              <div class="text-body-2 text-medium-emphasis">
                Choose a student from the list to view their qualifications
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- Error Snackbar -->
    <v-snackbar
      v-model="showError"
      color="error"
      timeout="6000"
    >
      {{ errorMessage }}
      <template v-slot:actions>
        <v-btn @click="showError = false" icon="mdi-close"></v-btn>
      </template>
    </v-snackbar>

    <v-snackbar
      v-model="showSuccess"
      color="success"
      timeout="3500"
    >
      {{ successMessage }}
      <template v-slot:actions>
        <v-btn @click="showSuccess = false" icon="mdi-close"></v-btn>
      </template>
    </v-snackbar>

    <v-dialog v-model="showRejectDialog" max-width="520">
      <v-card>
        <v-card-title class="text-h6">Reject Qualification</v-card-title>
        <v-card-text>
          <div class="text-body-2 mb-3">
            Please provide a reason for rejecting
            <span class="font-weight-medium">{{ rejectingQualification?.qualification_name }}</span>.
          </div>
          <v-textarea
            v-model="rejectReason"
            label="Rejection reason"
            variant="outlined"
            rows="4"
            auto-grow
            counter="500"
            :error-messages="rejectReasonError"
          ></v-textarea>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="closeRejectDialog">Cancel</v-btn>
          <v-btn
            color="error"
            :loading="reviewingQualificationId === rejectingQualification?.user_qualification_id && reviewAction === 'rejected'"
            @click="submitReject"
          >
            Confirm Reject
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useStore } from 'vuex'
import qualificationService from '@/services/qualificationService'
import { TZ } from '@/utils/tz.js'

const store = useStore()

// State
const accessDenied = ref(false)
const students = ref([])
const qualifications = ref([])
const selectedStudent = ref(null)
const studentQualifications = ref([])
const searchQuery = ref('')
const selectedQualification = ref(null)

// Loading states
const studentsLoading = ref(false)
const studentQualificationsLoading = ref(false)
const qualificationsLoading = ref(false)
const reviewingQualificationId = ref(null)
const reviewAction = ref('')

// Error handling
const showError = ref(false)
const errorMessage = ref('')
const showSuccess = ref(false)
const successMessage = ref('')

const showRejectDialog = ref(false)
const rejectingQualification = ref(null)
const rejectReason = ref('')
const rejectReasonError = ref('')

// Computed
const currentUser = computed(() => store.getters.getLoginUserInfo)
const filteredStudents = computed(() => {
  let filtered = students.value

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(student => 
      student.first_name?.toLowerCase().includes(query) ||
      student.last_name?.toLowerCase().includes(query) ||
      student.email?.toLowerCase().includes(query)
    )
  }

  // Filter by qualification
  if (selectedQualification.value) {
    filtered = filtered.filter(student => 
      student.qualifications?.some(qual => 
        qual.qualification_id === selectedQualification.value
      )
    )
  }

  return filtered
})

// Methods
const getInitials = (firstName, lastName) => {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
}

const getQualificationsSummary = (qualifications) => {
  if (!qualifications || qualifications.length === 0) return 'None'
  const names = qualifications.map(q => q.qualification_name).slice(0, 2)
  if (qualifications.length > 2) {
    names.push(`+${qualifications.length - 2}`)
  }
  return names.join(', ')
}

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'approved': return 'success'
    case 'pending': return 'warning'
    case 'rejected': return 'error'
    default: return 'grey'
  }
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', { timeZone: TZ })
}

const loadStudents = async () => {
  try {
    studentsLoading.value = true
    const response = await qualificationService.getStudentsWithQualifications(selectedQualification.value)
    students.value = response.data || []
  } catch (error) {
    if (error.response?.status === 403) {
      accessDenied.value = true
    } else {
      showError.value = true
      errorMessage.value = 'Failed to load students. Please try again.'
      console.error('Error loading students:', error)
    }
  } finally {
    studentsLoading.value = false
  }
}

const loadQualifications = async () => {
  try {
    qualificationsLoading.value = true
    const response = await qualificationService.getAllQualifications()
    qualifications.value = response.data || []
  } catch (error) {
    console.error('Error loading qualifications:', error)
  } finally {
    qualificationsLoading.value = false
  }
}

const selectStudent = async (student) => {
  selectedStudent.value = student
  await loadStudentQualifications(student.user_id)
}

const loadStudentQualifications = async (userId) => {
  try {
    studentQualificationsLoading.value = true
    const response = await qualificationService.getStudentQualifications(userId)
    studentQualifications.value = response.data || []
  } catch (error) {
    if (error.response?.status === 404) {
      studentQualifications.value = []
    } else {
      showError.value = true
      errorMessage.value = 'Failed to load student qualifications. Please try again.'
      console.error('Error loading student qualifications:', error)
    }
  } finally {
    studentQualificationsLoading.value = false
  }
}

const refreshStudentQualifications = async () => {
  if (selectedStudent.value) {
    await loadStudentQualifications(selectedStudent.value.user_id)
  }
}

const applyQualificationReviewUpdate = (updatedQualification) => {
  if (!updatedQualification?.user_qualification_id) return

  studentQualifications.value = studentQualifications.value.map((qualification) => {
    if (qualification.user_qualification_id === updatedQualification.user_qualification_id) {
      return {
        ...qualification,
        ...updatedQualification,
      }
    }
    return qualification
  })
}

const approveQualification = async (qualification) => {
  try {
    reviewingQualificationId.value = qualification.user_qualification_id
    reviewAction.value = 'approved'

    const response = await qualificationService.reviewUserQualification(
      qualification.user_qualification_id,
      'approved'
    )

    applyQualificationReviewUpdate(response.data?.data)
    successMessage.value = 'Qualification approved successfully.'
    showSuccess.value = true
  } catch (error) {
    showError.value = true
    errorMessage.value = error.response?.data?.message || 'Failed to approve qualification. Please try again.'
    console.error('Error approving qualification:', error)
  } finally {
    reviewingQualificationId.value = null
    reviewAction.value = ''
  }
}

const openRejectDialog = (qualification) => {
  rejectingQualification.value = qualification
  rejectReason.value = ''
  rejectReasonError.value = ''
  showRejectDialog.value = true
}

const closeRejectDialog = () => {
  showRejectDialog.value = false
  rejectingQualification.value = null
  rejectReason.value = ''
  rejectReasonError.value = ''
}

const submitReject = async () => {
  const reason = rejectReason.value.trim()
  if (!reason) {
    rejectReasonError.value = 'Rejection reason is required.'
    return
  }

  try {
    reviewingQualificationId.value = rejectingQualification.value.user_qualification_id
    reviewAction.value = 'rejected'

    const response = await qualificationService.reviewUserQualification(
      rejectingQualification.value.user_qualification_id,
      'rejected',
      reason
    )

    applyQualificationReviewUpdate(response.data?.data)
    successMessage.value = 'Qualification rejected successfully.'
    showSuccess.value = true
    closeRejectDialog()
  } catch (error) {
    rejectReasonError.value = error.response?.data?.message || ''
    showError.value = true
    errorMessage.value = error.response?.data?.message || 'Failed to reject qualification. Please try again.'
    console.error('Error rejecting qualification:', error)
  } finally {
    reviewingQualificationId.value = null
    reviewAction.value = ''
  }
}

// Watchers
watch(selectedQualification, () => {
  loadStudents()
})

// Lifecycle
onMounted(async () => {
  // Check if user is manager (you may need to adjust this based on your auth structure)
  if (currentUser.value?.role !== 'manager' && currentUser.value?.role !== 'admin') {
    accessDenied.value = true
    return
  }

  await Promise.all([
    loadStudents(),
    loadQualifications()
  ])
})
</script>

<style scoped>
.student-item:hover {
  background-color: #f5f5f5;
}

.student-item.v-list-item--active {
  background-color: #e8f5e8;
  border-left: 4px solid #4caf50;
}
</style>
