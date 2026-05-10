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
  
  // Bitflow Owner - Enhanced Analytics
  SUBJECT_POPULARITY: '/bitflow-owner/analytics/subject-popularity',
  COURSE_COMPLETION: '/bitflow-owner/analytics/course-completion',
  ASSESSMENT_PARTICIPATION: '/bitflow-owner/analytics/assessment-participation',
  STUDENT_PROGRESS: '/bitflow-owner/analytics/student-progress',
  TEACHER_PERFORMANCE: '/bitflow-owner/analytics/teacher-performance',
  COURSE_PERFORMANCE: '/bitflow-owner/analytics/course-performance',
  COLLEGE_COMPARISON: '/bitflow-owner/analytics/college-comparison',
  WEEKLY_SUMMARY: '/bitflow-owner/analytics/weekly-summary',
  EXPORT_WEEKLY_ACTIVITY: '/bitflow-owner/analytics/export/weekly-activity',

  // Bitflow Owner - Publisher Actions
  PUBLISHER_RESEND_CREDENTIALS: (id: string) => `/bitflow-owner/publishers/${id}/resend-credentials`,
  PUBLISHER_RENEW: (id: string) => `/bitflow-owner/publishers/${id}/renew`,
  PUBLISHER_UPLOAD_LOGO: '/bitflow-owner/upload-logo',

  // Bitflow Owner - College Actions
  COLLEGE_RESEND_CREDENTIALS: (id: string) => `/bitflow-owner/colleges/${id}/resend-credentials`,

  // Bitflow Owner - Content & MCQs
  CONTENT: '/bitflow-owner/content',
  CONTENT_STATS: '/bitflow-owner/content/stats',
  CONTENT_BY_ID: (id: string) => `/bitflow-owner/content/${id}`,
  CONTENT_STATUS: (id: string) => `/bitflow-owner/content/${id}/status`,
  MCQS_LIST: '/bitflow-owner/mcqs',
  MCQ_BY_ID: (id: string) => `/bitflow-owner/mcqs/${id}`,

  // Bitflow Owner - Misc
  TEACHER_ASSIGNMENTS: '/bitflow-owner/teacher-assignments',
  CHECK_EXPIRED_CONTRACTS_POST: '/bitflow-owner/check-expired-contracts',

  // Packages
  PACKAGES: '/packages',
  PACKAGE_BY_ID: (id: string) => `/packages/${id}`,
  PACKAGE_ASSIGNMENTS: '/packages/assignments',
  PACKAGE_ASSIGNMENTS_ALL: '/packages/assignments/all',
  PACKAGE_ASSIGNMENT_BY_ID: (id: string) => `/packages/assignments/${id}`,

  // Competencies
  COMPETENCIES: '/competencies',
  COMPETENCY_SUBJECTS: '/competencies/subjects',
  COMPETENCY_STATS: '/competencies/stats',
};
