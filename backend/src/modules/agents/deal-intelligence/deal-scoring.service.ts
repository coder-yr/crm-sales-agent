import { Injectable, Logger } from '@nestjs/common';

export type BuyingStage = 'DISCOVERY' | 'QUALIFICATION' | 'EVALUATION' | 'NEGOTIATION' | 'DECISION' | 'UNKNOWN';
export type DealHealth = 'HOT' | 'HEALTHY' | 'WARM' | 'AT_RISK' | 'COLD';
export type Urgency = 'HIGH' | 'MEDIUM' | 'LOW';

export interface DealScoringSignalInput {
  id?: string;
  type: string;
  title: string;
  description?: string | null;
  strength: number;
  confidence: number; // 0–100 scale
  evidence?: string | null;
  sourceUrl?: string | null;
  detectedAt?: Date | string;
}

export interface DealScoringContactInput {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  department?: string | null;
  seniority?: string | null;
  decisionMakerScore?: number | null;
}

export interface DealScoringCompanyInput {
  id?: string;
  name?: string;
  domain?: string | null;
  industry?: string | null;
  description?: string | null;
  location?: string | null;
  employeeCount?: number | null;
  revenue?: number | null;
  foundedYear?: number | null;
  websiteUrl?: string | null;
}

export interface DealScoringActivityInput {
  id?: string;
  type: string;
  createdAt: Date | string;
}

export interface DealScoringTaskInput {
  id?: string;
  title: string;
  dueDate: Date | string;
  isCompleted: boolean;
}

export interface DealScoringLeadInput {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  budget?: number | null;
  source?: string | null;
  expectedCloseDate?: Date | string | null;
  stageName?: string | null;
  stageOrder?: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  company?: DealScoringCompanyInput | null;
  contact?: DealScoringContactInput | null;
  signals?: DealScoringSignalInput[];
  activities?: DealScoringActivityInput[];
  tasks?: DealScoringTaskInput[];
}

export interface PositiveFactor {
  factor: string;
  evidence: string;
  confidence?: number;
  metric?: string;
}

export interface RiskFactor {
  factor: string;
  evidence: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface DealIntelligenceOutput {
  scoringVersion: string;
  dealScore: number;
  intentScore: number;
  companyFitScore: number;
  contactFitScore: number;
  engagementScore: number;
  riskScore: number;
  dataCompleteness: number;
  dealHealth: DealHealth;
  healthScore: string; // for schema compatibility
  buyingStage: BuyingStage;
  urgency: Urgency;
  positiveFactors: PositiveFactor[];
  riskFactors: RiskFactor[];
  missingInformation: string[];
  evidence: string[];
  calculatedAt: string;
}

@Injectable()
export class DealScoringService {
  public static readonly SCORING_VERSION = 'v1';
  private readonly logger = new Logger(DealScoringService.name);

