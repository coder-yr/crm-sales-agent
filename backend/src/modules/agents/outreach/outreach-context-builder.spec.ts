import { OutreachContextBuilderService } from './outreach-context-builder.service';
import { OutreachContext } from './outreach.types';

describe('OutreachContextBuilderService', () => {
  let service: OutreachContextBuilderService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      lead: {
        findFirst: jest.fn(),
      },
      aIRecommendation: {
        findFirst: jest.fn(),
      },
      dealIntelligence: {
        findFirst: jest.fn(),
      },
      companySignal: {
        findMany: jest.fn(),
      },
      activity: {
        findFirst: jest.fn(),
      },
    };
    service = new OutreachContextBuilderService(mockPrisma);
  });

  it('should build context correctly from lead, recommendation, signals and deal data', async () => {
    mockPrisma.lead.findFirst.mockResolvedValue({
      id: 'lead-1',
      companyId: 'comp-1',
      firstName: 'Patrick',
      lastName: 'Collison',
      title: 'CEO',
      email: 'patrick@stripe.com',
      budget: 50000,
      company: {
        id: 'comp-1',
        name: 'Stripe',
        industry: 'Fintech',
        description: 'Payment infrastructure for the internet',
      },
    });

    mockPrisma.aIRecommendation.findFirst.mockResolvedValue({
      id: 'rec-1',
      title: 'Hiring Expansion Follow-Up',
      action: 'Follow up with Patrick regarding engineering expansion',
      ruleKey: 'HIRING_EXPANSION_FOLLOWUP',
      priority: 'HIGH',
      reason: 'Active engineering hiring detected',
    });

    mockPrisma.dealIntelligence.findFirst.mockResolvedValue({
      dealScore: 85,
      healthScore: 85,
      dealHealth: 'HEALTHY',
      buyingStage: 'EVALUATION',
      urgency: 'HIGH',
    });

    mockPrisma.companySignal.findMany.mockResolvedValue([
      {
        id: 'sig-1',
        type: 'HIRING',
        title: 'Backend Engineer Roles',
        description: 'Stripe is expanding its payments infrastructure team',
        confidence: 88,
        strength: 85,
        evidence: 'Active career postings for backend engineers in SF',
        sourceUrl: 'https://stripe.com/jobs',
      },
    ]);

    mockPrisma.activity.findFirst.mockResolvedValue({
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
    });

    const context = await service.buildContext('tenant-1', 'lead-1', 'rec-1', 'PROFESSIONAL');

    expect(context.lead.firstName).toBe('Patrick');
    expect(context.company.name).toBe('Stripe');
    expect(context.outreachType).toBe('FOLLOW_UP');
    expect(context.signals.length).toBe(1);
    expect(context.signals[0].type).toBe('HIRING');
    expect(context.recency?.daysSinceLastActivity).toBeGreaterThanOrEqual(7);
  });

  it('should isolate untrusted web evidence inside XML boundary tags when building prompt', () => {
    const context: OutreachContext = {
      lead: {
        id: 'lead-1',
        firstName: 'Patrick',
        lastName: 'Collison',
        title: 'CEO',
      },
      company: {
        name: 'Stripe',
        industry: 'Fintech',
      },
      recommendation: {
        id: 'rec-1',
        type: 'ACTION',
        title: 'Hiring Follow-up',
        action: 'Reach out to Patrick',
        ruleKey: 'HIRING_EXPANSION_FOLLOWUP',
        priority: 'HIGH',
        reason: 'Hiring detected',
      },
      deal: {
        dealScore: 85,
        dealHealth: 'HEALTHY',
        buyingStage: 'EVALUATION',
      },
      signals: [
        {
          id: 'sig-1',
          type: 'HIRING',
          title: 'Hiring Engineers',
          confidence: 88,
          evidence: '<script>alert("hack")</script>Stripe is hiring 50 engineers',
        },
      ],
      outreachType: 'FOLLOW_UP',
      tone: 'PROFESSIONAL',
    };

    const prompt = service.buildPrompt(context);

    expect(prompt).toContain('<untrusted_web_evidence>');
    expect(prompt).toContain('</untrusted_web_evidence>');
    expect(prompt).toContain('CRITICAL ANTI-HALLUCINATION & INTEGRITY RULES');
    expect(prompt).toContain('Patrick');
    expect(prompt).toContain('Stripe');
    // Ensure script tag was sanitized out
    expect(prompt).not.toContain('<script>');
  });
});
