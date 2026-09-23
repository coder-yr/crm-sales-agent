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

export type BusinessSignalType =
  | 'HIRING'
  | 'PRODUCT_LAUNCH'
  | 'EXPANSION'
  | 'PARTNERSHIP'
  | 'LEADERSHIP_CHANGE'
  | 'FUNDING'
  | 'TECHNOLOGY_ADOPTION'
  | 'GENERAL';

export interface BusinessSignalItem {
  type: BusinessSignalType;
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
