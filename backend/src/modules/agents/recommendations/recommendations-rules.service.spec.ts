import { RecommendationsRulesService, RULE_KEYS, RuleEvaluationContext } from './recommendations-rules.service';

describe('RecommendationsRulesService (Deterministic Rule Engine)', () => {
  let service: RecommendationsRulesService;
  const fixedNow = new Date('2026-09-23T12:00:00Z');

  beforeEach(() => {
    service = new RecommendationsRulesService();
  });

  const createBaseContext = (overrides?: Partial<RuleEvaluationContext>): RuleEvaluationContext => ({
    lead: {
      id: 'lead-1',
      tenantId: 'tenant-1',
      firstName: 'Patrick',
      lastName: 'Collison',
      budget: 120000,
      stage: { name: 'Evaluation', order: 3 },
      expectedCloseDate: new Date('2026-10-30T00:00:00Z'),
      companyId: 'company-1',
      company: {
        id: 'company-1',
        name: 'Stripe',
        industry: 'FinTech',
        employeeCount: 7500,
        revenue: 14000000000,
      },
    },
    companySignals: [],
    dealIntelligence: {
      id: 'di-1',
      dealScore: 85,
      intentScore: 80,
      companyFitScore: 85,
      contactFitScore: 80,
      engagementScore: 70,
      riskScore: 15,
      dealHealth: 'HEALTHY',
      buyingStage: 'EVALUATION',
      urgency: 'HIGH',
      factors: {
        positives: [],
        risks: [],
        missingData: [],
      },
    },
    activities: [],
    tasks: [],
    contacts: [
      {
        id: 'contact-1',
        firstName: 'Patrick',
        lastName: 'Collison',
        title: 'Chief Executive Officer',
      },
    ],
    now: fixedNow,
    ...overrides,
  });

  describe('Rule 1: HIRING_EXPANSION_FOLLOWUP', () => {
    it('fires FOLLOW_UP when HIRING >= 80%, dealHealth is HEALTHY, and activity > 7 days ago', () => {
      const tenDaysAgo = new Date(fixedNow.getTime() - 10 * 24 * 60 * 60 * 1000);
      const ctx = createBaseContext({
        companySignals: [
          {
            id: 'sig-1',
            type: 'HIRING',
            title: 'Expanding infrastructure team',
            confidence: 88,
            evidence: 'Actively recruiting 50+ staff engineers',
            sourceUrl: 'https://stripe.com/jobs',
          },
        ],
        dealIntelligence: {
          id: 'di-1',
          dealScore: 85,
          intentScore: 80,
          companyFitScore: 85,
          contactFitScore: 80,
          engagementScore: 70,
          riskScore: 15,
          dealHealth: 'HEALTHY',
          buyingStage: 'EVALUATION',
          urgency: 'HIGH',
        },
        activities: [{ id: 'act-1', type: 'CALL', createdAt: tenDaysAgo }],
      });

      const recs = service.evaluateAll(ctx);
      const followup = recs.find((r) => r.ruleKey === RULE_KEYS.HIRING_EXPANSION_FOLLOWUP);

      expect(followup).toBeDefined();
      expect(followup?.priority).toBe('HIGH');
      expect(followup?.type).toBe('FOLLOW_UP');
      expect(followup?.action).toBe('Follow up with the prospect about their current hiring/expansion needs.');
      expect(followup?.evidencePayload.evidence.length).toBe(3);
      expect(followup?.evidencePayload.recommendationVersion).toBe('v1');
    });

    it('NEGATIVE: does NOT fire when HIRING signal confidence is 79%', () => {
      const tenDaysAgo = new Date(fixedNow.getTime() - 10 * 24 * 60 * 60 * 1000);
      const ctx = createBaseContext({
        companySignals: [
          {
            id: 'sig-1',
            type: 'HIRING',
            title: 'Hiring engineers',
            confidence: 79, // Below 80 threshold
            evidence: 'Recruiting engineers',
          },
        ],
        activities: [{ id: 'act-1', type: 'CALL', createdAt: tenDaysAgo }],
      });

      const recs = service.evaluateAll(ctx);
      const followup = recs.find((r) => r.ruleKey === RULE_KEYS.HIRING_EXPANSION_FOLLOWUP);
      expect(followup).toBeUndefined();
    });

    it('NEGATIVE: does NOT fire when dealHealth is COLD', () => {
      const tenDaysAgo = new Date(fixedNow.getTime() - 10 * 24 * 60 * 60 * 1000);
      const ctx = createBaseContext({
        companySignals: [
          {
            id: 'sig-1',
            type: 'HIRING',
            title: 'Hiring engineers',
            confidence: 88,
          },
        ],
        dealIntelligence: {
          id: 'di-1',
          dealScore: 20,
          intentScore: 20,
          companyFitScore: 20,
          contactFitScore: 20,
          engagementScore: 10,
          riskScore: 70,
          dealHealth: 'COLD', // Not HOT or HEALTHY
          buyingStage: 'DISCOVERY',
          urgency: 'LOW',
        },
        activities: [{ id: 'act-1', type: 'CALL', createdAt: tenDaysAgo }],
      });

      const recs = service.evaluateAll(ctx);
      const followup = recs.find((r) => r.ruleKey === RULE_KEYS.HIRING_EXPANSION_FOLLOWUP);
      expect(followup).toBeUndefined();
    });

    it('NEGATIVE: does NOT fire when there was recent activity yesterday (< 7 days ago)', () => {
      const yesterday = new Date(fixedNow.getTime() - 1 * 24 * 60 * 60 * 1000);
      const ctx = createBaseContext({
        companySignals: [
          {
            id: 'sig-1',
            type: 'HIRING',
            title: 'Hiring engineers',
            confidence: 88,
          },
        ],
        activities: [{ id: 'act-1', type: 'CALL', createdAt: yesterday }],
      });

      const recs = service.evaluateAll(ctx);
      const followup = recs.find((r) => r.ruleKey === RULE_KEYS.HIRING_EXPANSION_FOLLOWUP);
      expect(followup).toBeUndefined();
    });
  });

  describe('Rule 2: FUNDING_MOMENTUM', () => {
    it('fires CONGRATULATE_AND_CONNECT on FUNDING signal with confidence >= 70', () => {
      const ctx = createBaseContext({
        companySignals: [
          {
            id: 'sig-fund',
            type: 'FUNDING',
            title: 'Series D Round Closed',
            confidence: 90,
            evidence: 'Raised $100M Series D led by Sequoia',
          },
        ],
      });

      const recs = service.evaluateAll(ctx);
      const funding = recs.find((r) => r.ruleKey === RULE_KEYS.FUNDING_MOMENTUM);
      expect(funding).toBeDefined();
      expect(funding?.type).toBe('CONGRATULATE_AND_CONNECT');
      expect(funding?.priority).toBe('HIGH');
    });
  });

  describe('Rule 3: STALE_DEAL_REENGAGEMENT', () => {
    it('fires RISK_MITIGATION when last activity is > 14 days ago', () => {
      const sixteenDaysAgo = new Date(fixedNow.getTime() - 16 * 24 * 60 * 60 * 1000);
      const ctx = createBaseContext({
        activities: [{ id: 'act-old', type: 'EMAIL', createdAt: sixteenDaysAgo }],
      });

      const recs = service.evaluateAll(ctx);
      const stale = recs.find((r) => r.ruleKey === RULE_KEYS.STALE_DEAL_REENGAGEMENT);
      expect(stale).toBeDefined();
      expect(stale?.type).toBe('RISK_MITIGATION');
      expect(stale?.priority).toBe('HIGH');
    });

    it('fires RISK_MITIGATION when dealHealth is AT_RISK', () => {
      const ctx = createBaseContext({
        dealIntelligence: {
          id: 'di-risk',
          dealScore: 35,
          intentScore: 40,
          companyFitScore: 50,
          contactFitScore: 40,
          engagementScore: 10,
          riskScore: 65,
          dealHealth: 'AT_RISK',
          buyingStage: 'EVALUATION',
          urgency: 'HIGH',
        },
      });

      const recs = service.evaluateAll(ctx);
      const stale = recs.find((r) => r.ruleKey === RULE_KEYS.STALE_DEAL_REENGAGEMENT);
      expect(stale).toBeDefined();
    });
  });

  describe('Rule 4: SCHEDULE_TECHNICAL_DEMO', () => {
    it('fires SCHEDULE_DEMO when stage is EVALUATION, intent >= 70, and no demo task scheduled', () => {
      const ctx = createBaseContext({
        dealIntelligence: {
          id: 'di-eval',
          dealScore: 80,
          intentScore: 85,
          companyFitScore: 80,
          contactFitScore: 80,
          engagementScore: 70,
          riskScore: 10,
          dealHealth: 'HEALTHY',
          buyingStage: 'EVALUATION',
          urgency: 'HIGH',
        },
        tasks: [{ id: 'task-1', title: 'Send whitepaper', isCompleted: false, dueDate: fixedNow }],
      });

      const recs = service.evaluateAll(ctx);
      const demo = recs.find((r) => r.ruleKey === RULE_KEYS.SCHEDULE_TECHNICAL_DEMO);
      expect(demo).toBeDefined();
      expect(demo?.type).toBe('SCHEDULE_DEMO');
      expect(demo?.priority).toBe('HIGH');
    });

    it('does NOT fire if a demo task is already active', () => {
      const ctx = createBaseContext({
        dealIntelligence: {
          id: 'di-eval',
          dealScore: 80,
          intentScore: 85,
          companyFitScore: 80,
          contactFitScore: 80,
          engagementScore: 70,
          riskScore: 10,
          dealHealth: 'HEALTHY',
          buyingStage: 'EVALUATION',
          urgency: 'HIGH',
        },
        tasks: [{ id: 'task-1', title: 'Schedule Product Demo', isCompleted: false, dueDate: fixedNow }],
      });

      const recs = service.evaluateAll(ctx);
      const demo = recs.find((r) => r.ruleKey === RULE_KEYS.SCHEDULE_TECHNICAL_DEMO);
      expect(demo).toBeUndefined();
    });
  });

  describe('Rule 5: CONFIRM_BUDGET_SCOPE', () => {
    it('fires CONFIRM_BUDGET when stage is QUALIFICATION and budget is unconfirmed', () => {
      const ctx = createBaseContext({
        lead: {
          id: 'lead-1',
          tenantId: 'tenant-1',
          firstName: 'Patrick',
          lastName: 'Collison',
          budget: null, // Budget null
          stage: { name: 'Qualification', order: 2 },
        },
        dealIntelligence: {
          id: 'di-qual',
          dealScore: 50,
          intentScore: 50,
          companyFitScore: 60,
          contactFitScore: 50,
          engagementScore: 40,
          riskScore: 20,
          dealHealth: 'WARM',
          buyingStage: 'QUALIFICATION',
          urgency: 'MEDIUM',
          factors: {
            missingData: [{ category: 'BUDGET', title: 'Missing Budget' }],
          },
        },
      });

      const recs = service.evaluateAll(ctx);
      const budgetRec = recs.find((r) => r.ruleKey === RULE_KEYS.CONFIRM_BUDGET_SCOPE);
      expect(budgetRec).toBeDefined();
      expect(budgetRec?.type).toBe('CONFIRM_BUDGET');
      expect(budgetRec?.priority).toBe('MEDIUM');
    });
  });

  describe('Rule 6: EXECUTIVE_MULTI_THREADING', () => {
    it('fires MULTI_THREAD when company size >= 500 and no C-level/VP contact exists', () => {
      const ctx = createBaseContext({
        lead: {
          id: 'lead-1',
          tenantId: 'tenant-1',
          firstName: 'John',
          lastName: 'Developer',
          company: {
            id: 'company-1',
            name: 'Big Enterprise',
            employeeCount: 1200,
          },
        },
        contacts: [
          { id: 'c-1', firstName: 'John', lastName: 'Developer', title: 'Software Engineer' },
        ],
      });

      const recs = service.evaluateAll(ctx);
      const multi = recs.find((r) => r.ruleKey === RULE_KEYS.EXECUTIVE_MULTI_THREADING);
      expect(multi).toBeDefined();
      expect(multi?.type).toBe('MULTI_THREAD');
      expect(multi?.priority).toBe('MEDIUM');
    });
  });

  describe('Deterministic Tie-Breaker and Primary Designation', () => {
    it('designates HIRING_EXPANSION_FOLLOWUP as primary when multiple HIGH priority rules fire', () => {
      const tenDaysAgo = new Date(fixedNow.getTime() - 10 * 24 * 60 * 60 * 1000);
      const ctx = createBaseContext({
        companySignals: [
          {
            id: 'sig-hire',
            type: 'HIRING',
            title: 'Hiring engineers',
            confidence: 90,
          },
          {
            id: 'sig-fund',
            type: 'FUNDING',
            title: 'Series B Funding',
            confidence: 85,
          },
        ],
        dealIntelligence: {
          id: 'di-1',
          dealScore: 85,
          intentScore: 80,
          companyFitScore: 85,
          contactFitScore: 80,
          engagementScore: 70,
          riskScore: 15,
          dealHealth: 'HEALTHY',
          buyingStage: 'EVALUATION',
          urgency: 'HIGH',
        },
        activities: [{ id: 'act-1', type: 'CALL', createdAt: tenDaysAgo }],
      });

      const recs = service.evaluateAll(ctx);
      expect(recs.length).toBeGreaterThanOrEqual(2);

      // Verify order: HIRING rank 1 beats FUNDING rank 2
      expect(recs[0].ruleKey).toBe(RULE_KEYS.HIRING_EXPANSION_FOLLOWUP);
      expect(recs[0].isPrimary).toBe(true);

      expect(recs[1].ruleKey).toBe(RULE_KEYS.FUNDING_MOMENTUM);
      expect(recs[1].isPrimary).toBeFalsy();
    });
  });
});
