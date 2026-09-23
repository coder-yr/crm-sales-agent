import { Injectable } from '@nestjs/common';

export interface StoredEvidenceItem {
  sourceType: 'CompanySignal' | 'DealIntelligence' | 'Activity' | 'Task' | 'Company' | 'Contact';
  sourceId?: string | null;
  text: string;
  confidence?: number;
  sourceUrl?: string | null;
}

export interface StoredEvidencePayload {
  ruleKey: string;
  evidence: StoredEvidenceItem[];
  recommendationVersion: string;
}

export interface CandidateRecommendation {
  ruleKey: string;
  type: string;
  title: string;
  action: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
  isPrimary?: boolean;
  evidencePayload: StoredEvidencePayload;
}

export interface RuleEvaluationContext {
  lead: {
    id: string;
    tenantId: string;
    firstName: string;
    lastName: string;
    budget?: number | null;
    stage?: { name: string; order: number } | null;
    expectedCloseDate?: Date | string | null;
    companyId?: string | null;
    company?: {
      id: string;
      name: string;
      industry?: string | null;
      employeeCount?: number | null;
      revenue?: number | null;
    } | null;
  };
  companySignals: Array<{
    id: string;
    type: string;
    title: string;
    strength?: number | string | null;
    confidence: number;
    evidence?: string | null;
    source?: string | null;
    sourceUrl?: string | null;
    detectedAt?: Date | string | null;
  }>;
  dealIntelligence?: {
    id: string;
    dealScore: number;
    intentScore: number;
    companyFitScore: number;
    contactFitScore: number;
    engagementScore: number;
    riskScore: number;
    dealHealth: string; // 'HOT' | 'HEALTHY' | 'WARM' | 'AT_RISK' | 'COLD'
    buyingStage: string;
    urgency: string;
    factors?: {
      positives?: any[];
      risks?: any[];
      missingData?: any[];
    } | null;
  } | null;
  activities: Array<{
    id: string;
    type: string;
    createdAt: Date | string;
    metadata?: any;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    isCompleted: boolean;
    dueDate: Date | string;
  }>;
  contacts: Array<{
    id: string;
    firstName: string;
    lastName: string;
    title?: string | null;
  }>;
  now?: Date;
}

export const RULE_KEYS = {
  HIRING_EXPANSION_FOLLOWUP: 'HIRING_EXPANSION_FOLLOWUP',
  FUNDING_MOMENTUM: 'FUNDING_MOMENTUM',
  STALE_DEAL_REENGAGEMENT: 'STALE_DEAL_REENGAGEMENT',
  SCHEDULE_TECHNICAL_DEMO: 'SCHEDULE_TECHNICAL_DEMO',
  CONFIRM_BUDGET_SCOPE: 'CONFIRM_BUDGET_SCOPE',
  EXECUTIVE_MULTI_THREADING: 'EXECUTIVE_MULTI_THREADING',
} as const;

const PRIORITY_WEIGHTS: Record<string, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const RULE_TIE_BREAKER_ORDER: Record<string, number> = {
  [RULE_KEYS.HIRING_EXPANSION_FOLLOWUP]: 1,
  [RULE_KEYS.FUNDING_MOMENTUM]: 2,
  [RULE_KEYS.STALE_DEAL_REENGAGEMENT]: 3,
  [RULE_KEYS.SCHEDULE_TECHNICAL_DEMO]: 4,
  [RULE_KEYS.CONFIRM_BUDGET_SCOPE]: 5,
  [RULE_KEYS.EXECUTIVE_MULTI_THREADING]: 6,
};

@Injectable()
export class RecommendationsRulesService {
  readonly version = 'v1';

