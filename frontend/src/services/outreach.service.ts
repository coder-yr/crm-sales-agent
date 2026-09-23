import apiClient from './apiClient';

export type OutreachDraftStatus = 'DRAFT' | 'EDITED' | 'APPROVED' | 'DISCARDED';
export type OutreachTone = 'PROFESSIONAL' | 'CASUAL' | 'URGENT' | 'EXECUTIVE' | 'CONSULTATIVE';

export interface OutreachDraftRecord {
  id: string;
  tenantId: string;
  leadId: string;
  recommendationId?: string | null;
  type: string;
  status: OutreachDraftStatus;
  subject: string;
  body: string;
  tone: OutreachTone;
  personalizationPoints: string[];
  usedEvidence: string[];
  evidenceSnapshot?: Record<string, unknown> | null;
  model?: string | null;
  modelVersion?: string | null;
  recommendation?: {
    id: string;
    actionTitle?: string;
    ruleKey?: string;
    priority?: string;
    reasoning?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateDraftPayload {
  subject?: string;
  body?: string;
  tone?: OutreachTone;
}

class OutreachService {
  async getLeadOutreach(leadId: string): Promise<{ success: boolean; data: OutreachDraftRecord[] }> {
    return apiClient.get(`/leads/${leadId}/outreach`);
  }

  async getOutreachById(id: string): Promise<{ success: boolean; data: OutreachDraftRecord }> {
    return apiClient.get(`/outreach/${id}`);
  }

  async updateDraft(id: string, dto: UpdateDraftPayload): Promise<{ success: boolean; data: OutreachDraftRecord; message: string }> {
    return apiClient.patch(`/outreach/${id}`, dto);
  }

  async approveDraft(id: string): Promise<{ success: boolean; data: OutreachDraftRecord; message: string }> {
    return apiClient.post(`/outreach/${id}/approve`);
  }

  async discardDraft(id: string): Promise<{ success: boolean; data: OutreachDraftRecord; message: string }> {
    return apiClient.patch(`/outreach/${id}/discard`);
  }

  async regenerateDraft(
    id: string,
    tone?: OutreachTone
  ): Promise<{ success: boolean; data: { id: string; agentRunId: string; status: string; agentType: string; reused?: boolean }; message: string }> {
    return apiClient.post(`/outreach/${id}/regenerate`, { tone });
  }

  async generateOutreach(
    leadId: string,
    recommendationId?: string,
    tone?: OutreachTone
  ): Promise<{ success: boolean; data: { id: string; agentRunId: string; status: string; agentType: string; reused?: boolean }; message: string }> {
    return apiClient.post('/agent-runs/outreach', { leadId, recommendationId, tone });
  }
}

export const outreachService = new OutreachService();
