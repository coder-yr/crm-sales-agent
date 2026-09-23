import apiClient from './apiClient';

export interface RecommendationEvidence {
  ruleKey: string;
  evidence: string[];
  recommendationVersion: string;
  evaluatedAt: string;
  dataSnapshot?: Record<string, unknown>;
}

export interface RecommendationTask {
  id: string;
  title: string;
  status: string;
  dueDate?: string | null;
  description?: string | null;
}

export interface RecommendationRecord {
  id: string;
  tenantId: string;
  leadId: string;
  ruleKey?: string | null;
  type: string;
  title: string;
  reason?: string | null;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  action: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED';
  evidence?: RecommendationEvidence | null;
  version?: string | null;
  taskId?: string | null;
  task?: RecommendationTask | null;
  createdAt: string;
  executedAt?: string | null;
}

class RecommendationsService {
  async getLeadRecommendations(leadId: string): Promise<{ success: boolean; data: RecommendationRecord[] }> {
    return apiClient.get(`/leads/${leadId}/recommendations`);
  }

  async getAllRecommendations(): Promise<{ success: boolean; data: RecommendationRecord[] }> {
    return apiClient.get('/recommendations');
  }

  async getRecommendationById(id: string): Promise<{ success: boolean; data: RecommendationRecord }> {
    return apiClient.get(`/recommendations/${id}`);
  }

  async dismissRecommendation(id: string): Promise<{ success: boolean; data: RecommendationRecord; message: string }> {
    return apiClient.patch(`/recommendations/${id}/dismiss`);
  }

  async acceptRecommendation(
    id: string,
    createTask: boolean = true
  ): Promise<{ success: boolean; data: RecommendationRecord; message: string }> {
    return apiClient.post(`/recommendations/${id}/accept`, { createTask });
  }

  async startRecommendations(leadId: string): Promise<{
    success: boolean;
    data: { id: string; status: string; agentType: string; reused?: boolean };
    message?: string;
  }> {
    return apiClient.post('/agent-runs/recommendations', { leadId });
  }
}

export const recommendationsService = new RecommendationsService();
