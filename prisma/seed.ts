import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.plan.createMany({
    data: [
      {
        name: 'Basic',
        description: 'Access to essential wellness features',
        price: 199,
        currency: 'INR',
        interval: 'MONTHLY',
      },
      {
        name: 'Pro',
        description: 'Advanced wellness insights and tracking',
        price: 499,
        currency: 'INR',
        interval: 'MONTHLY',
      },
      {
        name: 'Elite',
        description: 'All features with personalized coaching',
        price: 999,
        currency: 'INR',
        interval: 'MONTHLY',
      },
    ],
    skipDuplicates: true,
  });
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
