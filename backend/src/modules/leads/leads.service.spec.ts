import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from './leads.service';
import { PrismaService } from '../../prisma/prisma.service';
import { getQueueToken } from '@nestjs/bullmq';
import { NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('LeadsService - Security Validation', () => {
  let service: LeadsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        {
          provide: PrismaService,
          useValue: {
            pipelineStage: { findFirst: jest.fn() },
            user: { findUnique: jest.fn(), findFirst: jest.fn() },
            lead: { findFirst: jest.fn(), create: jest.fn() },
          },
        },
        {
          provide: getQueueToken('events-queue'),
          useValue: { add: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<LeadsService>(LeadsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should throw NotFoundException if stageId belongs to a different tenant', async () => {
    jest.spyOn(prisma.lead, 'findFirst').mockResolvedValue(null);
    jest.spyOn(prisma.pipelineStage, 'findFirst').mockResolvedValue(null); // Simulated: not found in tenant

    const createDto = {
      firstName: 'Test',
      lastName: 'Lead',
      stageId: 'malicious-stage-id',
    };

    await expect(service.create('tenantA', 'user1', createDto)).rejects.toThrow(
      new NotFoundException('Pipeline stage not found in this workspace')
    );
  });

  it('should throw NotFoundException if assigneeId belongs to a different tenant', async () => {
    jest.spyOn(prisma.lead, 'findFirst').mockResolvedValue(null);
    jest.spyOn(prisma.pipelineStage, 'findFirst').mockResolvedValue({ id: 'valid-stage' } as any);
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ role: Role.MANAGER } as any);
    jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(null); // Simulated: assignee not found in tenant

    const createDto = {
      firstName: 'Test',
      lastName: 'Lead',
      stageId: 'valid-stage',
      assigneeId: 'malicious-assignee-id',
    };

    await expect(service.create('tenantA', 'user1', createDto)).rejects.toThrow(
      new NotFoundException('Assigned user not found in this workspace')
    );
  });
});
