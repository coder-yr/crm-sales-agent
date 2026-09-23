import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createUser() {
  const email = 'agent@estatelogic.com';
  const password = 'Password123!';
  const tenantId = 'default-tenant-id';

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: 'Estate',
        lastName: 'Agent',
        role: 'EMPLOYEE',
        status: 'ACTIVE',
        tenantId,
      },
    });

    console.log(`Successfully created user: ${email}`);
    console.log(`Password: ${password}`);
  } catch (error) {
    console.error('Error creating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createUser();