  evaluateAll(context: RuleEvaluationContext): CandidateRecommendation[] {
    const now = context.now ? new Date(context.now) : new Date();
    const candidates: CandidateRecommendation[] = [];

    // Calculate latestActivityAt safely
    const latestActivityAt = this.getLatestActivityTimestamp(context.activities);

    // Rule 1: HIRING_EXPANSION_FOLLOWUP
    const rule1 = this.evalHiringExpansionFollowup(context, latestActivityAt, now);
    if (rule1) candidates.push(rule1);

    // Rule 2: FUNDING_MOMENTUM
    const rule2 = this.evalFundingMomentum(context);
    if (rule2) candidates.push(rule2);

    // Rule 3: STALE_DEAL_REENGAGEMENT
    const rule3 = this.evalStaleDealReengagement(context, latestActivityAt, now);
    if (rule3) candidates.push(rule3);

    // Rule 4: SCHEDULE_TECHNICAL_DEMO
    const rule4 = this.evalScheduleTechnicalDemo(context);
    if (rule4) candidates.push(rule4);

    // Rule 5: CONFIRM_BUDGET_SCOPE
    const rule5 = this.evalConfirmBudgetScope(context);
    if (rule5) candidates.push(rule5);

    // Rule 6: EXECUTIVE_MULTI_THREADING
    const rule6 = this.evalExecutiveMultiThreading(context);
    if (rule6) candidates.push(rule6);

    // Deterministic Sorting:
    // 1. Priority: HIGH > MEDIUM > LOW
    // 2. Deterministic Tie-Breaker Order
    candidates.sort((a, b) => {
      const pDiff = (PRIORITY_WEIGHTS[b.priority] || 0) - (PRIORITY_WEIGHTS[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      const rankA = RULE_TIE_BREAKER_ORDER[a.ruleKey] || 999;
      const rankB = RULE_TIE_BREAKER_ORDER[b.ruleKey] || 999;
      return rankA - rankB;
    });

    if (candidates.length > 0) {
      candidates[0].isPrimary = true;
    }

    return candidates;
  }

  getLatestActivityTimestamp(activities: Array<{ createdAt: Date | string }>): Date | null {
    if (!activities || activities.length === 0) return null;
    let latest: Date | null = null;
    for (const act of activities) {
      const actDate = new Date(act.createdAt);
      if (!latest || actDate.getTime() > latest.getTime()) {
        latest = actDate;
      }
    }
    return latest;
  }

  // -------------------------------------------------------------
  // Rule 1: HIRING_EXPANSION_FOLLOWUP
  // -------------------------------------------------------------
  private evalHiringExpansionFollowup(
    ctx: RuleEvaluationContext,
    latestActivityAt: Date | null,
    now: Date
  ): CandidateRecommendation | null {
    // 1. Hiring Signal check
    const hiringSig = ctx.companySignals.find(
      (s) =>
        s.type === 'HIRING' &&
        (s.confidence >= 80 || s.strength === 'STRONG' || Number(s.strength) >= 0.8)
    );
    if (!hiringSig) return null;

    // 2. Deal Health check (HOT or HEALTHY)
    const health = ctx.dealIntelligence?.dealHealth;
    if (!health || !['HOT', 'HEALTHY'].includes(health)) return null;

    // 3. Activity Recency check (no activity in > 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const noRecentActivity = latestActivityAt === null || latestActivityAt.getTime() < sevenDaysAgo.getTime();
    if (!noRecentActivity) return null;

    const evidence: StoredEvidenceItem[] = [
      {
        sourceType: 'CompanySignal',
        sourceId: hiringSig.id,
        text: hiringSig.evidence || hiringSig.title,
        confidence: hiringSig.confidence,
        sourceUrl: hiringSig.sourceUrl,
      },
      {
        sourceType: 'DealIntelligence',
        sourceId: ctx.dealIntelligence?.id,
        text: `Deal health is ${health} (Score: ${ctx.dealIntelligence?.dealScore}/100)`,
      },
      {
        sourceType: 'Activity',
        sourceId: null,
        text: latestActivityAt
          ? `Last activity detected on ${latestActivityAt.toISOString().split('T')[0]} (>7 days ago)`
          : 'No CRM activity detected in the last 7 days',
      },
    ];

    return {
      ruleKey: RULE_KEYS.HIRING_EXPANSION_FOLLOWUP,
      type: 'FOLLOW_UP',
      priority: 'HIGH',
      title: 'Follow Up on Expansion & Hiring Signals',
      action: 'Follow up with the prospect about their current hiring/expansion needs.',
      reason: `Active engineering hiring signal detected with ${hiringSig.confidence}% confidence while deal health is ${health} and no touchpoint logged in the last 7 days.`,
      evidencePayload: {
        ruleKey: RULE_KEYS.HIRING_EXPANSION_FOLLOWUP,
        evidence,
        recommendationVersion: this.version,
      },
    };
  }

  // -------------------------------------------------------------
  // Rule 2: FUNDING_MOMENTUM
  // -------------------------------------------------------------
  private evalFundingMomentum(ctx: RuleEvaluationContext): CandidateRecommendation | null {
    const momentumSig = ctx.companySignals.find(
      (s) => ['FUNDING', 'PRODUCT_LAUNCH'].includes(s.type) && s.confidence >= 70
    );
    if (!momentumSig) return null;

    const evidence: StoredEvidenceItem[] = [
      {
        sourceType: 'CompanySignal',
        sourceId: momentumSig.id,
        text: momentumSig.evidence || momentumSig.title,
        confidence: momentumSig.confidence,
        sourceUrl: momentumSig.sourceUrl,
      },
      {
        sourceType: 'DealIntelligence',
        sourceId: ctx.dealIntelligence?.id,
        text: `Current buying stage: ${ctx.dealIntelligence?.buyingStage || 'DISCOVERY'}`,
      },
    ];

    return {
      ruleKey: RULE_KEYS.FUNDING_MOMENTUM,
      type: 'CONGRATULATE_AND_CONNECT',
      priority: 'HIGH',
      title: 'Leverage Funding / Product Momentum',
      action:
        'Reach out to congratulate the executive team on their recent funding/product launch and present strategic solution alignment.',
      reason: `Verified ${momentumSig.type} momentum signal detected (${momentumSig.confidence}% confidence). Executive outreach is recommended while organizational momentum is high.`,
      evidencePayload: {
        ruleKey: RULE_KEYS.FUNDING_MOMENTUM,
        evidence,
        recommendationVersion: this.version,
      },
    };
  }

  // -------------------------------------------------------------
  // Rule 3: STALE_DEAL_REENGAGEMENT
  // -------------------------------------------------------------
  private evalStaleDealReengagement(
    ctx: RuleEvaluationContext,
    latestActivityAt: Date | null,
    now: Date
  ): CandidateRecommendation | null {
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const isAtRisk = ctx.dealIntelligence?.dealHealth === 'AT_RISK';
    const isStale = latestActivityAt !== null && latestActivityAt.getTime() < fourteenDaysAgo.getTime();

    // Check overdue tasks
    const overdueTask = ctx.tasks.find(
      (t) => !t.isCompleted && new Date(t.dueDate).getTime() < now.getTime()
    );

    // Check close date approaching within 7 days
    let closeDateApproaching = false;
    if (ctx.lead.expectedCloseDate) {
      const closeDate = new Date(ctx.lead.expectedCloseDate);
      const diffDays = (closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays >= 0 && diffDays <= 7 && (latestActivityAt === null || latestActivityAt.getTime() < sevenDaysAgo.getTime())) {
        closeDateApproaching = true;
      }
    }

    if (!isAtRisk && !isStale && !overdueTask && !closeDateApproaching) {
      return null;
    }

    const evidence: StoredEvidenceItem[] = [];
    if (isAtRisk) {
      evidence.push({
        sourceType: 'DealIntelligence',
        sourceId: ctx.dealIntelligence?.id,
        text: `Deal health marked AT_RISK (Risk score: ${ctx.dealIntelligence?.riskScore}/100)`,
      });
    }
    if (isStale && latestActivityAt) {
      evidence.push({
        sourceType: 'Activity',
        sourceId: null,
        text: `No completed activity in the last 14 days (last touchpoint: ${latestActivityAt.toISOString().split('T')[0]})`,
      });
    }
    if (overdueTask) {
      evidence.push({
        sourceType: 'Task',
        sourceId: overdueTask.id,
        text: `Overdue task "${overdueTask.title}" was due on ${new Date(overdueTask.dueDate).toISOString().split('T')[0]}`,
      });
    }
    if (closeDateApproaching && ctx.lead.expectedCloseDate) {
      evidence.push({
        sourceType: 'DealIntelligence',
        sourceId: null,
        text: `Target close date (${new Date(ctx.lead.expectedCloseDate).toISOString().split('T')[0]}) is in less than 7 days without recent activity`,
      });
    }

    return {
      ruleKey: RULE_KEYS.STALE_DEAL_REENGAGEMENT,
      type: 'RISK_MITIGATION',
      priority: 'HIGH',
      title: 'Re-engage Stalled Opportunity',
      action: 'Send a re-engagement check-in to unblock pending decision items before the target close date.',
      reason: 'Opportunity exhibits clear deal risk indicators: stale engagement, overdue milestone task, or imminent close date.',
      evidencePayload: {
        ruleKey: RULE_KEYS.STALE_DEAL_REENGAGEMENT,
        evidence,
        recommendationVersion: this.version,
      },
    };
  }

  // -------------------------------------------------------------
  // Rule 4: SCHEDULE_TECHNICAL_DEMO
  // -------------------------------------------------------------
  private evalScheduleTechnicalDemo(ctx: RuleEvaluationContext): CandidateRecommendation | null {
    if (ctx.dealIntelligence?.buyingStage !== 'EVALUATION') return null;
    if ((ctx.dealIntelligence?.intentScore || 0) < 70) return null;

    // Check if demo task already exists
    const hasDemoTask = ctx.tasks.some(
      (t) => !t.isCompleted && t.title.toLowerCase().includes('demo')
    );
    if (hasDemoTask) return null;

    const evidence: StoredEvidenceItem[] = [
      {
        sourceType: 'DealIntelligence',
        sourceId: ctx.dealIntelligence?.id,
        text: `Deal is in EVALUATION stage with Intent Score: ${ctx.dealIntelligence?.intentScore}/100`,
      },
      {
        sourceType: 'Task',
        sourceId: null,
        text: 'No active demonstration task is currently scheduled',
      },
    ];

    return {
      ruleKey: RULE_KEYS.SCHEDULE_TECHNICAL_DEMO,
      type: 'SCHEDULE_DEMO',
      priority: 'HIGH',
      title: 'Schedule Technical Demonstration',
      action: 'Offer a tailored technical demo focusing on their target infrastructure requirements.',
      reason: `Prospect has reached EVALUATION stage with high purchase intent (${ctx.dealIntelligence.intentScore}/100). A hands-on technical demo will accelerate procurement.`,
      evidencePayload: {
        ruleKey: RULE_KEYS.SCHEDULE_TECHNICAL_DEMO,
        evidence,
        recommendationVersion: this.version,
      },
    };
  }

  // -------------------------------------------------------------
  // Rule 5: CONFIRM_BUDGET_SCOPE
  // -------------------------------------------------------------
  private evalConfirmBudgetScope(ctx: RuleEvaluationContext): CandidateRecommendation | null {
    if (ctx.dealIntelligence?.buyingStage !== 'QUALIFICATION') return null;

    const budgetUnconfirmed =
      !ctx.lead.budget ||
      ctx.lead.budget <= 0 ||
      (ctx.dealIntelligence?.factors?.missingData || []).some(
        (m: any) => m.category === 'BUDGET'
      );

    if (!budgetUnconfirmed) return null;

    const evidence: StoredEvidenceItem[] = [
      {
        sourceType: 'DealIntelligence',
        sourceId: ctx.dealIntelligence?.id,
        text: 'Deal is in QUALIFICATION stage with unconfirmed budget parameters',
      },
    ];

    return {
      ruleKey: RULE_KEYS.CONFIRM_BUDGET_SCOPE,
      type: 'CONFIRM_BUDGET',
      priority: 'MEDIUM',
      title: 'Establish Budget and Procurement Timeline',
      action: 'Qualify procurement scope and confirm allocated budget timeline with the prospect.',
      reason: 'Opportunity is in QUALIFICATION without a confirmed budget threshold. Verifying budget authority avoids late-stage pipeline stalls.',
      evidencePayload: {
        ruleKey: RULE_KEYS.CONFIRM_BUDGET_SCOPE,
        evidence,
        recommendationVersion: this.version,
      },
    };
  }

  // -------------------------------------------------------------
  // Rule 6: EXECUTIVE_MULTI_THREADING
  // -------------------------------------------------------------
  private evalExecutiveMultiThreading(ctx: RuleEvaluationContext): CandidateRecommendation | null {
    const employeeCount = ctx.lead.company?.employeeCount || 0;
    if (employeeCount < 500) return null;

    // Check if contacts have C-level/VP
    const hasExecutive = ctx.contacts.some((c) => {
      const title = (c.title || '').toLowerCase();
      return /ceo|cto|cfo|cmo|cro|chief|vp|vice president|head|director/i.test(title);
    });

    if (hasExecutive) return null;

    const evidence: StoredEvidenceItem[] = [
      {
        sourceType: 'Company',
        sourceId: ctx.lead.company?.id,
        text: `Enterprise scale verified: ~${employeeCount} employees`,
      },
      {
        sourceType: 'Contact',
        sourceId: null,
        text: 'No executive stakeholder (C-Level, VP, or Director) attached to lead records',
      },
    ];

    return {
      ruleKey: RULE_KEYS.EXECUTIVE_MULTI_THREADING,
      type: 'MULTI_THREAD',
      priority: 'MEDIUM',
      title: 'Identify Executive Decision-Maker',
      action: 'Multi-thread into department leadership (VP/Director) to build executive sponsorship.',
      reason: `Enterprise company with ~${employeeCount} employees requires multi-threading to secure technical and economic buyers.`,
      evidencePayload: {
        ruleKey: RULE_KEYS.EXECUTIVE_MULTI_THREADING,
        evidence,
        recommendationVersion: this.version,
      },
    };
  }
}
