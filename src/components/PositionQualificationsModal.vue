<template>
  <v-dialog v-model="isOpen" max-width="600px">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-certificate</v-icon>
        Required Qualifications
        <v-spacer></v-spacer>
        <v-btn @click="close" icon="mdi-close" variant="text"></v-btn>
      </v-card-title>
      
      <v-divider></v-divider>
      
      <v-card-text>
        <!-- Loading State -->
        <div v-if="loading" class="text-center pa-8">
          <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
          <div class="text-body-2 mt-2 text-medium-emphasis">Loading qualifications...</div>
        </div>
        
        <!-- Qualifications List -->
        <div v-else-if="qualifications.length > 0">
          <div class="text-subtitle-2 font-weight-medium mb-3">
            {{ positionName }} requires {{ qualifications.length }} qualification(s):
          </div>
          
          <v-card
            v-for="qual in qualifications"
            :key="qual.qualification_id"
            variant="outlined"
            class="mb-3"
          >
            <v-card-text class="pa-4">
              <div class="d-flex align-start">
                <v-icon color="primary" class="mr-3 mt-1">mdi-check-circle</v-icon>
                <div class="flex-grow-1">
                  <div class="font-weight-medium mb-1">{{ qual.qualification_name }}</div>
                  <div v-if="qual.description" class="text-body-2 text-medium-emphasis mb-2">
                    {{ qual.description }}
                  </div>
                  <div class="d-flex flex-wrap gap-2">
                    <v-chip
                      v-if="qual.requires_document"
                      size="x-small"
                      color="warning"
                      variant="outlined"
                    >
                      <v-icon start size="x-small">mdi-file-document</v-icon>
                      Document Required
                    </v-chip>
                  </div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </div>
        
        <!-- No Qualifications State -->
        <div v-else class="text-center pa-8">
          <v-icon size="64" color="grey-lighten-2">mdi-certificate-off</v-icon>
          <div class="text-h6 mt-2 text-medium-emphasis">No Qualifications Required</div>
          <div class="text-body-2 text-medium-emphasis">
            {{ positionName }} does not require any specific qualifications
          </div>
        </div>
      </v-card-text>
      
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn @click="close" variant="text">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import qualificationService from '@/services/qualificationService'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  positionId: {
    type: Number,
    default: null
  },
  positionName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const loading = ref(false)
const qualifications = ref([])

// Watch for prop changes
watch(() => props.modelValue, (newVal) => {
  isOpen.value = newVal
  if (newVal && props.positionId) {
    loadQualifications()
  }
})

watch(isOpen, (newVal) => {
  emit('update:modelValue', newVal)
})

const loadQualifications = async () => {
  if (!props.positionId) return
  
  try {
    loading.value = true
    const response = await qualificationService.getPositionRequiredQualifications(props.positionId)
    qualifications.value = response.data || []
  } catch (error) {
    console.error('Error loading position qualifications:', error)
    qualifications.value = []
  } finally {
    loading.value = false
  }
}

const close = () => {
  isOpen.value = false
  qualifications.value = []
}
</script>
