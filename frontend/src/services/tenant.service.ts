import apiClient from './apiClient';
import type { ApiResponse } from '../types';

export interface Tenant {
  id: string;
  name: string;
  slug?: string;
  supportEmail?: string;
  officialPhone?: string;
  logo?: string;
}

export const tenantService = {
  getMyTenant: async (): Promise<ApiResponse<Tenant>> => {
    return apiClient.get('/tenants/me');
  },

  updateMyTenant: async (updates: Partial<Tenant>): Promise<ApiResponse<Tenant>> => {
    return apiClient.patch('/tenants/me', updates);
  }
};
