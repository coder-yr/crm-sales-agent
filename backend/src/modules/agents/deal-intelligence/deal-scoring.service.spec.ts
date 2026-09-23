import { Test, TestingModule } from '@nestjs/testing';
import { DealScoringService, DealScoringLeadInput } from './deal-scoring.service';

describe('DealScoringService', () => {
  let service: DealScoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DealScoringService],
    }).compile();

    service = module.get<DealScoringService>(DealScoringService);
  });

  it('should be defined and declare scoringVersion v1', () => {
    expect(service).toBeDefined();
    expect(DealScoringService.SCORING_VERSION).toBe('v1');
  });

  describe('Deterministic Scoring & Formula', () => {
    const now = new Date('2026-09-23T12:00:00Z');

    const sampleLead: DealScoringLeadInput = {
      id: 'lead-1',
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@stripe.com',
      budget: 50000,
      stageName: 'Proposal / Evaluation',
      createdAt: new Date('2026-09-15T00:00:00Z'),
      updatedAt: new Date('2026-09-22T00:00:00Z'),
      expectedCloseDate: new Date('2026-10-15T00:00:00Z'),
      company: {
        id: 'comp-1',
        name: 'Stripe',
        domain: 'stripe.com',
        websiteUrl: 'https://stripe.com',
        industry: 'Financial Technology (FinTech)',
        description: 'Financial infrastructure for the internet.',
        employeeCount: 8000,
      },
      contact: {
        id: 'cont-1',
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@stripe.com',
        phone: '+1-555-0199',
        title: 'Chief Technology Officer',
        seniority: 'C-Level',
        decisionMakerScore: 95,
      },
      signals: [
        {
          id: 'sig-1',
          type: 'HIRING',
          title: 'Engineering Expansion',
          evidence: 'Actively recruiting distributed engineering teams globally.',
          strength: 1.0,
          confidence: 88,
          detectedAt: new Date('2026-09-20T00:00:00Z'),
        },
        {
          id: 'sig-2',
          type: 'EXPANSION',
          title: 'Global Office Opening',
          evidence: 'Opening new payment infrastructure hubs in APAC.',
          strength: 1.0,
          confidence: 92,
          detectedAt: new Date('2026-09-18T00:00:00Z'),
        },
      ],
      activities: [
        { id: 'act-1', type: 'MEETING_HELD', createdAt: new Date('2026-09-22T00:00:00Z') },
        { id: 'act-2', type: 'STAGE_CHANGED', createdAt: new Date('2026-09-21T00:00:00Z') },
      ],
      tasks: [
        { id: 'task-1', title: 'Send contract draft', dueDate: new Date('2026-10-01T00:00:00Z'), isCompleted: false },
      ],
    };

    it('should calculate identical scores for the same inputs (pure determinism)', () => {
      const res1 = service.calculateDealIntelligence(sampleLead);
      const res2 = service.calculateDealIntelligence(sampleLead);

      expect(res1.scoringVersion).toBe('v1');
      expect(res1.dealScore).toBe(res2.dealScore);
      expect(res1.intentScore).toBe(res2.intentScore);
      expect(res1.companyFitScore).toBe(res2.companyFitScore);
      expect(res1.contactFitScore).toBe(res2.contactFitScore);
      expect(res1.engagementScore).toBe(res2.engagementScore);
      expect(res1.riskScore).toBe(res2.riskScore);
      expect(res1.dealHealth).toBe(res2.dealHealth);
      expect(res1.buyingStage).toBe(res2.buyingStage);
      expect(res1.urgency).toBe(res2.urgency);
    });

    it('should satisfy the 40/25/15/10/10 weighting formula and remain bounded 0-100', () => {
      const res = service.calculateDealIntelligence(sampleLead);

      expect(res.dealScore).toBeGreaterThanOrEqual(0);
      expect(res.dealScore).toBeLessThanOrEqual(100);
      expect(res.intentScore).toBeGreaterThanOrEqual(0);
      expect(res.intentScore).toBeLessThanOrEqual(100);
      expect(res.companyFitScore).toBeGreaterThanOrEqual(0);
      expect(res.companyFitScore).toBeLessThanOrEqual(100);
      expect(res.contactFitScore).toBeGreaterThanOrEqual(0);
      expect(res.contactFitScore).toBeLessThanOrEqual(100);
      expect(res.engagementScore).toBeGreaterThanOrEqual(0);
      expect(res.engagementScore).toBeLessThanOrEqual(100);
      expect(res.riskScore).toBeGreaterThanOrEqual(0);
      expect(res.riskScore).toBeLessThanOrEqual(100);

      const expectedRaw =
        0.4 * res.intentScore +
        0.25 * res.companyFitScore +
        0.15 * res.contactFitScore +
        0.1 * res.engagementScore +
        0.1 * (100 - res.riskScore);

      expect(res.dealScore).toBe(Math.round(expectedRaw));
    });

    it('should map BuyingStage from CRM stage name deterministically', () => {
      expect(service.calculateDealIntelligence({ ...sampleLead, stageName: 'Discovery Call' }).buyingStage).toBe('DISCOVERY');
      expect(service.calculateDealIntelligence({ ...sampleLead, stageName: 'Vetting / Qualification' }).buyingStage).toBe('QUALIFICATION');
      expect(service.calculateDealIntelligence({ ...sampleLead, stageName: 'Product Demo & Proposal' }).buyingStage).toBe('EVALUATION');
      expect(service.calculateDealIntelligence({ ...sampleLead, stageName: 'Contract Review & Negotiation' }).buyingStage).toBe('NEGOTIATION');
      expect(service.calculateDealIntelligence({ ...sampleLead, stageName: 'Closed Won' }).buyingStage).toBe('DECISION');
    });

    it('should produce health HOT or HEALTHY for high scoring deals with low risk', () => {
      const res = service.calculateDealIntelligence(sampleLead);
      expect(['HOT', 'HEALTHY']).toContain(res.dealHealth);
    });
  });

  describe('Missing Data vs Real Risk Separation', () => {
    it('should handle a brand new lead with zero data without extreme risk or crashing', () => {
      const bareLead: DealScoringLeadInput = {
        id: 'bare-lead',
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const res = service.calculateDealIntelligence(bareLead);

      expect(res.dealScore).toBeGreaterThanOrEqual(0);
      expect(res.dealScore).toBeLessThanOrEqual(100);
      expect(res.dataCompleteness).toBeLessThan(30);

      // It should NOT pretend a bare new lead is 90% confirmed risk
      expect(res.riskScore).toBeLessThan(50);

      // It should document missing information transparently
      expect(res.missingInformation.length).toBeGreaterThan(0);
      expect(res.missingInformation.some((m) => m.includes('BUDGET'))).toBe(true);
      expect(res.missingInformation.some((m) => m.includes('COMPANY'))).toBe(true);
      expect(res.missingInformation.some((m) => m.includes('CONTACT'))).toBe(true);
      expect(res.missingInformation.some((m) => m.includes('SIGNALS'))).toBe(true);
    });

    it('should identify real risks: overdue tasks and stale follow-up >14d', () => {
      const pastDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000); // 20 days ago

      const atRiskLead: DealScoringLeadInput = {
        id: 'risk-lead',
        firstName: 'Bob',
        lastName: 'Vance',
        createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        updatedAt: pastDate,
        expectedCloseDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Close date expired!
        activities: [{ id: 'old-act', type: 'NOTE_ADDED', createdAt: pastDate }],
        tasks: [
          {
            id: 'task-overdue',
            title: 'Send quote',
            dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            isCompleted: false, // Overdue task!
          },
        ],
      };

      const res = service.calculateDealIntelligence(atRiskLead);

      expect(res.riskScore).toBeGreaterThanOrEqual(50);
      expect(res.riskFactors.length).toBeGreaterThan(0);
      expect(res.riskFactors.some((r) => r.factor.includes('OVERDUE'))).toBe(true);
      expect(res.riskFactors.some((r) => r.factor.includes('STALE') || r.factor.includes('CLOSE'))).toBe(true);
      expect(['AT_RISK', 'COLD']).toContain(res.dealHealth);
    });
  });
});
