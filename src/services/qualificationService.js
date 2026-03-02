import apiClient from "./services.js";

export default {
  // Get all students with their qualifications (optional filter by qualificationId)
  getStudentsWithQualifications(qualificationId = null) {
    const params = qualificationId ? { qualificationId } : {};
    return apiClient.get("qualifications/students/qualifications", { params });
  },

  // Get qualifications for a specific student
  getStudentQualifications(userId) {
    return apiClient.get(`qualifications/students/${userId}/qualifications`);
  },

  // Get required qualifications for a position
  getPositionRequiredQualifications(positionId) {
    return apiClient.get(`positions/${positionId}/required-qualifications`);
  },

  // Get all available qualifications (for filter dropdown)
  getAllQualifications() {
    return apiClient.get("qualifications");
  },

  // Check if user is qualified for a position
  checkUserQualificationForPosition(userId, positionId) {
    return apiClient.post(`qualifications/check`, {
      userId,
      positionId
    });
  },

  reviewUserQualification(userQualificationId, approvalStatus, rejectionReason = null) {
    return apiClient.put(`qualifications/user-qualifications/${userQualificationId}/review`, {
      approval_status: approvalStatus,
      rejection_reason: rejectionReason,
    });
  }
};