  /**
   * Calculates deterministic Deal Intelligence from verified CRM inputs.
   * Reproducible and strictly independent of LLM variability.
   */
  public calculateDealIntelligence(lead: DealScoringLeadInput): DealIntelligenceOutput {
    const now = Date.now();

    // 1. Data Completeness Assessment
    const completeness = this.calculateDataCompleteness(lead);

    // 2. Intent Score (0–100)
    const { intentScore, positiveSignalFactors } = this.calculateIntentScore(lead, now);

    // 3. Company Fit (0–100) - Transparent baseline without arbitrary ICP
    const { companyFitScore, companyFactors } = this.calculateCompanyFitScore(lead.company);

    // 4. Contact Fit (0–100)
    const { contactFitScore, contactFactors } = this.calculateContactFitScore(lead.contact);

    // 5. Engagement Score (0–100)
    const { engagementScore, engagementFactors } = this.calculateEngagementScore(lead.activities || [], lead.tasks || [], now);

    // 6. Risk Score (0–100, where 0 = very low risk, 100 = very high risk)
    const { riskScore, confirmedRiskFactors, missingInfo } = this.calculateRiskScore(lead, engagementScore, now);

    // 7. Deterministic Formula
    // Deal Score = 40% Intent + 25% Company Fit + 15% Contact Fit + 10% Engagement + 10% (100 - Risk)
    const rawDealScore =
      0.40 * intentScore +
      0.25 * companyFitScore +
      0.15 * contactFitScore +
      0.10 * engagementScore +
      0.10 * (100 - riskScore);

    const dealScore = Math.min(100, Math.max(0, Math.round(rawDealScore)));

    // 8. Controlled Buying Stage Mapping
    const buyingStage = this.mapBuyingStage(lead.stageName, lead.stageOrder);

    // 9. Controlled Urgency Mapping
    const urgency = this.calculateUrgency(dealScore, riskScore, lead.expectedCloseDate, intentScore, now);

    // 10. Controlled Deal Health Mapping
    const dealHealth = this.calculateDealHealth(dealScore, riskScore, engagementScore);

    // 11. Compile Positive Factors and Evidence
    const positiveFactors: PositiveFactor[] = [
      ...positiveSignalFactors,
      ...companyFactors,
      ...contactFactors,
      ...engagementFactors,
    ];

    const evidence: string[] = [
      ...positiveFactors.map((p) => p.evidence),
      ...confirmedRiskFactors.map((r) => r.evidence),
    ];

    return {
      scoringVersion: DealScoringService.SCORING_VERSION,
      dealScore,
      intentScore,
      companyFitScore,
      contactFitScore,
      engagementScore,
      riskScore,
      dataCompleteness: completeness,
      dealHealth,
      healthScore: dealHealth,
      buyingStage,
      urgency,
      positiveFactors,
      riskFactors: confirmedRiskFactors,
      missingInformation: missingInfo,
      evidence,
      calculatedAt: new Date(now).toISOString(),
    };
  }

  // --- Component Calculations ---

  private calculateDataCompleteness(lead: DealScoringLeadInput): number {
    let score = 0;
    if (lead.company && lead.company.name) score += 25;
    if (lead.signals && lead.signals.length > 0) score += 20;
    if (lead.contact && (lead.contact.email || lead.contact.title)) score += 20;
    if (lead.budget && lead.budget > 0) score += 15;
    if (lead.activities && lead.activities.length > 0) score += 10;
    if (lead.expectedCloseDate) score += 10;
    return score;
  }

