import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to get ISO week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Helper to get Monday of a week
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

async function main() {
  console.log('\n🚀 Starting seed: Historical Project with Expired Allocations\n');

  // Get existing consultants
  const consultants = await prisma.user.findMany({
    where: { role: 'CONSULTANT' },
    take: 6 // Use first 6 consultants
  });

  if (consultants.length < 4) {
    throw new Error('Need at least 4 consultants in database');
  }

  console.log(`✅ Found ${consultants.length} consultants`);

  // Use these consultants
  const pm = consultants[0]; // Alice Smith will be PM
  const consultant1 = consultants[1]; // Bob
  const consultant2 = consultants[2]; // Carol
  const consultant3 = consultants[3]; // Dave

  console.log(`   PM: ${pm.name}`);
  console.log(`   Team: ${consultant1.name}, ${consultant2.name}, ${consultant3.name}\n`);

  // Calculate dates - project started 8 weeks ago
  const today = new Date();
  const projectStart = new Date(today);
  projectStart.setDate(projectStart.getDate() - (8 * 7)); // 8 weeks ago
  const projectStartMonday = getMonday(projectStart);

  const projectEnd = new Date(today);
  projectEnd.setDate(projectEnd.getDate() + (4 * 7)); // 4 weeks in future

  console.log(`📅 Project Timeline:`);
  console.log(`   Start: ${projectStartMonday.toISOString().split('T')[0]} (8 weeks ago)`);
  console.log(`   End: ${projectEnd.toISOString().split('T')[0]} (4 weeks from now)`);
  console.log(`   Duration: 12 weeks\n`);

  // Create the project
  const project = await prisma.project.create({
    data: {
      title: 'Legacy Mobile App Modernization',
      description: 'Complete overhaul of legacy mobile application with modern React Native architecture. Includes backend API migration, UI/UX redesign, and performance optimization.',
      startDate: projectStartMonday,
      endDate: projectEnd,
      budgetedHours: 800,
      productManagerId: pm.id,
      consultants: {
        create: [
          { userId: pm.id, allocatedHours: 150 },
          { userId: consultant1.id, allocatedHours: 250 },
          { userId: consultant2.id, allocatedHours: 200 },
          { userId: consultant3.id, allocatedHours: 200 }
        ]
      }
    }
  });

  console.log(`✅ Created project: "${project.title}"`);
  console.log(`   ID: ${project.id}\n`);

  // Create sprints for the full 12 weeks
  const sprints = [];
  for (let i = 0; i < 6; i++) { // 6 sprints (12 weeks)
    const sprintStart = new Date(projectStartMonday);
    sprintStart.setDate(sprintStart.getDate() + (i * 14)); // 2-week sprints
    const sprintEnd = new Date(sprintStart);
    sprintEnd.setDate(sprintEnd.getDate() + 13); // 2 weeks - 1 day

    const sprint = await prisma.sprint.create({
      data: {
        projectId: project.id,
        sprintNumber: i + 1,
        startDate: sprintStart,
        endDate: sprintEnd
      }
    });
    sprints.push(sprint);
  }

  console.log(`✅ Created ${sprints.length} sprints\n`);

  // PHASE 1: Discovery & Planning (Sprints 1-2, COMPLETED - 4 weeks ago)
  // This phase ended 4 weeks ago, all allocations expired
  const phase1Start = sprints[0].startDate;
  const phase1End = sprints[1].endDate;

  const phase1 = await prisma.phase.create({
    data: {
      projectId: project.id,
      name: 'Discovery & Planning',
      description: 'Requirements gathering, technical architecture planning, and sprint planning',
      startDate: phase1Start,
      endDate: phase1End,
      sprints: {
        connect: [{ id: sprints[0].id }, { id: sprints[1].id }]
      }
    }
  });

  console.log(`✅ Phase 1: ${phase1.name}`);
  console.log(`   Period: ${phase1Start.toISOString().split('T')[0]} to ${phase1End.toISOString().split('T')[0]}`);
  console.log(`   Status: COMPLETED (ended 4 weeks ago)`);

  // Create phase allocations for Phase 1
  const phase1Alloc1 = await prisma.phaseAllocation.create({
    data: {
      phaseId: phase1.id,
      consultantId: pm.id,
      totalHours: 40,
      consultantDescription: 'Project management and stakeholder coordination',
      approvalStatus: 'APPROVED',
      approvedBy: pm.id,
      approvedAt: new Date(phase1Start)
    }
  });

  const phase1Alloc2 = await prisma.phaseAllocation.create({
    data: {
      phaseId: phase1.id,
      consultantId: consultant1.id,
      totalHours: 60,
      consultantDescription: 'Technical architecture and requirements analysis',
      approvalStatus: 'APPROVED',
      approvedBy: pm.id,
      approvedAt: new Date(phase1Start)
    }
  });

  // SCENARIO 1: Fully planned allocation (all hours allocated across weeks)
  const phase1Alloc3 = await prisma.phaseAllocation.create({
    data: {
      phaseId: phase1.id,
      consultantId: consultant2.id,
      totalHours: 50,
      consultantDescription: 'UI/UX research and design planning',
      approvalStatus: 'APPROVED',
      approvedBy: pm.id,
      approvedAt: new Date(phase1Start)
    }
  });

  console.log(`   - ${pm.name}: 40h (PM)`);
  console.log(`   - ${consultant1.name}: 60h (Tech Lead)`);
  console.log(`   - ${consultant2.name}: 50h (Design)`);

  // Create weekly allocations for Phase 1 (all expired now)
  // PM allocation - fully planned
  for (let i = 0; i < 4; i++) {
    const weekStart = new Date(phase1Start);
    weekStart.setDate(weekStart.getDate() + (i * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    await prisma.weeklyAllocation.create({
      data: {
        phaseAllocationId: phase1Alloc1.id,
        consultantId: pm.id,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        weekNumber: getWeekNumber(weekStart),
        year: weekStart.getFullYear(),
        proposedHours: 10,
        approvedHours: 10,
        planningStatus: 'APPROVED',
        plannedBy: pm.id,
        approvedBy: pm.id,
        approvedAt: new Date(weekStart)
      }
    });
  }

  // Consultant1 allocation - SCENARIO 2: Partially planned (only 2 weeks out of 4)
  for (let i = 0; i < 2; i++) {
    const weekStart = new Date(phase1Start);
    weekStart.setDate(weekStart.getDate() + (i * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    await prisma.weeklyAllocation.create({
      data: {
        phaseAllocationId: phase1Alloc2.id,
        consultantId: consultant1.id,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        weekNumber: getWeekNumber(weekStart),
        year: weekStart.getFullYear(),
        proposedHours: 15,
        approvedHours: 15,
        planningStatus: 'APPROVED',
        plannedBy: consultant1.id,
        approvedBy: pm.id,
        approvedAt: new Date(weekStart)
      }
    });
  }
  // 30 hours planned out of 60 - leaves 30 hours unplanned (EXPIRED)

  // Consultant2 allocation - SCENARIO 3: Completely unplanned (0 hours allocated)
  // No weekly allocations created - all 50 hours are unplanned (EXPIRED)

  console.log(`   Weekly Planning Status:`);
  console.log(`     ✅ ${pm.name}: Fully planned (40/40h)`);
  console.log(`     ⚠️  ${consultant1.name}: Partially planned (30/60h) - 30h EXPIRED & UNPLANNED`);
  console.log(`     ❌ ${consultant2.name}: Not planned (0/50h) - 50h EXPIRED & UNPLANNED\n`);

  // Mark allocations as EXPIRED and create UnplannedExpiredHours records
  const fourWeeksAgo = new Date(today);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  // Consultant1 - partially planned (30h unplanned)
  await prisma.phaseAllocation.update({
    where: { id: phase1Alloc2.id },
    data: { approvalStatus: 'EXPIRED' }
  });

  await prisma.unplannedExpiredHours.create({
    data: {
      phaseAllocationId: phase1Alloc2.id,
      unplannedHours: 30, // 60 total - 30 planned = 30 unplanned
      detectedAt: fourWeeksAgo,
      status: 'EXPIRED'
    }
  });

  // Consultant2 - completely unplanned (50h unplanned)
  await prisma.phaseAllocation.update({
    where: { id: phase1Alloc3.id },
    data: { approvalStatus: 'EXPIRED' }
  });

  await prisma.unplannedExpiredHours.create({
    data: {
      phaseAllocationId: phase1Alloc3.id,
      unplannedHours: 50, // All hours unplanned
      detectedAt: fourWeeksAgo,
      status: 'EXPIRED'
    }
  });

  console.log(`✅ Created UnplannedExpiredHours records for expired allocations\n`);

  // PHASE 2: Backend Development (Sprints 3-4, COMPLETED - just ended)
  const phase2Start = sprints[2].startDate;
  const phase2End = sprints[3].endDate;

  const phase2 = await prisma.phase.create({
    data: {
      projectId: project.id,
      name: 'Backend API Development',
      description: 'REST API development, database migration, authentication system',
      startDate: phase2Start,
      endDate: phase2End,
      sprints: {
        connect: [{ id: sprints[2].id }, { id: sprints[3].id }]
      }
    }
  });

  console.log(`✅ Phase 2: ${phase2.name}`);
  console.log(`   Period: ${phase2Start.toISOString().split('T')[0]} to ${phase2End.toISOString().split('T')[0]}`);
  console.log(`   Status: COMPLETED (just ended this week)`);

  // Create allocations for Phase 2 - all fully planned
  const phase2Alloc1 = await prisma.phaseAllocation.create({
    data: {
      phaseId: phase2.id,
      consultantId: consultant1.id,
      totalHours: 80,
      consultantDescription: 'Backend API development and architecture',
      approvalStatus: 'APPROVED',
      approvedBy: pm.id,
      approvedAt: new Date(phase2Start)
    }
  });

  const phase2Alloc2 = await prisma.phaseAllocation.create({
    data: {
      phaseId: phase2.id,
      consultantId: consultant3.id,
      totalHours: 70,
      consultantDescription: 'Database design and migration scripts',
      approvalStatus: 'APPROVED',
      approvedBy: pm.id,
      approvedAt: new Date(phase2Start)
    }
  });

  console.log(`   - ${consultant1.name}: 80h (Backend)`);
  console.log(`   - ${consultant3.name}: 70h (Database)`);

  // Fully plan Phase 2 allocations
  for (let i = 0; i < 4; i++) {
    const weekStart = new Date(phase2Start);
    weekStart.setDate(weekStart.getDate() + (i * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Consultant1
    await prisma.weeklyAllocation.create({
      data: {
        phaseAllocationId: phase2Alloc1.id,
        consultantId: consultant1.id,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        weekNumber: getWeekNumber(weekStart),
        year: weekStart.getFullYear(),
        proposedHours: 20,
        approvedHours: 20,
        planningStatus: 'APPROVED',
        plannedBy: consultant1.id,
        approvedBy: pm.id,
        approvedAt: new Date(weekStart)
      }
    });

    // Consultant3
    await prisma.weeklyAllocation.create({
      data: {
        phaseAllocationId: phase2Alloc2.id,
        consultantId: consultant3.id,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        weekNumber: getWeekNumber(weekStart),
        year: weekStart.getFullYear(),
        proposedHours: 17.5,
        approvedHours: 17.5,
        planningStatus: 'APPROVED',
        plannedBy: consultant3.id,
        approvedBy: pm.id,
        approvedAt: new Date(weekStart)
      }
    });
  }

  console.log(`   Weekly Planning Status:`);
  console.log(`     ✅ All allocations fully planned and completed\n`);

  // PHASE 3: Frontend Development (Sprints 5-6, IN PROGRESS)
  const phase3Start = sprints[4].startDate;
  const phase3End = sprints[5].endDate;

  const phase3 = await prisma.phase.create({
    data: {
      projectId: project.id,
      name: 'Frontend & Mobile Development',
      description: 'React Native app development, component library, state management',
      startDate: phase3Start,
      endDate: phase3End,
      sprints: {
        connect: [{ id: sprints[4].id }, { id: sprints[5].id }]
      }
    }
  });

  console.log(`✅ Phase 3: ${phase3.name}`);
  console.log(`   Period: ${phase3Start.toISOString().split('T')[0]} to ${phase3End.toISOString().split('T')[0]}`);
  console.log(`   Status: IN PROGRESS (active now)\n`);

  // Create allocations for Phase 3 - currently being worked on
  await prisma.phaseAllocation.create({
    data: {
      phaseId: phase3.id,
      consultantId: consultant2.id,
      totalHours: 100,
      consultantDescription: 'React Native development and UI implementation',
      approvalStatus: 'APPROVED',
      approvedBy: pm.id,
      approvedAt: new Date(phase3Start)
    }
  });

  await prisma.phaseAllocation.create({
    data: {
      phaseId: phase3.id,
      consultantId: consultant3.id,
      totalHours: 80,
      consultantDescription: 'State management and API integration',
      approvalStatus: 'APPROVED',
      approvedBy: pm.id,
      approvedAt: new Date(phase3Start)
    }
  });

  console.log(`   - ${consultant2.name}: 100h (Frontend)`);
  console.log(`   - ${consultant3.name}: 80h (Integration)`);
  console.log(`   (Planning in progress)\n`);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ SEED COMPLETE!');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('📊 Summary:');
  console.log(`   Project: "${project.title}"`);
  console.log(`   Duration: 12 weeks (started 8 weeks ago)`);
  console.log(`   Phases: 3 (2 completed, 1 in progress)`);
  console.log(`   Team: 4 consultants\n`);
  console.log('🔴 Expired Allocations to Handle:');
  console.log(`   1. ${consultant1.name} - Phase 1: 30h unplanned (partially planned)`);
  console.log(`   2. ${consultant2.name} - Phase 1: 50h unplanned (completely unplanned)\n`);
  console.log('💡 Test Scenarios:');
  console.log('   ✓ Fully planned expired allocation (no action needed)');
  console.log('   ✓ Partially planned expired allocation (30h to handle)');
  console.log('   ✓ Completely unplanned expired allocation (50h to handle)');
  console.log('   ✓ Active phase with pending allocations\n');
}

main()
  .catch((error) => {
    console.error('❌ Error seeding database:');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
