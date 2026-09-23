import { Test, TestingModule } from '@nestjs/testing';
import { SignalsService } from './signals.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('SignalsService - Tenant Isolation', () => {
  let service: SignalsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignalsService,
        {
          provide: PrismaService,
          useValue: {
            companySignal: { findFirst: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<SignalsService>(SignalsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('Tenant A -> Signal A = SUCCESS', async () => {
    jest.spyOn(prisma.companySignal, 'findFirst').mockResolvedValue({ id: 'sigA', tenantId: 'tenantA' } as any);
    const result = await service.findOne('tenantA', 'sigA');
    expect(result.id).toBe('sigA');
  });

  it('Tenant A -> Signal B = REJECTED', async () => {
    jest.spyOn(prisma.companySignal, 'findFirst').mockResolvedValue(null);
    await expect(service.findOne('tenantA', 'sigB')).rejects.toThrow(NotFoundException);
  });
});