  private calculateIntentScore(
    lead: DealScoringLeadInput,
    now: number
  ): { intentScore: number; positiveSignalFactors: PositiveFactor[] } {
    const signals = lead.signals || [];
    const positiveSignalFactors: PositiveFactor[] = [];

    if (signals.length === 0) {
      // Baseline with no signals
      const leadAgeDays = (now - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      const baseScore = leadAgeDays <= 14 ? 30 : 15;
      return { intentScore: baseScore, positiveSignalFactors };
    }

    let signalSum = 0;
    const typeWeights: Record<string, number> = {
      FUNDING: 25,
      EXPANSION: 20,
      GROWTH: 18,
      PRODUCT_LAUNCH: 16,
      HIRING: 14,
      PARTNERSHIP: 12,
      LEADERSHIP_CHANGE: 10,
      WEBSITE_CHANGE: 8,
      NEWS: 6,
      GENERAL: 5,
    };

    for (const sig of signals) {
      const baseWeight = typeWeights[sig.type] || 5;
      const confMultiplier = Math.min(100, Math.max(50, sig.confidence || 75)) / 100;

      // Recency multiplier
      let recencyMultiplier = 1.0;
      if (sig.detectedAt) {
        const ageDays = (now - new Date(sig.detectedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (ageDays > 90) recencyMultiplier = 0.4;
        else if (ageDays > 30) recencyMultiplier = 0.7;
      }

      const points = baseWeight * confMultiplier * recencyMultiplier;
      signalSum += points;

      if (positiveSignalFactors.length < 3) {
        positiveSignalFactors.push({
          factor: `${sig.type} SIGNAL`,
          evidence: sig.evidence ? `"${sig.evidence}"` : sig.title,
          confidence: Math.round(sig.confidence),
        });
      }
    }

    // Add recent activity intent bonus if any activity in past 14 days
    const recentActivities = (lead.activities || []).filter((a) => {
      const ageDays = (now - new Date(a.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return ageDays <= 14;
    });
    if (recentActivities.length > 0) {
      signalSum += 10;
    }

    // Base intent floor
    const intentScore = Math.min(100, Math.max(15, Math.round(20 + signalSum)));
    return { intentScore, positiveSignalFactors };
  }

  private calculateCompanyFitScore(
    company?: DealScoringCompanyInput | null
  ): { companyFitScore: number; companyFactors: PositiveFactor[] } {
    const companyFactors: PositiveFactor[] = [];

    if (!company || !company.name) {
      return { companyFitScore: 20, companyFactors };
    }

    let fitScore = 30; // base verified company profile presence

    if (company.websiteUrl || company.domain) {
      fitScore += 15;
    }

    if (company.description && company.description.length > 20) {
      fitScore += 15;
    }

    if (company.employeeCount !== null && company.employeeCount !== undefined && company.employeeCount > 0) {
      fitScore += 20;
      companyFactors.push({
        factor: 'COMPANY SCALE',
        evidence: `Verified team size of ~${company.employeeCount} employees`,
        metric: `${company.employeeCount} employees`,
      });
    }

    if (company.industry) {
      fitScore += 20;
      companyFactors.push({
        factor: 'COMPANY PROFILE',
        evidence: `Identified industry: ${company.industry}`,
      });
    }

    const companyFitScore = Math.min(100, Math.max(20, fitScore));
    return { companyFitScore, companyFactors };
  }

  private calculateContactFitScore(
    contact?: DealScoringContactInput | null
  ): { contactFitScore: number; contactFactors: PositiveFactor[] } {
    const contactFactors: PositiveFactor[] = [];

    if (!contact) {
      return { contactFitScore: 20, contactFactors };
    }

    let score = 25; // base contact presence

    const titleLower = (contact.title || '').toLowerCase();
    const seniorityLower = (contact.seniority || '').toLowerCase();

    const isCLevel =
      /\b(ceo|cto|cfo|cmo|cro|coo|cio|founder|co-founder|president|owner|partner)\b/i.test(titleLower) ||
      seniorityLower === 'c-level' ||
      seniorityLower === 'executive';

    const isVPOrDirector =
      /\b(vp|vice president|director|head of)\b/i.test(titleLower) ||
      seniorityLower === 'director' ||
      seniorityLower === 'vp';

    const isManager = /\b(manager|lead)\b/i.test(titleLower) || seniorityLower === 'manager';

    if (isCLevel) {
      score += 40;
      contactFactors.push({
        factor: 'DECISION MAKER SENIORITY',
        evidence: `Executive authority title: ${contact.title || 'C-Level'}`,
      });
    } else if (isVPOrDirector) {
      score += 30;
      contactFactors.push({
        factor: 'SENIOR LEADERSHIP',
        evidence: `Senior management title: ${contact.title || 'Director/VP'}`,
      });
    } else if (isManager) {
      score += 20;
    } else if (contact.title) {
      score += 10;
    }

    if (contact.email) score += 15;
    if (contact.phone) score += 10;

    if (contact.decisionMakerScore && contact.decisionMakerScore > 0) {
      const dmBonus = Math.round(Math.min(15, contact.decisionMakerScore > 1 ? (contact.decisionMakerScore / 100) * 15 : contact.decisionMakerScore * 15));
      score += dmBonus;
    }

    const contactFitScore = Math.min(100, Math.max(20, score));
    return { contactFitScore, contactFactors };
  }

  private calculateEngagementScore(
    activities: DealScoringActivityInput[],
    tasks: DealScoringTaskInput[],
    now: number
  ): { engagementScore: number; engagementFactors: PositiveFactor[] } {
    const engagementFactors: PositiveFactor[] = [];

    if (activities.length === 0 && tasks.length === 0) {
      return { engagementScore: 10, engagementFactors };
    }

    let score = 10;
    let recent7dCount = 0;
    let recent30dCount = 0;
    let newestActivityTime = 0;

    for (const act of activities) {
      const actTime = new Date(act.createdAt).getTime();
      if (actTime > newestActivityTime) newestActivityTime = actTime;

      const ageDays = (now - actTime) / (1000 * 60 * 60 * 24);
      if (ageDays <= 7) recent7dCount++;
      else if (ageDays <= 30) recent30dCount++;
    }

    // Recent activity frequency
    score += Math.min(40, recent7dCount * 15);
    score += Math.min(25, recent30dCount * 8);

    // Completed tasks bonus
    const completedTasksCount = tasks.filter((t) => t.isCompleted).length;
    score += Math.min(15, completedTasksCount * 5);

    // Recency bonus
    if (newestActivityTime > 0) {
      const newestAgeDays = (now - newestActivityTime) / (1000 * 60 * 60 * 24);
      if (newestAgeDays <= 3) score += 15;
      else if (newestAgeDays <= 7) score += 10;
      else if (newestAgeDays <= 14) score += 5;
    }

    if (recent7dCount > 0) {
      engagementFactors.push({
        factor: 'RECENT ENGAGEMENT',
        evidence: `${recent7dCount} active interaction${recent7dCount > 1 ? 's' : ''} in the last 7 days`,
        metric: `${recent7dCount} activities`,
      });
    }

    const engagementScore = Math.min(100, Math.max(10, score));
    return { engagementScore, engagementFactors };
  }

  private calculateRiskScore(
    lead: DealScoringLeadInput,
    engagementScore: number,
    now: number
  ): { riskScore: number; confirmedRiskFactors: RiskFactor[]; missingInfo: string[] } {
    let risk = 10; // Baseline low risk
    const confirmedRiskFactors: RiskFactor[] = [];
    const missingInfo: string[] = [];

    // --- REAL RISK FACTORS ---

    // 1. Overdue Tasks
    const overdueTasks = (lead.tasks || []).filter((t) => !t.isCompleted && new Date(t.dueDate).getTime() < now);
    if (overdueTasks.length > 0) {
      risk += 25;
      confirmedRiskFactors.push({
        factor: 'OVERDUE TASKS',
        evidence: `${overdueTasks.length} pending task${overdueTasks.length > 1 ? 's are' : ' is'} past due date.`,
        severity: 'HIGH',
      });
    }

    // 2. Stale Follow-up (No activity in last 14 days on active deal)
    let latestActivityTime = 0;
    for (const act of lead.activities || []) {
      const t = new Date(act.createdAt).getTime();
      if (t > latestActivityTime) latestActivityTime = t;
    }

    const daysSinceLastActivity = latestActivityTime > 0 ? (now - latestActivityTime) / (1000 * 60 * 60 * 24) : 999;
    const leadAgeDays = (now - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24);

    if (latestActivityTime > 0 && daysSinceLastActivity > 14) {
      risk += 25;
      confirmedRiskFactors.push({
        factor: 'STALE FOLLOW-UP',
        evidence: `No completed activity in the last ${Math.floor(daysSinceLastActivity)} days.`,
        severity: 'HIGH',
      });
    } else if (latestActivityTime === 0 && leadAgeDays > 14) {
      risk += 25;
      confirmedRiskFactors.push({
        factor: 'NO RECENT ENGAGEMENT',
        evidence: `Lead was created ${Math.floor(leadAgeDays)} days ago with no logged follow-up.`,
        severity: 'MEDIUM',
      });
    }

    // 3. Imminent Close Date with Low Engagement
    if (lead.expectedCloseDate) {
      const closeTime = new Date(lead.expectedCloseDate).getTime();
      const daysUntilClose = (closeTime - now) / (1000 * 60 * 60 * 24);

      if (daysUntilClose < 0) {
        risk += 30;
        confirmedRiskFactors.push({
          factor: 'EXPIRED TARGET CLOSE DATE',
          evidence: `Target close date passed ${Math.abs(Math.floor(daysUntilClose))} days ago.`,
          severity: 'HIGH',
        });
      } else if (daysUntilClose <= 7 && engagementScore < 40) {
        risk += 25;
        confirmedRiskFactors.push({
          factor: 'APPROACHING CLOSE WITHOUT ENGAGEMENT',
          evidence: `Expected close is in ${Math.ceil(daysUntilClose)} days with low engagement momentum.`,
          severity: 'HIGH',
        });
      }
    }

    // --- SEPARATE MISSING INFORMATION (Transparent caveats, not artificial 90% risk) ---
    if (!lead.budget || lead.budget <= 0) {
      missingInfo.push('NO CONFIRMED BUDGET: Budget information is unavailable.');
    }
    if (!lead.company) {
      missingInfo.push('NO ASSOCIATED COMPANY: Lead has no linked company profile.');
    }
    if (!lead.contact) {
      missingInfo.push('NO DESIGNATED CONTACT: Contact person and seniority unavailable.');
    }
    if (!lead.signals || lead.signals.length === 0) {
      missingInfo.push('NO COMPANY SIGNALS: Run Signal Detection to scan for hiring/funding intent.');
    }

    const riskScore = Math.min(100, Math.max(10, risk));
    return { riskScore, confirmedRiskFactors, missingInfo };
  }

  private mapBuyingStage(stageName?: string | null, stageOrder?: number | null): BuyingStage {
    if (!stageName) return 'UNKNOWN';
    const s = stageName.toLowerCase();

    if (s.includes('lead') || s.includes('new') || s.includes('discovery') || s.includes('prospect') || s.includes('contacted')) {
      return 'DISCOVERY';
    }
    if (s.includes('qualif') || s.includes('fit') || s.includes('vetting')) {
      return 'QUALIFICATION';
    }
    if (s.includes('eval') || s.includes('demo') || s.includes('meet') || s.includes('present') || s.includes('proposal')) {
      return 'EVALUATION';
    }
    if (s.includes('negotiat') || s.includes('contract') || s.includes('legal') || s.includes('terms') || s.includes('review')) {
      return 'NEGOTIATION';
    }
    if (s.includes('clos') || s.includes('won') || s.includes('decision') || s.includes('commit') || s.includes('sign')) {
      return 'DECISION';
    }

    // Fallback based on stage order if stage is numeric
    if (stageOrder !== null && stageOrder !== undefined) {
      if (stageOrder <= 1) return 'DISCOVERY';
      if (stageOrder === 2) return 'QUALIFICATION';
      if (stageOrder === 3) return 'EVALUATION';
      if (stageOrder === 4) return 'NEGOTIATION';
      if (stageOrder >= 5) return 'DECISION';
    }

    return 'QUALIFICATION';
  }

  private calculateUrgency(
    dealScore: number,
    riskScore: number,
    expectedCloseDate: Date | string | null | undefined,
    intentScore: number,
    now: number
  ): Urgency {
    if (expectedCloseDate) {
      const daysUntilClose = (new Date(expectedCloseDate).getTime() - now) / (1000 * 60 * 60 * 24);
      if (daysUntilClose > 0 && daysUntilClose <= 14) return 'HIGH';
    }

    if (dealScore >= 75 && riskScore <= 40 && intentScore >= 70) {
      return 'HIGH';
    }

    if (dealScore >= 50 || intentScore >= 50) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  private calculateDealHealth(dealScore: number, riskScore: number, engagementScore: number): DealHealth {
    if (riskScore >= 70) {
      return dealScore < 30 ? 'COLD' : 'AT_RISK';
    }

    if (dealScore >= 85) return 'HOT';
    if (dealScore >= 70) return 'HEALTHY';
    if (dealScore >= 50) return 'WARM';
    if (dealScore >= 30) return 'AT_RISK';
    return 'COLD';
  }
}
