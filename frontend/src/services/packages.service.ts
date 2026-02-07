import apiService from './api.service';

export interface Package {
  id: string;
  publisherId: string;
  name: string;
  description?: string;
  status: string;
  subjects: string[];
  contentTypes: string[];
  createdAt: string;
  updatedAt: string;
  publisher?: {
    id: string;
    name: string;
    code: string;
  };
  _count?: {
    college_packages: number;
  };
}

export interface PackageAssignment {
  id: string;
  collegeId: string;
  packageId: string;
  startDate: string;
  endDate?: string;
  status: string;
  assignedBy: string;
  createdAt: string;
  updatedAt: string;
  college?: {
    id: string;
    name: string;
    code: string;
  };
  package?: Package;
}

export interface CreatePackageDto {
  publisherId?: string;
  name: string;
  description?: string;
  subjects?: string[];
  contentTypes?: string[];
  status?: string;
}

export interface UpdatePackageDto {
  name?: string;
  description?: string;
  subjects?: string[];
  contentTypes?: string[];
  status?: string;
}

export interface AssignPackageToCollegeDto {
  packageId: string;
  collegeId: string;
  startDate: string;
  endDate?: string;
}

export interface UpdatePackageAssignmentDto {
  endDate?: string;
  status?: string;
}

export const packagesService = {
  // =====================================================
  // PACKAGE MANAGEMENT
  // =====================================================

  /**
   * Create a new package
   */
  create: async (data: CreatePackageDto): Promise<Package> => {
    const response = await apiService.post<Package>('/packages', data);
    return response.data;
  },

  /**
   * Get all packages
   */
  getAll: async (): Promise<Package[]> => {
    const response = await apiService.get<Package[]>('/packages');
    return response.data;
  },

  /**
   * Get a single package by ID
   */
  getById: async (id: string): Promise<Package> => {
    const response = await apiService.get<Package>(`/packages/${id}`);
    return response.data;
  },

  /**
   * Update a package
   */
  update: async (id: string, data: UpdatePackageDto): Promise<Package> => {
    const response = await apiService.put<Package>(`/packages/${id}`, data);
    return response.data;
  },

  /**
   * Delete (deactivate) a package
   */
  delete: async (id: string): Promise<Package> => {
    const response = await apiService.delete<Package>(`/packages/${id}`);
    return response.data;
  },

  // =====================================================
  // PACKAGE ASSIGNMENTS
  // =====================================================

  /**
   * Assign a package to a college
   */
  assignToCollege: async (data: AssignPackageToCollegeDto): Promise<PackageAssignment> => {
    const response = await apiService.post<PackageAssignment>('/packages/assignments', data);
    return response.data;
  },

  /**
   * Get all package assignments
   */
  getAllAssignments: async (): Promise<PackageAssignment[]> => {
    const response = await apiService.get<PackageAssignment[]>('/packages/assignments/all');
    return response.data;
  },

  /**
   * Get packages assigned to a specific college
   */
  getCollegePackages: async (collegeId: string): Promise<PackageAssignment[]> => {
    const response = await apiService.get<PackageAssignment[]>(`/packages/assignments/college/${collegeId}`);
    return response.data;
  },

  /**
   * Update a package assignment
   */
  updateAssignment: async (id: string, data: UpdatePackageAssignmentDto): Promise<PackageAssignment> => {
    const response = await apiService.put<PackageAssignment>(`/packages/assignments/${id}`, data);
    return response.data;
  },

  /**
   * Remove (cancel) a package assignment
   */
  removeAssignment: async (id: string): Promise<PackageAssignment> => {
    const response = await apiService.delete<PackageAssignment>(`/packages/assignments/${id}`);
    return response.data;
  },

  /**
   * Get available content for a college based on assigned packages
   * Used by Faculty when creating courses
   */
  getCollegeAvailableContent: async (collegeId: string): Promise<{
    packages: Array<{
      id: string;
      name: string;
      publisherId: string;
      subjects: string[];
      contentTypes: string[];
    }>;
    learningUnits: any[];
    subjects: string[];
    contentTypes: string[];
    message?: string;
  }> => {
    const response = await apiService.get(`/packages/content/college/${collegeId}`);
    return response.data;
  },
};

export default packagesService;
