import apiService from './api.service';
import { API_ENDPOINTS } from '../config/api';
import { AuthResponse, User } from '../types';

class AuthService {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>(API_ENDPOINTS.LOGIN, {
      email,
      password,
    });

    const { accessToken, refreshToken, user } = response.data;
    
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('token', accessToken); // For backward compatibility
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));

    return response.data;
  }

  async logout(): Promise<void> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await apiService.post(API_ENDPOINTS.LOGOUT, { refreshToken });
      }
    } catch (error) {
      // Ignore logout errors, still clear local storage
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }

  async getCurrentUser(): Promise<User> {
    const response = await apiService.get<{ userId: string; email: string; role: string }>(
      API_ENDPOINTS.ME
    );
    return response.data as any;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiService.post(API_ENDPOINTS.CHANGE_PASSWORD, {
      currentPassword,
      newPassword,
    });
  }

  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }
}

const authService = new AuthService();
export default authService;
