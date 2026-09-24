import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EventsGateway } from '../../../events/events.gateway';
import { LLMService } from '../../llm/llm.service';
import { OutreachContextBuilderService } from './outreach-context-builder.service';
import { OutreachHallucinationGuardService } from './outreach-hallucination-guard.service';
import { OutreachLlmOutput } from './outreach.types';

@Injectable()
export class OutreachAgentService {
  private readonly logger = new Logger(OutreachAgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly contextBuilder: OutreachContextBuilderService,
    private readonly hallucinationGuard: OutreachHallucinationGuardService,
    private readonly eventsGateway: EventsGateway,
    private readonly llmService: LLMService
  ) {}

  async execute(
    agentRunId: string,
    tenantId: string,
    leadId: string,
    recommendationId?: string,
    tone: string = 'PROFESSIONAL'
  ) {
    const startedAt = Date.now();
    this.logger.log(`Starting AI Outreach Agent run ${agentRunId} for Lead ${leadId}`);

    // Update agent run status to RUNNING
    await this.prisma.aIAgentRun.updateMany({
      where: { id: agentRunId, tenantId },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    this.eventsGateway.emitToTenant(tenantId, 'ai.agent.started', {
      runId: agentRunId,
      agentRunId,
      agentType: 'outreach',
      entityType: 'Lead',
      entityId: leadId,
      status: 'RUNNING',
      stage: 'Building verified context & research evidence...',
    });

    this.eventsGateway.emitToTenant(tenantId, 'ai.agent.progress', {
      runId: agentRunId,
      agentRunId,
      tenantId,
      entityId: leadId,
      agentType: 'outreach',
      progress: 25,
      stage: 'Building verified context & research evidence...',
    });

    try {
      // 1. Build Context
      const context = await this.contextBuilder.buildContext(
        tenantId,
        leadId,
        recommendationId,
        tone
      );

      this.eventsGateway.emitToTenant(tenantId, 'ai.agent.progress', {
        runId: agentRunId,
        agentRunId,
        tenantId,
        entityId: leadId,
        agentType: 'outreach',
        progress: 50,
        stage: 'Synthesizing personalized outreach draft...',
      });

      // 2. Build isolated prompt
      const prompt = this.contextBuilder.buildPrompt(context);

      // 3. Attempt LLM generation
      let llmOutput: OutreachLlmOutput | null = null;
      let modelUsed = 'deterministic-template-v1';
      let isFallback = true;

      try {
        this.logger.log(`Querying LLM Service for outreach generation...`);
        const result = await this.llmService.generate({
          model: 'llama3-70b-8192', // Default Groq model
          userPrompt: prompt,
          jsonMode: true,
          temperature: 0.3,
          timeoutMs: 30000,
        });

        if (result.content) {
          const validation = this.hallucinationGuard.validateLlmOutput(result.content, context);
          if (validation.isValid && validation.cleanedOutput) {
            llmOutput = validation.cleanedOutput;
            modelUsed = result.modelUsed;
            isFallback = false;
            this.logger.log(`LLM draft passed schema & hallucination guard!`);
          } else {
            this.logger.warn(`LLM output rejected by hallucination guard: ${validation.reason}. Using fallback template.`);
          }
        } else {
          this.logger.warn(`LLM service returned no content. Using fallback template.`);
        }
      } catch (err: any) {
        this.logger.warn(`Error during LLM generation: ${err.message}. Using deterministic template.`);
      }

      // If LLM failed or was rejected, use template fallback
      if (!llmOutput) {
        llmOutput = this.hallucinationGuard.generateFallbackTemplate(context);
        modelUsed = 'deterministic-template-v1';
        isFallback = true;
      }

      this.eventsGateway.emitToTenant(tenantId, 'ai.agent.progress', {
        runId: agentRunId,
        agentRunId,
        tenantId,
        entityId: leadId,
        agentType: 'outreach',
        progress: 85,
        stage: 'Persisting outreach draft...',
      });

      // 4. Persist AIOutreachDraft in PostgreSQL
      const draft = await this.prisma.aIOutreachDraft.create({
        data: {
          tenantId,
          leadId,
          recommendationId: context.recommendation?.id || null,
          type: context.outreachType,
          status: 'DRAFT',
          subject: llmOutput.subject,
          body: llmOutput.body,
          tone: context.tone,
          personalizationPoints: llmOutput.personalizationPoints as any,
          usedEvidence: llmOutput.usedEvidence as any,
          evidenceSnapshot: {
            leadName: `${context.lead.firstName} ${context.lead.lastName}`,
            companyName: context.company.name,
            recommendationAction: context.recommendation?.action,
            dealScore: context.deal?.dealScore,
            signalsUsed: context.signals.map((s) => ({ type: s.type, confidence: s.confidence })),
            evaluatedAt: new Date().toISOString(),
          } as any,
          model: modelUsed,
          modelVersion: 'v1',
        },
      });

      const durationMs = Date.now() - startedAt;

      // 5. Update AIAgentRun to COMPLETED
      await this.prisma.aIAgentRun.updateMany({
        where: { id: agentRunId, tenantId },
        data: {
          status: 'COMPLETED',
          output: {
            draftId: draft.id,
            outreachType: draft.type,
            subject: draft.subject,
            modelUsed,
            isFallback,
          } as any,
          model: modelUsed,
          modelVersion: 'v1',
          completedAt: new Date(),
          durationMs,
        },
      });

      this.eventsGateway.emitToTenant(tenantId, 'ai.agent.completed', {
        runId: agentRunId,
        agentRunId,
        agentType: 'outreach',
        entityType: 'Lead',
        entityId: leadId,
        status: 'COMPLETED',
        output: draft,
      });

      this.eventsGateway.emitToTenant(tenantId, 'outreach.draft.generated', {
        draftId: draft.id,
        leadId,
        status: draft.status,
        type: draft.type,
        subject: draft.subject,
      });

      this.logger.log(`AI Outreach Agent completed successfully for Lead ${leadId} (Draft: ${draft.id}, ${durationMs}ms)`);
      return draft;
    } catch (err: any) {
      this.logger.error(`AI Outreach Agent failed for run ${agentRunId}: ${err.message}`, err.stack);

      await this.prisma.aIAgentRun.updateMany({
        where: { id: agentRunId, tenantId },
        data: {
          status: 'FAILED',
          error: err.message || 'Unknown error',
          completedAt: new Date(),
          durationMs: Date.now() - startedAt,
        },
      });

      this.eventsGateway.emitToTenant(tenantId, 'ai.agent.failed', {
        runId: agentRunId,
        agentRunId,
        agentType: 'outreach',
        entityType: 'Lead',
        entityId: leadId,
        status: 'FAILED',
        error: err.message || 'Unknown error',
      });

      throw err;
    }
  }
}
