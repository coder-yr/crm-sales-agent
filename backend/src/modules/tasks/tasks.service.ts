import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { Role } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('events-queue') private eventsQueue: Queue
  ) {}

  async create(tenantId: string, userId: string, createDto: CreateTaskDto) {
    const taskUserId = createDto.assignedTo || userId;

    const lead = await this.prisma.lead.findFirst({ where: { id: createDto.leadId, tenantId } });
    if (!lead) throw new NotFoundException('Lead not found');

    const reqUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (reqUser?.role === Role.EMPLOYEE && lead.assigneeId !== userId) {
      throw new ForbiddenException('Access denied: Cannot create task for unassigned lead');
    }

    if (createDto.assignedTo && createDto.assignedTo !== userId) {
      const assignedUser = await this.prisma.user.findFirst({ where: { id: createDto.assignedTo, tenantId } });
      if (!assignedUser) throw new NotFoundException('Assigned user not found in this workspace');
    }

    const task = await this.prisma.task.create({
      data: {
        tenantId,
        leadId: createDto.leadId,
        userId: taskUserId,
        title: createDto.title,
        description: createDto.description,
        dueDate: new Date(createDto.dueDate),
      },
    });

    await this.eventsQueue.add('log.activity', {
      tenantId,
      type: 'TASK_CREATED',
      data: { leadId: createDto.leadId, userId, metadata: { taskId: task.id } },
    });

    if (createDto.assignedTo && createDto.assignedTo !== userId) {
      await this.eventsQueue.add('send.notification', {
        tenantId,
        data: {
          userId: createDto.assignedTo,
          title: 'New Task Assigned',
          message: `You have been assigned a new task: ${task.title}`,
        },
      });
    }

    return task;
  }

  async findAll(tenantId: string, user: any, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    let whereClause: any = { tenantId, deletedAt: null };

    if (user.role === Role.EMPLOYEE) {
      whereClause.userId = user.userId;
    }

    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { lead: { select: { firstName: true, lastName: true } } },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.task.count({ where: whereClause }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async update(tenantId: string, id: string, user: any, updateDto: UpdateTaskDto) {
    const { version, ...data } = updateDto;
    const task = await this.prisma.task.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!task) throw new NotFoundException('Task not found');

    if (user.role === Role.EMPLOYEE && task.userId !== user.userId) {
      throw new ForbiddenException('Access denied');
    }

    const where: any = { id, tenantId };
    if (version) where.version = version;

    try {
      const updatedTask = await this.prisma.task.update({
        where,
        data: {
          ...data,
          version: { increment: 1 },
        },
      });

      if (updateDto.isCompleted && !task.isCompleted) {
        await this.eventsQueue.add('log.activity', {
          tenantId,
          type: 'TASK_COMPLETED',
          data: { leadId: task.leadId, userId: user.userId, metadata: { taskId: task.id } },
        });
      }

      return updatedTask;
    } catch (e) {
      if (e.code === 'P2025') {
        throw new ConflictException('Concurrency conflict: Task has been modified by another user');
      }
      throw e;
    }
  }

  async remove(tenantId: string, id: string, user: any) {
    const task = await this.prisma.task.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!task) throw new NotFoundException('Task not found');

    if (user.role === Role.EMPLOYEE && task.userId !== user.userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.task.update({
      where: { id, tenantId },
      data: { deletedAt: new Date() },
    });
  }
}
