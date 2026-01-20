import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedActivation() {
  try {
    console.log('🌱 Seeding activation data...');

    // Create the default activation code
    const activation = await prisma.activation.upsert({
      where: { code: 'MEDLAB2025' },
      update: {},
      create: {
        code: 'MEDLAB2025',
        status: 'OFF', // Start with activation disabled
      },
    });

    console.log('✅ Activation seed completed:', activation);
  } catch (error) {
    console.error('❌ Error seeding activation:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeder if this file is executed directly
if (require.main === module) {
  seedActivation()
    .then(() => {
      console.log('🎉 Activation seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Activation seeding failed:', error);
      process.exit(1);
    });
}

export { seedActivation };
