import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventsGateway } from '../../../events/events.gateway';
import {
  RecommendationsRulesService,
  CandidateRecommendation,
} from './recommendations-rules.service';

export interface ExecuteRecommendationsDto {
  tenantId: string;
  agentRunId: string;
  agentType: string;
  entityType: string;
  entityId: string;
}

@Injectable()
export class RecommendationsAgentService {
  private readonly logger = new Logger(RecommendationsAgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
    private readonly rulesService: RecommendationsRulesService,
  ) {}

  async execute(dto: ExecuteRecommendationsDto): Promise<{
    success: boolean;
    recommendations?: CandidateRecommendation[];
    count?: number;
    error?: string;
  }> {
    const { tenantId, agentRunId, entityId: leadId } = dto;
    const startTime = Date.now();

    this.logger.log(
      `Starting Recommendations Agent run ${agentRunId} for Lead ${leadId} (Tenant: ${tenantId})`
    );

    // 1. Verify and update AIAgentRun to RUNNING
    const agentRun = await this.prisma.aIAgentRun.findFirst({
      where: { id: agentRunId, tenantId },
    });

    if (!agentRun) {
      this.logger.error(`AIAgentRun ${agentRunId} not found or tenant mismatch`);
      return { success: false, error: 'Agent run not found or tenant mismatch' };
    }

    await this.prisma.aIAgentRun.update({
      where: { id: agentRunId },
      data: { status: 'RUNNING' },
    });

    try {
      // 2. Fetch Lead with company and stage
      this.emitProgress(tenantId, agentRunId, leadId, 20, 'Loading lead intelligence & signals');

      const lead = await this.prisma.lead.findFirst({
        where: { id: leadId, tenantId },
        include: {
          company: true,
          stage: true,
        },
      });

      if (!lead) {
        throw new NotFoundException(`Lead ${leadId} not found for tenant ${tenantId}`);
      }

      // 3. Fetch Stored Phase 5 Company Signals
      let companySignals: any[] = [];
      if (lead.companyId) {
        companySignals = await this.prisma.companySignal.findMany({
          where: { tenantId, companyId: lead.companyId },
          orderBy: { detectedAt: 'desc' },
        });
      }

      // 4. Fetch Stored Phase 6 Deal Intelligence
      const dealIntelligence = await this.prisma.dealIntelligence.findUnique({
        where: { tenantId_leadId: { tenantId, leadId } },
      });

      // 5. Fetch CRM Activities
      const activities = await this.prisma.activity.findMany({
        where: { tenantId, leadId },
        orderBy: { createdAt: 'desc' },
      });

      // 6. Fetch CRM Tasks
      const tasks = await this.prisma.task.findMany({
        where: { tenantId, leadId, deletedAt: null },
      });

      // 7. Fetch Contacts
      let contacts: any[] = [];
      if (lead.companyId) {
        contacts = await this.prisma.contact.findMany({
          where: { tenantId, companyId: lead.companyId },
        });
      }

      // 8. Evaluate Deterministic Rules
      this.emitProgress(tenantId, agentRunId, leadId, 50, 'Evaluating recommendation policies');

      const candidates = this.rulesService.evaluateAll({
        lead: {
          id: lead.id,
          tenantId: lead.tenantId,
          firstName: lead.firstName,
          lastName: lead.lastName,
          budget: lead.budget,
          stage: lead.stage ? { name: lead.stage.name, order: lead.stage.order } : null,
          expectedCloseDate: lead.expectedCloseDate,
          companyId: lead.companyId,
          company: lead.company
            ? {
                id: lead.company.id,
                name: lead.company.name,
                industry: lead.company.industry,
                employeeCount: lead.company.employeeCount,
                revenue: lead.company.revenue,
              }
            : null,
        },
        companySignals,
        dealIntelligence: dealIntelligence
          ? {
              id: dealIntelligence.id,
              dealScore: dealIntelligence.dealScore,
              intentScore: dealIntelligence.intentScore,
              companyFitScore: dealIntelligence.companyFitScore,
              contactFitScore: dealIntelligence.contactFitScore,
              engagementScore: dealIntelligence.engagementScore,
              riskScore: dealIntelligence.riskScore,
              dealHealth: dealIntelligence.dealHealth,
              buyingStage: dealIntelligence.buyingStage,
              urgency: dealIntelligence.urgency,
              factors: ((dealIntelligence as any).factors || (dealIntelligence as any).reasons) as any,
            }
          : null,
        activities,
        tasks,
        contacts,
      });

      // 9. Active Deduplication & PostgreSQL Persistence
      this.emitProgress(tenantId, agentRunId, leadId, 80, 'Deduplicating & syncing active recommendations');

      const activeExisting = await this.prisma.aIRecommendation.findMany({
        where: {
          tenantId,
          leadId,
          status: { in: ['PENDING', 'ACCEPTED'] },
        },
      });

      const activeRuleKeys = new Set(
        activeExisting.map((r) => r.ruleKey).filter(Boolean)
      );

      const createdRecommendations: any[] = [];

      for (const cand of candidates) {
        if (activeRuleKeys.has(cand.ruleKey)) {
          // Rule is already active; update evidence if PENDING to keep it fresh
          const existingPending = activeExisting.find(
            (r) => r.ruleKey === cand.ruleKey && r.status === 'PENDING'
          );
          if (existingPending) {
            const updated = await this.prisma.aIRecommendation.update({
              where: { id: existingPending.id },
              data: {
                reason: cand.reason,
                action: cand.action,
                evidence: cand.evidencePayload as any,
              },
            });
            createdRecommendations.push(updated);
          } else {
            // It's ACCEPTED; keep as is
            const existingAccepted = activeExisting.find((r) => r.ruleKey === cand.ruleKey);
            if (existingAccepted) createdRecommendations.push(existingAccepted);
          }
        } else {
          // Insert new recommendation
          const rec = await this.prisma.aIRecommendation.create({
            data: {
              tenantId,
              leadId,
              ruleKey: cand.ruleKey,
              type: cand.type,
              title: cand.title,
              action: cand.action,
              priority: cand.priority,
              reason: cand.reason,
              status: 'PENDING',
              evidence: cand.evidencePayload as any,
              version: this.rulesService.version,
            },
          });
          createdRecommendations.push(rec);
        }
      }

      // 10. Complete AIAgentRun
      const durationMs = Date.now() - startTime;
      await this.prisma.aIAgentRun.update({
        where: { id: agentRunId },
        data: {
          status: 'COMPLETED',
          durationMs,
          completedAt: new Date(),
          output: {
            recommendations: candidates,
            count: candidates.length,
            generatedAt: new Date().toISOString(),
          } as any,
        },
      });

      this.emitProgress(tenantId, agentRunId, leadId, 100, 'Recommendations generated');

      // Emit completion event
      this.eventsGateway.emitToTenant(tenantId, 'ai.agent.completed', {
        runId: agentRunId,
        agentRunId,
        agentType: 'recommendations',
        entityType: 'Lead',
        entityId: leadId,
        status: 'COMPLETED',
        progress: 100,
        stage: 'Recommendations generated',
        output: {
          count: candidates.length,
          recommendations: candidates,
        },
      });

      // Emit domain event for NBA cards
      this.eventsGateway.emitToTenant(tenantId, 'recommendations.generated', {
        leadId,
        count: candidates.length,
        recommendations: candidates,
      });

      return {
        success: true,
        recommendations: candidates,
        count: candidates.length,
      };
    } catch (err: any) {
      this.logger.error(
        `Recommendations Agent failed for AgentRun ${agentRunId}: ${err.message}`,
        err.stack
      );

      const durationMs = Date.now() - startTime;
      await this.prisma.aIAgentRun.update({
        where: { id: agentRunId },
        data: {
          status: 'FAILED',
          durationMs,
          error: err.message,
          completedAt: new Date(),
        },
      });

      this.eventsGateway.emitToTenant(tenantId, 'ai.agent.failed', {
        runId: agentRunId,
        agentRunId,
        agentType: 'recommendations',
        entityType: 'Lead',
        entityId: leadId,
        status: 'FAILED',
        error: err.message,
      });

      return { success: false, error: err.message };
    }
  }

  private emitProgress(
    tenantId: string,
    agentRunId: string,
    leadId: string,
    progress: number,
    stage: string
  ) {
    this.eventsGateway.emitToTenant(tenantId, 'ai.agent.progress', {
      runId: agentRunId,
      agentRunId,
      agentType: 'recommendations',
      entityType: 'Lead',
      entityId: leadId,
      progress,
      stage,
      status: 'RUNNING',
    });
  }
}
