import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding DELETION_PENDING to ApprovalStatus enum...');

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TYPE "ApprovalStatus" ADD VALUE IF NOT EXISTS 'DELETION_PENDING';
    `);
    console.log('✓ Successfully added DELETION_PENDING enum value');
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      console.log('✓ DELETION_PENDING already exists in enum');
    } else {
      console.error('Error adding enum value:', error);
      throw error;
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
