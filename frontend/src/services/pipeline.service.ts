import apiClient from './apiClient';
import type { PipelineStage, ApiResponse } from '../types';

export const pipelineService = {
  getStages: async (): Promise<ApiResponse<PipelineStage[]>> => {
    return apiClient.get('/pipeline-stages');
  },

  createStage: async (stage: Partial<PipelineStage>): Promise<ApiResponse<PipelineStage>> => {
    return apiClient.post('/pipeline-stages', stage);
  },

  updateStage: async (id: string, updates: Partial<PipelineStage>): Promise<ApiResponse<PipelineStage>> => {
    return apiClient.patch(`/pipeline-stages/${id}`, updates);
  },

  deleteStage: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/pipeline-stages/${id}`);
  }
};
