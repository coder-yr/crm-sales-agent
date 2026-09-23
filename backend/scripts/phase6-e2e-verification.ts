import { PrismaClient } from '@prisma/client';
import { io } from 'socket.io-client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BACKEND_URL = 'http://localhost:3001';

async function runPhase6E2E() {
  console.log('===========================================================');
  console.log('DEALPILOT AI PHASE 6 — END-TO-END RUNTIME VERIFICATION');
  console.log('===========================================================\n');

  let tenant: any;
  let user: any;
  let stage: any;
  let company: any;
  let lead: any;
  let socket: any;

  try {
    // 1. Setup Tenant and User
    tenant = await prisma.tenant.create({
      data: { name: `Phase6-Tenant-${Date.now()}` },
    });
    console.log(`[1] Created Test Tenant: ${tenant.id}`);

    const testPassword = 'Password123!';
    const passwordHash = await bcrypt.hash(testPassword, 10);

    user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: `phase6-user-${Date.now()}@test.com`,
        passwordHash,
        status: 'ACTIVE',
        firstName: 'Alex',
        lastName: 'SalesPro',
        role: 'OWNER',
      },
    });
    console.log(`[2] Created Test User: ${user.id} (${user.email})`);

    stage = await prisma.pipelineStage.create({
      data: {
        tenantId: tenant.id,
        name: 'Evaluation / Demo',
        order: 3,
      },
    });

    // 2. Setup Company with Phase 5 Signals
    company = await prisma.company.create({
      data: {
        tenantId: tenant.id,
        name: 'Stripe Global',
        websiteUrl: 'https://stripe.com',
        domain: 'stripe.com',
        industry: 'FinTech & Payments Infrastructure',
        employeeCount: 7500,
        revenue: 14000000000,
        location: 'San Francisco, CA',
      },
    });
    console.log(`[3] Created Test Company: ${company.name} (${company.id})`);

    // Add Phase 5 Signals (HIRING + EXPANSION)
    const signal1 = await prisma.companySignal.create({
      data: {
        tenantId: tenant.id,
        companyId: company.id,
        type: 'HIRING',
        title: 'Payments Engineering Expansion',
        description: 'Actively recruiting 50+ staff engineers',
        strength: 1.0,
        confidence: 88,
        source: 'CAREERS_PAGE',
        evidence: 'View our open engineering roles in payments infrastructure.',
        fingerprint: `hiring-${company.id}-${Date.now()}`,
      },
    });

    const signal2 = await prisma.companySignal.create({
      data: {
        tenantId: tenant.id,
        companyId: company.id,
        type: 'EXPANSION',
        title: 'New Enterprise Market Launch',
        description: 'Expanding enterprise partner network in EMEA',
        strength: 0.8,
        confidence: 82,
        source: 'PRESS_RELEASE',
        evidence: 'Launching expanded partner network for global payments.',
        fingerprint: `expansion-${company.id}-${Date.now()}`,
      },
    });
    console.log(`[4] Seeded Phase 5 Signals: HIRING (${signal1.confidence}%), EXPANSION (${signal2.confidence}%)`);

    // 3. Setup Lead
    lead = await prisma.lead.create({
      data: {
        tenantId: tenant.id,
        firstName: 'Patrick',
        lastName: 'Collison',
        email: 'patrick@stripe.com',
        phone: '+1-555-0199',
        budget: 120000,
        stageId: stage.id,
        creatorId: user.id,
        companyId: company.id,
        expectedCloseDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 days out
      },
    });
    console.log(`[5] Created Test Lead: ${lead.firstName} ${lead.lastName} (Budget: $${lead.budget})`);

    // Add Contact
    await prisma.contact.create({
      data: {
        tenantId: tenant.id,
        companyId: company.id,
        firstName: 'Patrick',
        lastName: 'Collison',
        email: 'patrick@stripe.com',
        title: 'Chief Executive Officer',
      },
    });

    // Add Activity
    await prisma.activity.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        leadId: lead.id,
        type: 'STAGE_CHANGED',
        metadata: { note: 'Advanced to Evaluation stage following technical review' },
      },
    });
    console.log(`[6] Seeded Contact (CEO) & Recent Activity`);

    // 4. Authenticate via Backend Login Endpoint
    console.log('[7] Authenticating via POST /api/v1/auth/login...');
    const loginRes = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: testPassword }),
    });
    const loginBody: any = await loginRes.json();
    if (!loginRes.ok) {
      throw new Error(`Login failed (${loginRes.status}): ${JSON.stringify(loginBody)}`);
    }

    const token = loginBody.data?.accessToken || loginBody.accessToken;
    console.log('    ✓ Login successful! Token acquired.');

    // 5. Connect Socket.IO
    console.log(`[8] Connecting Socket.IO client to ${BACKEND_URL}...`);
    socket = io(BACKEND_URL, {
      auth: { token: `Bearer ${token}` },
      extraHeaders: {
        origin: 'http://localhost:5173',
      },
      transports: ['websocket', 'polling'],
    });

    const receivedEvents: Record<string, any[]> = {};
    const registerEvent = (name: string) => {
      receivedEvents[name] = [];
      socket.on(name, (data: any) => {
        console.log(`    ⚡ [SOCKET EVENT] ${name}:`, JSON.stringify(data));
        receivedEvents[name].push(data);
      });
    };

    registerEvent('ai.agent.queued');
    registerEvent('ai.agent.started');
    registerEvent('ai.agent.progress');
    registerEvent('ai.agent.completed');
    registerEvent('ai.agent.failed');
    registerEvent('deal.score.updated');
    registerEvent('deal.health.updated');

    await new Promise<void>((resolve, reject) => {
      socket.on('connect', () => {
        console.log('    ✓ Socket connected successfully! ID:', socket.id);
        resolve();
      });
      socket.on('connect_error', (err: any) => {
        reject(new Error(`Socket connection error: ${err.message}`));
      });
      setTimeout(() => reject(new Error('Socket connection timed out')), 6000);
    });

    // 6. Trigger Deal Analysis via HTTP POST
    console.log('\n[9] Triggering Deal Analysis: POST /api/v1/agent-runs/deal-analysis...');
    const triggerRes = await fetch(`${BACKEND_URL}/api/v1/agent-runs/deal-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ leadId: lead.id }),
    });

    const triggerBody: any = await triggerRes.json();
    console.log('    Response status:', triggerRes.status);
    console.log('    AgentRun ID:', triggerBody?.data?.id);
    console.log('    Status:', triggerBody?.data?.status);

    // 7. Poll or wait for completion via BullMQ worker
    console.log('\n[10] Awaiting worker processing & PostgreSQL persistence...');
    let persisted: any = null;
    const startTime = Date.now();
    while (Date.now() - startTime < 25000) {
      persisted = await prisma.dealIntelligence.findUnique({
        where: { tenantId_leadId: { tenantId: tenant.id, leadId: lead.id } },
      });
      if (persisted) break;
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (!persisted) {
      throw new Error('DealIntelligence record was not persisted within 25s');
    }

    console.log('\n[11] ✓ DealIntelligence Record Successfully Persisted:');
    console.log(`     - Deal Score:       ${persisted.dealScore} / 100`);
    console.log(`     - Health Score:     ${persisted.healthScore} / 100`);
    console.log(`     - Deal Health:      ${persisted.dealHealth}`);
    console.log(`     - Buying Stage:     ${persisted.buyingStage}`);
    console.log(`     - Urgency:          ${persisted.urgency}`);
    console.log(`     - Model Version:    ${persisted.modelVersion}`);
    console.log(`     - Intent Score:     ${persisted.intentScore}`);
    console.log(`     - Company Fit:      ${persisted.companyFitScore}`);
    console.log(`     - Contact Fit:      ${persisted.contactFitScore}`);
    console.log(`     - Engagement Score: ${persisted.engagementScore}`);
    console.log(`     - Risk Score:       ${persisted.riskScore}`);

    // Verify deterministic formula
    const expectedFormula = Math.round(
      0.40 * persisted.intentScore +
      0.25 * persisted.companyFitScore +
      0.15 * persisted.contactFitScore +
      0.10 * persisted.engagementScore +
      0.10 * (100 - persisted.riskScore)
    );
    console.log(`     - Deterministic formula check: expected ${expectedFormula}, got ${persisted.dealScore}`);
    if (persisted.dealScore !== expectedFormula) {
      throw new Error(`Formula mismatch: expected ${expectedFormula}, got ${persisted.dealScore}`);
    }

    // 8. Test HTTP GET endpoint
    console.log('\n[12] Testing GET /api/v1/deal-intelligence/lead/:leadId...');
    const getRes = await fetch(`${BACKEND_URL}/api/v1/deal-intelligence/lead/${lead.id}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const getBody: any = await getRes.json();
    console.log('     Response status:', getRes.status);
    console.log('     Fetched Deal Score:', getBody?.data?.dealScore);
    console.log('     Positives count:', getBody?.data?.factors?.positives?.length);
    console.log('     Risks count:', getBody?.data?.factors?.risks?.length);
    console.log('     Missing data count:', getBody?.data?.factors?.missingData?.length);

    console.log('\n===========================================================');
    console.log('ALL PHASE 6 END-TO-END VERIFICATION CHECKS PASSED (100%)');
    console.log('===========================================================\n');
  } catch (err: any) {
    console.error('\n❌ Phase 6 E2E Verification Failed:', err.message);
    process.exitCode = 1;
  } finally {
    // Cleanup
    if (socket) socket.disconnect();
    if (lead) {
      try {
        await prisma.dealIntelligence.deleteMany({ where: { leadId: lead.id } });
        await prisma.aIAgentRun.deleteMany({ where: { tenantId: tenant.id } });
        await prisma.activity.deleteMany({ where: { leadId: lead.id } });
        await prisma.contact.deleteMany({ where: { tenantId: tenant.id } });
        await prisma.lead.deleteMany({ where: { id: lead.id } });
        await prisma.companySignal.deleteMany({ where: { companyId: company.id } });
        await prisma.company.deleteMany({ where: { id: company.id } });
        await prisma.pipelineStage.deleteMany({ where: { id: stage.id } });
        await prisma.user.deleteMany({ where: { id: user.id } });
        await prisma.tenant.deleteMany({ where: { id: tenant.id } });
        console.log('[Cleanup] Test fixtures cleaned successfully.');
      } catch (cleanupErr: any) {
        console.warn('[Cleanup Warning]:', cleanupErr.message);
      }
    }
    await prisma.$disconnect();
  }
}

runPhase6E2E();
