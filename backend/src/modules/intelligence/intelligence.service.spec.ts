import { Test, TestingModule } from '@nestjs/testing';
import { IntelligenceService } from './intelligence.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('IntelligenceService - Tenant Isolation', () => {
  let service: IntelligenceService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntelligenceService,
        {
          provide: PrismaService,
          useValue: {
            lead: { findFirst: jest.fn() },
            dealIntelligence: { findUnique: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<IntelligenceService>(IntelligenceService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('Tenant A -> Lead B Intelligence = REJECTED', async () => {
    jest.spyOn(prisma.lead, 'findFirst').mockResolvedValue(null);
    await expect(service.findByLead('tenantA', 'leadB')).rejects.toThrow(NotFoundException);
  });
});
