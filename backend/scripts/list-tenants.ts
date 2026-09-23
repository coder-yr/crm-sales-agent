import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listTenants() {
  try {
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
      }
    });

    console.log('--- Tenants ---');
    tenants.forEach(t => {
      console.log(`ID: ${t.id} | Name: ${t.name} | Slug: ${t.slug}`);
    });
    console.log('---------------');
  } catch (error) {
    console.error('Error listing tenants:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listTenants();
