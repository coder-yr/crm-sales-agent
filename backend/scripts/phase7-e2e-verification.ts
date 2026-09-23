import { PrismaClient } from '@prisma/client';
import { io } from 'socket.io-client';
import * as jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const BACKEND_URL = 'http://127.0.0.1:3001';
const API_URL = `${BACKEND_URL}/api/v1`;
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'fallback-access-secret-change-me';

async function apiPost(endpoint: string, body: any, token: string) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

async function apiGet(endpoint: string, token: string) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

async function runPhase7E2EVerification() {
  console.log('===============================================================');
  console.log(' DEALPILOT AI PHASE 7 — RECOMMENDATIONS AGENT E2E VERIFICATION');
  console.log('===============================================================\n');

  // 1. Setup Tenant A & User A
  let tenantA = await prisma.tenant.findFirst({ where: { name: 'P7 E2E Tenant A' } });
  if (!tenantA) {
    tenantA = await prisma.tenant.create({ data: { name: 'P7 E2E Tenant A' } });
  }

  let userA = await prisma.user.findFirst({ where: { tenantId: tenantA.id } });
  if (!userA) {
    userA = await prisma.user.create({
      data: {
        tenantId: tenantA.id,
        email: `p7-user-${Date.now()}@dealpilot.ai`,
        firstName: 'Patrick',
        lastName: 'E2E',
        role: 'OWNER',
      },
    });
  }

  let stage = await prisma.pipelineStage.findFirst({ where: { tenantId: tenantA.id } });
  if (!stage) {
    stage = await prisma.pipelineStage.create({
      data: { tenantId: tenantA.id, name: 'Evaluation', order: 1 },
    });
  }

  // Setup Company A
  let companyA = await prisma.company.findFirst({ where: { tenantId: tenantA.id, name: 'Stripe, Inc.' } });
  if (!companyA) {
    companyA = await prisma.company.create({
      data: {
        tenantId: tenantA.id,
        name: 'Stripe, Inc.',
        websiteUrl: 'https://stripe.com',
        industry: 'Fintech',
        employeeCount: 7000,
      },
    });
  }

  // Setup Company Signal (Phase 5: HIRING confidence: 88 >= 80)
  await prisma.companySignal.deleteMany({ where: { companyId: companyA.id } });
  const signal = await prisma.companySignal.create({
    data: {
      tenantId: tenantA.id,
      companyId: companyA.id,
      type: 'HIRING',
      title: 'Stripe expanding payments engineering',
      description: 'Hiring 50+ backend payment infrastructure engineers in Q3',
      strength: 88,
      confidence: 88,
      evidence: 'Multiple job postings for Senior Staff Payment Engineers',
      source: 'web_research',
      sourceUrl: 'https://stripe.com/jobs',
      fingerprint: `stripe-hiring-${Date.now()}`,
    },
  });
  console.log(`[1] Seeded Phase 5 Hiring Signal: ${signal.type} (confidence: ${signal.confidence}%)`);

  // Setup Lead A
  let leadA = await prisma.lead.findFirst({ where: { tenantId: tenantA.id, email: 'patrick@stripe.com' } });
  if (!leadA) {
    leadA = await prisma.lead.create({
      data: {
        tenantId: tenantA.id,
        firstName: 'Patrick',
        lastName: 'Collison',
        email: 'patrick@stripe.com',
        companyId: companyA.id,
        stageId: stage.id,
        creatorId: userA.id,
        budget: 150000,
      },
    });
  }
  console.log(`[2] Seeded Lead A: ${leadA.firstName} ${leadA.lastName} (${leadA.id})`);

  // Setup Phase 6 Deal Intelligence (dealScore 85, dealHealth HEALTHY)
  await prisma.dealIntelligence.deleteMany({ where: { leadId: leadA.id } });
  const dealIntel = await prisma.dealIntelligence.create({
    data: {
      tenantId: tenantA.id,
      leadId: leadA.id,
      dealScore: 85,
      healthScore: 'HEALTHY',
      dealHealth: 'HEALTHY',
      intentScore: 80,
      companyFitScore: 85,
      contactFitScore: 80,
      engagementScore: 70,
      riskScore: 15,
      buyingStage: 'EVALUATION',
      urgency: 'HIGH',
      modelVersion: 'v1',
      reasons: {
        positives: [{ title: 'Strong Hiring Momentum', confidence: 88 }],
        risks: [],
        missingData: [],
      },
    },
  });
  console.log(`[3] Seeded Phase 6 Deal Intelligence: dealScore=${dealIntel.dealScore}, health=${dealIntel.dealHealth}`);

  // Clean prior recommendations and tasks for clean run
  await prisma.task.deleteMany({ where: { leadId: leadA.id } });
  await prisma.aIRecommendation.deleteMany({ where: { leadId: leadA.id } });

  // 2. Generate Auth Token
  const tokenA = jwt.sign(
    { sub: userA.id, email: userA.email, tenantId: tenantA.id, role: userA.role },
    JWT_SECRET
  );

  // 3. Connect Realtime Socket
  console.log('[4] Connecting Socket.IO client...');
  const socket = io(BACKEND_URL, {
    auth: { token: `Bearer ${tokenA}` },
    transports: ['websocket', 'polling'],
  });

  await new Promise<void>((resolve, reject) => {
    socket.on('connect', () => {
      console.log('    ✓ Socket connected! ID:', socket.id);
      resolve();
    });
    socket.on('connect_error', (err) => {
      console.error('    Socket connect error:', err.message);
      reject(err);
    });
    setTimeout(() => reject(new Error('Socket connection timeout')), 5000);
  });

  socket.on('agent:queued', (data) => {
    console.log('    [EVENT RECEIVED] agent:queued:', data?.agentType);
  });
  socket.on('agent:started', (data) => {
    console.log('    [EVENT RECEIVED] agent:started:', data?.agentType);
  });
  socket.on('agent:progress', (data) => {
    console.log(`    [EVENT RECEIVED] agent:progress: ${data?.progress}% - ${data?.stage}`);
  });
  socket.on('agent:completed', (data) => {
    console.log('    [EVENT RECEIVED] agent:completed:', data?.agentType);
  });

  // 4. Trigger Recommendations Agent
  console.log('[5] Triggering POST /api/v1/agent-runs/recommendations...');
  const triggerRes = await apiPost('/agent-runs/recommendations', { leadId: leadA.id }, tokenA);
  console.log('    ✓ Trigger Response Status:', triggerRes.status, triggerRes.data?.data?.status);

  // 5. Wait for BullMQ worker execution
  console.log('[6] Waiting for BullMQ worker to process recommendations run...');
  const startTime = Date.now();
  let completed = false;
  while (Date.now() - startTime < 30000) {
    await new Promise((r) => setTimeout(r, 1500));
    const runRes = await apiGet(`/agent-runs/entity/Lead/${leadA.id}/latest?agentType=recommendations`, tokenA);
    if (runRes.data?.data?.status === 'COMPLETED') {
      completed = true;
      console.log('    ✓ AgentRun status: COMPLETED (duration:', runRes.data.data.durationMs, 'ms)');
      break;
    }
  }

  if (!completed) {
    throw new Error('Recommendations agent run did not complete within 30 seconds');
  }

  // 6. Fetch Lead Recommendations
  console.log('[7] Fetching GET /api/v1/leads/:leadId/recommendations...');
  const recsRes = await apiGet(`/leads/${leadA.id}/recommendations`, tokenA);
  const recs = recsRes.data?.data;
  console.log(`    ✓ Fetched ${recs?.length} recommendations`);

  if (!recs || recs.length === 0) {
    throw new Error('Expected at least 1 recommendation to be generated');
  }

  const primaryRec = recs[0];
  console.log('    Primary Recommendation:');
  console.log(`      - Rule Key:  ${primaryRec.ruleKey}`);
  console.log(`      - Priority:  ${primaryRec.priority}`);
  console.log(`      - Action:    "${primaryRec.action}"`);
  console.log(`      - Status:    ${primaryRec.status}`);
  console.log(`      - Evidence:  ${JSON.stringify(primaryRec.evidence?.evidence)}`);

  // Verify Canonical Rule Behavior
  if (primaryRec.ruleKey !== 'HIRING_EXPANSION_FOLLOWUP') {
    throw new Error(`Expected primary ruleKey to be HIRING_EXPANSION_FOLLOWUP, got ${primaryRec.ruleKey}`);
  }
  if (primaryRec.priority !== 'HIGH') {
    throw new Error(`Expected priority to be HIGH, got ${primaryRec.priority}`);
  }
  if (primaryRec.action !== 'Follow up with the prospect about their current hiring/expansion needs.') {
    throw new Error(`Canonical action statement mismatch: ${primaryRec.action}`);
  }

  // 7. Verify Active Deduplication
  console.log('[8] Testing Active Deduplication (re-triggering agent)...');
  await apiPost('/agent-runs/recommendations', { leadId: leadA.id }, tokenA);

  // Poll for second run completion
  await new Promise((r) => setTimeout(r, 4000));
  const recsAfterSecondRun = await apiGet(`/leads/${leadA.id}/recommendations`, tokenA);
  console.log(`    ✓ Recommendations count after 2nd run: ${recsAfterSecondRun.data.data.length}`);
  if (recsAfterSecondRun.data.data.length !== recs.length) {
    throw new Error(`Deduplication failed! Expected ${recs.length} recs, found ${recsAfterSecondRun.data.data.length}`);
  }
  console.log('    ✓ Active deduplication confirmed: no duplicate active recommendations created.');

  // 8. Accept Recommendation and verify Task creation
  const acceptRes = await apiPost(`/recommendations/${primaryRec.id}/accept`, { createTask: true }, tokenA);
  console.log('    ✓ Accept response message:', acceptRes.data?.message);
  const acceptedRec = acceptRes.data?.data;
  const createdTask = acceptedRec?.task;

  console.log(`    ✓ Recommendation Status: ${acceptedRec?.status}`);
  console.log(`    ✓ Linked Task ID:         ${acceptedRec?.taskId}`);
  console.log(`    ✓ Created Task Title:     "${createdTask?.title}"`);

  if (acceptedRec?.status !== 'COMPLETED') {
    throw new Error(`Expected status COMPLETED when task created, got ${acceptedRec?.status} (taskError: ${acceptedRec?.taskError})`);
  }
  if (!acceptedRec?.taskId || !createdTask) {
    throw new Error('Task was not created or not linked to recommendation');
  }

  // 9. Cross-Tenant Security Verification
  console.log('[10] Verifying Cross-Tenant Security Isolation...');
  let tenantB = await prisma.tenant.findFirst({ where: { name: 'P7 E2E Tenant B' } });
  if (!tenantB) {
    tenantB = await prisma.tenant.create({ data: { name: 'P7 E2E Tenant B' } });
  }
  let userB = await prisma.user.findFirst({ where: { tenantId: tenantB.id } });
  if (!userB) {
    userB = await prisma.user.create({
      data: {
        tenantId: tenantB.id,
        email: `p7-userb-${Date.now()}@dealpilot.ai`,
        firstName: 'TenantB',
        lastName: 'User',
        role: 'EMPLOYEE',
      },
    });
  }
  const tokenB = jwt.sign(
    { sub: userB.id, email: userB.email, tenantId: tenantB.id, role: userB.role },
    JWT_SECRET
  );

  const crossTenantRes = await apiPost(`/recommendations/${primaryRec.id}/accept`, { createTask: true }, tokenB);
  if (crossTenantRes.status === 404) {
    console.log('    ✓ Cross-tenant security confirmed: Tenant B received HTTP 404 Not Found');
  } else {
    throw new Error(`SECURITY VIOLATION: Expected 404, got status ${crossTenantRes.status}`);
  }

  socket.disconnect();
  console.log('\n===============================================================');
  console.log(' ✓ ALL PHASE 7 E2E RUNTIME & SECURITY CHECKS PASSED PERFECTLY!');
  console.log('===============================================================\n');
}

runPhase7E2EVerification()
  .catch((err) => {
    console.error('\n❌ E2E VERIFICATION FAILED:', err.message || err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
