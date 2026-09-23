import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../../events/events.gateway';
import { Logger } from '@nestjs/common';
import { ResearchAgentService } from '../agents/research/research-agent.service';
import { SignalDetectionAgentService } from '../agents/signals/signal-detection-agent.service';
import { DealIntelligenceAgentService } from '../agents/deal-intelligence/deal-intelligence-agent.service';
import { RecommendationsAgentService } from '../agents/recommendations/recommendations-agent.service';
import { OutreachAgentService } from '../agents/outreach/outreach-agent.service';

@Processor('ai-agent', { concurrency: 1 }) // Concurrency 1 for deterministic testing and idempotency
export class AiAgentProcessor extends WorkerHost {
  private readonly logger = new Logger(AiAgentProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
    private readonly researchAgentService: ResearchAgentService,
    private readonly signalDetectionAgentService: SignalDetectionAgentService,
    private readonly dealIntelligenceAgentService: DealIntelligenceAgentService,
    private readonly recommendationsAgentService: RecommendationsAgentService,
    private readonly outreachAgentService: OutreachAgentService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { tenantId, agentRunId, agentType, entityType, entityId, input, _forceFailureType } = job.data;
    
    this.logger.log(`Processing job ${job.id} for AgentRun ${agentRunId} (type: ${agentType})`);

    // Verify tenant entity ownership synchronously during worker execution
    const run = await this.prisma.aIAgentRun.findFirst({
      where: { id: agentRunId, tenantId },
    });

    if (!run) {
      // Permanent failure - no retry
      this.logger.error(`AgentRun ${agentRunId} not found or tenant mismatch`);
      this.eventsGateway.emitToTenant(tenantId, 'ai.agent.failed', {
        runId: agentRunId,
        agentRunId,
        agentType,
        entityType: job.data.entityType,
        entityId: job.data.entityId,
        status: 'FAILED',
        error: 'Agent run not found or tenant mismatch',
      });
      return { success: false, reason: 'NOT_FOUND' };
    }

    if (run.status === 'COMPLETED' || run.status === 'FAILED') {
      this.logger.warn(`AgentRun ${agentRunId} is already ${run.status}. Skipping.`);
      return { success: true, reason: 'ALREADY_PROCESSED' };
    }

    // Determine failure behavior for testing
    if (_forceFailureType === 'PERMANENT') {
      await this.failRun(tenantId, agentRunId, 'Permanent failure triggered by input');
      return { success: false }; // We do NOT throw an error here so BullMQ won't retry it.
    }

    if (_forceFailureType === 'TRANSIENT') {
      // Throw an error to trigger BullMQ retry logic
      throw new Error('Transient failure simulated');
    }

    // Route based on agentType
    if (agentType === 'research') {
      return this.researchAgentService.execute(job.data);
    }

    if (agentType === 'signal_detection') {
      return this.signalDetectionAgentService.execute(job.data);
    }

    if (agentType === 'deal_analysis') {
      return this.dealIntelligenceAgentService.execute(job.data);
    }

    if (agentType === 'recommendations') {
      return this.recommendationsAgentService.execute(job.data);
    }

    if (agentType === 'outreach') {
      const payload = input || job.data;
      return this.outreachAgentService.execute(
        agentRunId,
        tenantId,
        payload.leadId || entityId,
        payload.recommendationId,
        payload.tone
      );
    }

    try {
      // Transition to RUNNING
      await this.prisma.aIAgentRun.update({
        where: { id: agentRunId },
        data: { status: 'RUNNING' },
      });
      
      this.eventsGateway.emitToTenant(tenantId, 'ai.agent.started', {
        agentRunId,
        agentType,
        status: 'RUNNING',
      });

      // Simulate work
      await new Promise(resolve => setTimeout(resolve, 500));

      this.eventsGateway.emitToTenant(tenantId, 'ai.agent.progress', {
        agentRunId,
        progress: 50,
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      // Transition to COMPLETED
      const durationMs = Date.now() - run.startedAt.getTime();
      const output = { phase: 'infrastructure-test', success: true };

      await this.prisma.aIAgentRun.update({
        where: { id: agentRunId },
        data: {
          status: 'COMPLETED',
          output,
          completedAt: new Date(),
          // durationMs is not in the schema, but we persist the dates so it's calculated.
        },
      });

      this.eventsGateway.emitToTenant(tenantId, 'ai.agent.completed', {
        agentRunId,
        status: 'COMPLETED',
        output,
        durationMs,
      });

      return { success: true, phase: 'infrastructure-test' };
    } catch (err: any) {
      await this.failRun(tenantId, agentRunId, err.message);
      throw err; // Trigger retry if applicable
    }
  }

  private async failRun(tenantId: string, agentRunId: string, errorMessage: string) {
    const run = await this.prisma.aIAgentRun.findUnique({ where: { id: agentRunId } });
    if (!run) return;
    
    await this.prisma.aIAgentRun.update({
      where: { id: agentRunId },
      data: {
        status: 'FAILED',
        error: errorMessage,
        completedAt: new Date(),
      },
    });

    this.eventsGateway.emitToTenant(tenantId, 'ai.agent.failed', {
      runId: agentRunId,
      agentRunId,
      agentType: run.agentType,
      entityType: run.entityType,
      entityId: run.entityId,
      status: 'FAILED',
      error: errorMessage,
    });
  }
}
