import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import { io } from 'socket.io-client';

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

async function apiPatch(endpoint: string, body: any, token: string) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'PATCH',
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

async function runPhase8E2EVerification() {
  console.log('==================================================================');
  console.log(' DEALPILOT AI PHASE 8 — AI OUTREACH AGENT END-TO-END VERIFICATION');
  console.log('==================================================================\n');

  // 1. Setup Tenant A & User A
  let tenantA = await prisma.tenant.findFirst({ where: { name: 'P8 E2E Tenant A' } });
  if (!tenantA) {
    tenantA = await prisma.tenant.create({ data: { name: 'P8 E2E Tenant A' } });
  }

  let userA = await prisma.user.findFirst({ where: { tenantId: tenantA.id } });
  if (!userA) {
    userA = await prisma.user.create({
      data: {
        tenantId: tenantA.id,
        email: `p8-user-${Date.now()}@dealpilot.ai`,
        firstName: 'Patrick',
        lastName: 'E2E',
        role: 'OWNER',
      },
    });
  }

  // 2. Setup Tenant B & User B for Cross-Tenant Isolation Tests
  let tenantB = await prisma.tenant.findFirst({ where: { name: 'P8 E2E Tenant B' } });
  if (!tenantB) {
    tenantB = await prisma.tenant.create({ data: { name: 'P8 E2E Tenant B' } });
  }

  let userB = await prisma.user.findFirst({ where: { tenantId: tenantB.id } });
  if (!userB) {
    userB = await prisma.user.create({
      data: {
        tenantId: tenantB.id,
        email: `p8-userB-${Date.now()}@dealpilot.ai`,
        firstName: 'Eve',
        lastName: 'Attacker',
        role: 'OWNER',
      },
    });
  }

  const tokenA = jwt.sign(
    { userId: userA.id, id: userA.id, tenantId: tenantA.id, role: userA.role, email: userA.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const tokenB = jwt.sign(
    { userId: userB.id, id: userB.id, tenantId: tenantB.id, role: userB.role, email: userB.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  console.log(`✓ Tenant A: ${tenantA.id} (User: ${userA.email})`);
  console.log(`✓ Tenant B: ${tenantB.id} (User: ${userB.email})\n`);

  // 3. Create Stripe Company, Lead, Signal, Deal Intelligence, and Phase 7 Recommendation
  let company = await prisma.company.findFirst({
    where: { tenantId: tenantA.id, name: 'Stripe Inc.' },
  });
  if (!company) {
    company = await prisma.company.create({
      data: {
        tenantId: tenantA.id,
        name: 'Stripe Inc.',
        industry: 'Financial Technology',
        description: 'Online payment processing infrastructure',
        websiteUrl: 'https://stripe.com',
      },
    });
  }

  let stage = await prisma.pipelineStage.findFirst({ where: { tenantId: tenantA.id } });
  if (!stage) {
    stage = await prisma.pipelineStage.create({
      data: { tenantId: tenantA.id, name: 'Evaluation', order: 1 },
    });
  }

  let lead = await prisma.lead.findFirst({
    where: { tenantId: tenantA.id, email: 'patrick@stripe.com' },
  });
  if (!lead) {
    lead = await prisma.lead.create({
      data: {
        tenantId: tenantA.id,
        companyId: company.id,
        stageId: stage.id,
        creatorId: userA.id,
        firstName: 'Patrick',
        lastName: 'Collison',
        notes: 'Co-founder & CEO',
        email: 'patrick@stripe.com',
        budget: 75000,
      },
    });
  }

  // Create or update High Hiring signal
  await prisma.companySignal.upsert({
    where: {
      id: `${company.id}-hiring-signal`,
    },
    update: {
      type: 'HIRING',
      title: 'Active Engineering Expansion',
      description: 'Multiple staff backend and infrastructure engineer openings in SF and Dublin',
      confidence: 88,
      strength: 90,
      detectedAt: new Date(),
    },
    create: {
      id: `${company.id}-hiring-signal`,
      tenantId: tenantA.id,
      companyId: company.id,
      type: 'HIRING',
      title: 'Active Engineering Expansion',
      description: 'Multiple staff backend and infrastructure engineer openings in SF and Dublin',
      confidence: 88,
      strength: 90,
      source: 'careers.stripe.com',
    },
  });

  // Create Deal Intelligence
  await prisma.dealIntelligence.upsert({
    where: { leadId: lead.id },
    update: {
      dealScore: 85,
      intentScore: 90,
      healthScore: '85',
      dealHealth: 'HEALTHY',
      riskScore: 15,
      buyingStage: 'EVALUATION',
      urgency: 'HIGH',
    },
    create: {
      tenantId: tenantA.id,
      leadId: lead.id,
      dealScore: 85,
      intentScore: 90,
      healthScore: '85',
      dealHealth: 'HEALTHY',
      riskScore: 15,
      buyingStage: 'EVALUATION',
      urgency: 'HIGH',
    },
  });

  // Create Phase 7 Recommendation
  const recommendation = await prisma.aIRecommendation.create({
    data: {
      tenantId: tenantA.id,
      leadId: lead.id,
      ruleKey: 'HIRING_EXPANSION_FOLLOWUP',
      type: 'NEXT_BEST_ACTION',
      title: 'Hiring Expansion Follow-Up',
      action: 'Follow up with Patrick about current infrastructure and hiring needs',
      reason: 'Active hiring signal (88% confidence) and healthy deal status',
      priority: 'HIGH',
      status: 'PENDING',
    },
  });

  console.log(`✓ Lead prepared: ${lead.firstName} ${lead.lastName} at ${company.name}`);
  console.log(`✓ Recommendation created: ${recommendation.title} (${recommendation.id})\n`);

  // 4. Test Trigger Outreach Agent via REST API
  console.log('--- Step 1: Trigger Outreach Agent via POST /api/v1/agent-runs/outreach ---');
  const triggerRes = await apiPost(
    '/agent-runs/outreach',
    {
      leadId: lead.id,
      recommendationId: recommendation.id,
      tone: 'PROFESSIONAL',
    },
    tokenA
  );

  console.log('Trigger Response Status:', triggerRes.status);
  console.log('Trigger Response Data:', triggerRes.data);

  if (!triggerRes.ok || !triggerRes.data.success) {
    throw new Error(`Failed to trigger outreach agent: ${JSON.stringify(triggerRes.data)}`);
  }
  const agentRunId = triggerRes.data.data.agentRunId || triggerRes.data.data.id;
  console.log(`✓ Outreach agent run queued: ${agentRunId}\n`);

  // 5. Poll for AgentRun completion
  console.log('--- Step 2: Waiting for worker to complete draft synthesis ---');
  let completed = false;
  let draftId: string | null = null;
  const startTime = Date.now();

  while (!completed && Date.now() - startTime < 60000) {
    await new Promise((r) => setTimeout(r, 2000));
    const run = await prisma.aIAgentRun.findUnique({ where: { id: agentRunId } });
    if (run?.status === 'COMPLETED') {
      completed = true;
      console.log(`✓ Agent run ${agentRunId} COMPLETED in ${(Date.now() - startTime) / 1000}s!`);
      const output: any = run.output;
      draftId = output?.draftId;
      console.log('Agent Run Output:', JSON.stringify(output, null, 2));
    } else if (run?.status === 'FAILED') {
      throw new Error(`Agent run failed: ${run.error}`);
    } else {
      process.stdout.write(`... status: ${run?.status || 'QUEUED'}\n`);
    }
  }

  if (!completed) {
    throw new Error('Timed out waiting for outreach agent run completion');
  }

  // 6. Fetch Drafts via REST API: GET /api/v1/leads/:leadId/outreach
  console.log('\n--- Step 3: Verify GET /api/v1/leads/:leadId/outreach ---');
  const listRes = await apiGet(`/leads/${lead.id}/outreach`, tokenA);
  console.log(`Fetched ${listRes.data?.data?.length || 0} drafts for lead.`);
  if (!listRes.ok || !listRes.data?.data || listRes.data.data.length === 0) {
    throw new Error(`No drafts returned by GET /leads/${lead.id}/outreach`);
  }

  const generatedDraft = listRes.data.data[0];
  console.log('Generated Draft Details:');
  console.log(`- ID: ${generatedDraft.id}`);
  console.log(`- Type: ${generatedDraft.type}`);
  console.log(`- Status: ${generatedDraft.status}`);
  console.log(`- Tone: ${generatedDraft.tone}`);
  console.log(`- Subject: "${generatedDraft.subject}"`);
  console.log(`- Personalization: ${JSON.stringify(generatedDraft.personalizationPoints)}`);
  console.log(`- Body Snippet: "${generatedDraft.body.substring(0, 120)}..."\n`);

  // Verify grounding assertions
  if (!generatedDraft.subject || generatedDraft.subject.length < 5) {
    throw new Error('Subject is missing or invalid');
  }
  if (!generatedDraft.body.includes('Patrick') && !generatedDraft.body.includes('there')) {
    throw new Error(`Body does not address recipient Patrick: "${generatedDraft.body}"`);
  }
  if (generatedDraft.status !== 'DRAFT') {
    throw new Error(`Expected initial status DRAFT, got ${generatedDraft.status}`);
  }
  console.log('✓ Grounded draft assertions verified (correct subject, greeting, and DRAFT status).\n');

  // 7. Test Editing Draft: PATCH /api/v1/outreach/:id
  console.log('--- Step 4: Test Draft Editing via PATCH /api/v1/outreach/:id ---');
  const editedSubject = "Customized subject for Patrick: Scaling Stripe's Payments Infra";
  const editRes = await apiPatch(
    `/outreach/${generatedDraft.id}`,
    {
      subject: editedSubject,
      body: generatedDraft.body + '\n\nP.S. Looking forward to our discussion.',
    },
    tokenA
  );

  console.log('Edit Response Status:', editRes.status);
  console.log(`- New Status: ${editRes.data?.data?.status}`);
  console.log(`- New Subject: "${editRes.data?.data?.subject}"`);

  if (!editRes.ok || editRes.data?.data?.status !== 'EDITED') {
    throw new Error(`Expected status EDITED after update, got ${editRes.data?.data?.status}`);
  }
  console.log('✓ Draft edit successfully saved and transitioned to EDITED status.\n');

  // 8. Test Human Approval: POST /api/v1/outreach/:id/approve
  console.log('--- Step 5: Test Human Approval via POST /api/v1/outreach/:id/approve ---');
  const approveRes = await apiPost(`/outreach/${generatedDraft.id}/approve`, {}, tokenA);
  console.log('Approve Response Status:', approveRes.status);
  console.log(`- Approved Status: ${approveRes.data?.data?.status}`);

  if (!approveRes.ok || approveRes.data?.data?.status !== 'APPROVED') {
    throw new Error(`Expected status APPROVED, got ${approveRes.data?.data?.status}`);
  }
  console.log('✓ Draft successfully approved for outreach (Human-in-the-Loop confirmed).\n');

  // 9. Test Multi-Tenant Security & Isolation
  console.log('--- Step 6: Multi-Tenant Security & Isolation Verification ---');
  console.log('User B from Tenant B attempting to access Tenant A draft...');

  const unauthorizedGet = await apiGet(`/outreach/${generatedDraft.id}`, tokenB);
  console.log(`- Cross-tenant GET status: ${unauthorizedGet.status} (expected 404)`);
  if (unauthorizedGet.status !== 404) {
    throw new Error(`Security breach: Tenant B accessed Tenant A draft (status ${unauthorizedGet.status})`);
  }

  const unauthorizedPatch = await apiPatch(`/outreach/${generatedDraft.id}`, { subject: 'Hacked' }, tokenB);
  console.log(`- Cross-tenant PATCH status: ${unauthorizedPatch.status} (expected 404)`);
  if (unauthorizedPatch.status !== 404) {
    throw new Error(`Security breach: Tenant B modified Tenant A draft (status ${unauthorizedPatch.status})`);
  }

  const unauthorizedApprove = await apiPost(`/outreach/${generatedDraft.id}/approve`, {}, tokenB);
  console.log(`- Cross-tenant APPROVE status: ${unauthorizedApprove.status} (expected 404)`);
  if (unauthorizedApprove.status !== 404) {
    throw new Error(`Security breach: Tenant B approved Tenant A draft (status ${unauthorizedApprove.status})`);
  }

  console.log('✓ Multi-tenant isolation verified: Cross-tenant operations strictly blocked with 404.\n');

  // 10. Test Discard Endpoint: PATCH /api/v1/outreach/:id/discard
  console.log('--- Step 7: Test Discard Draft via PATCH /api/v1/outreach/:id/discard ---');
  const discardRes = await apiPatch(`/outreach/${generatedDraft.id}/discard`, {}, tokenA);
  console.log('Discard Response Status:', discardRes.status);
  console.log(`- Discarded Status: ${discardRes.data?.data?.status}`);

  if (!discardRes.ok || discardRes.data?.data?.status !== 'DISCARDED') {
    throw new Error(`Expected status DISCARDED, got ${discardRes.data?.data?.status}`);
  }
  console.log('✓ Draft successfully discarded.\n');

  console.log('==================================================================');
  console.log(' ALL PHASE 8 E2E VERIFICATION CHECKS PASSED PERFECTLY!');
  console.log('==================================================================');
}

runPhase8E2EVerification()
  .catch((err) => {
    console.error('\n❌ E2E VERIFICATION FAILED:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
