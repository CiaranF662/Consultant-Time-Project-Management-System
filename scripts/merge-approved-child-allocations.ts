/**
 * Script to merge approved child reallocations with their parent allocations
 * This fixes data inconsistencies where child allocations were approved before the merge logic was implemented
 *
 * Run with: npx tsx scripts/merge-approved-child-allocations.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function mergeApprovedChildAllocations() {
  try {
    console.log('🔍 Looking for approved child allocations that need to be merged...\n');

    // Find all child allocations that are APPROVED (shouldn't exist but might due to race conditions)
    const approvedChildren = await prisma.phaseAllocation.findMany({
      where: {
        parentAllocationId: { not: null },
        approvalStatus: 'APPROVED'
      },
      include: {
        parentAllocation: true,
        consultant: { select: { name: true, email: true } },
        phase: {
          select: {
            name: true,
            project: { select: { title: true } }
          }
        }
      }
    });

    if (approvedChildren.length === 0) {
      console.log('✅ No approved child allocations found. Database is clean!');
      return;
    }

    console.log(`⚠️  Found ${approvedChildren.length} approved child allocation(s) that need merging:\n`);

    for (const child of approvedChildren) {
      console.log(`📋 Child Allocation ID: ${child.id}`);
      console.log(`   Consultant: ${child.consultant.name || child.consultant.email}`);
      console.log(`   Project: ${child.phase.project.title}`);
      console.log(`   Phase: ${child.phase.name}`);
      console.log(`   Hours: ${child.totalHours}h`);
      console.log(`   Parent ID: ${child.parentAllocationId}`);
      console.log(`   Parent Hours: ${child.parentAllocation?.totalHours}h\n`);

      // Merge child into parent
      await prisma.$transaction(async (tx) => {
        // Add child hours to parent
        await tx.phaseAllocation.update({
          where: { id: child.parentAllocationId! },
          data: {
            totalHours: {
              increment: child.totalHours
            }
          }
        });

        // Delete the child allocation
        await tx.phaseAllocation.delete({
          where: { id: child.id }
        });

        console.log(`   ✅ Merged ${child.totalHours}h into parent. New parent total: ${child.parentAllocation!.totalHours + child.totalHours}h`);
        console.log(`   🗑️  Deleted child allocation ${child.id}\n`);
      });
    }

    console.log(`\n🎉 Successfully merged ${approvedChildren.length} child allocation(s)!`);

  } catch (error) {
    console.error('❌ Error merging child allocations:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
mergeApprovedChildAllocations()
  .then(() => {
    console.log('\n✨ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
