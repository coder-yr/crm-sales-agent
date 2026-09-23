export const APPROVED_SIGNAL_TYPES = [
  'HIRING',
  'EXPANSION',
  'NEWS',
  'LEADERSHIP_CHANGE',
  'WEBSITE_CHANGE',
  'PRODUCT_LAUNCH',
  'PARTNERSHIP',
  'FUNDING',
  'GROWTH',
  'ENGAGEMENT',
] as const;

export type SignalType = typeof APPROVED_SIGNAL_TYPES[number];

export type SignalStrengthLabel = 'STRONG' | 'MEDIUM' | 'WEAK';

export interface SignalStrengthMapping {
  value: number; // Float value for CompanySignal.strength
  label: SignalStrengthLabel;
}

export const SIGNAL_STRENGTH_MAP: Record<SignalStrengthLabel, number> = {
  STRONG: 1.0,
  MEDIUM: 0.7,
  WEAK: 0.4,
};

export interface CandidateSignal {
  type: SignalType;
  title: string;
  description: string;
  evidence: string;
  sourceUrl: string;
  source: string;
  rawConfidence: number;
}

export interface ValidatedSignal {
  type: SignalType;
  title: string;
  description: string;
  strength: number;
  strengthLabel: SignalStrengthLabel;
  confidence: number;
  evidence: string;
  source: string;
  sourceUrl: string;
  fingerprint: string;
  detectedAt: Date;
}

export interface SignalDetectionResult {
  signals: ValidatedSignal[];
  signalCount: number;
  researchRunId: string;
  companyId: string;
  companyName: string;
  completedAt: string;
}

export interface SignalDetectionJobData {
  tenantId: string;
  agentRunId: string;
  agentType: 'signal_detection';
  entityType: 'Company' | 'Lead';
  entityId: string;
  companyId?: string;
  leadId?: string;
}
