import { Test, TestingModule } from '@nestjs/testing';
import { DealIntelligenceAgentService } from './deal-intelligence-agent.service';
import { DealScoringService } from './deal-scoring.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventsGateway } from '../../../events/events.gateway';
import { NotFoundException } from '@nestjs/common';

describe('DealIntelligenceAgentService', () => {
  let service: DealIntelligenceAgentService;
  let prisma: PrismaService;
  let eventsGateway: EventsGateway;
  let scoringService: DealScoringService;

  const tenantId = 'tenant-123';
  const leadId = 'lead-456';
  const agentRunId = 'run-789';

  const mockRun = {
    id: agentRunId,
    tenantId,
    agentType: 'deal_analysis',
    entityType: 'Lead',
    entityId: leadId,
    status: 'QUEUED',
    startedAt: new Date(),
  };

  const mockLead = {
    id: leadId,
    tenantId,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@stripe.com',
    budget: 100000,
    expectedCloseDate: new Date('2026-10-30'),
    stage: { name: 'Proposal Review', order: 4 },
    company: {
      id: 'comp-1',
      name: 'Stripe',
      domain: 'stripe.com',
      industry: 'FinTech',
      employeeCount: 8000,
      contacts: [
        {
          id: 'contact-1',
          firstName: 'John',
          lastName: 'Doe',
          title: 'VP of Engineering',
          seniority: 'VP',
          email: 'john@stripe.com',
          decisionMakerScore: 85,
        },
      ],
      signals: [
        {
          id: 'sig-1',
          type: 'HIRING',
          title: 'Hiring Engineering Roles',
          confidence: 88,
          strength: 1.0,
          evidence: 'Actively recruiting engineering leads.',
          detectedAt: new Date(),
        },
      ],
    },
    activities: [
      { id: 'act-1', type: 'MEETING_HELD', createdAt: new Date() },
    ],
    tasks: [
      { id: 'task-1', title: 'Follow up proposal', dueDate: new Date('2026-10-15'), isCompleted: false },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DealIntelligenceAgentService,
        DealScoringService,
        {
          provide: PrismaService,
          useValue: {
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
              upsert: jest.fn(),
            },
          },
        },
        {
          provide: EventsGateway,
          useValue: {
            emitToTenant: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DealIntelligenceAgentService>(DealIntelligenceAgentService);
    prisma = module.get<PrismaService>(PrismaService);
    eventsGateway = module.get<EventsGateway>(EventsGateway);
    scoringService = module.get<DealScoringService>(DealScoringService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Agent Run Validation & Execution', () => {
    it('should return error when agentRun does not exist for tenant', async () => {
      jest.spyOn(prisma.aIAgentRun, 'findFirst').mockResolvedValue(null);

      const res = await service.execute({
        tenantId,
        agentRunId: 'unknown-run',
        agentType: 'deal_analysis',
        entityType: 'Lead',
        entityId: leadId,
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe('AGENT_RUN_NOT_FOUND');
    });

    it('should successfully execute deal analysis, persist DealIntelligence, and emit events', async () => {
      jest.spyOn(prisma.aIAgentRun, 'findFirst').mockResolvedValue(mockRun as any);
      jest.spyOn(prisma.aIAgentRun, 'update').mockResolvedValue({} as any);
      jest.spyOn(prisma.lead, 'findFirst').mockResolvedValue(mockLead as any);
      jest.spyOn(prisma.dealIntelligence, 'upsert').mockResolvedValue({} as any);

      const res = await service.execute({
        tenantId,
        agentRunId,
        agentType: 'deal_analysis',
        entityType: 'Lead',
        entityId: leadId,
      });

      expect(res.success).toBe(true);
      expect(res.result).toBeDefined();
      expect(res.result?.scoringVersion).toBe('v1');
      expect(res.result?.dealScore).toBeGreaterThanOrEqual(0);
      expect(res.result?.dealScore).toBeLessThanOrEqual(100);

      // Verify DealIntelligence upsert was called with unique tenantId and leadId
      expect(prisma.dealIntelligence.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId_leadId: { tenantId, leadId } },
          create: expect.objectContaining({
            tenantId,
            leadId,
            dealScore: res.result?.dealScore,
            healthScore: res.result?.dealHealth,
            modelVersion: 'v1',
          }),
        })
      );

      // Verify agent run transitioned to COMPLETED
      expect(prisma.aIAgentRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: agentRunId },
          data: expect.objectContaining({ status: 'COMPLETED' }),
        })
      );

      // Verify Socket.IO events were emitted
      expect(eventsGateway.emitToTenant).toHaveBeenCalledWith(
        tenantId,
        'ai.agent.completed',
        expect.objectContaining({
          agentRunId,
          agentType: 'deal_analysis',
          status: 'COMPLETED',
          progress: 100,
        })
      );

      expect(eventsGateway.emitToTenant).toHaveBeenCalledWith(
        tenantId,
        'deal.score.updated',
        expect.objectContaining({
          leadId,
          dealScore: res.result?.dealScore,
          dealHealth: res.result?.dealHealth,
          scoringVersion: 'v1',
        })
      );

      expect(eventsGateway.emitToTenant).toHaveBeenCalledWith(
        tenantId,
        'deal.health.updated',
        expect.objectContaining({
          leadId,
          dealHealth: res.result?.dealHealth,
        })
      );
    });

    it('should transition agent run to FAILED if lead is not found', async () => {
      jest.spyOn(prisma.aIAgentRun, 'findFirst').mockResolvedValue(mockRun as any);
      jest.spyOn(prisma.aIAgentRun, 'update').mockResolvedValue({} as any);
      jest.spyOn(prisma.lead, 'findFirst').mockResolvedValue(null);

      const res = await service.execute({
        tenantId,
        agentRunId,
        agentType: 'deal_analysis',
        entityType: 'Lead',
        entityId: 'non-existent-lead',
      });

      expect(res.success).toBe(false);
      expect(prisma.aIAgentRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: agentRunId },
          data: expect.objectContaining({ status: 'FAILED' }),
        })
      );

      expect(eventsGateway.emitToTenant).toHaveBeenCalledWith(
        tenantId,
        'ai.agent.failed',
        expect.objectContaining({
          agentRunId,
          status: 'FAILED',
        })
      );
    });
  });
});
