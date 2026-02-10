import apiService from './api.service';

// ==================== DEPARTMENT TYPES ====================
export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  hodUserId?: string;
  hodId?: string;
  hodUser?: {
    id: string;
    fullName: string;
    email: string;
  };
  hod?: {
    id: string;
    fullName: string;
    email: string;
  };
  collegeId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    faculty_assignments: number;
    student_departments?: number;
    students?: number;
  };
}

export interface CreateDepartmentDto {
  name: string;
  code: string;
  description?: string;
}

export interface UpdateDepartmentDto {
  name?: string;
  code?: string;
  description?: string;
}

// ==================== FACULTY TYPES ====================
export interface Faculty {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  collegeId?: string;
  lastLoginAt?: string;
  createdAt: string;
}

export interface FacultyAssignment {
  id: string;
  userId: string;
  departmentId: string;
  permissionId: string;
  subjects: string[];
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
  assignedAt: string;
  updatedAt: string;
  user?: Faculty;
  department?: Department;
  permissions?: PermissionSet;
}

export interface CreateFacultyAssignmentDto {
  userId: string;
  departmentId: string;
  permissionId: string;
  subjects?: string[];
}

export interface UpdateFacultyAssignmentDto {
  permissionId?: string;
  subjects?: string[];
  status?: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
}

// ==================== PERMISSION SET TYPES ====================
export interface PermissionSet {
  id: string;
  name: string;
  description?: string;
  canCreateCourse: boolean;
  canEditCourse: boolean;
  canDeleteCourse: boolean;
  canPublishCourse: boolean;
  canCreateMcq: boolean;
  canEditMcq: boolean;
  canDeleteMcq: boolean;
  canViewAnalytics: boolean;
  canAssignStudents: boolean;
  canGradeStudents: boolean;
  collegeId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePermissionSetDto {
  name: string;
  description?: string;
  canCreateCourse?: boolean;
  canEditCourse?: boolean;
  canDeleteCourse?: boolean;
  canPublishCourse?: boolean;
  canCreateMcq?: boolean;
  canEditMcq?: boolean;
  canDeleteMcq?: boolean;
  canViewAnalytics?: boolean;
  canAssignStudents?: boolean;
  canGradeStudents?: boolean;
}

export interface UpdatePermissionSetDto extends Partial<CreatePermissionSetDto> {}

// ==================== FACULTY CREATION TYPES ====================
export interface CreateFacultyDto {
  email: string;
  fullName: string;
  departmentId: string;
  permissionSetId: string;
}

// ==================== COLLEGE PROFILE TYPES ====================
export interface CollegeProfile {
  id: string;
  name: string;
  code: string;
  emailDomain?: string;
  adminContactEmail?: string;
  address?: string;
  city?: string;
  state?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    departments: number;
    users: number;
    students: number;
  };
}

