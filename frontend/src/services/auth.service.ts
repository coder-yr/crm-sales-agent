import apiClient from './apiClient';
import type { User, ApiResponse } from '../types';

export const authService = {
  login: async (credentials: any): Promise<ApiResponse<{ user: User; accessToken: string; refreshToken: string }>> => {
    return apiClient.post('/auth/login', credentials);
  },

  register: async (credentials: any): Promise<ApiResponse<{ user: User; accessToken: string; refreshToken: string }>> => {
    return apiClient.post('/auth/register', credentials);
  },
  
  logout: async () => {
    await apiClient.post('/auth/logout');
  },
  
  getProfile: async (): Promise<ApiResponse<User>> => {
    return apiClient.get('/auth/me');
  },

  activateAccount: async (token: string, password: string): Promise<ApiResponse<any>> => {
    return apiClient.post('/auth/activate', { token, password });
  }
};
