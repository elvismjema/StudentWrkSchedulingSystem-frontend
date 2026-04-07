import axios from 'axios';

// External API configuration
const STUDENT_SCHEDULE_API_BASE = 'https://stingray.oc.edu/api/accommodationuserschedule';
const DEFAULT_TERM_CODE = '2024FA'; // This can be made dynamic later

class StudentScheduleService {
  /**
   * Fetch student class schedule from external API
   * @param {string} studentEmail - Student's email address
   * @param {string} termCode - Term code (defaults to current term)
   * @returns {Promise<Object>} Schedule data
   */
  async getStudentSchedule(studentEmail, termCode = null) {
    try {
      // Use email as the user identifier for the external API
      const userId = studentEmail;
      const resolvedTermCode = termCode || this.getCurrentTermCode() || DEFAULT_TERM_CODE;
      
      const response = await axios.get(`${STUDENT_SCHEDULE_API_BASE}/${userId}/${resolvedTermCode}`, {
        headers: {
          'Content-Type': 'application/json',
          // Add any required headers for the external API
        },
        timeout: 10000, // 10 second timeout
      });

      if (response.data && response.data.Success === 'True') {
        return response.data;
      } else {
        throw new Error('API returned unsuccessful response');
      }

    } catch (error) {
      console.error('Error fetching student schedule:', error);
      
      // Handle different types of errors
      if (error.response) {
        // The server responded with an error status
        if (error.response.status === 404) {
          throw new Error('Student schedule not found');
        } else if (error.response.status === 401) {
          throw new Error('Unauthorized access to schedule API');
        } else {
          throw new Error(`API error: ${error.response.status}`);
        }
      } else if (error.request) {
        // The request was made but no response was received
        if (error.code === 'ECONNABORTED') {
          throw new Error('Schedule service request timed out');
        }
        throw new Error('Unable to connect to schedule service');
      } else {
        // Something else happened
        throw new Error(error.message || 'Failed to fetch student schedule');
      }
    }
  }

  /**
   * Format course data for display
   * @param {Object} courseData - Raw course data from API
   * @returns {Object} Formatted course data
   */
  formatCourseData(courseData) {
    return {
      CourseName: courseData.CourseName || '',
      CourseID: courseData.CourseID || '',
      Instructors: Array.isArray(courseData.Instructors) ? courseData.Instructors : [],
      start_date: courseData.start_date || null,
      end_date: courseData.end_date || null,
      meeting_times: Array.isArray(courseData.meeting_times) ? courseData.meeting_times : [],
      meeting_days: Array.isArray(courseData.meeting_days) ? courseData.meeting_days : [],
    };
  }

  /**
   * Get current term code (can be enhanced to calculate dynamically)
   * @returns {string} Current term code
   */
  getCurrentTermCode() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    if (month >= 1 && month <= 5) return `${year}SP`;
    if (month >= 6 && month <= 7) return `${year}SU`;
    return `${year}FA`;
  }

  /**
   * Check if schedule API is available
   * @returns {Promise<boolean>} True if API is accessible
   */
  async checkApiAvailability() {
    try {
      // Make a simple request to check API availability
      await axios.get(`${STUDENT_SCHEDULE_API_BASE}/test/test`, {
        timeout: 5000,
      });
      return true;
    } catch (error) {
      console.warn('Schedule API not available:', error.message);
      return false;
    }
  }
}

export default new StudentScheduleService();