// ==================== GOVERNANCE SERVICE ====================
const governanceService = {
  // ==================== DEPARTMENTS ====================
  
  // Get all departments
  getDepartments: async (): Promise<Department[]> => {
    const response = await apiService.get<Department[]>('/governance/departments');
    return response.data;
  },

  // Get my departments (for HOD/Faculty)
  getMyDepartments: async (): Promise<Department[]> => {
    const response = await apiService.get<Department[]>('/governance/departments/my-departments');
    return response.data;
  },

  // Get department by ID
  getDepartmentById: async (id: string): Promise<Department> => {
    const response = await apiService.get<Department>(`/governance/departments/${id}`);
    return response.data;
  },

  // Create department
  createDepartment: async (data: CreateDepartmentDto): Promise<Department> => {
    const response = await apiService.post<Department>('/governance/departments', data);
    return response.data;
  },

  // Update department
  updateDepartment: async (id: string, data: UpdateDepartmentDto): Promise<Department> => {
    const response = await apiService.put<Department>(`/governance/departments/${id}`, data);
    return response.data;
  },

  // Assign HOD to department
  assignHod: async (departmentId: string, hodUserId: string): Promise<Department> => {
    const response = await apiService.put<Department>(
      `/governance/departments/${departmentId}/assign-hod`,
      { hodId: hodUserId }
    );
    return response.data;
  },

  // Remove HOD from department
  removeHod: async (departmentId: string): Promise<Department> => {
    const response = await apiService.delete<Department>(
      `/governance/departments/${departmentId}/remove-hod`
    );
    return response.data;
  },

  // Delete (deactivate) department
  deleteDepartment: async (id: string): Promise<void> => {
    await apiService.delete(`/governance/departments/${id}`);
  },

  // ==================== FACULTY PERMISSIONS ====================
  
  // Get all permission sets
  getPermissionSets: async (): Promise<PermissionSet[]> => {
    const response = await apiService.get<PermissionSet[]>('/governance/faculty-permissions');
    return response.data;
  },

  // Get permission set by ID
  getPermissionSetById: async (id: string): Promise<PermissionSet> => {
    const response = await apiService.get<PermissionSet>(`/governance/faculty-permissions/${id}`);
    return response.data;
  },

  // Create permission set
  createPermissionSet: async (data: CreatePermissionSetDto): Promise<PermissionSet> => {
    const response = await apiService.post<PermissionSet>('/governance/faculty-permissions', data);
    return response.data;
  },

  // Initialize default permission sets
  initializeDefaultPermissions: async (): Promise<PermissionSet[]> => {
    const response = await apiService.post<PermissionSet[]>(
      '/governance/faculty-permissions/initialize-defaults'
    );
    return response.data;
  },

  // Update permission set
  updatePermissionSet: async (id: string, data: UpdatePermissionSetDto): Promise<PermissionSet> => {
    const response = await apiService.put<PermissionSet>(`/governance/faculty-permissions/${id}`, data);
    return response.data;
  },

  // Delete permission set
  deletePermissionSet: async (id: string): Promise<void> => {
    await apiService.delete(`/governance/faculty-permissions/${id}`);
  },

  // ==================== FACULTY ASSIGNMENTS ====================
  
  // Get faculty assignments by department
  getFacultyByDepartment: async (departmentId: string): Promise<FacultyAssignment[]> => {
    const response = await apiService.get<FacultyAssignment[]>(
      `/governance/faculty-assignments/by-department/${departmentId}`
    );
    return response.data;
  },

  // Get faculty's assignments
  getFacultyAssignments: async (facultyUserId: string): Promise<FacultyAssignment[]> => {
    const response = await apiService.get<FacultyAssignment[]>(
      `/governance/faculty-assignments/by-faculty/${facultyUserId}`
    );
    return response.data;
  },

  // Get my assignments (for logged-in faculty)
  getMyAssignments: async (): Promise<FacultyAssignment[]> => {
    const response = await apiService.get<FacultyAssignment[]>(
      '/governance/faculty-assignments/my-assignments'
    );
    return response.data;
  },

  // Get faculty permissions for department
  getFacultyPermissions: async (departmentId: string): Promise<any> => {
    const response = await apiService.get(
      `/governance/faculty-assignments/permissions/${departmentId}`
    );
    return response.data;
  },

  // Create faculty assignment
  createFacultyAssignment: async (data: CreateFacultyAssignmentDto): Promise<FacultyAssignment> => {
    const response = await apiService.post<FacultyAssignment>(
      '/governance/faculty-assignments',
      data
    );
    return response.data;
  },

  // Update faculty assignment
  updateFacultyAssignment: async (id: string, data: UpdateFacultyAssignmentDto): Promise<FacultyAssignment> => {
    const response = await apiService.put<FacultyAssignment>(
      `/governance/faculty-assignments/${id}`,
      data
    );
    return response.data;
  },

  // Remove faculty from department
  removeFacultyAssignment: async (userId: string, departmentId: string): Promise<void> => {
    await apiService.delete('/governance/faculty-assignments', {
      data: { userId, departmentId }
    });
  },

  // ==================== COLLEGE PROFILE ====================
  
  // Get college profile (for logged-in college admin)
  getCollegeProfile: async (): Promise<CollegeProfile> => {
    const response = await apiService.get<CollegeProfile>('/college/profile');
    return response.data;
  },

  // Update college profile
  updateCollegeProfile: async (data: Partial<CollegeProfile>): Promise<CollegeProfile> => {
    const response = await apiService.put<CollegeProfile>('/college/profile', data);
    return response.data;
  },

  // ==================== FACULTY USER CREATION ====================
  
  // Get all faculty users in college
  getFacultyUsers: async (): Promise<Faculty[]> => {
    const response = await apiService.get<Faculty[]>('/governance/faculty-users');
    return response.data;
  },

  // Create faculty user
  createFacultyUser: async (data: CreateFacultyDto): Promise<{ user: Faculty; tempPassword: string }> => {
    const response = await apiService.post<{ user: Faculty; tempPassword: string }>(
      '/governance/faculty-users',
      data
    );
    return response.data;
  },

  // Bulk upload faculty from CSV
  bulkUploadFaculty: async (file: File): Promise<{
    success: number;
    failed: number;
    errors: { row: number; email: string; error: string }[];
    createdFaculty: { fullName: string; email: string; tempPassword: string }[];
    emailsSent: number;
    emailsFailed: number;
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('accessToken');
    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    const response = await fetch(`${baseUrl}/governance/faculty-users/bulk-upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json();
      const err = new Error('Failed to upload faculty users');
      (err as any).response = { data: error };
      throw err;
    }
    return response.json();
  },

  // Delete faculty user permanently
  deleteFacultyUser: async (id: string): Promise<{ message: string; deletedUser: { id: string; fullName: string; email: string } }> => {
    const response = await apiService.delete<{ message: string; deletedUser: { id: string; fullName: string; email: string } }>(
      `/governance/faculty-users/${id}`
    );
    return response.data;
  },

  // ==================== NOTIFICATIONS ====================
  
  // Get all notifications (admin view)
  getNotifications: async (query?: { type?: string; priority?: string; isActive?: boolean }): Promise<Notification[]> => {
    const response = await apiService.get<Notification[]>('/governance/notifications', { params: query });
    return response.data;
  },

  // Get notifications for current user
  getMyNotifications: async (): Promise<Notification[]> => {
    const response = await apiService.get<Notification[]>('/governance/notifications/my-notifications');
    return response.data;
  },

  // Get unread notification count
  getUnreadNotificationCount: async (): Promise<{ count: number }> => {
    const response = await apiService.get<{ count: number }>('/governance/notifications/unread-count');
    return response.data;
  },

  // Get single notification
  getNotificationById: async (id: string): Promise<Notification> => {
    const response = await apiService.get<Notification>(`/governance/notifications/${id}`);
    return response.data;
  },

  // Create notification
  createNotification: async (data: CreateNotificationDto): Promise<Notification> => {
    const response = await apiService.post<Notification>('/governance/notifications', data);
    return response.data;
  },

  // Update notification
  updateNotification: async (id: string, data: UpdateNotificationDto): Promise<Notification> => {
    const response = await apiService.put<Notification>(`/governance/notifications/${id}`, data);
    return response.data;
  },

  // Delete notification
  deleteNotification: async (id: string): Promise<void> => {
    await apiService.delete(`/governance/notifications/${id}`);
  },

  // Mark notification as read
  markNotificationAsRead: async (id: string): Promise<void> => {
    await apiService.post(`/governance/notifications/${id}/read`);
  },
};

// ==================== NOTIFICATION TYPES ====================
export interface Notification {
  id: string;
  collegeId: string;
  createdBy: string;
  title: string;
  message: string;
  type: 'ANNOUNCEMENT' | 'SCHEDULE_CHANGE' | 'ACADEMIC_NOTICE' | 'SYSTEM_ALERT';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  audience: 'ALL' | 'FACULTY' | 'STUDENTS' | 'DEPARTMENT' | 'BATCH';
  departmentId?: string;
  academicYear?: string;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  creator?: { id: string; fullName: string; email?: string };
  department?: { id: string; name: string; code?: string };
  isRead?: boolean;
  readAt?: string;
  _count?: { readReceipts: number };
}

export interface CreateNotificationDto {
  title: string;
  message: string;
  type?: 'ANNOUNCEMENT' | 'SCHEDULE_CHANGE' | 'ACADEMIC_NOTICE' | 'SYSTEM_ALERT';
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  audience?: 'ALL' | 'FACULTY' | 'STUDENTS' | 'DEPARTMENT' | 'BATCH';
  departmentId?: string;
  academicYear?: string;
  expiresAt?: string;
}

export interface UpdateNotificationDto {
  title?: string;
  message?: string;
  type?: 'ANNOUNCEMENT' | 'SCHEDULE_CHANGE' | 'ACADEMIC_NOTICE' | 'SYSTEM_ALERT';
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  isActive?: boolean;
  expiresAt?: string;
}

export default governanceService;
