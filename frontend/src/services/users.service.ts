import apiClient from './apiClient';
import type { User, ApiResponse } from '../types';

export const usersService = {
  getUsers: async (): Promise<ApiResponse<User[]>> => {
    return apiClient.get('/users');
  },
  
  inviteUser: async (data: any): Promise<ApiResponse<User>> => {
    return apiClient.post('/users/invite', data);
  },

  updateUserStatus: async (userId: string, status: string): Promise<ApiResponse<User>> => {
    return apiClient.patch(`/users/${userId}/status`, { status });
  }
};
