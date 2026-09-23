import { Test, TestingModule } from '@nestjs/testing';
import { ContactsService } from './contacts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('ContactsService - Tenant Isolation', () => {
  let service: ContactsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactsService,
        {
          provide: PrismaService,
          useValue: {
            company: { findFirst: jest.fn() },
            contact: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<ContactsService>(ContactsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('Tenant A -> Contact A = SUCCESS', async () => {
    jest.spyOn(prisma.contact, 'findFirst').mockResolvedValue({ id: 'contA', tenantId: 'tenantA' } as any);
    const result = await service.findOne('tenantA', 'contA');
    expect(result.id).toBe('contA');
  });

  it('Tenant A -> Contact B = REJECTED', async () => {
    jest.spyOn(prisma.contact, 'findFirst').mockResolvedValue(null);
    await expect(service.findOne('tenantA', 'contB')).rejects.toThrow(NotFoundException);
  });

  it('Tenant A -> Company B when creating Contact = REJECTED', async () => {
    jest.spyOn(prisma.company, 'findFirst').mockResolvedValue(null);
    await expect(service.create('tenantA', { companyId: 'compB', firstName: 'Test', lastName: 'User' })).rejects.toThrow(NotFoundException);
  });

  it('Tenant A -> Move Contact to Company B = REJECTED', async () => {
    jest.spyOn(prisma.contact, 'findFirst').mockResolvedValue({ id: 'contA', tenantId: 'tenantA' } as any);
    jest.spyOn(prisma.company, 'findFirst').mockResolvedValue(null);
    await expect(service.update('tenantA', 'contA', { companyId: 'compB' })).rejects.toThrow(ForbiddenException);
  });
});
