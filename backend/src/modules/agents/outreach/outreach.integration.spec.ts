import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma/prisma.service';
import { OutreachAgentService } from './outreach-agent.service';
import { OutreachContextBuilderService } from './outreach-context-builder.service';
import { OutreachHallucinationGuardService } from './outreach-hallucination-guard.service';
import { OutreachService } from '../../outreach/outreach.service';
import { AgentsService } from '../agents.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { EventsModule } from '../../../events/events.module';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { NotFoundException } from '@nestjs/common';

describe('Outreach Agent Real Database Integration', () => {
  jest.setTimeout(45000);

  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let outreachAgentService: OutreachAgentService;
  let outreachService: OutreachService;

  let tenantA: any;
  let tenantB: any;
  let userA: any;
  let companyA: any;
  let leadA: any;
  let signalA: any;
  let dealIntelA: any;
  let recommendationA: any;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        EventEmitterModule.forRoot(),
        PrismaModule,
        EventsModule,
      ],
      providers: [
        OutreachContextBuilderService,
        OutreachHallucinationGuardService,
        OutreachAgentService,
        OutreachService,
        {
          provide: AgentsService,
          useValue: {
            startOutreach: jest.fn().mockResolvedValue({ id: 'mock-run', status: 'QUEUED' }),
          },
        },
      ],
    }).compile();

    prisma = moduleRef.get<PrismaService>(PrismaService);
    outreachAgentService = moduleRef.get<OutreachAgentService>(OutreachAgentService);
    outreachService = moduleRef.get<OutreachService>(OutreachService);

    // Setup Test Data in PostgreSQL
    tenantA = await prisma.tenant.create({ data: { name: `Outreach-Tenant-A-${Date.now()}` } });
    tenantB = await prisma.tenant.create({ data: { name: `Outreach-Tenant-B-${Date.now()}` } });

    userA = await prisma.user.create({
      data: {
        tenantId: tenantA.id,
        email: `usera-outreach-${Date.now()}@test.com`,
        firstName: 'OutreachUser',
        lastName: 'A',
        role: 'OWNER',
      },
    });

    companyA = await prisma.company.create({
      data: {
        tenantId: tenantA.id,
        name: 'Stripe Global Inc',
        websiteUrl: 'https://stripe.com',
        industry: 'FinTech',
        employeeCount: 8000,
        description: 'Payment infrastructure for the modern internet',
      },
    });

    signalA = await prisma.companySignal.create({
      data: {
        tenantId: tenantA.id,
        companyId: companyA.id,
        type: 'HIRING',
        title: 'Infrastructure Expansion',
        description: 'Recruiting staff platform engineers',
        strength: 0.9,
        confidence: 88,
        source: 'CAREERS_PAGE',
        evidence: 'Open engineering positions in payments infrastructure',
        fingerprint: `hiring-${companyA.id}-${Date.now()}`,
      },
    });

    const stageA = await prisma.pipelineStage.create({
      data: {
        tenantId: tenantA.id,
        name: 'Evaluation / Demo',
        order: 3,
      },
    });

    leadA = await prisma.lead.create({
      data: {
        tenantId: tenantA.id,
        firstName: 'Patrick',
        lastName: 'Collison',
        email: 'patrick@stripe.com',
        budget: 150000,
        stageId: stageA.id,
        creatorId: userA.id,
        companyId: companyA.id,
      },
    });

    dealIntelA = await prisma.dealIntelligence.create({
      data: {
        tenantId: tenantA.id,
        leadId: leadA.id,
        dealScore: 85,
        healthScore: 'HEALTHY',
        intentScore: 88,
        companyFitScore: 85,
        contactFitScore: 80,
        engagementScore: 75,
        riskScore: 15,
        dealHealth: 'HEALTHY',
        buyingStage: 'EVALUATION',
        urgency: 'HIGH',
      },
    });

    recommendationA = await prisma.aIRecommendation.create({
      data: {
        tenantId: tenantA.id,
        leadId: leadA.id,
        ruleKey: 'HIRING_EXPANSION_FOLLOWUP',
        type: 'NEXT_BEST_ACTION',
        title: 'Hiring Expansion Follow-Up',
        action: 'Follow up with Patrick about engineering expansion',
        reason: 'Active hiring signal with 88% confidence',
        priority: 'HIGH',
        status: 'PENDING',
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    if (tenantA?.id) {
      await prisma.aIOutreachDraft.deleteMany({ where: { tenantId: tenantA.id } });
      await prisma.aIAgentRun.deleteMany({ where: { tenantId: tenantA.id } });
      await prisma.aIRecommendation.deleteMany({ where: { tenantId: tenantA.id } });
      await prisma.dealIntelligence.deleteMany({ where: { tenantId: tenantA.id } });
      await prisma.companySignal.deleteMany({ where: { tenantId: tenantA.id } });
      await prisma.lead.deleteMany({ where: { tenantId: tenantA.id } });
      await prisma.pipelineStage.deleteMany({ where: { tenantId: tenantA.id } });
      await prisma.company.deleteMany({ where: { tenantId: tenantA.id } });
      await prisma.user.deleteMany({ where: { tenantId: tenantA.id } });
      await prisma.tenant.delete({ where: { id: tenantA.id } });
    }
    if (tenantB?.id) {
      await prisma.tenant.delete({ where: { id: tenantB.id } });
    }
    await prisma.$disconnect();
  });

  it('should execute OutreachAgentService and persist grounded AIOutreachDraft', async () => {
    const run = await prisma.aIAgentRun.create({
      data: {
        tenantId: tenantA.id,
        agentType: 'outreach',
        entityType: 'Lead',
        entityId: leadA.id,
        status: 'STARTED',
      },
    });

    const result = await outreachAgentService.execute(
      run.id,
      tenantA.id,
      leadA.id,
      recommendationA.id,
      'PROFESSIONAL'
    );

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();

    // Verify stored draft in PostgreSQL
    const savedDraft = await prisma.aIOutreachDraft.findUnique({
      where: { id: result.id },
    });

    expect(savedDraft).toBeDefined();
    expect(savedDraft?.tenantId).toBe(tenantA.id);
    expect(savedDraft?.leadId).toBe(leadA.id);
    expect(savedDraft?.status).toBe('DRAFT');
    expect(savedDraft?.subject).toBeDefined();
    expect(savedDraft?.subject.length).toBeGreaterThan(5);
    expect(savedDraft?.body).toContain('Patrick');
  });

  it('should query drafts through OutreachService with recommendation include', async () => {
    const drafts = await outreachService.findByLead(tenantA.id, leadA.id);
    expect(drafts.length).toBeGreaterThanOrEqual(1);

    const first = drafts[0];
    expect(first.leadId).toBe(leadA.id);
    expect(first.recommendation).toBeDefined();
    expect(first.recommendation?.title).toBe('Hiring Expansion Follow-Up');
  });

  it('should update draft content and transition status to EDITED', async () => {
    const drafts = await outreachService.findByLead(tenantA.id, leadA.id);
    const draft = drafts[0];

    const updated = await outreachService.update(tenantA.id, draft.id, {
      subject: 'Customized Follow-up for Patrick at Stripe',
    });

    expect(updated.status).toBe('EDITED');
    expect(updated.subject).toBe('Customized Follow-up for Patrick at Stripe');
  });

  it('should allow human approval and transition status to APPROVED', async () => {
    const drafts = await outreachService.findByLead(tenantA.id, leadA.id);
    const draft = drafts[0];

    const approved = await outreachService.approve(tenantA.id, draft.id);
    expect(approved.status).toBe('APPROVED');
  });

  it('should strictly enforce tenant isolation and prevent cross-tenant queries', async () => {
    const drafts = await outreachService.findByLead(tenantA.id, leadA.id);
    const draft = drafts[0];

    // Tenant B cannot fetch Tenant A's draft
    await expect(outreachService.findOne(tenantB.id, draft.id)).rejects.toThrow(
      NotFoundException
    );

    // Tenant B cannot fetch drafts for Tenant A's lead
    await expect(outreachService.findByLead(tenantB.id, leadA.id)).rejects.toThrow(
      NotFoundException
    );
  });
});
