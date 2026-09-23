import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventsGateway } from '../../../events/events.gateway';
import { DealIntelligenceAgentService } from './deal-intelligence-agent.service';
import { DealScoringService } from './deal-scoring.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { EventsModule } from '../../../events/events.module';
import { ConfigModule } from '@nestjs/config';

describe('Deal Intelligence Agent Real Database Integration', () => {
  jest.setTimeout(40000);

  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let dealAgentService: DealIntelligenceAgentService;

  let tenantA: any;
  let tenantB: any;
  let userA: any;
  let stageA: any;
  let companyA: any;
  let leadA: any;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, EventsModule],
      providers: [DealScoringService, DealIntelligenceAgentService],
    }).compile();

    prisma = moduleRef.get<PrismaService>(PrismaService);
    dealAgentService = moduleRef.get<DealIntelligenceAgentService>(DealIntelligenceAgentService);

    // Setup Test Data in PostgreSQL
    tenantA = await prisma.tenant.create({ data: { name: `Deal Tenant A ${Date.now()}` } });
    tenantB = await prisma.tenant.create({ data: { name: `Deal Tenant B ${Date.now()}` } });

    userA = await prisma.user.create({
      data: {
        tenantId: tenantA.id,
        email: `usera-deal-db-${Date.now()}@test.com`,
        firstName: 'DealUser',
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
        name: 'Acme Cloud Corp',
        websiteUrl: 'https://acmecloud.io',
        domain: 'acmecloud.io',
        industry: 'Enterprise Software / SaaS',
        employeeCount: 450,
      },
    });

    // Create verified signal for companyA
    await prisma.companySignal.create({
      data: {
        tenantId: tenantA.id,
        companyId: companyA.id,
        type: 'HIRING',
        title: 'Tech Hiring Activity',
        description: 'Actively recruiting cloud architects',
        strength: 1.0,
        confidence: 88,
        source: 'CAREERS_PAGE',
        evidence: 'We are hiring Senior Cloud Architects to scale our team.',
      },
    });

    leadA = await prisma.lead.create({
      data: {
        tenantId: tenantA.id,
        firstName: 'Sarah',
        lastName: 'Connor',
        email: 'sarah@acmecloud.io',
        budget: 75000,
        stageId: stageA.id,
        creatorId: userA.id,
        companyId: companyA.id,
        expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }, 30000);

  afterAll(async () => {
    try {
      if (leadA) {
        await prisma.dealIntelligence.deleteMany({ where: { leadId: leadA.id } });
        await prisma.aIAgentRun.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
        await prisma.lead.deleteMany({ where: { id: leadA.id } });
        await prisma.companySignal.deleteMany({ where: { companyId: companyA.id } });
        await prisma.company.deleteMany({ where: { id: companyA.id } });
        await prisma.pipelineStage.deleteMany({ where: { id: stageA.id } });
        await prisma.user.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
        await prisma.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } } });
      }
      await moduleRef.close();
    } catch {
      // ignore cleanup errors
    }
  }, 30000);

  it('should execute deal analysis and persist DealIntelligence record in PostgreSQL', async () => {
    const run = await prisma.aIAgentRun.create({
      data: {
        tenantId: tenantA.id,
        agentType: 'deal_analysis',
        entityType: 'Lead',
        entityId: leadA.id,
        status: 'QUEUED',
      },
    });

    const execRes = await dealAgentService.execute({
      tenantId: tenantA.id,
      agentRunId: run.id,
      agentType: 'deal_analysis',
      entityType: 'Lead',
      entityId: leadA.id,
    });

    expect(execRes.success).toBe(true);
    expect(execRes.result).toBeDefined();
    expect(execRes.result?.scoringVersion).toBe('v1');
    expect(execRes.result?.dealScore).toBeGreaterThanOrEqual(0);
    expect(execRes.result?.dealScore).toBeLessThanOrEqual(100);

    // Verify DealIntelligence row in PostgreSQL
    const persisted = await prisma.dealIntelligence.findUnique({
      where: { tenantId_leadId: { tenantId: tenantA.id, leadId: leadA.id } },
    });

    expect(persisted).toBeDefined();
    expect(persisted?.dealScore).toBe(execRes.result?.dealScore);
    expect(persisted?.modelVersion).toBe('v1');
    expect(persisted?.buyingStage).toBe('EVALUATION');

    // Verify AIAgentRun transitioned to COMPLETED
    const updatedRun = await prisma.aIAgentRun.findUnique({ where: { id: run.id } });
    expect(updatedRun?.status).toBe('COMPLETED');
  });

  it('should re-execute without creating duplicate DealIntelligence rows (idempotent upsert)', async () => {
    const initialCount = await prisma.dealIntelligence.count({
      where: { tenantId: tenantA.id, leadId: leadA.id },
    });
    expect(initialCount).toBe(1);

    const run2 = await prisma.aIAgentRun.create({
      data: {
        tenantId: tenantA.id,
        agentType: 'deal_analysis',
        entityType: 'Lead',
        entityId: leadA.id,
        status: 'QUEUED',
      },
    });

    await dealAgentService.execute({
      tenantId: tenantA.id,
      agentRunId: run2.id,
      agentType: 'deal_analysis',
      entityType: 'Lead',
      entityId: leadA.id,
    });

    const finalCount = await prisma.dealIntelligence.count({
      where: { tenantId: tenantA.id, leadId: leadA.id },
    });
    expect(finalCount).toBe(1);
  });

  it('should reject execution when tenantId does not match the agent run (tenant isolation)', async () => {
    const runB = await prisma.aIAgentRun.create({
      data: {
        tenantId: tenantB.id,
        agentType: 'deal_analysis',
        entityType: 'Lead',
        entityId: leadA.id, // leadA belongs to tenantA
        status: 'QUEUED',
      },
    });

    const execRes = await dealAgentService.execute({
      tenantId: tenantB.id,
      agentRunId: runB.id,
      agentType: 'deal_analysis',
      entityType: 'Lead',
      entityId: leadA.id,
    });

    expect(execRes.success).toBe(false);
  });
});
