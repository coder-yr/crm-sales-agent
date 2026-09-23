import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventsGateway } from '../../../events/events.gateway';
import { RecommendationsAgentService } from './recommendations-agent.service';
import { RecommendationsRulesService, RULE_KEYS } from './recommendations-rules.service';
import { RecommendationsService } from '../../recommendations/recommendations.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { EventsModule } from '../../../events/events.module';
import { ConfigModule } from '@nestjs/config';

describe('Recommendations Agent Real Database Integration', () => {
  jest.setTimeout(45000);

  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let agentService: RecommendationsAgentService;
  let recService: RecommendationsService;

  let tenantA: any;
  let userA: any;
  let stageA: any;
  let companyA: any;
  let leadA: any;
  let signalA: any;
  let dealIntelA: any;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, EventsModule],
      providers: [
        RecommendationsRulesService,
        RecommendationsAgentService,
        RecommendationsService,
      ],
    }).compile();

    prisma = moduleRef.get<PrismaService>(PrismaService);
    agentService = moduleRef.get<RecommendationsAgentService>(RecommendationsAgentService);
    recService = moduleRef.get<RecommendationsService>(RecommendationsService);

    // Setup Test Data in PostgreSQL
    tenantA = await prisma.tenant.create({ data: { name: `Rec-Tenant-A-${Date.now()}` } });

    userA = await prisma.user.create({
      data: {
        tenantId: tenantA.id,
        email: `usera-rec-db-${Date.now()}@test.com`,
        firstName: 'RecUser',
        lastName: 'A',
        role: 'OWNER',
      },
    });

    stageA = await prisma.pipelineStage.create({
      data: {
        tenantId: tenantA.id,
        name: 'Evaluation / Demo',
        order: 3,
      },
    });

    companyA = await prisma.company.create({
      data: {
        tenantId: tenantA.id,
        name: 'Stripe Test Corp',
        websiteUrl: 'https://stripe.com',
        domain: 'stripe.com',
        industry: 'FinTech',
        employeeCount: 7500,
      },
    });

    signalA = await prisma.companySignal.create({
      data: {
        tenantId: tenantA.id,
        companyId: companyA.id,
        type: 'HIRING',
        title: 'Infrastructure Hiring Wave',
        description: 'Actively recruiting 50+ staff engineers',
        strength: 1.0,
        confidence: 88,
        source: 'CAREERS_PAGE',
        evidence: 'View our open engineering roles in payments infrastructure.',
        fingerprint: `hiring-${companyA.id}-${Date.now()}`,
      },
    });

    leadA = await prisma.lead.create({
      data: {
        tenantId: tenantA.id,
        firstName: 'Patrick',
        lastName: 'Collison',
        email: 'patrick@stripe.com',
        budget: 120000,
        stageId: stageA.id,
        creatorId: userA.id,
        companyId: companyA.id,
        expectedCloseDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      },
    });

    dealIntelA = await prisma.dealIntelligence.create({
      data: {
        tenantId: tenantA.id,
        leadId: leadA.id,
        dealScore: 85,
        healthScore: 'HEALTHY',
        intentScore: 80,
        companyFitScore: 85,
        contactFitScore: 80,
        engagementScore: 70,
        riskScore: 15,
        dealHealth: 'HEALTHY',
        buyingStage: 'EVALUATION',
        urgency: 'HIGH',
        modelVersion: 'v1',
        reasons: {
          positives: [{ title: 'Hiring Signal', confidence: 88 }],
          risks: [],
          missingData: [],
        },
      },
    });
  }, 35000);

  afterAll(async () => {
    try {
      if (leadA) {
        await prisma.task.deleteMany({ where: { leadId: leadA.id } });
        await prisma.aIRecommendation.deleteMany({ where: { leadId: leadA.id } });
        await prisma.dealIntelligence.deleteMany({ where: { leadId: leadA.id } });
        await prisma.aIAgentRun.deleteMany({ where: { tenantId: tenantA.id } });
        await prisma.lead.deleteMany({ where: { id: leadA.id } });
        await prisma.companySignal.deleteMany({ where: { companyId: companyA.id } });
        await prisma.company.deleteMany({ where: { id: companyA.id } });
        await prisma.pipelineStage.deleteMany({ where: { id: stageA.id } });
        await prisma.user.deleteMany({ where: { tenantId: tenantA.id } });
        await prisma.tenant.deleteMany({ where: { id: tenantA.id } });
      }
      await moduleRef.close();
    } catch {
      // ignore cleanup errors
    }
  }, 35000);

  it('executes recommendations agent and persists AIRecommendation in PostgreSQL', async () => {
    const run = await prisma.aIAgentRun.create({
      data: {
        tenantId: tenantA.id,
        agentType: 'recommendations',
        entityType: 'Lead',
        entityId: leadA.id,
        status: 'QUEUED',
      },
    });

    const execRes = await agentService.execute({
      tenantId: tenantA.id,
      agentRunId: run.id,
      agentType: 'recommendations',
      entityType: 'Lead',
      entityId: leadA.id,
    });

    expect(execRes.success).toBe(true);
    expect(execRes.count).toBeGreaterThanOrEqual(1);

    // Verify AIRecommendation in PostgreSQL
    const persisted = await prisma.aIRecommendation.findFirst({
      where: {
        tenantId: tenantA.id,
        leadId: leadA.id,
        ruleKey: RULE_KEYS.HIRING_EXPANSION_FOLLOWUP,
      },
    });

    expect(persisted).toBeDefined();
    expect(persisted?.type).toBe('FOLLOW_UP');
    expect(persisted?.priority).toBe('HIGH');
    expect(persisted?.status).toBe('PENDING');
    expect(persisted?.evidence).toBeDefined();

    // Verify AIAgentRun transitioned to COMPLETED
    const updatedRun = await prisma.aIAgentRun.findUnique({ where: { id: run.id } });
    expect(updatedRun?.status).toBe('COMPLETED');
  });

  it('deduplicates: running agent again does not create duplicate active recommendations', async () => {
    const initialCount = await prisma.aIRecommendation.count({
      where: {
        tenantId: tenantA.id,
        leadId: leadA.id,
        status: { in: ['PENDING', 'ACCEPTED'] },
      },
    });

    const run2 = await prisma.aIAgentRun.create({
      data: {
        tenantId: tenantA.id,
        agentType: 'recommendations',
        entityType: 'Lead',
        entityId: leadA.id,
        status: 'QUEUED',
      },
    });

    await agentService.execute({
      tenantId: tenantA.id,
      agentRunId: run2.id,
      agentType: 'recommendations',
      entityType: 'Lead',
      entityId: leadA.id,
    });

    const finalCount = await prisma.aIRecommendation.count({
      where: {
        tenantId: tenantA.id,
        leadId: leadA.id,
        status: { in: ['PENDING', 'ACCEPTED'] },
      },
    });

    expect(finalCount).toBe(initialCount);
  });

  it('accepts recommendation and transactionally creates a CRM Task in PostgreSQL', async () => {
    const rec = await prisma.aIRecommendation.findFirst({
      where: {
        tenantId: tenantA.id,
        leadId: leadA.id,
        status: 'PENDING',
      },
    });

    expect(rec).toBeDefined();

    const accepted = await recService.accept(tenantA.id, userA.id, rec!.id, true);

    expect(accepted.status).toBe('COMPLETED');
    expect(accepted.taskId).toBeDefined();

    // Verify Task in PostgreSQL
    const task = await prisma.task.findUnique({
      where: { id: accepted.taskId! },
    });

    expect(task).toBeDefined();
    expect(task?.leadId).toBe(leadA.id);
    expect(task?.tenantId).toBe(tenantA.id);
    expect(task?.userId).toBe(userA.id);
    expect(task?.isCompleted).toBe(false);
  });
});
