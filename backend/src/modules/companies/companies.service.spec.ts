import { Test, TestingModule } from '@nestjs/testing';
import { CompaniesService } from './companies.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('CompaniesService - Tenant Isolation', () => {
  let service: CompaniesService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        {
          provide: PrismaService,
          useValue: {
            company: { findFirst: jest.fn(), update: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('Tenant A -> Company A = SUCCESS', async () => {
    jest.spyOn(prisma.company, 'findFirst').mockResolvedValue({ id: 'compA', tenantId: 'tenantA' } as any);
    const result = await service.findOne('tenantA', 'compA');
    expect(result.id).toBe('compA');
  });

  it('Tenant A -> Company B = REJECTED', async () => {
    jest.spyOn(prisma.company, 'findFirst').mockResolvedValue(null);
    await expect(service.findOne('tenantA', 'compB')).rejects.toThrow(NotFoundException);
  });
});
