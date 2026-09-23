import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EventsGateway } from '../../events/events.gateway';
import { CreateAgentRunDto } from './dto/create-agent-run.dto';
import { ResearchAgentDto } from './dto/research-agent.dto';
import { SignalDetectionDto } from './dto/signal-detection.dto';
import { DealAnalysisDto } from './dto/deal-analysis.dto';
import { RecommendationsAnalysisDto } from './dto/recommendations-analysis.dto';
import { OutreachAgentDto } from './dto/outreach-agent.dto';

@Injectable()
export class AgentsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('ai-agent') private readonly aiQueue: Queue,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async findAll(tenantId: string) {
    return this.prisma.aIAgentRun.findMany({ where: { tenantId }, orderBy: { startedAt: 'desc' } });
  }

  async findOne(tenantId: string, id: string) {
    const run = await this.prisma.aIAgentRun.findFirst({ where: { id, tenantId } });
    if (!run) throw new NotFoundException('Agent run not found in this workspace');
    return run;
  }

  async findLatestByEntity(tenantId: string, entityType: string, entityId: string, agentType?: string) {
    const whereClause: any = {
      tenantId,
      entityId,
      entityType: { equals: entityType, mode: 'insensitive' },
    };
    if (agentType) {
      whereClause.agentType = agentType;
    }
    const run = await this.prisma.aIAgentRun.findFirst({
      where: whereClause,
      orderBy: { startedAt: 'desc' },
    });
    return run;
  }

  async startResearch(tenantId: string, dto: ResearchAgentDto) {
    // 1. Entity Authorization & Ownership
    if (dto.entityType === 'Lead') {
      const lead = await this.prisma.lead.findFirst({
        where: { id: dto.entityId, tenantId },
      });
      if (!lead) {
        throw new ForbiddenException(`You do not have access to this Lead or it does not exist.`);
      }
    } else if (dto.entityType === 'Company') {
      const company = await this.prisma.company.findFirst({
        where: { id: dto.entityId, tenantId },
      });
      if (!company) {
        throw new ForbiddenException(`You do not have access to this Company or it does not exist.`);
      }
    }

    // 2. Idempotency: Check if an active research job is already running
    const activeRun = await this.prisma.aIAgentRun.findFirst({
      where: {
        tenantId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        agentType: 'research',
        status: { in: ['QUEUED', 'RUNNING'] },
      },
      orderBy: { startedAt: 'desc' },
    });

    if (activeRun) {
      const STALE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes
      const isStale = Date.now() - new Date(activeRun.startedAt).getTime() > STALE_THRESHOLD_MS;
      if (!isStale) {
        return {
          agentRunId: activeRun.id,
          status: activeRun.status,
          reused: true,
        };
      }
      // If it's stale, mark it FAILED and allow a fresh run
      await this.prisma.aIAgentRun.update({
        where: { id: activeRun.id },
        data: {
          status: 'FAILED',
          error: 'Previous research run timed out or was interrupted.',
          completedAt: new Date(),
        },
      });
    }

    // 3. Create fresh AIAgentRun
    const run = await this.prisma.aIAgentRun.create({
      data: {
        tenantId,
        agentType: 'research',
        entityType: dto.entityType,
        entityId: dto.entityId,
        status: 'QUEUED',
        input: { entityType: dto.entityType, entityId: dto.entityId },
      },
    });

    // 4. Emit queued event
    this.eventsGateway.emitToTenant(tenantId, 'ai.agent.queued', {
      runId: run.id,
      agentRunId: run.id,
      agentType: 'research',
      entityType: dto.entityType,
      entityId: dto.entityId,
      status: 'QUEUED',
      progress: 0,
      stage: 'Queued for research',
    });

    // 5. Enqueue in BullMQ with deterministic jobId
    await this.aiQueue.add(
      'run-agent',
      {
        tenantId,
        agentRunId: run.id,
        agentType: 'research',
        entityType: dto.entityType,
        entityId: dto.entityId,
        input: run.input,
      },
      { jobId: run.id }
    );

    return { agentRunId: run.id, status: 'QUEUED', reused: false };
  }

  async startSignalDetection(tenantId: string, dto: SignalDetectionDto) {
    // 1. Resolve target Company ID
    let targetCompanyId = dto.companyId;

    if (!targetCompanyId && dto.entityType === 'Company' && dto.entityId) {
      targetCompanyId = dto.entityId;
    }

    if (!targetCompanyId && (dto.leadId || (dto.entityType === 'Lead' && dto.entityId))) {
      const leadId = dto.leadId || dto.entityId;
      const lead = await this.prisma.lead.findFirst({
        where: { id: leadId, tenantId },
      });
      if (!lead) {
        throw new ForbiddenException('You do not have access to this Lead or it does not exist.');
      }
      if (!lead.companyId) {
        throw new BadRequestException('Lead is not associated with any company. Run company research first.');
      }
      targetCompanyId = lead.companyId;
    }

    if (!targetCompanyId) {
      throw new BadRequestException('A valid companyId or leadId must be provided for signal detection.');
    }

    // Verify company ownership
    const company = await this.prisma.company.findFirst({
      where: { id: targetCompanyId, tenantId },
      include: { leads: true },
    });
    if (!company) {
      throw new ForbiddenException('You do not have access to this Company or it does not exist.');
    }

    // 2. Check research availability: must have a completed research run
    const leadIds = (company.leads || []).map((l: any) => l.id);
    const completedResearch = await this.prisma.aIAgentRun.findFirst({
      where: {
        tenantId,
        agentType: 'research',
        status: 'COMPLETED',
        OR: [
          { entityType: 'Company', entityId: company.id },
          ...(leadIds.length > 0 ? [{ entityType: 'Lead', entityId: { in: leadIds } }] : []),
        ],
      },
      orderBy: { completedAt: 'desc' },
    });

    if (!completedResearch || !completedResearch.output) {
      throw new BadRequestException('No completed company research is available. Run company research first.');
    }

    // 3. Active-run idempotency
    const activeRun = await this.prisma.aIAgentRun.findFirst({
      where: {
        tenantId,
        entityType: 'Company',
        entityId: company.id,
        agentType: 'signal_detection',
        status: { in: ['QUEUED', 'RUNNING'] },
      },
      orderBy: { startedAt: 'desc' },
    });

    if (activeRun) {
      const STALE_THRESHOLD_MS = 2 * 60 * 1000;
      const isStale = Date.now() - new Date(activeRun.startedAt).getTime() > STALE_THRESHOLD_MS;
      if (!isStale) {
        return {
          id: activeRun.id,
          agentRunId: activeRun.id,
          status: activeRun.status,
          agentType: 'signal_detection',
          reused: true,
        };
      }
      await this.prisma.aIAgentRun.update({
        where: { id: activeRun.id },
        data: {
          status: 'FAILED',
          error: 'Previous signal detection run timed out or was interrupted.',
          completedAt: new Date(),
        },
      });
    }

    // 4. Create fresh AIAgentRun
    const run = await this.prisma.aIAgentRun.create({
      data: {
        tenantId,
        agentType: 'signal_detection',
        entityType: 'Company',
        entityId: company.id,
        status: 'QUEUED',
        input: { companyId: company.id, leadId: dto.leadId },
      },
    });

    // 5. Emit queued event
    this.eventsGateway.emitToTenant(tenantId, 'ai.agent.queued', {
      runId: run.id,
      agentRunId: run.id,
      agentType: 'signal_detection',
      entityType: 'Company',
      entityId: company.id,
      status: 'QUEUED',
      stage: 'Queued for signal detection...',
    });

    // 6. Enqueue BullMQ job
    await this.aiQueue.add(
      'signal_detection_job',
      {
        tenantId,
        agentRunId: run.id,
        agentType: 'signal_detection',
        entityType: 'Company',
        entityId: company.id,
        companyId: company.id,
        leadId: dto.leadId,
      },
      { jobId: run.id }
    );

    return {
      id: run.id,
      agentRunId: run.id,
      status: run.status,
      agentType: 'signal_detection',
      reused: false,
    };
  }

  async createAgentRun(tenantId: string, dto: CreateAgentRunDto) {
    // 1. Entity Authorization
    let entityExists = false;
    if (dto.entityType === 'Lead') {
      entityExists = !!(await this.prisma.lead.findFirst({ where: { id: dto.entityId, tenantId } }));
    } else if (dto.entityType === 'Company') {
      entityExists = !!(await this.prisma.company.findFirst({ where: { id: dto.entityId, tenantId } }));
    } else if (dto.entityType === 'Contact') {
      entityExists = !!(await this.prisma.contact.findFirst({ where: { id: dto.entityId, tenantId } }));
    }

    if (!entityExists) {
      throw new ForbiddenException(`You do not have access to this ${dto.entityType} or it does not exist.`);
    }

    // 2. Create the Agent Run record
    const run = await this.prisma.aIAgentRun.create({
      data: {
        tenantId,
        agentType: dto.agentType,
        entityType: dto.entityType,
        entityId: dto.entityId,
        status: 'QUEUED',
        input: dto.input || {},
      },
    });

    // 3. Emit queued event
    this.eventsGateway.emitToTenant(tenantId, 'ai.agent.queued', {
      agentRunId: run.id,
      agentType: run.agentType,
      status: 'QUEUED',
    });

    // 4. Enqueue Job (use jobId for idempotency)
    await this.aiQueue.add(
      'run-agent',
      {
        tenantId,
        agentRunId: run.id,
        agentType: dto.agentType,
        entityType: dto.entityType,
        entityId: dto.entityId,
        input: dto.input,
        _forceFailureType: dto._forceFailureType,
      },
      { jobId: run.id } // This prevents duplicate executions!
    );

    return { agentRunId: run.id, status: 'QUEUED' };
  }

  async startDealAnalysis(tenantId: string, dto: { leadId: string }) {
    // 1. Verify tenant lead exists
    const lead = await this.prisma.lead.findFirst({
      where: { id: dto.leadId, tenantId },
    });

    if (!lead) {
      throw new NotFoundException(`Lead ${dto.leadId} not found in this workspace`);
    }

    // 2. Active Run Idempotency
    const activeRun = await this.prisma.aIAgentRun.findFirst({
      where: {
        tenantId,
        agentType: 'deal_analysis',
        entityType: 'Lead',
        entityId: dto.leadId,
        status: { in: ['QUEUED', 'RUNNING'] },
      },
      orderBy: { startedAt: 'desc' },
    });

    if (activeRun) {
      const STALE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes
      const isStale = Date.now() - new Date(activeRun.startedAt).getTime() > STALE_THRESHOLD_MS;
      if (!isStale) {
        return {
          id: activeRun.id,
          agentRunId: activeRun.id,
          status: activeRun.status,
          agentType: 'deal_analysis',
          reused: true,
        };
      }
      await this.prisma.aIAgentRun.update({
        where: { id: activeRun.id },
        data: {
          status: 'FAILED',
          error: 'Previous deal analysis run timed out or was interrupted.',
          completedAt: new Date(),
        },
      });
    }

    // 3. Create fresh AIAgentRun
    const run = await this.prisma.aIAgentRun.create({
      data: {
        tenantId,
        agentType: 'deal_analysis',
        entityType: 'Lead',
        entityId: dto.leadId,
        status: 'QUEUED',
        input: { leadId: dto.leadId },
      },
    });

    // 4. Emit queued event
    this.eventsGateway.emitToTenant(tenantId, 'ai.agent.queued', {
      runId: run.id,
      agentRunId: run.id,
      agentType: 'deal_analysis',
      entityType: 'Lead',
      entityId: dto.leadId,
      status: 'QUEUED',
      progress: 0,
      stage: 'Queued for deal analysis...',
    });

    // 5. Enqueue BullMQ job with deterministic jobId
    await this.aiQueue.add(
      'deal_analysis_job',
      {
        tenantId,
        agentRunId: run.id,
        agentType: 'deal_analysis',
        entityType: 'Lead',
        entityId: dto.leadId,
        input: { leadId: dto.leadId },
      },
      { jobId: run.id }
    );

    return {
      id: run.id,
      agentRunId: run.id,
      status: 'QUEUED',
      agentType: 'deal_analysis',
      reused: false,
    };
  }

  async startRecommendations(tenantId: string, dto: RecommendationsAnalysisDto) {
    // 1. Authorize lead
    const lead = await this.prisma.lead.findFirst({
      where: { id: dto.leadId, tenantId },
    });
    if (!lead) {
      throw new NotFoundException(`Lead ${dto.leadId} not found or tenant mismatch`);
    }

    // 2. Check for active run (QUEUED or RUNNING)
    const activeRun = await this.prisma.aIAgentRun.findFirst({
      where: {
        tenantId,
        entityType: 'Lead',
        entityId: dto.leadId,
        agentType: 'recommendations',
        status: { in: ['QUEUED', 'RUNNING'] },
      },
    });

    if (activeRun) {
      const runAgeMs = Date.now() - activeRun.startedAt.getTime();
      if (runAgeMs < 120000) {
        return {
          id: activeRun.id,
          agentRunId: activeRun.id,
          status: activeRun.status,
          agentType: 'recommendations',
          reused: true,
        };
      }
      await this.prisma.aIAgentRun.update({
        where: { id: activeRun.id },
        data: {
          status: 'FAILED',
          error: 'Previous recommendations run timed out or was interrupted.',
          completedAt: new Date(),
        },
      });
    }

    // 3. Create fresh AIAgentRun
    const run = await this.prisma.aIAgentRun.create({
      data: {
        tenantId,
        agentType: 'recommendations',
        entityType: 'Lead',
        entityId: dto.leadId,
        status: 'QUEUED',
        input: { leadId: dto.leadId },
      },
    });

    // 4. Emit queued event
    this.eventsGateway.emitToTenant(tenantId, 'ai.agent.queued', {
      runId: run.id,
      agentRunId: run.id,
      agentType: 'recommendations',
      entityType: 'Lead',
      entityId: dto.leadId,
      status: 'QUEUED',
      progress: 0,
      stage: 'Queued for recommendations analysis...',
    });

    // 5. Enqueue BullMQ job with deterministic jobId
    await this.aiQueue.add(
      'recommendations_job',
      {
        tenantId,
        agentRunId: run.id,
        agentType: 'recommendations',
        entityType: 'Lead',
        entityId: dto.leadId,
        input: { leadId: dto.leadId },
      },
      { jobId: run.id }
    );

    return {
      id: run.id,
      agentRunId: run.id,
      status: 'QUEUED',
      agentType: 'recommendations',
      reused: false,
    };
  }

  async startOutreach(tenantId: string, dto: OutreachAgentDto) {
    // 1. Authorize lead
    const lead = await this.prisma.lead.findFirst({
      where: { id: dto.leadId, tenantId },
    });
    if (!lead) {
      throw new NotFoundException(`Lead ${dto.leadId} not found or tenant mismatch`);
    }

    // 2. Check for active run (QUEUED or RUNNING)
    const activeRun = await this.prisma.aIAgentRun.findFirst({
      where: {
        tenantId,
        entityType: 'Lead',
        entityId: dto.leadId,
        agentType: 'outreach',
        status: { in: ['QUEUED', 'RUNNING'] },
      },
    });

    if (activeRun) {
      const runAgeMs = Date.now() - activeRun.startedAt.getTime();
      if (runAgeMs < 120000) {
        return {
          id: activeRun.id,
          agentRunId: activeRun.id,
          status: activeRun.status,
          agentType: 'outreach',
          reused: true,
        };
      }
      await this.prisma.aIAgentRun.update({
        where: { id: activeRun.id },
        data: {
          status: 'FAILED',
          error: 'Previous outreach run timed out or was interrupted.',
          completedAt: new Date(),
        },
      });
    }

    // 3. Create fresh AIAgentRun
    const run = await this.prisma.aIAgentRun.create({
      data: {
        tenantId,
        agentType: 'outreach',
        entityType: 'Lead',
        entityId: dto.leadId,
        status: 'QUEUED',
        input: {
          leadId: dto.leadId,
          recommendationId: dto.recommendationId,
          tone: dto.tone || 'PROFESSIONAL',
        },
      },
    });

    // 4. Emit queued event
    this.eventsGateway.emitToTenant(tenantId, 'ai.agent.queued', {
      runId: run.id,
      agentRunId: run.id,
      agentType: 'outreach',
      entityType: 'Lead',
      entityId: dto.leadId,
      status: 'QUEUED',
      progress: 0,
      stage: 'Queued for outreach draft generation...',
    });

    // 5. Enqueue BullMQ job with deterministic jobId
    await this.aiQueue.add(
      'outreach_job',
      {
        tenantId,
        agentRunId: run.id,
        agentType: 'outreach',
        entityType: 'Lead',
        entityId: dto.leadId,
        input: {
          leadId: dto.leadId,
          recommendationId: dto.recommendationId,
          tone: dto.tone || 'PROFESSIONAL',
        },
      },
      { jobId: run.id }
    );

    return {
      id: run.id,
      agentRunId: run.id,
      status: 'QUEUED',
      agentType: 'outreach',
      reused: false,
    };
  }
}

