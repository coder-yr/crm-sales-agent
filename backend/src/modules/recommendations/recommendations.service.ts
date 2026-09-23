import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateRecommendationStatusDto } from './dto/recommendation.dto';

const PRIORITY_RANK: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
const RULE_RANK: Record<string, number> = {
  HIRING_EXPANSION_FOLLOWUP: 1,
  FUNDING_MOMENTUM: 2,
  STALE_DEAL_REENGAGEMENT: 3,
  SCHEDULE_TECHNICAL_DEMO: 4,
  CONFIRM_BUDGET_SCOPE: 5,
  EXECUTIVE_MULTI_THREADING: 6,
};

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.aIRecommendation.findMany({
      where: { tenantId },
      include: { task: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const rec = await this.prisma.aIRecommendation.findFirst({
      where: { id, tenantId },
      include: { task: true },
    });
    if (!rec) throw new NotFoundException('Recommendation not found in this workspace');
    return rec;
  }

  async findByLead(tenantId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, tenantId } });
    if (!lead) throw new NotFoundException('Lead not found in this workspace');

    const recs = await this.prisma.aIRecommendation.findMany({
      where: { leadId, tenantId },
      include: { task: true },
      orderBy: { createdAt: 'desc' },
    });

    // Sort deterministically:
    // 1. Priority: HIGH > MEDIUM > LOW
    // 2. Deterministic Rule Rank
    return recs.sort((a, b) => {
      const pDiff = (PRIORITY_RANK[b.priority] || 0) - (PRIORITY_RANK[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      const rDiff = (RULE_RANK[a.ruleKey || ''] || 99) - (RULE_RANK[b.ruleKey || ''] || 99);
      return rDiff;
    });
  }

  async dismiss(tenantId: string, id: string) {
    const rec = await this.findOne(tenantId, id);
    if (rec.status !== 'PENDING') {
      throw new BadRequestException(`Cannot dismiss recommendation that is already ${rec.status}`);
    }

    return this.prisma.aIRecommendation.update({
      where: { id },
      data: { status: 'REJECTED' },
      include: { task: true },
    });
  }

  async accept(tenantId: string, userId: string, id: string, createTask: boolean = true) {
    const rec = await this.findOne(tenantId, id);
    if (rec.status !== 'PENDING') {
      throw new BadRequestException(`Cannot accept recommendation that is already ${rec.status}`);
    }

    // Step 1: Transition status to ACCEPTED
    let updatedRec = await this.prisma.aIRecommendation.update({
      where: { id },
      data: { status: 'ACCEPTED' },
      include: { task: true },
    });

    // Step 2: Transactionally create Task if requested
    if (createTask) {
      try {
        const dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // due in 2 days
        const task = await this.prisma.task.create({
          data: {
            tenantId,
            leadId: rec.leadId,
            userId,
            title: rec.action || rec.title,
            description: rec.reason || `Generated from AI Recommendation: ${rec.title}`,
            dueDate,
            isCompleted: false,
          },
        });

        // Step 3: Link Task and transition recommendation to COMPLETED
        updatedRec = await this.prisma.aIRecommendation.update({
          where: { id },
          data: {
            status: 'COMPLETED',
            taskId: task.id,
            executedAt: new Date(),
          },
          include: { task: true },
        });
      } catch (err: any) {
        // If task creation fails, recommendation remains ACCEPTED!
        console.error(`Failed to create task for recommendation ${id}:`, err?.message || err);
      }
    }

    return updatedRec;
  }

  async updateStatus(tenantId: string, id: string, data: UpdateRecommendationStatusDto) {
    const rec = await this.findOne(tenantId, id);

    // Status transition validation
    const validTransitions: Record<string, string[]> = {
      PENDING: ['ACCEPTED', 'REJECTED'],
      ACCEPTED: ['COMPLETED', 'PENDING'],
      REJECTED: ['PENDING'],
      COMPLETED: [],
    };

    const allowed = validTransitions[rec.status] || [];
    if (!allowed.includes(data.status)) {
      throw new BadRequestException(`Cannot transition recommendation from ${rec.status} to ${data.status}`);
    }

    return this.prisma.aIRecommendation.update({
      where: { id },
      data: {
        status: data.status,
        executedAt: data.status === 'COMPLETED' ? new Date() : rec.executedAt,
      },
      include: { task: true },
    });
  }
}
