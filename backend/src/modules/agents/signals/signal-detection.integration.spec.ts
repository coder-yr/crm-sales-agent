import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../app.module';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { io, Socket } from 'socket.io-client';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SignalDetectionAgentService } from './signal-detection-agent.service';

describe('Signal Detection Agent Integration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let socket: Socket;

  let tenantA: any;
  let tenantB: any;
  let userA: any;
  let userB: any;
  let companyA: any;
  let companyB: any;
  let tokenA: string;
  let tokenB: string;

  const sampleResearchData = {
    businessSummary:
      'TechGlobal announced a $40M Series C funding round led by Apex Capital. The company opened a new office in Austin, TX to expand operations. Jane Smith was appointed as Chief Technology Officer. TechGlobal partnered with CloudCorp for infrastructure optimization. The engineering team launched HyperScale v3 in general availability.',
    sources: [
      { url: 'https://techglobal.io/careers', title: 'TechGlobal Careers - We are hiring senior engineers' },
      { url: 'https://techglobal.io/press', title: 'TechGlobal Press Releases' },
    ],
    company: {
      name: 'TechGlobal Inc',
      website: 'https://techglobal.io',
      description: 'Enterprise cloud provider.',
    },
    businessSignals: [
      {
        type: 'HIRING',
        title: 'Active engineering hiring',
        description: 'Actively hiring senior engineers and staff roles',
        evidence: 'We are hiring senior engineers',
        sourceUrl: 'https://techglobal.io/careers',
        confidence: 85,
      },
    ],
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    await app.listen(0);
    const url = await app.getUrl();

    prisma = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);
    configService = app.get<ConfigService>(ConfigService);

    const jwtSecret = configService.get<string>('jwt.accessSecret') || 'fallback-access-secret-change-me';

    tenantA = await prisma.tenant.create({ data: { name: `Signal Tenant A ${Date.now()}` } });
    tenantB = await prisma.tenant.create({ data: { name: `Signal Tenant B ${Date.now()}` } });

    userA = await prisma.user.create({
      data: {
        tenantId: tenantA.id,
        email: `usera-signal-${Date.now()}@test.com`,
        firstName: 'SignalUser',
        lastName: 'A',
        role: 'OWNER',
      },
    });

    userB = await prisma.user.create({
      data: {
        tenantId: tenantB.id,
        email: `userb-signal-${Date.now()}@test.com`,
        firstName: 'SignalUser',
        lastName: 'B',
        role: 'OWNER',
      },
    });

    companyA = await prisma.company.create({
      data: {
        tenantId: tenantA.id,
        name: 'TechGlobal Inc',
        websiteUrl: 'https://techglobal.io',
        domain: 'techglobal.io',
      },
    });

    companyB = await prisma.company.create({
      data: {
        tenantId: tenantB.id,
        name: 'OtherCorp',
        websiteUrl: 'https://othercorp.io',
        domain: 'othercorp.io',
      },
    });

    tokenA = jwtService.sign(
      { sub: userA.id, email: userA.email, tenantId: tenantA.id, role: userA.role },
      { secret: jwtSecret }
    );

    tokenB = jwtService.sign(
      { sub: userB.id, email: userB.email, tenantId: tenantB.id, role: userB.role },
      { secret: jwtSecret }
    );

    socket = io(url, {
      auth: { token: `Bearer ${tokenA}` },
      reconnectionDelay: 100,
      forceNew: true,
      transports: ['websocket'],
    });

    // Clear queue before testing
    try {
      const queue = app.get<Queue>(getQueueToken('ai-agent'));
      await queue.drain();
      await queue.clean(0, 1000, 'wait');
      await queue.clean(0, 1000, 'active');
      await queue.clean(0, 1000, 'failed');
      await queue.clean(0, 1000, 'completed');
    } catch {}

    await new Promise<void>((resolve) => socket.on('connect', () => resolve()));
  }, 40000);

  afterAll(async () => {
    if (socket) socket.disconnect();
    try {
      const queue = app.get<Queue>(getQueueToken('ai-agent'));
      await queue.drain();
      await queue.clean(0, 1000, 'wait');
      await queue.clean(0, 1000, 'active');
    } catch {}

    const tenantIds = [tenantA?.id, tenantB?.id].filter(Boolean);
    const companyIds = [companyA?.id, companyB?.id].filter(Boolean);
    const userIds = [userA?.id, userB?.id].filter(Boolean);

    await prisma.companySignal.deleteMany({
      where: { tenantId: { in: tenantIds } },
    });
    await prisma.aIAgentRun.deleteMany({
      where: { tenantId: { in: tenantIds } },
    });
    await prisma.company.deleteMany({
      where: { id: { in: companyIds } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: tenantIds } },
    });
    await app.close();
  }, 40000);

  describe('1. Preconditions & Tenant Isolation', () => {
    it('should return 400 Bad Request if no completed research exists', async () => {
      const res = await request(app.getHttpServer())
        .post('/agent-runs/signals')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ companyId: companyA.id });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/No completed company research is available/i);
    }, 20000);

    it('should return 403 Forbidden when requesting signal detection on cross-tenant company', async () => {
      const res = await request(app.getHttpServer())
        .post('/agent-runs/signals')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ companyId: companyB.id });

      expect(res.status).toBe(403);
    }, 20000);
  });

  describe('2. Signal Detection Execution & Validation', () => {
    beforeAll(async () => {
      // Seed a completed Phase 4 research run
      await prisma.aIAgentRun.create({
        data: {
          tenantId: tenantA.id,
          agentType: 'research',
          entityType: 'Company',
          entityId: companyA.id,
          status: 'COMPLETED',
          completedAt: new Date(),
          output: sampleResearchData,
        },
      });
    }, 20000);

    it('should queue signal detection, process via worker, emit Socket.IO events, and persist signals with fingerprints', (done) => {
      let sawProgress = false;

      socket.on('ai.agent.progress', (data) => {
        if (data.agentType === 'signal_detection') {
          sawProgress = true;
          expect(data.progress).toBeGreaterThan(0);
        }
      });

      socket.on('ai.agent.completed', async (data) => {
        if (data.agentType === 'signal_detection') {
          try {
            expect(data.status).toBe('COMPLETED');
            expect(data.output).toBeDefined();
            expect(data.output.signals).toBeDefined();
            expect(data.output.signals.length).toBeGreaterThan(0);

            // Verify database persistence
            const dbSignals = await prisma.companySignal.findMany({
              where: { companyId: companyA.id, tenantId: tenantA.id },
            });

            expect(dbSignals.length).toBeGreaterThan(0);

            for (const sig of dbSignals) {
              expect(sig.fingerprint).toBeDefined();
              expect(sig.fingerprint?.length).toBe(64);
              expect(sig.evidence).toBeDefined();
              expect(sig.evidence?.length).toBeGreaterThan(0);
              expect(sig.confidence).toBeGreaterThanOrEqual(50);
              expect(sig.sourceUrl).toBeDefined();
            }

            expect(sawProgress).toBe(true);
            done();
          } catch (err) {
            done(err);
          }
        }
      });

      socket.on('ai.agent.failed', (data) => {
        if (data.agentType === 'signal_detection') {
          done(new Error(`Signal detection failed unexpectedly: ${data.error}`));
        }
      });

      request(app.getHttpServer())
        .post('/agent-runs/signals')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ companyId: companyA.id })
        .expect(201)
        .then((res) => {
          expect(res.body.data).toBeDefined();
          expect(res.body.data.id).toBeDefined();
          expect(res.body.data.agentType).toBe('signal_detection');
          expect(res.body.data.status).toBe('QUEUED');
        })
        .catch(done);
    }, 45000);

    it('should return existing run when an active run is in flight (idempotency)', async () => {
      // Create a dummy RUNNING run
      const runningRun = await prisma.aIAgentRun.create({
        data: {
          tenantId: tenantA.id,
          agentType: 'signal_detection',
          entityType: 'Company',
          entityId: companyA.id,
          status: 'RUNNING',
          startedAt: new Date(),
        },
      });

      const res = await request(app.getHttpServer())
        .post('/agent-runs/signals')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ companyId: companyA.id });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe(runningRun.id);
      expect(res.body.data.reused).toBe(true);

      // Clean up running dummy run
      await prisma.aIAgentRun.delete({ where: { id: runningRun.id } });
    }, 20000);

    it('should deduplicate signals on subsequent detection runs (zero duplicates)', async () => {
      const initialSignals = await prisma.companySignal.findMany({
        where: { companyId: companyA.id, tenantId: tenantA.id },
      });
      const initialCount = initialSignals.length;
      expect(initialCount).toBeGreaterThan(0);

      // Trigger agent worker execution directly to verify deduplication
      const service = app.get(SignalDetectionAgentService);

      const secondRun = await prisma.aIAgentRun.create({
        data: {
          tenantId: tenantA.id,
          agentType: 'signal_detection',
          entityType: 'Company',
          entityId: companyA.id,
          status: 'RUNNING',
        },
      });

      await service.execute({
        tenantId: tenantA.id,
        agentRunId: secondRun.id,
        agentType: 'signal_detection',
        entityType: 'Company',
        entityId: companyA.id,
        companyId: companyA.id,
      });

      const signalsAfterSecondRun = await prisma.companySignal.findMany({
        where: { companyId: companyA.id, tenantId: tenantA.id },
      });

      // No duplicate signals created!
      expect(signalsAfterSecondRun.length).toBe(initialCount);
    }, 35000);
  });
});
