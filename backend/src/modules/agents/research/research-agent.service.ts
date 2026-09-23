import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventsGateway } from '../../../events/events.gateway';
import { CompanyResolverService } from './company-resolver.service';
import { WebsiteFetcherService } from './website-fetcher.service';
import { HtmlExtractorService } from './html-extractor.service';
import { ResearchExtractorService } from './research-extractor.service';
import { CompanyResearchResult } from './research.types';

export interface ResearchJobPayload {
  tenantId: string;
  agentRunId: string;
  agentType: string;
  entityType: string;
  entityId: string;
  input?: any;
}

@Injectable()
export class ResearchAgentService {
  private readonly logger = new Logger(ResearchAgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
    private readonly companyResolver: CompanyResolverService,
    private readonly websiteFetcher: WebsiteFetcherService,
    private readonly htmlExtractor: HtmlExtractorService,
    private readonly researchExtractor: ResearchExtractorService
  ) {}

  /**
   * Executes the full autonomous Research Agent lifecycle.
   */
  public async execute(jobData: ResearchJobPayload): Promise<{ success: boolean; result?: CompanyResearchResult; error?: string }> {
    const { tenantId, agentRunId, agentType, entityType, entityId } = jobData;
    const startTime = Date.now();

    this.logger.log(`Starting Research Agent execution for AgentRun ${agentRunId} (tenant: ${tenantId})`);

    // Verify run existence in DB
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

      this.emitProgress(tenantId, agentRunId, entityType, entityId, 5, 'Resolving company', 'RUNNING');

      // 1. Company Resolution
      const { company, domain } = await this.companyResolver.resolveCompany(tenantId, entityType, entityId);
      this.logger.log(`Resolved company '${company.name}' with domain '${domain}'`);

      // 2. Fetch Website
      this.emitProgress(tenantId, agentRunId, entityType, entityId, 30, 'Fetching website');
      const fetchedPages = await this.websiteFetcher.fetchCompanyPages(domain);
      this.logger.log(`Fetched ${fetchedPages.length} pages for ${domain}`);

      // 3. Extract Content
      this.emitProgress(tenantId, agentRunId, entityType, entityId, 60, 'Extracting content');
      const researchContext = this.htmlExtractor.extractFromPages(domain, fetchedPages);

      // 4. AI & Structured Extraction
      this.emitProgress(tenantId, agentRunId, entityType, entityId, 80, 'Analyzing company');
      const { result, modelUsed, modelVersion } = await this.researchExtractor.extractCompanyResearch(
        company.name,
        domain,
        researchContext
      );

      // 5. Saving Research & Persistence
      this.emitProgress(tenantId, agentRunId, entityType, entityId, 90, 'Saving research');
      await this.persistResearchData(tenantId, company.id, result);

      // 6. Complete Run
      const durationMs = Date.now() - startTime;
      await this.prisma.aIAgentRun.update({
        where: { id: agentRunId },
        data: {
          status: 'COMPLETED',
          output: result as any,
          model: modelUsed,
          modelVersion,
          durationMs,
          completedAt: new Date(),
        },
      });

      // Emit completed event
      this.eventsGateway.emitToTenant(tenantId, 'ai.agent.completed', {
        runId: agentRunId,
        agentRunId,
        agentType: 'research',
        entityType,
        entityId,
        status: 'COMPLETED',
        progress: 100,
        stage: 'Research completed',
        output: result,
        durationMs,
      });

      this.logger.log(`Research Agent successfully completed for AgentRun ${agentRunId} in ${durationMs}ms`);
      return { success: true, result };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const errorMessage = err.message || 'An error occurred during company research';
      this.logger.error(`Research Agent failed for AgentRun ${agentRunId}: ${errorMessage}`);

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
        agentType: 'research',
        entityType,
        entityId,
        status: 'FAILED',
        error: errorMessage,
        durationMs,
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Helper to emit structured progress events to the authenticated tenant room.
   */
  private emitProgress(
    tenantId: string,
    runId: string,
    entityType: string,
    entityId: string,
    progress: number,
    stage: string,
    status: string = 'RUNNING'
  ) {
    this.eventsGateway.emitToTenant(tenantId, 'ai.agent.progress', {
      runId,
      agentRunId: runId,
      agentType: 'research',
      entityType,
      entityId,
      status,
      progress,
      stage,
    });
  }

  /**
   * Persists research intelligence into Company and CompanySignal models
   * with deterministic deduplication.
   */
  private async persistResearchData(tenantId: string, companyId: string, result: CompanyResearchResult) {
    // 1. Update Company profile attributes if not already richer
    const updateData: any = {};
    if (result.company.description) updateData.description = result.company.description;
    if (result.company.industry) updateData.industry = result.company.industry;
    if (result.company.location) updateData.location = result.company.location;
    if (result.company.foundedYear) updateData.foundedYear = result.company.foundedYear;
    if (result.company.website) updateData.websiteUrl = result.company.website;
    if (result.company.employeeCount) updateData.employeeCount = result.company.employeeCount;

    if (Object.keys(updateData).length > 0) {
      await this.prisma.company.update({
        where: { id: companyId },
        data: updateData,
      });
    }

    // 2. Persist Business Signals with deterministic deduplication
    for (const signal of result.businessSignals) {
      if (!signal.title || !signal.type) continue;

      // Check if signal with exact type & normalized title already exists for this company
      const existingSignal = await this.prisma.companySignal.findFirst({
        where: {
          tenantId,
          companyId,
          type: signal.type,
          title: signal.title.trim(),
        },
      });

      if (existingSignal) {
        // Update existing signal with fresh evidence and timestamp
        await this.prisma.companySignal.update({
          where: { id: existingSignal.id },
          data: {
            description: signal.description || existingSignal.description,
            confidence: signal.confidence,
            sourceUrl: signal.sourceUrl || existingSignal.sourceUrl,
            detectedAt: new Date(),
          },
        });
      } else {
        // Create new signal
        await this.prisma.companySignal.create({
          data: {
            tenantId,
            companyId,
            type: signal.type,
            title: signal.title.trim(),
            description: signal.description || null,
            strength: 1.0,
            confidence: signal.confidence || 0.8,
            source: 'RESEARCH_AGENT',
            sourceUrl: signal.sourceUrl || null,
            detectedAt: new Date(),
          },
        });
      }
    }
  }
}
