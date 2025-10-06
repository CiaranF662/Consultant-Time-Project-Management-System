const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateToApprovalSystem() {
  try {
    console.log('Starting migration to two-stage approval system...');

    // First, let's add the new columns without dropping the old ones
    await prisma.$executeRaw`
      ALTER TABLE "WeeklyAllocation"
      ADD COLUMN IF NOT EXISTS "proposedHours" DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS "approvedHours" DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS "planningStatus" TEXT DEFAULT 'PENDING',
      ADD COLUMN IF NOT EXISTS "plannedBy" TEXT,
      ADD COLUMN IF NOT EXISTS "approvedBy" TEXT,
      ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
    `;

    await prisma.$executeRaw`
      ALTER TABLE "PhaseAllocation"
      ADD COLUMN IF NOT EXISTS "approvalStatus" TEXT DEFAULT 'PENDING',
      ADD COLUMN IF NOT EXISTS "approvedBy" TEXT,
      ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
    `;

    console.log('Added new columns...');

    // Migrate existing plannedHours to proposedHours and set consultant as planner
    const weeklyAllocations = await prisma.weeklyAllocation.findMany({
      select: {
        id: true,
        plannedHours: true,
        consultantId: true
      }
    });

    console.log(`Found ${weeklyAllocations.length} weekly allocations to migrate...`);

    for (const allocation of weeklyAllocations) {
      await prisma.$executeRaw`
        UPDATE "WeeklyAllocation"
        SET
          "proposedHours" = ${allocation.plannedHours},
          "approvedHours" = ${allocation.plannedHours},
          "planningStatus" = 'APPROVED',
          "plannedBy" = ${allocation.consultantId}
        WHERE "id" = ${allocation.id}
      `;
    }

    console.log('Migrated weekly allocation data...');

    // Set all existing phase allocations as approved
    await prisma.$executeRaw`
      UPDATE "PhaseAllocation"
      SET "approvalStatus" = 'APPROVED'
      WHERE "approvalStatus" IS NULL OR "approvalStatus" = 'PENDING'
    `;

    console.log('Set existing phase allocations as approved...');

    console.log('Migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateToApprovalSystem();