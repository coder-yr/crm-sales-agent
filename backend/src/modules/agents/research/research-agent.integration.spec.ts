import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../app.module';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { io, Socket } from 'socket.io-client';
import { WebsiteFetcherService } from './website-fetcher.service';
import { ResearchAgentService } from './research-agent.service';

jest.setTimeout(45000);

describe('Research Agent & Pipeline Integration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let socketA: Socket;

  let tenantA: any;
  let tenantB: any;
  let userA: any;
  let userB: any;
  let leadA: any;
  let leadB: any;
  let leadGmail: any;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(WebsiteFetcherService)
      .useValue({
        fetchCompanyPages: jest.fn().mockResolvedValue([
          {
            url: 'https://acme-analytics.io',
            finalUrl: 'https://acme-analytics.io',
            status: 200,
            contentType: 'text/html',
            html: `
              <title>Acme Analytics - Enterprise Real-Time Data Platform</title>
              <meta name="description" content="Acme Analytics powers real-time enterprise stream processing." />
              <h1>Real-Time Stream Processing</h1>
              <h2>Built for Modern Data Teams</h2>
              <p>Acme Analytics provides enterprise streaming solutions using React, Node.js, and AWS.</p>
              <p>Headquartered in Austin, Texas. Founded in 2020.</p>
            `,
            pageType: 'HOMEPAGE',
          },
          {
            url: 'https://acme-analytics.io/careers',
            finalUrl: 'https://acme-analytics.io/careers',
            status: 200,
            contentType: 'text/html',
            html: `
              <title>Careers at Acme Analytics</title>
              <p>We are actively hiring Senior Distributed Systems Engineers to scale our core platform.</p>
            `,
            pageType: 'CAREERS',
          },
        ]),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    await app.listen(0);
    const url = await app.getUrl();

    prisma = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);
    const configService = app.get<ConfigService>(ConfigService);
    const accessSecret = configService.get<string>('jwt.accessSecret') || 'fallback-access-secret-change-me';

    // Setup Test Data
    tenantA = await prisma.tenant.create({ data: { name: 'Tenant A - Research' } });
    tenantB = await prisma.tenant.create({ data: { name: 'Tenant B - Research' } });

    userA = await prisma.user.create({
      data: { tenantId: tenantA.id, email: `usera-${Date.now()}@test.com`, firstName: 'User', lastName: 'A', role: 'OWNER' },
    });
    userB = await prisma.user.create({
      data: { tenantId: tenantB.id, email: `userb-${Date.now()}@test.com`, firstName: 'User', lastName: 'B', role: 'OWNER' },
    });

    const stageA = await prisma.pipelineStage.create({
      data: { tenantId: tenantA.id, name: 'Stage A', order: 1 },
    });
    const stageB = await prisma.pipelineStage.create({
      data: { tenantId: tenantB.id, name: 'Stage B', order: 1 },
    });

    // Lead A with corporate business domain
    leadA = await prisma.lead.create({
      data: {
        tenantId: tenantA.id,
        firstName: 'Sarah',
        lastName: 'Connor',
        email: 'sarah@acme-analytics.io',
        stageId: stageA.id,
        creatorId: userA.id,
      },
    });

    // Lead B belonging to Tenant B
    leadB = await prisma.lead.create({
      data: {
        tenantId: tenantB.id,
        firstName: 'Bob',
        lastName: 'Smith',
        email: 'bob@competitor.com',
        stageId: stageB.id,
        creatorId: userB.id,
      },
    });

    // Lead with Gmail (free consumer email)
    leadGmail = await prisma.lead.create({
      data: {
        tenantId: tenantA.id,
        firstName: 'Anonymous',
        lastName: 'Consumer',
        email: 'consumer@gmail.com',
        stageId: stageA.id,
        creatorId: userA.id,
      },
    });

    tokenA = jwtService.sign(
      { sub: userA.id, email: userA.email, tenantId: tenantA.id, role: userA.role },
      { secret: accessSecret }
    );
    tokenB = jwtService.sign(
      { sub: userB.id, email: userB.email, tenantId: tenantB.id, role: userB.role },
      { secret: accessSecret }
    );

    // Connect socket for Tenant A
    socketA = io(url, {
      auth: { token: `Bearer ${tokenA}` },
      reconnectionDelay: 100,
      forceNew: true,
      transports: ['websocket'],
    });

    await Promise.race([
      new Promise<void>((resolve) => socketA.on('connect', () => resolve())),
      new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Socket connect timed out')), 8000)),
    ]);
  }, 45000);

  afterAll(async () => {
    if (socketA?.connected) {
      socketA.disconnect();
    }
    if (prisma && tenantA && tenantB) {
      const tenantIds = [tenantA.id, tenantB.id];
      await prisma.companySignal.deleteMany({
        where: {
          OR: [
            { tenantId: { in: tenantIds } },
            { company: { tenantId: { in: tenantIds } } },
          ],
        },
      });
      await prisma.aIAgentRun.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await prisma.lead.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await prisma.company.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await prisma.pipelineStage.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await prisma.user.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });
    }
    if (app) {
      await app.close();
    }
  }, 30000);

  it('1. POST /agent-runs/research - creates AIAgentRun and queues research job', async () => {
    const res = await request(app.getHttpServer())
      .post('/agent-runs/research')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        entityType: 'Lead',
        entityId: leadA.id,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.agentRunId).toBeDefined();
    expect(res.body.data.status).toBe('QUEUED');
    expect(res.body.data.reused).toBe(false);

    // Verify persisted in PostgreSQL database
    const dbRun = await prisma.aIAgentRun.findUnique({
      where: { id: res.body.data.agentRunId },
    });
    expect(dbRun).toBeDefined();
    expect(dbRun?.tenantId).toBe(tenantA.id);
    expect(dbRun?.agentType).toBe('research');
    expect(dbRun?.entityId).toBe(leadA.id);
  });

  it('2. Tenant Isolation: Tenant A cannot trigger research on Tenant B Lead', async () => {
    const res = await request(app.getHttpServer())
      .post('/agent-runs/research')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        entityType: 'Lead',
        entityId: leadB.id,
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('You do not have access to this Lead');
  });

  it('3. Idempotency: Duplicate active research call returns existing active run', async () => {
    // 1st call creates or reuses active run
    const res1 = await request(app.getHttpServer())
      .post('/agent-runs/research')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        entityType: 'Lead',
        entityId: leadA.id,
      });

    // 2nd call should reuse the same active run
    const res2 = await request(app.getHttpServer())
      .post('/agent-runs/research')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        entityType: 'Lead',
        entityId: leadA.id,
      });

    expect(res2.status).toBe(201);
    expect(res2.body.data.agentRunId).toBe(res1.body.data.agentRunId);
    expect(res2.body.data.reused).toBe(true);
  });

  it('4. Free Public Email Domain Failure: Lead with @gmail.com fails without crashing worker', async () => {
    const run = await prisma.aIAgentRun.create({
      data: {
        tenantId: tenantA.id,
        agentType: 'research',
        entityType: 'Lead',
        entityId: leadGmail.id,
        status: 'QUEUED',
        input: { entityType: 'Lead', entityId: leadGmail.id },
      },
    });

    const researchService = app.get(ResearchAgentService);
    const execResult = await researchService.execute({
      tenantId: tenantA.id,
      agentRunId: run.id,
      agentType: 'research',
      entityType: 'Lead',
      entityId: leadGmail.id,
    });

    expect(execResult.success).toBe(false);
    expect(execResult.error).toContain('public provider');

    // Verify run status in database is FAILED
    const updatedRun = await prisma.aIAgentRun.findUnique({ where: { id: run.id } });
    expect(updatedRun?.status).toBe('FAILED');
    expect(updatedRun?.error).toContain('public provider');
  });

  it('5. Full Research Execution: Resolves company, extracts intelligence, persists data, updates Lead link', async () => {
    // Create fresh lead
    const targetLead = await prisma.lead.create({
      data: {
        tenantId: tenantA.id,
        firstName: 'Alex',
        lastName: 'Mercer',
        email: 'alex@acme-analytics.io',
        stageId: leadA.stageId,
        creatorId: userA.id,
      },
    });

    const run = await prisma.aIAgentRun.create({
      data: {
        tenantId: tenantA.id,
        agentType: 'research',
        entityType: 'Lead',
        entityId: targetLead.id,
        status: 'QUEUED',
        input: { entityType: 'Lead', entityId: targetLead.id },
      },
    });

    const researchService = app.get(ResearchAgentService);
    const execResult = await researchService.execute({
      tenantId: tenantA.id,
      agentRunId: run.id,
      agentType: 'research',
      entityType: 'Lead',
      entityId: targetLead.id,
    });

    expect(execResult.success).toBe(true);
    expect(execResult.result).toBeDefined();

    // 1. Verify AIAgentRun completed with output
    const completedRun = await prisma.aIAgentRun.findUnique({ where: { id: run.id } });
    expect(completedRun?.status).toBe('COMPLETED');
    expect(completedRun?.completedAt).toBeDefined();
    expect(completedRun?.durationMs).toBeGreaterThan(0);
    expect(completedRun?.output).toBeDefined();

    // 2. Verify Lead is linked to resolved company
    const refreshedLead = await prisma.lead.findUnique({
      where: { id: targetLead.id },
      include: { company: true },
    });
    expect(refreshedLead?.companyId).toBeDefined();
    expect(refreshedLead?.company?.domain).toBe('acme-analytics.io');

    // 3. Verify Company was enriched
    const company = refreshedLead?.company;
    expect(company?.description).toContain('Acme Analytics');
    expect(company?.location).toBe('Austin, Texas');
    expect(company?.foundedYear).toBe(2020);

    // 4. Verify CompanySignal records created with evidence
    const signals = await prisma.companySignal.findMany({
      where: { tenantId: tenantA.id, companyId: company?.id },
    });
    expect(signals.length).toBeGreaterThan(0);
    const hiringSig = signals.find((s) => s.type === 'HIRING');
    expect(hiringSig).toBeDefined();
    expect(hiringSig?.source).toBe('RESEARCH_AGENT');

    // Clean up
    await prisma.companySignal.deleteMany({ where: { companyId: company?.id } });
    await prisma.aIAgentRun.deleteMany({ where: { id: run.id } });
    await prisma.lead.delete({ where: { id: targetLead.id } });
    if (company) await prisma.company.delete({ where: { id: company.id } });
  });

  it('6. GET /agent-runs/entity/Lead/:id/latest - retrieves latest research run', async () => {
    const res = await request(app.getHttpServer())
      .get(`/agent-runs/entity/Lead/${leadA.id}/latest`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.entityId).toBe(leadA.id);
  });

  it('C. Socket.IO failed event delivers full structured failure payload', async () => {
    const testLeadFail = await prisma.lead.create({
      data: {
        tenantId: tenantA.id,
        firstName: 'Public',
        lastName: 'Yahoo',
        email: 'researchfail@yahoo.com',
        stageId: leadA.stageId,
        creatorId: userA.id,
      },
    });

    const run = await prisma.aIAgentRun.create({
      data: {
        tenantId: tenantA.id,
        agentType: 'research',
        entityType: 'Lead',
        entityId: testLeadFail.id,
        status: 'QUEUED',
        input: { entityType: 'Lead', entityId: testLeadFail.id },
      },
    });

    const failedEventPromise = new Promise<any>((resolve) => {
      socketA.once('ai.agent.failed', (data) => resolve(data));
    });

    const researchService = app.get(ResearchAgentService);
    const execResult = await researchService.execute({
      tenantId: tenantA.id,
      agentRunId: run.id,
      agentType: 'research',
      entityType: 'Lead',
      entityId: testLeadFail.id,
    });

    expect(execResult.success).toBe(false);
    expect(execResult.error).toContain('public provider');

    const failedEvent = await failedEventPromise;
    expect(failedEvent.runId).toBe(run.id);
    expect(failedEvent.agentType).toBe('research');
    expect(failedEvent.entityType).toBe('Lead');
    expect(failedEvent.entityId).toBe(testLeadFail.id);
    expect(failedEvent.status).toBe('FAILED');
    expect(failedEvent.error).toContain('public provider');

    await prisma.aIAgentRun.deleteMany({ where: { id: run.id } });
    await prisma.lead.delete({ where: { id: testLeadFail.id } });
  });

  it('D. Page refresh after FAILED run reconstructs FAILED status and error', async () => {
    const res = await request(app.getHttpServer())
      .get(`/agent-runs/entity/Lead/${leadGmail.id}/latest`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('FAILED');
    expect(res.body.data.error).toContain('public provider');
  });

  it('E. Retry after FAILED run creates a new run instead of reusing FAILED run', async () => {
    const prevLatest = await prisma.aIAgentRun.findFirst({
      where: { tenantId: tenantA.id, entityId: leadGmail.id },
      orderBy: { startedAt: 'desc' },
    });
    expect(prevLatest?.status).toBe('FAILED');

    const res = await request(app.getHttpServer())
      .post('/agent-runs/research')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        entityType: 'Lead',
        entityId: leadGmail.id,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.reused).toBe(false);
    expect(res.body.data.agentRunId).not.toBe(prevLatest?.id);
  });

  it('F. Unrelated run event isolation: Event targeting and relevance filtering prevents cross-lead state corruption', async () => {
    const currentLeadId = leadA.id;
    const currentRunId = 'current-run-123';
    const unrelatedLeadId = 'unrelated-lead-999';
    const unrelatedRunId = 'unrelated-run-888';

    // The frontend relevance check logic as implemented in CompanyResearchCard.tsx
    const isRelevantEvent = (
      targetLeadId: string,
      activeRunId: string | null,
      eventData: { runId?: string; agentRunId?: string; entityType?: string; entityId?: string }
    ) => {
      const incomingRunId = eventData.runId || eventData.agentRunId;
      if (incomingRunId && activeRunId && incomingRunId === activeRunId) return true;
      if (eventData.entityId && eventData.entityId === targetLeadId) return true;
      return false;
    };

    // 1. Event from unrelated run and entity must be rejected
    const unrelatedEvent = {
      runId: unrelatedRunId,
      entityType: 'Lead',
      entityId: unrelatedLeadId,
      status: 'FAILED',
      error: 'Unrelated error',
    };
    expect(isRelevantEvent(currentLeadId, currentRunId, unrelatedEvent)).toBe(false);

    // 2. Event with matching runId is accepted
    const matchingRunEvent = {
      runId: currentRunId,
      entityType: 'Lead',
      entityId: 'some-other-id',
      status: 'FAILED',
    };
    expect(isRelevantEvent(currentLeadId, currentRunId, matchingRunEvent)).toBe(true);

    // 3. Event with matching entityId is accepted
    const matchingEntityEvent = {
      runId: 'some-diff-run',
      entityType: 'Lead',
      entityId: currentLeadId,
      status: 'FAILED',
    };
    expect(isRelevantEvent(currentLeadId, currentRunId, matchingEntityEvent)).toBe(true);
  });
});
