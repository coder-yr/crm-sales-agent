import apiClient from './apiClient';
import type { Task, ApiResponse } from '../types';

export const tasksService = {
  getTasks: async (params?: any): Promise<ApiResponse<Task[]>> => {
    return apiClient.get('/tasks', { params });
  },

  createTask: async (task: Partial<Task>): Promise<ApiResponse<Task>> => {
    return apiClient.post('/tasks', task);
  },

  updateTask: async (id: string, updates: Partial<Task>): Promise<ApiResponse<Task>> => {
    return apiClient.patch(`/tasks/${id}`, updates);
  },

  deleteTask: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/tasks/${id}`);
  }
};
