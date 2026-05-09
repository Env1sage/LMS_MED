import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_BASE_URL } from '../config/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token and device ID
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // For FormData, remove the JSON Content-Type so axios sets the correct
        // multipart/form-data boundary automatically
        if (config.data instanceof FormData) {
          delete config.headers['Content-Type'];
        }
        
        // Phase 2: Add device ID header
        let deviceId = localStorage.getItem('bitflow_device_id');
        if (!deviceId) {
          deviceId = this.generateDeviceId();
          localStorage.setItem('bitflow_device_id', deviceId);
        }
        config.headers['X-Device-ID'] = deviceId;
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest: any = error.config;

        // Don't try to refresh for epub content endpoints - they use their own content tokens
        const isEpubRequest = originalRequest?.url?.includes('/epub/');

        if (error.response?.status === 401 && !originalRequest._retry && !isEpubRequest) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                refreshToken,
              });

              const { accessToken } = response.data;
              localStorage.setItem('accessToken', accessToken);
              localStorage.setItem('token', accessToken); // For backward compatibility

              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, logout user
            localStorage.removeItem('accessToken');
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  get<T = any>(url: string, config?: { params?: any }) {
    return this.api.get<T>(url, config);
  }

  post<T = any>(url: string, data?: any) {
    return this.api.post<T>(url, data);
  }

  patch<T = any>(url: string, data?: any) {
    return this.api.patch<T>(url, data);
  }

  put<T = any>(url: string, data?: any) {
    return this.api.put<T>(url, data);
  }

  delete<T = any>(url: string, config?: { data?: any; params?: any }) {
    return this.api.delete<T>(url, config);
  }

  /**
   * Generate unique device ID using crypto API
   * Phase 2: Device-bound watermark tracking
   */
  private generateDeviceId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

const apiService = new ApiService();
export default apiService;
