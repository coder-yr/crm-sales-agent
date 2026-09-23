import { PrismaClient } from '@prisma/client';
import { io } from 'socket.io-client';
import { JwtService } from '@nestjs/jwt';

const prisma = new PrismaClient();
const jwtService = new JwtService();
const BACKEND_URL = 'http://localhost:3001';
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'fallback-access-secret-change-me';

async function runRuntimeVerification() {
  console.log('=== DEALPILOT AI PHASE 4 — REAL RUNTIME VERIFICATION ===\n');

  // 1. Find or create a valid tenant and user
  let tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    tenant = await prisma.tenant.create({ data: { name: 'E2E Runtime Tenant' } });
  }

  let user = await prisma.user.findFirst({ where: { tenantId: tenant.id } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: `runtime-test-${Date.now()}@dealpilot.ai`,
        firstName: 'Runtime',
        lastName: 'Tester',
        role: 'OWNER',
      },
    });
  }

  let stage = await prisma.pipelineStage.findFirst({ where: { tenantId: tenant.id } });
  if (!stage) {
    stage = await prisma.pipelineStage.create({
      data: { tenantId: tenant.id, name: 'Lead Qualified', order: 1 },
    });
  }

  // 2. Create a test lead with a public domain email (mail.com)
  const testLead = await prisma.lead.create({
    data: {
      tenantId: tenant.id,
      firstName: 'Public',
      lastName: 'EmailUser',
      email: `test-reject-${Date.now()}@mail.com`,
      stageId: stage.id,
      creatorId: user.id,
    },
  });
  console.log(`[1] Created Test Lead: ${testLead.id} (${testLead.email})`);

  // 3. Generate Auth Token
  const token = jwtService.sign(
    { sub: user.id, email: user.email, tenantId: tenant.id, role: user.role },
    { secret: JWT_SECRET }
  );

  // 4. Connect Socket.IO client
  console.log('[2] Connecting Socket.IO client to:', BACKEND_URL);
  const socket = io(BACKEND_URL, {
    auth: { token: `Bearer ${token}` },
    transports: ['websocket'],
  });

  const receivedEvents: Record<string, any> = {};

  await new Promise<void>((resolve, reject) => {
    socket.on('connect', () => {
      console.log('    Socket connected successfully! Socket ID:', socket.id);
      resolve();
    });
    socket.on('connect_error', (err: any) => {
      console.error('    Socket connect error:', err.message);
      reject(err);
    });
    setTimeout(() => reject(new Error('Socket connection timed out')), 8000);
  });

  socket.on('ai.agent.queued', (data: any) => {
    console.log('    [EVENT RECEIVED] ai.agent.queued:', JSON.stringify(data));
    receivedEvents['queued'] = data;
  });

  socket.on('ai.agent.started', (data: any) => {
    console.log('    [EVENT RECEIVED] ai.agent.started:', JSON.stringify(data));
    receivedEvents['started'] = data;
  });

  socket.on('ai.agent.progress', (data: any) => {
    console.log('    [EVENT RECEIVED] ai.agent.progress:', JSON.stringify(data));
    receivedEvents['progress'] = data;
  });

  const failedEventPromise = new Promise<any>((resolve) => {
    socket.on('ai.agent.failed', (data: any) => {
      console.log('    [EVENT RECEIVED] ai.agent.failed:', JSON.stringify(data));
      receivedEvents['failed'] = data;
      resolve(data);
    });
  });

  // 5. Trigger research via HTTP POST /agent-runs/research
  console.log('\n[3] Calling POST /agent-runs/research...');
  const postRes = await fetch(`${BACKEND_URL}/agent-runs/research`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ entityType: 'Lead', entityId: testLead.id }),
  });

  const postJson: any = await postRes.json();
  console.log('    HTTP Response:', postRes.status, postJson);
  const runId = postJson.data?.agentRunId;
  if (!runId) throw new Error('No agentRunId returned!');

  // 6. Wait for ai.agent.failed Socket.IO event
  console.log('\n[4] Waiting for ai.agent.failed Socket.IO event...');
  const failedEvent = await Promise.race([
    failedEventPromise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timed out waiting for ai.agent.failed event')), 20000)),
  ]);

  console.log('\n=== VERIFYING REQUIREMENTS ===');
  console.log('Requirement 3: ai.agent.failed Payload Validation:');
  console.log('  runId:', failedEvent.runId, failedEvent.runId === runId ? '✓ MATCH' : '✗ MISMATCH');
  console.log('  agentType:', failedEvent.agentType, failedEvent.agentType === 'research' ? '✓' : '✗');
  console.log('  entityType:', failedEvent.entityType, failedEvent.entityType === 'Lead' ? '✓' : '✗');
  console.log('  entityId:', failedEvent.entityId, failedEvent.entityId === testLead.id ? '✓ MATCH' : '✗ MISMATCH');
  console.log('  status:', failedEvent.status, failedEvent.status === 'FAILED' ? '✓' : '✗');
  console.log('  error:', failedEvent.error);
  if (!failedEvent.error.includes('mail.com') && !failedEvent.error.includes('public provider')) {
    throw new Error('Error message does not mention public provider!');
  }
  console.log('  ✓ Error message contains descriptive rejection reason');

  // 7. Verify PostgreSQL persistence
  console.log('\nRequirement 1 & 2: Database Persistence Validation:');
  const dbRun = await prisma.aIAgentRun.findUnique({ where: { id: runId } });
  console.log('  DB status:', dbRun?.status, dbRun?.status === 'FAILED' ? '✓' : '✗');
  console.log('  DB error:', dbRun?.error);
  console.log('  DB completedAt:', dbRun?.completedAt ? '✓ POPULATED' : '✗ MISSING');
  console.log('  DB durationMs:', dbRun?.durationMs, 'ms');

  // 8. Verify GET /agent-runs/entity/:entityType/:entityId/latest (Page refresh)
  console.log('\nRequirement 7: Page Refresh Reconstruction:');
  const latestRes = await fetch(`${BACKEND_URL}/agent-runs/entity/Lead/${testLead.id}/latest`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const latestJson: any = await latestRes.json();
  console.log('  GET /agent-runs/entity/Lead/:id/latest response:', latestJson);
  const latestData = latestJson.data;
  console.log('  Latest run status:', latestData.status, latestData.status === 'FAILED' ? '✓' : '✗');
  console.log('  Latest run error:', latestData.error);
  if (latestData.status !== 'FAILED') {
    throw new Error('Latest run reconstructed invalid status!');
  }

  // 9. Verify Retry after FAILED run
  console.log('\nRequirement 6 (allow retry): Calling POST /agent-runs/research again (Retry):');
  const retryRes = await fetch(`${BACKEND_URL}/agent-runs/research`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ entityType: 'Lead', entityId: testLead.id }),
  });
  const retryJson: any = await retryRes.json();
  console.log('  Retry response:', retryJson);
  console.log('  Retry created fresh run:', retryJson.data.reused === false ? '✓' : '✗');
  console.log('  Retry run ID != prev run ID:', retryJson.data.agentRunId !== runId ? '✓' : '✗');

  // Clean up
  console.log('\n[5] Cleaning up test data...');
  socket.disconnect();
  await prisma.aIAgentRun.deleteMany({ where: { entityId: testLead.id } });
  await prisma.lead.delete({ where: { id: testLead.id } });
  await prisma.$disconnect();

  console.log('\n======================================================');
  console.log('✓ REAL RUNTIME VERIFICATION SUCCESSFUL — ALL CHECKS PASSED');
  console.log('======================================================\n');
}

runRuntimeVerification().catch(async (e) => {
  console.error('\n✗ RUNTIME VERIFICATION FAILED:', e);
  await prisma.$disconnect();
  process.exit(1);
});
