import { Test, TestingModule } from '@nestjs/testing';
import { OutreachService } from './outreach.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../../events/events.gateway';
import { AgentsService } from '../agents/agents.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('OutreachService', () => {
  let service: OutreachService;
  let prisma: any;
  let eventsGateway: any;
  let agentsService: any;

  beforeEach(async () => {
    prisma = {
      lead: {
        findFirst: jest.fn(),
      },
      aIOutreachDraft: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    eventsGateway = {
      emitToTenant: jest.fn(),
    };

    agentsService = {
      startOutreach: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutreachService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventsGateway, useValue: eventsGateway },
        { provide: AgentsService, useValue: agentsService },
      ],
    }).compile();

    service = module.get<OutreachService>(OutreachService);
  });

  const mockDraft = {
    id: 'draft-1',
    tenantId: 'tenant-1',
    leadId: 'lead-1',
    recommendationId: 'rec-1',
    type: 'FOLLOW_UP',
    status: 'DRAFT',
    subject: 'Following up regarding Stripe engineering',
    body: 'Hi Patrick,\n\nFollowing up on our conversation...',
    tone: 'PROFESSIONAL',
    personalizationPoints: ['Hiring signal'],
    usedEvidence: ['HIRING'],
    evidenceSnapshot: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should list drafts for a lead belonging to tenant', async () => {
    prisma.lead.findFirst.mockResolvedValue({ id: 'lead-1', tenantId: 'tenant-1' });
    prisma.aIOutreachDraft.findMany.mockResolvedValue([mockDraft]);

    const result = await service.findByLead('tenant-1', 'lead-1');
    expect(result).toEqual([mockDraft]);
    expect(prisma.aIOutreachDraft.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'tenant-1', leadId: 'lead-1' },
      })
    );
  });

  it('should throw NotFoundException if lead does not belong to tenant', async () => {
    prisma.lead.findFirst.mockResolvedValue(null);

    await expect(service.findByLead('tenant-1', 'lead-2')).rejects.toThrow(
      NotFoundException
    );
  });

  it('should update draft and transition status to EDITED', async () => {
    prisma.aIOutreachDraft.findFirst.mockResolvedValue(mockDraft);
    prisma.aIOutreachDraft.update.mockResolvedValue({
      ...mockDraft,
      subject: 'Updated Subject',
      status: 'EDITED',
    });

    const result = await service.update('tenant-1', 'draft-1', {
      subject: 'Updated Subject',
    });

    expect(result.subject).toBe('Updated Subject');
    expect(result.status).toBe('EDITED');
    expect(eventsGateway.emitToTenant).toHaveBeenCalledWith(
      'tenant-1',
      'ai.outreach.updated',
      expect.objectContaining({ draftId: 'draft-1', status: 'EDITED' })
    );
  });

  it('should approve draft and transition status to APPROVED', async () => {
    prisma.aIOutreachDraft.findFirst.mockResolvedValue(mockDraft);
    prisma.aIOutreachDraft.update.mockResolvedValue({
      ...mockDraft,
      status: 'APPROVED',
    });

    const result = await service.approve('tenant-1', 'draft-1');
    expect(result.status).toBe('APPROVED');
    expect(eventsGateway.emitToTenant).toHaveBeenCalledWith(
      'tenant-1',
      'ai.outreach.approved',
      expect.objectContaining({ draftId: 'draft-1', status: 'APPROVED' })
    );
  });

  it('should not allow approving a discarded draft', async () => {
    prisma.aIOutreachDraft.findFirst.mockResolvedValue({
      ...mockDraft,
      status: 'DISCARDED',
    });

    await expect(service.approve('tenant-1', 'draft-1')).rejects.toThrow(
      BadRequestException
    );
  });

  it('should discard draft and emit event', async () => {
    prisma.aIOutreachDraft.findFirst.mockResolvedValue(mockDraft);
    prisma.aIOutreachDraft.update.mockResolvedValue({
      ...mockDraft,
      status: 'DISCARDED',
    });

    const result = await service.discard('tenant-1', 'draft-1');
    expect(result.status).toBe('DISCARDED');
    expect(eventsGateway.emitToTenant).toHaveBeenCalledWith(
      'tenant-1',
      'ai.outreach.discarded',
      expect.objectContaining({ draftId: 'draft-1', status: 'DISCARDED' })
    );
  });

  it('should regenerate draft by triggering outreach agent run', async () => {
    prisma.aIOutreachDraft.findFirst.mockResolvedValue(mockDraft);
    agentsService.startOutreach.mockResolvedValue({
      id: 'run-new',
      status: 'QUEUED',
      reused: false,
    });

    const result = await service.regenerate('tenant-1', 'draft-1', 'CASUAL');
    expect(agentsService.startOutreach).toHaveBeenCalledWith('tenant-1', {
      leadId: 'lead-1',
      recommendationId: 'rec-1',
      tone: 'CASUAL',
    });
    expect(result.status).toBe('QUEUED');
  });
});
