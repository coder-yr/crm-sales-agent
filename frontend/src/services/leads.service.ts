import apiClient from './apiClient';
import type { Lead, ApiResponse } from '../types';

export const leadsService = {
  getLeads: async (params?: any): Promise<ApiResponse<Lead[]>> => {
    return apiClient.get('/leads', { params });
  },

  getLeadById: async (id: string): Promise<ApiResponse<Lead>> => {
    return apiClient.get(`/leads/${id}`);
  },

  createLead: async (lead: Partial<Lead>): Promise<ApiResponse<Lead>> => {
    return apiClient.post('/leads', lead);
  },

  bulkUpload: async (file: File): Promise<ApiResponse<{ count: number; leads: Lead[] }>> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/leads/bulk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  updateLead: async (id: string, updates: Partial<Lead>): Promise<ApiResponse<Lead>> => {
    return apiClient.patch(`/leads/${id}`, updates);
  },

  updateLeadStage: async (id: string, stageId: string): Promise<ApiResponse<Lead>> => {
    return apiClient.patch(`/leads/${id}/stage`, { stageId });
  },

  assignLead: async (id: string, assigneeId: string): Promise<ApiResponse<Lead>> => {
    return apiClient.patch(`/leads/${id}/assign`, { assigneeId });
  },

  deleteLead: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/leads/${id}`);
  }
};
