import { Test, TestingModule } from '@nestjs/testing';
import { AgentsController } from '../agents.controller';
import { AgentsService } from '../agents.service';
import { DealIntelligenceController } from '../../intelligence/deal-intelligence.controller';
import { IntelligenceService } from '../../intelligence/intelligence.service';
import { NotFoundException } from '@nestjs/common';

describe('Deal Analysis Controllers & Endpoints', () => {
  let agentsController: AgentsController;
  let dealIntelligenceController: DealIntelligenceController;
  let agentsService: AgentsService;
  let intelligenceService: IntelligenceService;

  const tenantA = 'tenant-a';
  const tenantB = 'tenant-b';
  const leadId = 'lead-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgentsController, DealIntelligenceController],
      providers: [
        {
          provide: AgentsService,
          useValue: {
            startDealAnalysis: jest.fn(),
          },
        },
        {
          provide: IntelligenceService,
          useValue: {
            findByLead: jest.fn(),
          },
        },
      ],
    }).compile();

    agentsController = module.get<AgentsController>(AgentsController);
    dealIntelligenceController = module.get<DealIntelligenceController>(DealIntelligenceController);
    agentsService = module.get<AgentsService>(AgentsService);
    intelligenceService = module.get<IntelligenceService>(IntelligenceService);
  });

  describe('POST /agent-runs/deal-analysis', () => {
    it('should queue deal analysis successfully', async () => {
      const mockResult = {
        id: 'run-1',
        agentRunId: 'run-1',
        status: 'QUEUED',
        agentType: 'deal_analysis',
        reused: false,
      };

      jest.spyOn(agentsService, 'startDealAnalysis').mockResolvedValue(mockResult as any);

      const user = { tenantId: tenantA };
      const res = await agentsController.startDealAnalysis(user, { leadId });

      expect(res.success).toBe(true);
      expect(res.data.agentRunId).toBe('run-1');
      expect(res.data.reused).toBe(false);
      expect(agentsService.startDealAnalysis).toHaveBeenCalledWith(tenantA, { leadId });
    });

    it('should return reused: true when active run exists', async () => {
      const mockResult = {
        id: 'run-active',
        agentRunId: 'run-active',
        status: 'RUNNING',
        agentType: 'deal_analysis',
        reused: true,
      };

      jest.spyOn(agentsService, 'startDealAnalysis').mockResolvedValue(mockResult as any);

      const user = { tenantId: tenantA };
      const res = await agentsController.startDealAnalysis(user, { leadId });

      expect(res.success).toBe(true);
      expect(res.data.agentRunId).toBe('run-active');
      expect(res.data.reused).toBe(true);
    });

    it('should reject when lead does not belong to tenant', async () => {
      jest.spyOn(agentsService, 'startDealAnalysis').mockRejectedValue(new NotFoundException('Lead not found in this workspace'));

      const user = { tenantId: tenantB };
      await expect(agentsController.startDealAnalysis(user, { leadId })).rejects.toThrow(NotFoundException);
    });
  });

  describe('GET /deal-intelligence/lead/:leadId', () => {
    it('should return Deal Intelligence for tenant lead', async () => {
      const mockData = {
        id: 'intel-1',
        tenantId: tenantA,
        leadId,
        dealScore: 87,
        intentScore: 92,
        companyFitScore: 85,
        contactFitScore: 78,
        engagementScore: 81,
        riskScore: 22,
        healthScore: 'HEALTHY',
        dealHealth: 'HEALTHY',
        buyingStage: 'QUALIFICATION',
        urgency: 'HIGH',
        modelVersion: 'v1',
      };

      jest.spyOn(intelligenceService, 'findByLead').mockResolvedValue(mockData as any);

      const user = { tenantId: tenantA };
      const res = await dealIntelligenceController.findByLead(user, leadId);

      expect(res.success).toBe(true);
      expect(res.data.dealScore).toBe(87);
      expect(res.data.dealHealth).toBe('HEALTHY');
      expect(intelligenceService.findByLead).toHaveBeenCalledWith(tenantA, leadId);
    });

    it('should reject when tenant does not own the lead', async () => {
      jest.spyOn(intelligenceService, 'findByLead').mockRejectedValue(new NotFoundException('Lead not found in this workspace'));

      const user = { tenantId: tenantB };
      await expect(dealIntelligenceController.findByLead(user, leadId)).rejects.toThrow(NotFoundException);
    });
  });
});
