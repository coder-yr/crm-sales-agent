import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function resetPassword(email: string, newPassword: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`User with email ${email} not found.`);
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email },
      data: { 
        passwordHash,
        status: 'ACTIVE' // Ensure user is active
      },
    });

    console.log(`Successfully reset password for ${email}`);
    console.log(`New Password: ${newPassword}`);
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

const email = process.argv[2] || 'agent@estatelogic.com';
const password = process.argv[3] || 'Password123!';

resetPassword(email, password);
