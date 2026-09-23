import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../../events/events.gateway';
import { AgentsService } from '../agents/agents.service';
import { UpdateOutreachDraftDto } from './dto/update-outreach-draft.dto';

const RECOMMENDATION_SELECT = {
  id: true,
  title: true,
  action: true,
  ruleKey: true,
  priority: true,
  reason: true,
};

@Injectable()
export class OutreachService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
    @Inject(forwardRef(() => AgentsService))
    private readonly agentsService: AgentsService,
  ) {}

  async findByLead(tenantId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
    });
    if (!lead) {
      throw new NotFoundException('Lead not found in this workspace');
    }

    return this.prisma.aIOutreachDraft.findMany({
      where: { tenantId, leadId },
      include: {
        recommendation: {
          select: RECOMMENDATION_SELECT,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const draft = await this.prisma.aIOutreachDraft.findFirst({
      where: { id, tenantId },
      include: {
        recommendation: {
          select: RECOMMENDATION_SELECT,
        },
      },
    });

    if (!draft) {
      throw new NotFoundException('Outreach draft not found in this workspace');
    }

    return draft;
  }

  async update(tenantId: string, id: string, dto: UpdateOutreachDraftDto) {
    await this.findOne(tenantId, id);

    const updated = await this.prisma.aIOutreachDraft.update({
      where: { id },
      data: {
        ...(dto.subject !== undefined ? { subject: dto.subject } : {}),
        ...(dto.body !== undefined ? { body: dto.body } : {}),
        ...(dto.tone !== undefined ? { tone: dto.tone } : {}),
        status: 'EDITED',
      },
      include: {
        recommendation: {
          select: RECOMMENDATION_SELECT,
        },
      },
    });

    this.eventsGateway.emitToTenant(tenantId, 'ai.outreach.updated', {
      draftId: updated.id,
      leadId: updated.leadId,
      status: updated.status,
      subject: updated.subject,
    });

    return updated;
  }

  async approve(tenantId: string, id: string) {
    const draft = await this.findOne(tenantId, id);

    if (draft.status === 'DISCARDED') {
      throw new BadRequestException('Cannot approve a discarded outreach draft');
    }

    const updated = await this.prisma.aIOutreachDraft.update({
      where: { id },
      data: { status: 'APPROVED' },
      include: {
        recommendation: {
          select: RECOMMENDATION_SELECT,
        },
      },
    });

    this.eventsGateway.emitToTenant(tenantId, 'ai.outreach.approved', {
      draftId: updated.id,
      leadId: updated.leadId,
      status: 'APPROVED',
      approvedAt: new Date(),
    });

    return updated;
  }

  async discard(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    const updated = await this.prisma.aIOutreachDraft.update({
      where: { id },
      data: { status: 'DISCARDED' },
      include: {
        recommendation: {
          select: RECOMMENDATION_SELECT,
        },
      },
    });

    this.eventsGateway.emitToTenant(tenantId, 'ai.outreach.discarded', {
      draftId: updated.id,
      leadId: updated.leadId,
      status: 'DISCARDED',
    });

    return updated;
  }

  async regenerate(
    tenantId: string,
    id: string,
    tone?: 'PROFESSIONAL' | 'CASUAL' | 'URGENT' | 'EXECUTIVE' | 'CONSULTATIVE',
  ) {
    const draft = await this.findOne(tenantId, id);

    return this.agentsService.startOutreach(tenantId, {
      leadId: draft.leadId,
      recommendationId: draft.recommendationId || undefined,
      tone: tone || (draft.tone as any) || 'PROFESSIONAL',
    });
  }
}
