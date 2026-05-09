export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  REFRESH: '/auth/refresh',
  LOGOUT: '/auth/logout',
  ME: '/auth/me',
  CHANGE_PASSWORD: '/auth/change-password',
  
  // Bitflow Owner - Publishers
  PUBLISHERS: '/bitflow-owner/publishers',
  PUBLISHER_BY_ID: (id: string) => `/bitflow-owner/publishers/${id}`,
  PUBLISHER_STATUS: (id: string) => `/bitflow-owner/publishers/${id}/status`,
  PUBLISHER_DETAILS: (id: string) => `/bitflow-owner/publishers/${id}/details`,
  
  // Bitflow Owner - Colleges
  COLLEGES: '/bitflow-owner/colleges',
  COLLEGE_BY_ID: (id: string) => `/bitflow-owner/colleges/${id}`,
  COLLEGE_STATUS: (id: string) => `/bitflow-owner/colleges/${id}/status`,
  COLLEGE_DETAILS: (id: string) => `/bitflow-owner/colleges/${id}/details`,
  
  // Bitflow Owner - Security & Features
  SECURITY_POLICY: '/bitflow-owner/security-policy',
  FEATURE_FLAGS: '/bitflow-owner/feature-flags',
  
  // Bitflow Owner - Analytics & Audit
  ANALYTICS: '/bitflow-owner/analytics',
  AUDIT_LOGS: '/bitflow-owner/audit-logs',
  
  // Bitflow Owner - Dashboard (Phase 2)
  DASHBOARD: '/bitflow-owner/dashboard',
  ACTIVITY_TRENDS: '/bitflow-owner/activity-trends',
  CHECK_EXPIRED_CONTRACTS: '/bitflow-owner/check-expired-contracts',
  
  // Bitflow Owner - Enhanced Analytics (Phase 2)
  SUBJECT_POPULARITY: '/bitflow-owner/analytics/subject-popularity',
  COURSE_COMPLETION: '/bitflow-owner/analytics/course-completion',
  ASSESSMENT_PARTICIPATION: '/bitflow-owner/analytics/assessment-participation',
  
  // Competencies (Phase 2)
  COMPETENCIES: '/competencies',
};
