import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { PrismaService } from '../../prisma/prisma.service';
import { getQueueToken } from '@nestjs/bullmq';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('TasksService - Security Validation', () => {
  let service: TasksService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: PrismaService,
          useValue: {
            lead: { findFirst: jest.fn() },
            user: { findUnique: jest.fn(), findFirst: jest.fn() },
            task: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
          },
        },
        {
          provide: getQueueToken('events-queue'),
          useValue: { add: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should throw ForbiddenException if employee creates task for unassigned lead', async () => {
    jest.spyOn(prisma.lead, 'findFirst').mockResolvedValue({ id: 'lead1', assigneeId: 'manager1' } as any);
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ id: 'employee1', role: Role.EMPLOYEE } as any);

    const createDto = {
      leadId: 'lead1',
      title: 'Hacked Task',
      dueDate: new Date().toISOString(),
    };

    await expect(service.create('tenantA', 'employee1', createDto)).rejects.toThrow(
      new ForbiddenException('Access denied: Cannot create task for unassigned lead')
    );
  });

  it('should allow employee to create task for their own lead', async () => {
    jest.spyOn(prisma.lead, 'findFirst').mockResolvedValue({ id: 'lead1', assigneeId: 'employee1' } as any);
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ id: 'employee1', role: Role.EMPLOYEE } as any);
    jest.spyOn(prisma.task, 'create').mockResolvedValue({ id: 'task1' } as any);

    const createDto = {
      leadId: 'lead1',
      title: 'Valid Task',
      dueDate: new Date().toISOString(),
    };

    const result = await service.create('tenantA', 'employee1', createDto);
    expect(result).toBeDefined();
    expect(prisma.task.create).toHaveBeenCalled();
  });
});
