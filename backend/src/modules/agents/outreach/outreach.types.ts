export type OutreachType =
  | 'FOLLOW_UP'
  | 'FUNDING_OUTREACH'
  | 'PRODUCT_LAUNCH_OUTREACH'
  | 'RE_ENGAGEMENT'
  | 'DEMO_OUTREACH'
  | 'BUDGET_OUTREACH'
  | 'EXECUTIVE_OUTREACH';

export type OutreachDraftStatus = 'DRAFT' | 'EDITED' | 'APPROVED' | 'DISCARDED';

export interface VerifiedLeadContext {
  id: string;
  firstName: string;
  lastName: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  budget?: number | null;
  location?: string | null;
}

export interface VerifiedCompanyContext {
  id?: string;
  name: string;
  industry?: string | null;
  description?: string | null;
  location?: string | null;
  employeeCount?: number | null;
  websiteUrl?: string | null;
}

export interface VerifiedRecommendationContext {
  id: string;
  ruleKey?: string | null;
  type: string;
  title: string;
  action: string;
  reason?: string | null;
  priority: string;
  evidence?: any;
}

export interface VerifiedDealContext {
  dealScore: number;
  healthScore?: string | number;
  dealHealth?: string | null;
  buyingStage?: string | null;
  urgency?: string | null;
}

export interface VerifiedSignalItem {
  id?: string;
  type: string;
  title: string;
  description?: string | null;
  confidence: number;
  strength?: number;
  evidence?: string | null;
  sourceUrl?: string | null;
}

export interface OutreachContext {
  lead: VerifiedLeadContext;
  company: VerifiedCompanyContext;
  recommendation?: VerifiedRecommendationContext | null;
  deal?: VerifiedDealContext | null;
  signals: VerifiedSignalItem[];
  outreachType: OutreachType;
  tone: string;
  recency?: {
    latestActivityAt?: string | null;
    daysSinceLastActivity?: number | null;
  };
}

export interface OutreachLlmOutput {
  subject: string;
  body: string;
  personalizationPoints: string[];
  usedEvidence: string[];
}

export interface OutreachGenerationResult {
  outreachType: OutreachType;
  subject: string;
  body: string;
  tone: string;
  personalizationPoints: string[];
  usedEvidence: string[];
  evidenceSnapshot: Record<string, any>;
  modelUsed: string;
  modelVersion: string;
  isFallback: boolean;
}
