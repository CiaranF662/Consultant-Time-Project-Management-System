import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🗑️  Deleting test project: Legacy Mobile App Modernization\n');

  // Find the project
  const project = await prisma.project.findFirst({
    where: {
      title: 'Legacy Mobile App Modernization'
    },
    include: {
      phases: {
        include: {
          allocations: {
            include: {
              weeklyAllocations: true,
              unplannedExpiredHours: true
            }
          }
        }
      },
      sprints: true,
      consultants: true
    }
  });

  if (!project) {
    console.log('❌ Project not found - may have already been deleted');
    return;
  }

  console.log(`Found project: "${project.title}"`);
  console.log(`  ID: ${project.id}`);
  console.log(`  Phases: ${project.phases.length}`);
  console.log(`  Sprints: ${project.sprints.length}`);
  console.log(`  Team members: ${project.consultants.length}`);

  // Count related data
  const totalAllocations = project.phases.reduce((sum, phase) => sum + phase.allocations.length, 0);
  const totalWeeklyAllocations = project.phases.reduce(
    (sum, phase) => sum + phase.allocations.reduce((s, a) => s + a.weeklyAllocations.length, 0),
    0
  );
  const totalUnplannedExpired = project.phases.reduce(
    (sum, phase) => sum + phase.allocations.filter(a => a.unplannedExpiredHours).length,
    0
  );

  console.log(`  Phase allocations: ${totalAllocations}`);
  console.log(`  Weekly allocations: ${totalWeeklyAllocations}`);
  console.log(`  UnplannedExpiredHours records: ${totalUnplannedExpired}\n`);

  // Confirm deletion
  console.log('⚠️  This will DELETE:');
  console.log('  - The project');
  console.log('  - All phases');
  console.log('  - All sprints');
  console.log('  - All phase allocations');
  console.log('  - All weekly allocations');
  console.log('  - All UnplannedExpiredHours records');
  console.log('  - All consultant assignments\n');

  console.log('🔄 Deleting project...\n');

  // Delete the project (cascades will handle related data)
  await prisma.project.delete({
    where: { id: project.id }
  });

  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ PROJECT DELETED SUCCESSFULLY');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('Summary:');
  console.log(`  - Deleted project: "${project.title}"`);
  console.log(`  - Removed ${project.phases.length} phases`);
  console.log(`  - Removed ${project.sprints.length} sprints`);
  console.log(`  - Removed ${totalAllocations} phase allocations`);
  console.log(`  - Removed ${totalWeeklyAllocations} weekly allocations`);
  console.log(`  - Removed ${totalUnplannedExpired} UnplannedExpiredHours records`);
  console.log(`  - Removed ${project.consultants.length} consultant assignments\n`);
  console.log('💡 You can now run the seed script again to test fresh:\n');
  console.log('   npx ts-node scripts/seed-historical-project.ts\n');
}

main()
  .catch((error) => {
    console.error('❌ Error deleting project:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
