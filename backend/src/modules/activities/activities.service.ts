import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class ActivitiesService {
  constructor(private prisma: PrismaService) {}

  async findAllByLead(tenantId: string, leadId: string, user: any, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, tenantId } });
    if (!lead) throw new ForbiddenException('Lead not found or access denied');

    if (user.role === Role.EMPLOYEE && lead.assigneeId !== user.userId) {
      throw new ForbiddenException('Access denied');
    }

    const [data, total] = await Promise.all([
      this.prisma.activity.findMany({
        where: { tenantId, leadId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.activity.count({ where: { tenantId, leadId } }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findAll(tenantId: string, user: any, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (user.role === Role.EMPLOYEE) {
      where.lead = { assigneeId: user.userId };
    }

    const [data, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { 
          user: { select: { firstName: true, lastName: true } },
          lead: { select: { firstName: true, lastName: true } }
        },
      }),
      this.prisma.activity.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async create(tenantId: string, userId: string, leadId: string, type: string, metadata?: any) {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, tenantId } });
    if (!lead) throw new ForbiddenException('Lead not found or access denied');

    const reqUser = await this.prisma.user.findFirst({ where: { id: userId, tenantId } });
    if (reqUser && reqUser.role === Role.EMPLOYEE && lead.assigneeId !== userId) {
      throw new ForbiddenException('Access denied: Cannot add activity to unassigned lead');
    }

    return this.prisma.activity.create({
      data: {
        tenantId,
        userId,
        leadId,
        type,
        metadata,
      },
    });
  }
}
