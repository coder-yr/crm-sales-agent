import apiClient from './apiClient';

export interface ChannelPartner {
  id: string;
  name: string;
  contactInfo: string;
  primaryContact: string;
  activeAgents: number;
  commissionRate: number;
  totalSales: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChannelPartnerDto {
  name: string;
  contactInfo?: string;
  primaryContact?: string;
  activeAgents?: number;
  commissionRate?: number;
}

export const channelPartnersService = {
  async getAll() {
    const response = await apiClient.get('/channel-partners');
    return response.data;
  },

  async getOne(id: string) {
    const response = await apiClient.get(`/channel-partners/${id}`);
    return response.data;
  },

  async create(data: CreateChannelPartnerDto) {
    const response = await apiClient.post('/channel-partners', data);
    return response.data;
  },

  async update(id: string, data: Partial<CreateChannelPartnerDto>) {
    const response = await apiClient.patch(`/channel-partners/${id}`, data);
    return response.data;
  },

  async remove(id: string) {
    const response = await apiClient.delete(`/channel-partners/${id}`);
    return response.data;
  },
};

export default channelPartnersService;
