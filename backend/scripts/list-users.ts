import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        role: true,
      }
    });

    console.log('--- Registered Users ---');
    users.forEach(u => {
      console.log(`Email: ${u.email} | Name: ${u.firstName} ${u.lastName} | Status: ${u.status} | Role: ${u.role}`);
    });
    console.log('------------------------');
  } catch (error) {
    console.error('Error listing users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();
