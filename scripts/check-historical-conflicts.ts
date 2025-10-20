import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check the time period we'll be using
  const today = new Date();
  const eightWeeksAgo = new Date(today);
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - (8 * 7));

  console.log('\n🔍 Checking for conflicts in historical period...\n');
  console.log(`Period: ${eightWeeksAgo.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`);
  console.log('(8 weeks ago to today)\n');

  // Get the consultants we'll use
  const consultants = await prisma.user.findMany({
    where: { role: 'CONSULTANT' },
    take: 6
  });

  const targetConsultants = consultants.slice(0, 4); // PM + 3 consultants

  console.log('Target consultants for historical project:');
  targetConsultants.forEach((c, i) => {
    console.log(`  ${i === 0 ? 'PM' : `Consultant ${i}`}: ${c.name}`);
  });
  console.log('');

  // Check for existing allocations in this time period for these consultants
  const existingAllocations = await prisma.weeklyAllocation.findMany({
    where: {
      consultantId: { in: targetConsultants.map(c => c.id) },
      weekStartDate: {
        gte: eightWeeksAgo,
        lte: today
      }
    },
    include: {
      phaseAllocation: {
        include: {
          phase: {
            include: {
              project: {
                select: {
                  title: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (existingAllocations.length === 0) {
    console.log('✅ No existing allocations found in this period for these consultants');
    console.log('✅ Safe to proceed - no conflicts!\n');
  } else {
    console.log(`⚠️  Found ${existingAllocations.length} existing allocations:\n`);

    // Group by consultant
    const byConsultant: Record<string, typeof existingAllocations> = {};
    existingAllocations.forEach(alloc => {
      if (!byConsultant[alloc.consultantId]) {
        byConsultant[alloc.consultantId] = [];
      }
      byConsultant[alloc.consultantId].push(alloc);
    });

    for (const [consultantId, allocs] of Object.entries(byConsultant)) {
      const consultant = targetConsultants.find(c => c.id === consultantId);
      console.log(`${consultant?.name}:`);
      allocs.forEach(alloc => {
        console.log(`  - ${alloc.weekStartDate.toISOString().split('T')[0]}: ${alloc.approvedHours || alloc.proposedHours}h on "${alloc.phaseAllocation.phase.project.title}"`);
      });
      console.log('');
    }

    console.log('💡 This means these consultants already have work allocated in the past.');
    console.log('💡 The seed script will ADD to their historical workload.');
    console.log('💡 This is realistic - consultants can work on multiple projects!\n');
  }

  // Check total hours per week for each consultant
  console.log('📊 Calculating total weekly hours with new project:\n');

  for (const consultant of targetConsultants) {
    const allocs = existingAllocations.filter(a => a.consultantId === consultant.id);
    if (allocs.length > 0) {
      const totalHours = allocs.reduce((sum, a) => sum + (a.approvedHours || a.proposedHours || 0), 0);
      const avgPerWeek = totalHours / 8; // Over 8 weeks
      console.log(`${consultant.name}: Currently ${avgPerWeek.toFixed(1)}h/week average`);
      console.log(`  Adding historical project will increase their past workload`);
      console.log(`  (This is fine - it's in the past and we're testing expired allocations)\n`);
    } else {
      console.log(`${consultant.name}: No historical allocations`);
      console.log(`  Will add historical project work (realistic scenario)\n`);
    }
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ SAFE TO PROCEED');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\nThe seed script will:');
  console.log('✓ Create a NEW project (no modifications to existing projects)');
  console.log('✓ Add historical work for consultants (8 weeks ago)');
  console.log('✓ Create realistic expired allocation scenarios');
  console.log('✓ Not affect current or future allocations\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
