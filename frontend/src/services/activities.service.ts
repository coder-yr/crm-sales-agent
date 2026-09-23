import apiClient from './apiClient';
import type { ApiResponse } from '../types';

export interface Activity {
  id: string;
  type: string;
  metadata: any;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
  };
}

export const activitiesService = {
  getLeadActivities: async (leadId: string, params?: any): Promise<ApiResponse<Activity[]>> => {
    return apiClient.get(`/activities/lead/${leadId}`, { params });
  },
  getActivities: async (params?: any): Promise<ApiResponse<Activity[]>> => {
    return apiClient.get('/activities', { params });
  }
};
