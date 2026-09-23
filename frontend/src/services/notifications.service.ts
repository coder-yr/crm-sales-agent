import apiClient from './apiClient';
import type { ApiResponse } from '../types';

export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export const notificationsService = {
  getNotifications: async (): Promise<ApiResponse<Notification[]>> => {
    return apiClient.get('/notifications');
  },

  markAsRead: async (id: string): Promise<ApiResponse<Notification>> => {
    return apiClient.patch(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<ApiResponse<void>> => {
    return apiClient.patch('/notifications/read-all');
  }
};
