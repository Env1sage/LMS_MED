import apiService from './api.service';

export interface PublisherProfile {
  companyName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  description: string | null;
  publisherCode: string;
  contractStartDate: string | null;
  contractEndDate: string | null;
  status: string;
  createdAt: string;
  logoUrl?: string | null;
}

export interface UpdatePublisherProfileDto {
  companyName?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  description?: string;
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
