import { Test, TestingModule } from '@nestjs/testing';
import { AgentsService } from './agents.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('AgentsService - Tenant Isolation', () => {
  let service: AgentsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentsService,
        {
          provide: PrismaService,
          useValue: {
            aIAgentRun: { findFirst: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<AgentsService>(AgentsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('Tenant A -> Agent Run B = REJECTED', async () => {
    jest.spyOn(prisma.aIAgentRun, 'findFirst').mockResolvedValue(null);
    await expect(service.findOne('tenantA', 'runB')).rejects.toThrow(NotFoundException);
  });
});
