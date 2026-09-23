import apiClient from './apiClient';

export interface CompanyProfile {
  name: string;
  domain?: string | null;
  website?: string | null;
  description?: string | null;
  industry?: string | null;
  location?: string | null;
  employeeCount?: number | null;
  foundedYear?: number | null;
}

export interface BusinessSignalItem {
  type: string;
  title: string;
  description?: string | null;
  evidence: string;
  sourceUrl: string;
  confidence: number;
}

export interface ResearchSourceItem {
  title: string;
  url: string;
  sourceType: string;
}

export interface CompanyResearchResult {
  company: CompanyProfile;
  businessSummary: string;
  productsOrServices: string[];
  targetCustomers: string[];
  technologies: string[];
  businessSignals: BusinessSignalItem[];
  sources: ResearchSourceItem[];
  researchedAt: string;
}

export interface SignalItem {
  id?: string;
  type: string;
  title: string;
  description?: string | null;
  strength: number;
  strengthLabel?: 'STRONG' | 'MEDIUM' | 'WEAK';
  confidence: number;
  evidence?: string | null;
  source?: string;
  sourceUrl?: string | null;
  fingerprint?: string | null;
  detectedAt?: string;
}

export interface SignalDetectionResult {
  signals: SignalItem[];
  signalCount: number;
  researchRunId: string;
  companyId: string;
  companyName: string;
  completedAt: string;
}

export interface AgentRunRecord {
  id: string;
  tenantId: string;
  agentType: string;
  entityType: string;
  entityId: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  input?: Record<string, unknown>;
  output?: CompanyResearchResult | SignalDetectionResult | any;
  model?: string | null;
  modelVersion?: string | null;
  durationMs?: number | null;
  error?: string | null;
  startedAt: string;
  completedAt?: string | null;
}

export interface DealIntelligenceFactorPositive {
  category: 'SIGNAL' | 'ENGAGEMENT' | 'COMPANY_FIT' | 'CONTACT_FIT' | 'STAGE';
  title: string;
  detail?: string;
  evidence?: string;
  confidence?: number;
}

export interface DealIntelligenceFactorRisk {
  category: 'CLOSE_DATE' | 'STALE_ENGAGEMENT' | 'OVERDUE_TASK' | 'STAGE_MISMATCH' | 'GENERAL';
  title: string;
  detail: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface DealIntelligenceFactorMissing {
  category: 'BUDGET' | 'COMPANY' | 'CONTACT' | 'ENGAGEMENT' | 'SIGNALS';
  title: string;
  detail: string;
}

export interface DealIntelligenceFactors {
  positives: DealIntelligenceFactorPositive[];
  risks: DealIntelligenceFactorRisk[];
  missingData: DealIntelligenceFactorMissing[];
}

export interface DealIntelligenceRecord {
  id: string;
  tenantId: string;
  leadId: string;
  dealScore: number;
  healthScore: number;
  intentScore: number;
  companyFitScore: number;
  contactFitScore: number;
  engagementScore: number;
  riskScore: number;
  dealHealth: 'HOT' | 'HEALTHY' | 'WARM' | 'AT_RISK' | 'COLD';
  buyingStage: 'DISCOVERY' | 'QUALIFICATION' | 'EVALUATION' | 'NEGOTIATION' | 'DECISION' | 'UNKNOWN';
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  dataCompleteness: number;
  factors: DealIntelligenceFactors;
  modelVersion: string;
  lastAnalyzedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

class AgentRunsService {
  async startResearch(
    entityType: 'Lead' | 'Company',
    entityId: string
  ): Promise<{ success: boolean; data: { agentRunId: string; status: string; reused?: boolean }; message: string }> {
    return apiClient.post('/agent-runs/research', { entityType, entityId });
  }

  async startSignalDetection(
    companyId?: string,
    leadId?: string
  ): Promise<{ success: boolean; data: { id: string; status: string; reused?: boolean; agentType: string }; message?: string }> {
    return apiClient.post('/agent-runs/signals', { companyId, leadId });
  }

  async startDealAnalysis(
    leadId: string
  ): Promise<{ success: boolean; data: { id: string; status: string; reused?: boolean; agentType: string }; message?: string }> {
    return apiClient.post('/agent-runs/deal-analysis', { leadId });
  }

  async startRecommendations(
    leadId: string
  ): Promise<{ success: boolean; data: { id: string; status: string; reused?: boolean; agentType: string }; message?: string }> {
    return apiClient.post('/agent-runs/recommendations', { leadId });
  }

  async getDealIntelligence(
    leadId: string
  ): Promise<{ success: boolean; data: DealIntelligenceRecord | null }> {
    return apiClient.get(`/deal-intelligence/lead/${leadId}`);
  }

  async getLatestRun(
    entityType: string,
    entityId: string,
    agentType?: string
  ): Promise<{ success: boolean; data: AgentRunRecord | null }> {
    const query = agentType ? `?agentType=${encodeURIComponent(agentType)}` : '';
    return apiClient.get(`/agent-runs/entity/${entityType}/${entityId}/latest${query}`);
  }

  async getRunById(id: string): Promise<{ success: boolean; data: AgentRunRecord }> {
    return apiClient.get(`/agent-runs/${id}`);
  }

  async getCompanySignals(companyId: string): Promise<{ success: boolean; data: SignalItem[] }> {
    return apiClient.get(`/companies/${companyId}/signals`);
  }

  async getAllSignals(): Promise<{ success: boolean; data: SignalItem[] }> {
    return apiClient.get('/signals');
  }
}

export const agentRunsService = new AgentRunsService();

