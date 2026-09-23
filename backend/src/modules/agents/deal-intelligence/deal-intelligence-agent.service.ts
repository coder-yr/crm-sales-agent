import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventsGateway } from '../../../events/events.gateway';
import { DealScoringService, DealScoringLeadInput, DealIntelligenceOutput } from './deal-scoring.service';

export interface DealAnalysisJobPayload {
  tenantId: string;
  agentRunId: string;
  agentType: string;
  entityType: string;
  entityId: string;
  input?: any;
}

@Injectable()
export class DealIntelligenceAgentService {
  private readonly logger = new Logger(DealIntelligenceAgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
    private readonly dealScoringService: DealScoringService
  ) {}

  /**
   * Executes autonomous Deal Intelligence analysis on an authenticated tenant lead.
   */
  public async execute(jobData: DealAnalysisJobPayload): Promise<{ success: boolean; result?: DealIntelligenceOutput; error?: string }> {
    const { tenantId, agentRunId, entityType, entityId } = jobData;
    const startTime = Date.now();

    this.logger.log(`Starting Deal Intelligence execution for AgentRun ${agentRunId} (lead: ${entityId}, tenant: ${tenantId})`);

    // 1. Verify AgentRun existence and ownership
    const run = await this.prisma.aIAgentRun.findFirst({
      where: { id: agentRunId, tenantId },
    });

    if (!run) {
      this.logger.error(`AIAgentRun ${agentRunId} not found or tenant mismatch`);
      return { success: false, error: 'AGENT_RUN_NOT_FOUND' };
    }

    try {
      // Transition run to RUNNING
      await this.prisma.aIAgentRun.update({
        where: { id: agentRunId },
        data: { status: 'RUNNING' },
      });

      this.emitProgress(tenantId, agentRunId, entityId, 20, 'Loading lead context', 'RUNNING');

      // 2. Fetch Lead with complete CRM relational context
      const leadId = entityType === 'Lead' ? entityId : jobData.input?.leadId || entityId;

      const lead = await this.prisma.lead.findFirst({
        where: { id: leadId, tenantId },
        include: {
          stage: true,
          company: {
            include: {
              contacts: true,
              signals: true,
            },
          },
          activities: {
            orderBy: { createdAt: 'desc' },
            take: 30,
          },
          tasks: {
            orderBy: { dueDate: 'asc' },
            take: 20,
          },
        },
      });

      if (!lead) {
        throw new NotFoundException(`Lead ${leadId} not found for tenant ${tenantId}`);
      }

      this.emitProgress(tenantId, agentRunId, leadId, 40, 'Analyzing company & contact fit');

      // 3. Fetch any additional signals directly linked to the company
      let signals = lead.company?.signals || [];
      if (lead.companyId && signals.length === 0) {
        signals = await this.prisma.companySignal.findMany({
          where: { tenantId, companyId: lead.companyId },
          orderBy: { detectedAt: 'desc' },
        });
      }

      this.emitProgress(tenantId, agentRunId, leadId, 60, 'Analyzing business signals & intent');

      // 4. Resolve primary contact
      const contact = lead.company?.contacts?.[0] || {
        id: undefined,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        title: null,
        seniority: null,
        decisionMakerScore: null,
      };

      this.emitProgress(tenantId, agentRunId, leadId, 75, 'Calculating engagement & risk factors');

      // 5. Structure scoring input
      const scoringInput: DealScoringLeadInput = {
        id: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        budget: lead.budget,
        source: lead.source,
        expectedCloseDate: lead.expectedCloseDate,
        stageName: lead.stage?.name,
        stageOrder: lead.stage?.order,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
        company: lead.company
          ? {
              id: lead.company.id,
              name: lead.company.name,
              domain: lead.company.domain,
              industry: lead.company.industry,
              description: lead.company.description,
              location: lead.company.location,
              employeeCount: lead.company.employeeCount,
              revenue: lead.company.revenue,
              foundedYear: lead.company.foundedYear,
              websiteUrl: lead.company.websiteUrl,
            }
          : null,
        contact: contact
          ? {
              id: contact.id,
              firstName: contact.firstName,
              lastName: contact.lastName,
              email: contact.email,
              phone: contact.phone,
              title: contact.title,
              department: (contact as any).department,
              seniority: (contact as any).seniority,
              decisionMakerScore: contact.decisionMakerScore,
            }
          : null,
        signals: signals.map((s) => ({
          id: s.id,
          type: s.type,
          title: s.title,
          description: s.description,
          strength: s.strength,
          confidence: s.confidence,
          evidence: s.evidence,
          sourceUrl: s.sourceUrl,
          detectedAt: s.detectedAt,
        })),
        activities: lead.activities.map((a) => ({
          id: a.id,
          type: a.type,
          createdAt: a.createdAt,
        })),
        tasks: lead.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          dueDate: t.dueDate,
          isCompleted: t.isCompleted,
        })),
      };

      this.emitProgress(tenantId, agentRunId, leadId, 90, 'Generating evidence explanations');

      // 6. Execute deterministic scoring
      const result = this.dealScoringService.calculateDealIntelligence(scoringInput);

      // 7. Persist DealIntelligence atomically (Upsert guaranteed by @@unique([tenantId, leadId]))
      await this.prisma.dealIntelligence.upsert({
        where: {
          tenantId_leadId: {
            tenantId,
            leadId: lead.id,
          },
        },
        create: {
          tenantId,
          leadId: lead.id,
          dealScore: result.dealScore,
          intentScore: result.intentScore,
          companyFitScore: result.companyFitScore,
          contactFitScore: result.contactFitScore,
          engagementScore: result.engagementScore,
          riskScore: result.riskScore,
          healthScore: result.dealHealth,
          dealHealth: result.dealHealth,
          buyingStage: result.buyingStage,
          urgency: result.urgency,
          reasons: result as any,
          lastAnalyzedAt: new Date(),
          modelVersion: result.scoringVersion,
        },
        update: {
          dealScore: result.dealScore,
          intentScore: result.intentScore,
          companyFitScore: result.companyFitScore,
          contactFitScore: result.contactFitScore,
          engagementScore: result.engagementScore,
          riskScore: result.riskScore,
          healthScore: result.dealHealth,
          dealHealth: result.dealHealth,
          buyingStage: result.buyingStage,
          urgency: result.urgency,
          reasons: result as any,
          lastAnalyzedAt: new Date(),
          modelVersion: result.scoringVersion,
        },
      });

      const durationMs = Date.now() - startTime;

      // 8. Update AIAgentRun to COMPLETED
      await this.prisma.aIAgentRun.update({
        where: { id: agentRunId },
        data: {
          status: 'COMPLETED',
          output: result as any,
          modelVersion: result.scoringVersion,
          durationMs,
          completedAt: new Date(),
        },
      });

      // 9. Emit real-time completion & domain score events
      this.eventsGateway.emitToTenant(tenantId, 'ai.agent.completed', {
        runId: agentRunId,
        agentRunId,
        agentType: 'deal_analysis',
        entityType: 'Lead',
        entityId: lead.id,
        status: 'COMPLETED',
        progress: 100,
        stage: 'Deal analysis completed',
        output: result,
      });

      this.eventsGateway.emitToTenant(tenantId, 'deal.score.updated', {
        leadId: lead.id,
        dealScore: result.dealScore,
        intentScore: result.intentScore,
        riskScore: result.riskScore,
        dealHealth: result.dealHealth,
        scoringVersion: result.scoringVersion,
      });

      this.eventsGateway.emitToTenant(tenantId, 'deal.health.updated', {
        leadId: lead.id,
        dealHealth: result.dealHealth,
        buyingStage: result.buyingStage,
        urgency: result.urgency,
      });

      this.logger.log(`Deal Intelligence completed successfully for lead ${lead.id} with score ${result.dealScore}/100 (${result.dealHealth})`);
      return { success: true, result };
    } catch (err: any) {
      this.logger.error(`Deal Intelligence failed for AgentRun ${agentRunId}: ${err.message}`, err.stack);

      await this.prisma.aIAgentRun.update({
        where: { id: agentRunId },
        data: {
          status: 'FAILED',
          error: err.message || 'Deal intelligence execution error',
          completedAt: new Date(),
        },
      });

      this.eventsGateway.emitToTenant(tenantId, 'ai.agent.failed', {
        runId: agentRunId,
        agentRunId,
        agentType: 'deal_analysis',
        entityType: 'Lead',
        entityId: jobData.entityId,
        status: 'FAILED',
        error: err.message || 'Deal intelligence execution error',
      });

      return { success: false, error: err.message };
    }
  }

  private emitProgress(
    tenantId: string,
    agentRunId: string,
    leadId: string,
    progress: number,
    stage: string,
    status = 'RUNNING'
  ) {
    this.eventsGateway.emitToTenant(tenantId, 'ai.agent.progress', {
      runId: agentRunId,
      agentRunId,
      agentType: 'deal_analysis',
      entityType: 'Lead',
      entityId: leadId,
      progress,
      stage,
      status,
    });
  }
}
