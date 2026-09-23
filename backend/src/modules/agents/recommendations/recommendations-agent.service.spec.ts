import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsAgentService } from './recommendations-agent.service';
import { RecommendationsRulesService, RULE_KEYS } from './recommendations-rules.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventsGateway } from '../../../events/events.gateway';

describe('RecommendationsAgentService Unit Tests', () => {
  let service: RecommendationsAgentService;
  let prisma: any;
  let eventsGateway: any;
  let rulesService: RecommendationsRulesService;

  beforeEach(async () => {
    prisma = {
      aIAgentRun: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      lead: {
        findFirst: jest.fn(),
      },
      companySignal: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      dealIntelligence: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      activity: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      task: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      contact: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      aIRecommendation: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    eventsGateway = {
      emitToTenant: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsAgentService,
        RecommendationsRulesService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventsGateway, useValue: eventsGateway },
      ],
    }).compile();

    service = module.get<RecommendationsAgentService>(RecommendationsAgentService);
    rulesService = module.get<RecommendationsRulesService>(RecommendationsRulesService);
  });

  it('successfully executes recommendations agent and creates AIRecommendation rows', async () => {
    const mockRun = { id: 'run-1', tenantId: 'tenant-1', status: 'QUEUED' };
    const mockLead = {
      id: 'lead-1',
      tenantId: 'tenant-1',
      firstName: 'Jane',
      lastName: 'Doe',
      companyId: 'company-1',
      company: { id: 'company-1', name: 'Acme', employeeCount: 100 },
    };

    const mockSignal = {
      id: 'sig-1',
      type: 'HIRING',
      title: 'Hiring devs',
      confidence: 88,
      evidence: 'Hiring 20 developers',
      sourceUrl: 'https://acme.com',
    };

    const mockDealIntel = {
      id: 'di-1',
      dealScore: 80,
      intentScore: 85,
      companyFitScore: 80,
      contactFitScore: 80,
      engagementScore: 70,
      riskScore: 10,
      dealHealth: 'HEALTHY',
      buyingStage: 'EVALUATION',
      urgency: 'HIGH',
    };

    prisma.aIAgentRun.findFirst.mockResolvedValue(mockRun);
    prisma.aIAgentRun.update.mockResolvedValue({ ...mockRun, status: 'RUNNING' });
    prisma.lead.findFirst.mockResolvedValue(mockLead);
    prisma.companySignal.findMany.mockResolvedValue([mockSignal]);
    prisma.dealIntelligence.findUnique.mockResolvedValue(mockDealIntel);
    prisma.activity.findMany.mockResolvedValue([]); // no activity -> qualifies for HIRING_EXPANSION_FOLLOWUP
    prisma.aIRecommendation.findMany.mockResolvedValue([]); // no existing active recommendations
    prisma.aIRecommendation.create.mockImplementation((args: any) => Promise.resolve({ id: 'rec-1', ...args.data }));

    const result = await service.execute({
      tenantId: 'tenant-1',
      agentRunId: 'run-1',
      agentType: 'recommendations',
      entityType: 'Lead',
      entityId: 'lead-1',
    });

    expect(result.success).toBe(true);
    expect(result.count).toBeGreaterThanOrEqual(1);

    // Verify AIRecommendation created
    expect(prisma.aIRecommendation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          leadId: 'lead-1',
          ruleKey: RULE_KEYS.HIRING_EXPANSION_FOLLOWUP,
          type: 'FOLLOW_UP',
          priority: 'HIGH',
          status: 'PENDING',
        }),
      })
    );

    // Verify events emitted
    expect(eventsGateway.emitToTenant).toHaveBeenCalledWith(
      'tenant-1',
      'recommendations.generated',
      expect.objectContaining({ leadId: 'lead-1' })
    );

    // Verify agent run transitioned to COMPLETED
    expect(prisma.aIAgentRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'run-1' },
        data: expect.objectContaining({ status: 'COMPLETED' }),
      })
    );
  });

  it('deduplicates: does not create duplicate AIRecommendation if already PENDING or ACCEPTED', async () => {
    const mockRun = { id: 'run-1', tenantId: 'tenant-1', status: 'QUEUED' };
    const mockLead = {
      id: 'lead-1',
      tenantId: 'tenant-1',
      firstName: 'Jane',
      lastName: 'Doe',
      companyId: 'company-1',
      company: { id: 'company-1', name: 'Acme' },
    };

    const mockSignal = {
      id: 'sig-1',
      type: 'HIRING',
      confidence: 88,
    };

    const mockDealIntel = {
      id: 'di-1',
      dealHealth: 'HEALTHY',
    };

    prisma.aIAgentRun.findFirst.mockResolvedValue(mockRun);
    prisma.aIAgentRun.update.mockResolvedValue({ ...mockRun, status: 'RUNNING' });
    prisma.lead.findFirst.mockResolvedValue(mockLead);
    prisma.companySignal.findMany.mockResolvedValue([mockSignal]);
    prisma.dealIntelligence.findUnique.mockResolvedValue(mockDealIntel);

    // Existing active recommendation already present
    prisma.aIRecommendation.findMany.mockResolvedValue([
      {
        id: 'rec-existing-1',
        tenantId: 'tenant-1',
        leadId: 'lead-1',
        ruleKey: RULE_KEYS.HIRING_EXPANSION_FOLLOWUP,
        status: 'PENDING',
      },
    ]);
    prisma.aIRecommendation.update.mockResolvedValue({ id: 'rec-existing-1' });

    const result = await service.execute({
      tenantId: 'tenant-1',
      agentRunId: 'run-1',
      agentType: 'recommendations',
      entityType: 'Lead',
      entityId: 'lead-1',
    });

    expect(result.success).toBe(true);
    // Should NOT call create because it was already PENDING
    expect(prisma.aIRecommendation.create).not.toHaveBeenCalled();
    // Should call update to refresh evidence
    expect(prisma.aIRecommendation.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'rec-existing-1' } })
    );
  });

  it('fails safely and transitions agent run to FAILED when lead does not exist', async () => {
    const mockRun = { id: 'run-1', tenantId: 'tenant-1', status: 'QUEUED' };
    prisma.aIAgentRun.findFirst.mockResolvedValue(mockRun);
    prisma.aIAgentRun.update.mockResolvedValue({ ...mockRun, status: 'RUNNING' });
    prisma.lead.findFirst.mockResolvedValue(null); // Not found

    const result = await service.execute({
      tenantId: 'tenant-1',
      agentRunId: 'run-1',
      agentType: 'recommendations',
      entityType: 'Lead',
      entityId: 'non-existent',
    });

    expect(result.success).toBe(false);
    expect(prisma.aIAgentRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'run-1' },
        data: expect.objectContaining({ status: 'FAILED' }),
      })
    );
    expect(eventsGateway.emitToTenant).toHaveBeenCalledWith(
      'tenant-1',
      'ai.agent.failed',
      expect.objectContaining({ status: 'FAILED' })
    );
  });
});
