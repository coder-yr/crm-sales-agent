import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function moveUser() {
  const email = 'agent@estatelogic.com';
  const targetTenantId = '3f8e6272-a2b6-4803-9bfb-e806418cf317'; // New Workspace (vakajot530)

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`User ${email} not found.`);
      return;
    }

    await prisma.user.update({
      where: { email },
      data: { 
        tenantId: targetTenantId,
        firstName: 'Estate',
        lastName: 'Agent'
      },
    });

    console.log(`Successfully moved ${email} to tenant ${targetTenantId}`);
  } catch (error) {
    console.error('Error moving user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

moveUser();
