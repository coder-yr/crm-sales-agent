import { Injectable, Logger, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventsGateway } from '../../../events/events.gateway';
import { SignalDetectionJobData, SignalDetectionResult } from './signals.types';
import { SignalRulesUtil } from './signal-rules.util';
import { SignalValidatorService } from './signal-validator.service';

@Injectable()
export class SignalDetectionAgentService {
  private readonly logger = new Logger(SignalDetectionAgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
    private readonly validator: SignalValidatorService,
  ) {}

  /**
   * Main entrypoint for the Signal Detection Agent worker.
   */
  async execute(jobData: SignalDetectionJobData): Promise<{ success: boolean; result?: SignalDetectionResult; error?: string }> {
    const startTime = Date.now();
    const { tenantId, agentRunId } = jobData;

    this.logger.log(`Starting Signal Detection Agent for AgentRun ${agentRunId} (Tenant ${tenantId})`);

    // Verify AIAgentRun existence
    const run = await this.prisma.aIAgentRun.findFirst({
      where: { id: agentRunId, tenantId },
    });

    if (!run) {
      this.logger.error(`AIAgentRun ${agentRunId} not found for tenant ${tenantId}`);
      return { success: false, error: 'AGENT_RUN_NOT_FOUND' };
    }

    try {
      // Transition to RUNNING
      await this.prisma.aIAgentRun.update({
        where: { id: agentRunId },
        data: { status: 'RUNNING' },
      });

      this.emitProgress(tenantId, agentRunId, 'Company', jobData.entityId, 15, 'Loading company research', 'RUNNING');

      // 1. Resolve Company and verify tenant authorization
      const companyId = await this.resolveTargetCompanyId(tenantId, jobData);
      const company = await this.prisma.company.findFirst({
        where: { id: companyId, tenantId },
        include: { leads: true },
      });

      if (!company) {
        throw new NotFoundException(`Company ${companyId} not found or tenant mismatch`);
      }

      // 2. Load latest completed Phase 4 research data
      const researchRun = await this.findCompletedResearch(tenantId, company);

      if (!researchRun || !researchRun.output) {
        throw new BadRequestException('No completed company research is available. Run company research first.');
      }

      const researchData = researchRun.output as any;

      // 3. Extract candidate signals
      this.emitProgress(tenantId, agentRunId, 'Company', company.id, 40, 'Analyzing evidence');
      const candidateSignals = SignalRulesUtil.extractCandidateSignals(researchData);

      // 4. Validate evidence, URLs, and normalize confidence
      this.emitProgress(tenantId, agentRunId, 'Company', company.id, 65, 'Validating signals');
      const validatedSignals = this.validator.validateAndNormalize(
        tenantId,
        company.id,
        candidateSignals,
        researchData
      );

      // 5. Deduplicate and Persist signals
      this.emitProgress(tenantId, agentRunId, 'Company', company.id, 80, 'Deduplicating signals');
      this.emitProgress(tenantId, agentRunId, 'Company', company.id, 90, 'Saving signals');

      const persistedSignals = await this.persistAndDeduplicate(tenantId, company.id, validatedSignals);

      const durationMs = Date.now() - startTime;
      const result: SignalDetectionResult = {
        signals: persistedSignals,
        signalCount: persistedSignals.length,
        researchRunId: researchRun.id,
        companyId: company.id,
        companyName: company.name,
        completedAt: new Date().toISOString(),
      };

      // 6. Complete Run
      await this.prisma.aIAgentRun.update({
        where: { id: agentRunId },
        data: {
          status: 'COMPLETED',
          output: result as any,
          durationMs,
          completedAt: new Date(),
        },
      });

      // Emit completed event
      this.eventsGateway.emitToTenant(tenantId, 'ai.agent.completed', {
        runId: agentRunId,
        agentRunId,
        agentType: 'signal_detection',
        entityType: 'Company',
        entityId: company.id,
        status: 'COMPLETED',
        progress: 100,
        stage: 'Signals detected successfully',
        output: result,
        durationMs,
      });

      this.logger.log(`Signal Detection Agent completed for Company ${company.id} with ${persistedSignals.length} signals in ${durationMs}ms`);
      return { success: true, result };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const errorMessage = err.message || 'An error occurred during signal detection';
      this.logger.error(`Signal Detection Agent failed for AgentRun ${agentRunId}: ${errorMessage}`);

      await this.prisma.aIAgentRun.update({
        where: { id: agentRunId },
        data: {
          status: 'FAILED',
          error: errorMessage,
          durationMs,
          completedAt: new Date(),
        },
      });

      this.eventsGateway.emitToTenant(tenantId, 'ai.agent.failed', {
        runId: agentRunId,
        agentRunId,
        agentType: 'signal_detection',
        entityType: 'Company',
        entityId: jobData.entityId,
        status: 'FAILED',
        error: errorMessage,
        durationMs,
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Resolves target Company ID from job data (supports direct companyId or resolving through Lead).
   */
  private async resolveTargetCompanyId(tenantId: string, jobData: SignalDetectionJobData): Promise<string> {
    if (jobData.companyId) {
      return jobData.companyId;
    }

    if (jobData.entityType === 'Company') {
      return jobData.entityId;
    }

    if (jobData.entityType === 'Lead' || jobData.leadId) {
      const leadId = jobData.leadId || jobData.entityId;
      const lead = await this.prisma.lead.findFirst({
        where: { id: leadId, tenantId },
      });

      if (!lead) {
        throw new ForbiddenException(`You do not have access to this Lead or it does not exist.`);
      }

      if (!lead.companyId) {
        throw new BadRequestException(`Lead is not associated with any company. Run company research first.`);
      }

      return lead.companyId;
    }

    return jobData.entityId;
  }

  /**
   * Finds latest completed Phase 4 research run for the company or its leads.
   */
  private async findCompletedResearch(tenantId: string, company: any) {
    const leadIds = (company.leads || []).map((l: any) => l.id);

    // 1. Check company-level research run first
    let researchRun = await this.prisma.aIAgentRun.findFirst({
      where: {
        tenantId,
        entityType: 'Company',
        entityId: company.id,
        agentType: 'research',
        status: 'COMPLETED',
      },
      orderBy: { completedAt: 'desc' },
    });

    if (researchRun && researchRun.output) {
      return researchRun;
    }

    // 2. Check lead-level research run if company was resolved from a lead
    if (leadIds.length > 0) {
      researchRun = await this.prisma.aIAgentRun.findFirst({
        where: {
          tenantId,
          entityType: 'Lead',
          entityId: { in: leadIds },
          agentType: 'research',
          status: 'COMPLETED',
        },
        orderBy: { completedAt: 'desc' },
      });
    }

    return researchRun;
  }

  /**
   * Deduplicates signals by (tenantId, companyId, fingerprint) and persists them.
   * If a signal with the exact fingerprint already exists:
   * updates detectedAt, confidence, and evidence in place without inserting duplicates.
   */
  private async persistAndDeduplicate(
    tenantId: string,
    companyId: string,
    signals: any[]
  ) {
    const persisted = [];

    for (const sig of signals) {
      const existingSignal = await this.prisma.companySignal.findFirst({
        where: {
          tenantId,
          companyId,
          fingerprint: sig.fingerprint,
        },
      });

      if (existingSignal) {
        // Update existing signal with freshest evidence & timestamp
        try {
          const updated = await this.prisma.companySignal.update({
            where: { id: existingSignal.id },
            data: {
              title: sig.title,
              description: sig.description,
              strength: sig.strength,
              confidence: Math.max(existingSignal.confidence, sig.confidence),
              evidence: sig.evidence || existingSignal.evidence,
              sourceUrl: sig.sourceUrl || existingSignal.sourceUrl,
              detectedAt: new Date(),
            },
          });
          persisted.push({ ...sig, id: updated.id });
        } catch (updateErr) {
          // If record was concurrently modified or removed, re-create safely
          const created = await this.prisma.companySignal.create({
            data: {
              tenantId,
              companyId,
              type: sig.type,
              title: sig.title,
              description: sig.description,
              strength: sig.strength,
              confidence: sig.confidence,
              source: sig.source,
              sourceUrl: sig.sourceUrl,
              evidence: sig.evidence,
              fingerprint: sig.fingerprint,
              detectedAt: sig.detectedAt,
            },
          });
          persisted.push({ ...sig, id: created.id });
        }
      } else {
        // Create new signal
        const created = await this.prisma.companySignal.create({
          data: {
            tenantId,
            companyId,
            type: sig.type,
            title: sig.title,
            description: sig.description,
            strength: sig.strength,
            confidence: sig.confidence,
            source: sig.source,
            sourceUrl: sig.sourceUrl,
            evidence: sig.evidence,
            fingerprint: sig.fingerprint,
            detectedAt: sig.detectedAt,
          },
        });
        persisted.push({ ...sig, id: created.id });
      }
    }

    return persisted;
  }

  private emitProgress(
    tenantId: string,
    agentRunId: string,
    entityType: string,
    entityId: string,
    progress: number,
    stage: string,
    status: string = 'RUNNING'
  ) {
    this.eventsGateway.emitToTenant(tenantId, 'ai.agent.progress', {
      runId: agentRunId,
      agentRunId,
      agentType: 'signal_detection',
      entityType,
      entityId,
      status,
      progress,
      stage,
    });
  }
}
