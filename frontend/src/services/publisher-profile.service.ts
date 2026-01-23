import apiService from './api.service';

export interface PublisherProfile {
  companyName: string;
  contactPerson: string | null;
  contactEmail: string | null;
  physicalAddress: string | null;
  publisherCode: string;
  contractStartDate: string | null;
  contractEndDate: string | null;
  status: string;
  legalName: string | null;
  createdAt: string;
}

export interface UpdatePublisherProfileDto {
  companyName?: string;
  contactPerson?: string;
  contactEmail?: string;
  physicalAddress?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

const publisherProfileService = {
  // Get publisher profile
  getProfile: async (): Promise<PublisherProfile> => {
    const response = await apiService.get<PublisherProfile>('/publisher/profile');
    return response.data;
  },

  // Update publisher profile (editable fields only)
  updateProfile: async (data: UpdatePublisherProfileDto): Promise<PublisherProfile> => {
    const response = await apiService.put<PublisherProfile>('/publisher/profile', data);
    return response.data;
  },

  // Change password
  changePassword: async (data: ChangePasswordDto): Promise<{ message: string }> => {
    const response = await apiService.post<{ message: string }>('/publisher/profile/change-password', data);
    return response.data;
  },
};

export default publisherProfileService;
