import { OutreachHallucinationGuardService } from './outreach-hallucination-guard.service';
import { OutreachContext } from './outreach.types';

describe('OutreachHallucinationGuardService', () => {
  let service: OutreachHallucinationGuardService;

  beforeEach(() => {
    service = new OutreachHallucinationGuardService();
  });

  const baseContext: OutreachContext = {
    lead: {
      id: 'lead-1',
      firstName: 'Patrick',
      lastName: 'Collison',
      title: 'CEO',
      email: 'patrick@stripe.com',
      budget: 50000,
    },
    company: {
      name: 'Stripe',
      industry: 'Fintech',
      description: 'Online payment infrastructure',
    },
    recommendation: {
      id: 'rec-1',
      type: 'ACTION',
      title: 'Hiring Expansion Follow-Up',
      action: 'Follow up with the prospect about their current hiring/expansion needs.',
      ruleKey: 'HIRING_EXPANSION_FOLLOWUP',
      priority: 'HIGH',
      reason: 'Active engineering hiring detected',
    },
    deal: {
      dealScore: 85,
      dealHealth: 'HEALTHY',
      buyingStage: 'EVALUATION',
      urgency: 'HIGH',
    },
    signals: [
      {
        id: 'sig-1',
        type: 'HIRING',
        title: 'Engineering Expansion',
        confidence: 88,
        evidence: 'Multiple backend infrastructure openings',
      },
    ],
    outreachType: 'FOLLOW_UP',
    tone: 'PROFESSIONAL',
  };

  it('should validate and accept grounded AI draft', () => {
    const rawJson = JSON.stringify({
      subject: "Supporting Stripe's engineering growth",
      body: "Hi Patrick,\n\nI noticed Stripe is actively expanding its engineering team. Given your current hiring trajectory, I thought it would be valuable to connect around scaling infrastructure smoothly.\n\nWould you be open to a brief conversation this week?\n\nBest regards,\n[Your Name]",
      personalizationPoints: ['Mentioned active engineering hiring', 'Addressed to CEO Patrick'],
      usedEvidence: ['HIRING signal (confidence: 88)'],
    });

    const result = service.validateLlmOutput(rawJson, baseContext);
    expect(result.isValid).toBe(true);
    expect(result.cleanedOutput).toBeDefined();
    expect(result.cleanedOutput?.subject).toContain("Stripe's engineering growth");
    expect(result.cleanedOutput?.body).toContain('Hi Patrick');
  });

  it('should catch ungrounded financial numbers and flag as hallucination', () => {
    const rawJson = JSON.stringify({
      subject: 'Congratulations on your Series D $500M funding round!',
      body: 'Hi Patrick,\n\nCongratulations on raising $500 million yesterday! We want to help you spend your $500 million treasury.\n\nBest regards,\n[Your Name]',
      personalizationPoints: ['$500M funding'],
      usedEvidence: ['Unverified news'],
    });

    const result = service.validateLlmOutput(rawJson, baseContext);
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('financial');
  });

  it('should reject email if recipient is not properly addressed', () => {
    const rawJson = JSON.stringify({
      subject: "Quick question about your software stack",
      body: "Dear Sir or Madam,\n\nI am writing to inquire if you are looking to purchase software for your company today.\n\nBest regards,\n[Your Name]",
      personalizationPoints: ['Generic outreach'],
      usedEvidence: [],
    });

    const result = service.validateLlmOutput(rawJson, baseContext);
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('address recipient');
  });

  it('should produce deterministic fallback draft for each outreach type', () => {
    const types: Array<OutreachContext['outreachType']> = [
      'FOLLOW_UP',
      'FUNDING_OUTREACH',
      'PRODUCT_LAUNCH_OUTREACH',
      'RE_ENGAGEMENT',
      'DEMO_OUTREACH',
      'BUDGET_OUTREACH',
      'EXECUTIVE_OUTREACH',
    ];

    for (const type of types) {
      const fallback = service.generateFallbackTemplate({ ...baseContext, outreachType: type });
      expect(fallback.subject).toBeDefined();
      expect(fallback.subject.length).toBeGreaterThan(5);
      expect(fallback.body).toContain(baseContext.lead.firstName);
      expect(fallback.body).toContain(baseContext.company.name);
      expect(fallback.personalizationPoints.length).toBeGreaterThan(0);
      expect(fallback.usedEvidence.length).toBeGreaterThan(0);
    }
  });
});
