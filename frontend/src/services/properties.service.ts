import apiClient from './apiClient';
import type { ApiResponse } from '../types';

export interface Property {
  id: string;
  name: string;
  description?: string;
  price: number;
  location: string;
  type: string;
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt?: number;
  status: string;
  images: string[];
  createdAt: string;
  version: number;
}

export const propertiesService = {
  getProperties: async (): Promise<ApiResponse<Property[]>> => {
    return apiClient.get('/properties');
  },

  getPropertyById: async (id: string): Promise<ApiResponse<Property>> => {
    return apiClient.get(`/properties/${id}`);
  },

  createProperty: async (property: Partial<Property>): Promise<ApiResponse<Property>> => {
    return apiClient.post('/properties', property);
  },

  updateProperty: async (id: string, updates: Partial<Property>): Promise<ApiResponse<Property>> => {
    return apiClient.patch(`/properties/${id}`, updates);
  },

  deleteProperty: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/properties/${id}`);
  },
};
