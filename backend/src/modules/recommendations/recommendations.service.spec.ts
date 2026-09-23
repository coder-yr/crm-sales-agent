import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsService } from './recommendations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('RecommendationsService Unit & Security Tests', () => {
  let service: RecommendationsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      aIRecommendation: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      lead: {
        findFirst: jest.fn(),
      },
      task: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
  });

  describe('Security & Tenant Isolation', () => {
    it('Tenant B attempting to GET Tenant A recommendation throws 404', async () => {
      prisma.aIRecommendation.findFirst.mockResolvedValue(null);
      await expect(service.findOne('tenant-B', 'rec-tenant-A')).rejects.toThrow(
        NotFoundException
      );
    });

    it('Tenant B attempting to ACCEPT Tenant A recommendation throws 404 and creates ZERO tasks', async () => {
      prisma.aIRecommendation.findFirst.mockResolvedValue(null);
      await expect(
        service.accept('tenant-B', 'user-B', 'rec-tenant-A', true)
      ).rejects.toThrow(NotFoundException);

      // Verify no task was created
      expect(prisma.task.create).not.toHaveBeenCalled();
      expect(prisma.aIRecommendation.update).not.toHaveBeenCalled();
    });
  });

  describe('Dismiss Flow', () => {
    it('successfully transitions PENDING recommendation to REJECTED', async () => {
      const mockRec = { id: 'rec-1', tenantId: 'tenant-1', status: 'PENDING' };
      prisma.aIRecommendation.findFirst.mockResolvedValue(mockRec);
      prisma.aIRecommendation.update.mockResolvedValue({ ...mockRec, status: 'REJECTED' });

      const res = await service.dismiss('tenant-1', 'rec-1');
      expect(res.status).toBe('REJECTED');
      expect(prisma.aIRecommendation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rec-1' },
          data: { status: 'REJECTED' },
        })
      );
    });

    it('throws BadRequestException when dismissing a recommendation that is not PENDING', async () => {
      const mockRec = { id: 'rec-1', tenantId: 'tenant-1', status: 'COMPLETED' };
      prisma.aIRecommendation.findFirst.mockResolvedValue(mockRec);

      await expect(service.dismiss('tenant-1', 'rec-1')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('Accept & Task Creation Flow', () => {
    it('accepts recommendation, creates CRM Task, and marks status COMPLETED', async () => {
      const mockRec = {
        id: 'rec-1',
        tenantId: 'tenant-1',
        leadId: 'lead-1',
        title: 'Follow Up on Expansion',
        action: 'Follow up with the prospect about their current hiring/expansion needs.',
        reason: 'Hiring signal detected with 88% confidence',
        status: 'PENDING',
      };

      const mockTask = {
        id: 'task-100',
        tenantId: 'tenant-1',
        leadId: 'lead-1',
        title: mockRec.action,
        isCompleted: false,
      };

      prisma.aIRecommendation.findFirst.mockResolvedValue(mockRec);
      prisma.aIRecommendation.update
        .mockResolvedValueOnce({ ...mockRec, status: 'ACCEPTED' })
        .mockResolvedValueOnce({
          ...mockRec,
          status: 'COMPLETED',
          taskId: 'task-100',
          task: mockTask,
        });

      prisma.task.create.mockResolvedValue(mockTask);

      const res = await service.accept('tenant-1', 'user-1', 'rec-1', true);

      // Verify task creation
      expect(prisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-1',
            leadId: 'lead-1',
            userId: 'user-1',
            title: mockRec.action,
          }),
        })
      );

      // Verify final status is COMPLETED with linked taskId
      expect(res.status).toBe('COMPLETED');
      expect(res.taskId).toBe('task-100');
    });

    it('transactional safety: if task creation fails, recommendation remains ACCEPTED and NOT completed', async () => {
      const mockRec = {
        id: 'rec-1',
        tenantId: 'tenant-1',
        leadId: 'lead-1',
        title: 'Follow Up',
        status: 'PENDING',
      };

      prisma.aIRecommendation.findFirst.mockResolvedValue(mockRec);
      prisma.aIRecommendation.update.mockResolvedValue({ ...mockRec, status: 'ACCEPTED' });

      // Task creation fails (e.g., db error / constraint violation)
      prisma.task.create.mockRejectedValue(new Error('DB task error'));

      const res = await service.accept('tenant-1', 'user-1', 'rec-1', true);

      // Recommendation should remain ACCEPTED
      expect(res.status).toBe('ACCEPTED');
      expect(res.taskId).toBeUndefined();
    });
  });

  describe('Deterministic Lead Recommendations Sorting', () => {
    it('returns recommendations sorted by priority and rule rank', async () => {
      prisma.lead.findFirst.mockResolvedValue({ id: 'lead-1', tenantId: 'tenant-1' });

      const unsorted = [
        { id: '1', priority: 'MEDIUM', ruleKey: 'CONFIRM_BUDGET_SCOPE' },
        { id: '2', priority: 'HIGH', ruleKey: 'FUNDING_MOMENTUM' },
        { id: '3', priority: 'HIGH', ruleKey: 'HIRING_EXPANSION_FOLLOWUP' },
        { id: '4', priority: 'LOW', ruleKey: 'GENERAL' },
      ];

      prisma.aIRecommendation.findMany.mockResolvedValue(unsorted);

      const sorted = await service.findByLead('tenant-1', 'lead-1');

      // Rank 1: HIRING (HIGH)
      expect(sorted[0].id).toBe('3');
      // Rank 2: FUNDING (HIGH)
      expect(sorted[1].id).toBe('2');
      // Rank 3: BUDGET (MEDIUM)
      expect(sorted[2].id).toBe('1');
      // Rank 4: GENERAL (LOW)
      expect(sorted[3].id).toBe('4');
    });
  });
});
