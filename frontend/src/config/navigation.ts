// Navigation configurations for each portal

export const OWNER_NAV_SECTIONS = [
  {
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: '📊' },
      { label: 'Publishers', path: '/publishers', icon: '📚' },
      { label: 'Colleges', path: '/colleges', icon: '🏛️' },
      { label: 'Analytics', path: '/analytics', icon: '📈' },
      { label: 'Audit Logs', path: '/audit-logs', icon: '🔍' },
      { label: 'Security', path: '/security', icon: '🔐' },
      { label: 'Content', path: '/content-management', icon: '📁' },
    ],
  },
];

export const PUBLISHER_NAV_SECTIONS = [
  {
    items: [
      { label: 'Dashboard', path: '/publisher-admin', icon: '📊' },
      { label: 'Learning Units', path: '/learning-units', icon: '📚' },
      { label: 'MCQs', path: '/mcqs', icon: '✍️' },
      { label: 'Profile', path: '/profile', icon: '👤' },
    ],
  },
];

export const COLLEGE_NAV_SECTIONS = [
  {
    items: [
      { label: 'Dashboard', path: '/college-admin', icon: '📊' },
      { label: 'Students', path: '/students', icon: '👥' },
      { label: 'Faculty', path: '/faculty-list', icon: '👨‍🏫' },
      { label: 'Bulk Upload', path: '/bulk-upload', icon: '📤' },
    ],
  },
];

export const FACULTY_NAV_SECTIONS = [
  {
    items: [
      { label: 'Dashboard', path: '/faculty', icon: '📊' },
      { label: 'Courses', path: '/courses', icon: '📚' },
      { label: 'Assignments', path: '/assignments', icon: '📝' },
      { label: 'Analytics', path: '/faculty-analytics', icon: '📈' },
      { label: 'Tracking', path: '/student-tracking', icon: '👁️' },
    ],
  },
];

export const STUDENT_NAV_SECTIONS = [
  {
    items: [
      { label: 'Dashboard', path: '/student', icon: '📊' },
      { label: 'My Courses', path: '/my-courses', icon: '📚' },
      { label: 'Self-Paced', path: '/self-paced', icon: '🎯' },
    ],
  },
];

export const DEAN_NAV_SECTIONS = [
  {
    items: [
      { label: 'Dashboard', path: '/dean', icon: '📊' },
      { label: 'Faculty', path: '/dean/faculty', icon: '👨‍🏫' },
      { label: 'Analytics', path: '/dean/analytics', icon: '📈' },
    ],
  },
];

export const COMPETENCY_NAV_SECTIONS = [
  {
    items: [
      { label: 'Dashboard', path: '/competencies', icon: '📊' },
      { label: 'Browse', path: '/competencies/browse', icon: '🔍' },
      { label: 'Manage', path: '/competencies/manage', icon: '⚙️' },
    ],
  },
];

// Portal Accent Colors
export const PORTAL_COLORS = {
  OWNER: '#2563EB',
  PUBLISHER: '#14B8A6',
  COLLEGE: '#8B5CF6',
  FACULTY: '#F97316',
  STUDENT: '#10B981',
  DEAN: '#6366F1',
  COMPETENCY: '#F43F5E',
};
