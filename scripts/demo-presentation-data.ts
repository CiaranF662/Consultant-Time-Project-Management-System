import { PrismaClient, UserRole, UserStatus, ApprovalStatus, PlanningStatus, ExpiredHoursStatus } from '@prisma/client';
import { hash } from 'bcrypt';
import { addWeeks, startOfWeek, endOfWeek, getISOWeek, getYear, subWeeks } from 'date-fns';

const prisma = new PrismaClient();

/**
 * DEMO PRESENTATION DATA SCRIPT
 *
 * This script creates a realistic consulting project scenario that demonstrates:
 * - Expired allocations and how they're handled
 * - Phases in different states (completed, in-progress, upcoming)
 * - Rejected weekly plans
 * - All status indicators working correctly
 * - Real-world timeline that makes sense
 *
 * PROJECT SCENARIO:
 * "E-Commerce Platform Modernization" for a retail client
 * Timeline: 12 weeks (started 8 weeks ago, 4 weeks remaining)
 * Team: Ciaran PM (PM), Luyanda (Senior Dev), Shaana (UI/UX Designer)
 */

async function main() {
  console.log('🚀 Starting demo data creation...\n');

  // ============================================================================
  // STEP 1: Create/Update Users
  // ============================================================================
  console.log('📋 STEP 1: Setting up users...');

  const password = await hash('Password123!', 12);

  // Growth Team Member (observer role)
  const growthTeamMember = await prisma.user.upsert({
    where: { email: 'naleditshapi04@gmail.com' },
    update: {
      name: 'Naledzi Tshapi',
      role: UserRole.GROWTH_TEAM,
      status: UserStatus.APPROVED,
      emailVerified: new Date()
    },
    create: {
      email: 'naleditshapi04@gmail.com',
      name: 'Naledzi Tshapi',
      password,
      role: UserRole.GROWTH_TEAM,
      status: UserStatus.APPROVED,
      emailVerified: new Date()
    }
  });

  // Product Manager (Ciaran)
  const ciaranPM = await prisma.user.upsert({
    where: { email: 'ciaranformby@gmail.com' },
    update: {
      name: 'Ciaran Formby',
      role: UserRole.CONSULTANT,
      status: UserStatus.APPROVED,
      emailVerified: new Date()
    },
    create: {
      email: 'ciaranformby@gmail.com',
      name: 'Ciaran Formby',
      password,
      role: UserRole.CONSULTANT,
      status: UserStatus.APPROVED,
      emailVerified: new Date()
    }
  });

  // Senior Developer (Luyanda)
  const luyanda = await prisma.user.upsert({
    where: { email: 'ndlovuluyanda@icloud.com' },
    update: {
      name: 'Luyanda Ndlovu',
      role: UserRole.CONSULTANT,
      status: UserStatus.APPROVED,
      emailVerified: new Date()
    },
    create: {
      email: 'ndlovuluyanda@icloud.com',
      name: 'Luyanda Ndlovu',
      password,
      role: UserRole.CONSULTANT,
      status: UserStatus.APPROVED,
      emailVerified: new Date()
    }
  });

  // UI/UX Designer (Shaana)
  const shaana = await prisma.user.upsert({
    where: { email: 'shaanandzenge@gmail.com' },
    update: {
      name: 'Shaana Ndzenge',
      role: UserRole.CONSULTANT,
      status: UserStatus.APPROVED,
      emailVerified: new Date()
    },
    create: {
      email: 'shaanandzenge@gmail.com',
      name: 'Shaana Ndzenge',
      password,
      role: UserRole.CONSULTANT,
      status: UserStatus.APPROVED,
      emailVerified: new Date()
    }
  });

  console.log('✅ Users created:');
  console.log(`   - ${growthTeamMember.name} (Growth Team)`);
  console.log(`   - ${ciaranPM.name} (Product Manager)`);
  console.log(`   - ${luyanda.name} (Senior Developer)`);
  console.log(`   - ${shaana.name} (UI/UX Designer)\n`);

  // ============================================================================
  // STEP 2: Create Project with Realistic Timeline
  // ============================================================================
  console.log('📋 STEP 2: Creating project...');

  // Project started 8 weeks ago, runs for 12 weeks total
  const projectStart = startOfWeek(subWeeks(new Date(), 8), { weekStartsOn: 1 });
  const projectEnd = endOfWeek(addWeeks(projectStart, 12), { weekStartsOn: 1 });

  const project = await prisma.project.create({
    data: {
      title: 'E-Commerce Platform Modernization',
      description: 'Complete overhaul of legacy e-commerce system with modern tech stack, improved UX, and scalable architecture. Includes payment gateway integration, inventory management, and customer portal.',
      startDate: projectStart,
      endDate: projectEnd,
      budgetedHours: 480, // 12 weeks * 40 hours average
      productManagerId: ciaranPM.id,
      consultants: {
        create: [
          // PM is NOT a consultant - only Luyanda and Shaana
          { userId: luyanda.id },
          { userId: shaana.id }
        ]
      }
    }
  });

  console.log(`✅ Project created: "${project.title}"`);
  console.log(`   Timeline: ${projectStart.toISOString().split('T')[0]} to ${projectEnd.toISOString().split('T')[0]}`);
  console.log(`   Budget: ${project.budgetedHours} hours\n`);

  // ============================================================================
  // STEP 3: Generate Sprints (6 sprints of 2 weeks each)
  // ============================================================================
  console.log('📋 STEP 3: Generating sprints...');

  const sprints = [];
  for (let i = 0; i < 6; i++) {
    const sprintStart = startOfWeek(addWeeks(projectStart, i * 2), { weekStartsOn: 1 });
    const sprintEnd = endOfWeek(addWeeks(sprintStart, 1), { weekStartsOn: 1 });

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

  console.log(`✅ Created ${sprints.length} sprints (2-week cycles)\n`);

  // ============================================================================
  // STEP 4: Create Phases with Different Statuses
  // ============================================================================
  console.log('📋 STEP 4: Creating phases...');

  // PHASE 1: Discovery & Planning (COMPLETED - Sprints 1-2, weeks 1-4)
  // This phase is done, all hours allocated and approved
  const phase1 = await prisma.phase.create({
    data: {
      projectId: project.id,
      name: 'Discovery & Requirements Analysis',
      description: 'Initial discovery, requirements gathering, technical architecture design, and sprint planning.',
      startDate: sprints[0].startDate,
      endDate: sprints[1].endDate,
      sprints: {
        connect: [{ id: sprints[0].id }, { id: sprints[1].id }]
      }
    }
  });

  // PHASE 2: Backend Development (IN PROGRESS - Sprints 3-4, weeks 5-8)
  // This phase has some expired allocations and mixed statuses
  const phase2 = await prisma.phase.create({
    data: {
      projectId: project.id,
      name: 'Backend API Development',
      description: 'RESTful API development, database design, authentication system, and payment gateway integration.',
      startDate: sprints[2].startDate,
      endDate: sprints[3].endDate,
      sprints: {
        connect: [{ id: sprints[2].id }, { id: sprints[3].id }]
      }
    }
  });

  // PHASE 3: Frontend Development (STARTING SOON - Sprints 5-6, weeks 9-12)
  // This phase has pending allocations
  const phase3 = await prisma.phase.create({
    data: {
      projectId: project.id,
      name: 'Frontend & UX Implementation',
      description: 'React frontend development, responsive design, user dashboard, and checkout flow optimization.',
      startDate: sprints[4].startDate,
      endDate: sprints[5].endDate,
      sprints: {
        connect: [{ id: sprints[4].id }, { id: sprints[5].id }]
      }
    }
  });

  console.log('✅ Created 3 phases:');
  console.log(`   1. ${phase1.name} (Completed)`);
  console.log(`   2. ${phase2.name} (In Progress - with expired allocations)`);
  console.log(`   3. ${phase3.name} (Upcoming)\n`);

  // ============================================================================
  // STEP 5: Phase 1 Allocations (COMPLETED & APPROVED)
  // ============================================================================
  console.log('📋 STEP 5: Creating Phase 1 allocations (completed)...');

  // Ciaran PM: 20 hours for project oversight
  const phase1AllocPM = await prisma.phaseAllocation.create({
    data: {
      phaseId: phase1.id,
      consultantId: ciaranPM.id,
      totalHours: 20,
      approvalStatus: ApprovalStatus.APPROVED,
      approvedBy: growthTeamMember.id,
      approvedAt: subWeeks(new Date(), 7)
    }
  });

  // Luyanda: 60 hours for backend architecture
  const phase1Alloc1 = await prisma.phaseAllocation.create({
    data: {
      phaseId: phase1.id,
      consultantId: luyanda.id,
      totalHours: 60,
      approvalStatus: ApprovalStatus.APPROVED,
      approvedBy: growthTeamMember.id,
      approvedAt: subWeeks(new Date(), 7)
    }
  });

  // Shaana: 40 hours for UX research
  const phase1Alloc2 = await prisma.phaseAllocation.create({
    data: {
      phaseId: phase1.id,
      consultantId: shaana.id,
      totalHours: 40,
      approvalStatus: ApprovalStatus.APPROVED,
      approvedBy: growthTeamMember.id,
      approvedAt: subWeeks(new Date(), 7)
    }
  });

  // Create weekly allocations for Phase 1 (all approved and in the past)
  const phase1Weeks = [
    { consultant: ciaranPM.id, phaseAllocId: phase1AllocPM.id, sprint: 0, week: 0, hours: 5 },
    { consultant: ciaranPM.id, phaseAllocId: phase1AllocPM.id, sprint: 0, week: 1, hours: 5 },
    { consultant: ciaranPM.id, phaseAllocId: phase1AllocPM.id, sprint: 1, week: 0, hours: 5 },
    { consultant: ciaranPM.id, phaseAllocId: phase1AllocPM.id, sprint: 1, week: 1, hours: 5 },
    { consultant: luyanda.id, phaseAllocId: phase1Alloc1.id, sprint: 0, week: 0, hours: 15 },
    { consultant: luyanda.id, phaseAllocId: phase1Alloc1.id, sprint: 0, week: 1, hours: 15 },
    { consultant: luyanda.id, phaseAllocId: phase1Alloc1.id, sprint: 1, week: 0, hours: 15 },
    { consultant: luyanda.id, phaseAllocId: phase1Alloc1.id, sprint: 1, week: 1, hours: 15 },
    { consultant: shaana.id, phaseAllocId: phase1Alloc2.id, sprint: 0, week: 0, hours: 10 },
    { consultant: shaana.id, phaseAllocId: phase1Alloc2.id, sprint: 0, week: 1, hours: 10 },
    { consultant: shaana.id, phaseAllocId: phase1Alloc2.id, sprint: 1, week: 0, hours: 10 },
    { consultant: shaana.id, phaseAllocId: phase1Alloc2.id, sprint: 1, week: 1, hours: 10 }
  ];

  for (const weekData of phase1Weeks) {
    const weekStart = startOfWeek(addWeeks(sprints[weekData.sprint].startDate, weekData.week), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const phaseAllocId = weekData.phaseAllocId;

    await prisma.weeklyAllocation.create({
      data: {
        phaseAllocationId: phaseAllocId,
        consultantId: weekData.consultant,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        weekNumber: getISOWeek(weekStart),
        year: getYear(weekStart),
        proposedHours: weekData.hours,
        approvedHours: weekData.hours,
        planningStatus: PlanningStatus.APPROVED,
        plannedBy: weekData.consultant,
        approvedBy: growthTeamMember.id,
        approvedAt: subWeeks(new Date(), 6)
      }
    });
  }

  console.log('✅ Phase 1: All allocations completed and approved\n');

  // ============================================================================
  // STEP 6: Phase 2 Allocations (IN PROGRESS - WITH EXPIRED ALLOCATIONS)
  // ============================================================================
  console.log('📋 STEP 6: Creating Phase 2 allocations (with expired allocations)...');

  // Ciaran PM: 20 hours approved and fully planned
  const phase2AllocPM = await prisma.phaseAllocation.create({
    data: {
      phaseId: phase2.id,
      consultantId: ciaranPM.id,
      totalHours: 20,
      approvalStatus: ApprovalStatus.APPROVED,
      approvedBy: growthTeamMember.id,
      approvedAt: subWeeks(new Date(), 4)
    }
  });

  // Luyanda: 80 hours approved (but only 60 planned - 20 hours EXPIRED)
  const phase2Alloc1 = await prisma.phaseAllocation.create({
    data: {
      phaseId: phase2.id,
      consultantId: luyanda.id,
      totalHours: 80,
      approvalStatus: ApprovalStatus.APPROVED,
      approvedBy: growthTeamMember.id,
      approvedAt: subWeeks(new Date(), 4)
    }
  });

  // Shaana: 50 hours approved (40 planned, 10 hours EXPIRED - she got sick)
  const phase2Alloc2 = await prisma.phaseAllocation.create({
    data: {
      phaseId: phase2.id,
      consultantId: shaana.id,
      totalHours: 50,
      approvalStatus: ApprovalStatus.APPROVED,
      approvedBy: growthTeamMember.id,
      approvedAt: subWeeks(new Date(), 4)
    }
  });

  // PM's weekly plans for Phase 2 (weeks 5-8) - All planned, no expired
  const week5Start = startOfWeek(sprints[2].startDate, { weekStartsOn: 1 });
  const week6Start = startOfWeek(addWeeks(sprints[2].startDate, 1), { weekStartsOn: 1 });
  const week7Start = startOfWeek(sprints[3].startDate, { weekStartsOn: 1 });
  const week8Start = startOfWeek(addWeeks(sprints[3].startDate, 1), { weekStartsOn: 1 });

  // PM Week 5: 5h - APPROVED
  await prisma.weeklyAllocation.create({
    data: {
      phaseAllocationId: phase2AllocPM.id,
      consultantId: ciaranPM.id,
      weekStartDate: week5Start,
      weekEndDate: endOfWeek(week5Start, { weekStartsOn: 1 }),
      weekNumber: getISOWeek(week5Start),
      year: getYear(week5Start),
      proposedHours: 5,
      approvedHours: 5,
      planningStatus: PlanningStatus.APPROVED,
      plannedBy: ciaranPM.id,
      approvedBy: growthTeamMember.id,
      approvedAt: subWeeks(new Date(), 4)
    }
  });

  // PM Week 6: 5h - APPROVED
  await prisma.weeklyAllocation.create({
    data: {
      phaseAllocationId: phase2AllocPM.id,
      consultantId: ciaranPM.id,
      weekStartDate: week6Start,
      weekEndDate: endOfWeek(week6Start, { weekStartsOn: 1 }),
      weekNumber: getISOWeek(week6Start),
      year: getYear(week6Start),
      proposedHours: 5,
      approvedHours: 5,
      planningStatus: PlanningStatus.APPROVED,
      plannedBy: ciaranPM.id,
      approvedBy: growthTeamMember.id,
      approvedAt: subWeeks(new Date(), 3)
    }
  });

  // PM Week 7: 5h - APPROVED
  await prisma.weeklyAllocation.create({
    data: {
      phaseAllocationId: phase2AllocPM.id,
      consultantId: ciaranPM.id,
      weekStartDate: week7Start,
      weekEndDate: endOfWeek(week7Start, { weekStartsOn: 1 }),
      weekNumber: getISOWeek(week7Start),
      year: getYear(week7Start),
      proposedHours: 5,
      approvedHours: 5,
      planningStatus: PlanningStatus.APPROVED,
      plannedBy: ciaranPM.id,
      approvedBy: growthTeamMember.id,
      approvedAt: subWeeks(new Date(), 2)
    }
  });

  // PM Week 8: 5h - APPROVED
  await prisma.weeklyAllocation.create({
    data: {
      phaseAllocationId: phase2AllocPM.id,
      consultantId: ciaranPM.id,
      weekStartDate: week8Start,
      weekEndDate: endOfWeek(week8Start, { weekStartsOn: 1 }),
      weekNumber: getISOWeek(week8Start),
      year: getYear(week8Start),
      proposedHours: 5,
      approvedHours: 5,
      planningStatus: PlanningStatus.APPROVED,
      plannedBy: ciaranPM.id,
      approvedBy: growthTeamMember.id,
      approvedAt: subWeeks(new Date(), 1)
    }
  });

  // Luyanda's weekly plans for Phase 2 (weeks 5-8)
  // Week 5: 20h - APPROVED
  await prisma.weeklyAllocation.create({
    data: {
      phaseAllocationId: phase2Alloc1.id,
      consultantId: luyanda.id,
      weekStartDate: week5Start,
      weekEndDate: endOfWeek(week5Start, { weekStartsOn: 1 }),
      weekNumber: getISOWeek(week5Start),
      year: getYear(week5Start),
      proposedHours: 20,
      approvedHours: 20,
      planningStatus: PlanningStatus.APPROVED,
      plannedBy: luyanda.id,
      approvedBy: growthTeamMember.id,
      approvedAt: subWeeks(new Date(), 4)
    }
  });

  // Week 6: 20h - APPROVED
  await prisma.weeklyAllocation.create({
    data: {
      phaseAllocationId: phase2Alloc1.id,
      consultantId: luyanda.id,
      weekStartDate: week6Start,
      weekEndDate: endOfWeek(week6Start, { weekStartsOn: 1 }),
      weekNumber: getISOWeek(week6Start),
      year: getYear(week6Start),
      proposedHours: 20,
      approvedHours: 20,
      planningStatus: PlanningStatus.APPROVED,
      plannedBy: luyanda.id,
      approvedBy: growthTeamMember.id,
      approvedAt: subWeeks(new Date(), 3)
    }
  });

  // Week 7: 20h - APPROVED (last week - now expired)
  await prisma.weeklyAllocation.create({
    data: {
      phaseAllocationId: phase2Alloc1.id,
      consultantId: luyanda.id,
      weekStartDate: week7Start,
      weekEndDate: endOfWeek(week7Start, { weekStartsOn: 1 }),
      weekNumber: getISOWeek(week7Start),
      year: getYear(week7Start),
      proposedHours: 20,
      approvedHours: 20,
      planningStatus: PlanningStatus.APPROVED,
      plannedBy: luyanda.id,
      approvedBy: growthTeamMember.id,
      approvedAt: subWeeks(new Date(), 2)
    }
  });

  // Week 8 (sprint 3, week 1): NOT PLANNED - This creates 20 hours EXPIRED
  // (The week has passed but no weekly plan was created)

  // Shaana's weekly plans for Phase 2
  // Week 5: 15h - APPROVED
  await prisma.weeklyAllocation.create({
    data: {
      phaseAllocationId: phase2Alloc2.id,
      consultantId: shaana.id,
      weekStartDate: week5Start,
      weekEndDate: endOfWeek(week5Start, { weekStartsOn: 1 }),
      weekNumber: getISOWeek(week5Start),
      year: getYear(week5Start),
      proposedHours: 15,
      approvedHours: 15,
      planningStatus: PlanningStatus.APPROVED,
      plannedBy: shaana.id,
      approvedBy: growthTeamMember.id,
      approvedAt: subWeeks(new Date(), 4)
    }
  });

  // Week 6: 10h - REJECTED (Growth team thought it was too few hours)
  const week6RejectedAlloc = await prisma.weeklyAllocation.create({
    data: {
      phaseAllocationId: phase2Alloc2.id,
      consultantId: shaana.id,
      weekStartDate: week6Start,
      weekEndDate: endOfWeek(week6Start, { weekStartsOn: 1 }),
      weekNumber: getISOWeek(week6Start),
      year: getYear(week6Start),
      proposedHours: 10,
      approvedHours: null,
      planningStatus: PlanningStatus.REJECTED,
      rejectionReason: 'Only 10 hours for a full week seems low. Please review the work breakdown and adjust hours accordingly.',
      plannedBy: shaana.id,
      approvedBy: growthTeamMember.id,
      approvedAt: subWeeks(new Date(), 3)
    }
  });

  // Week 7: 15h - APPROVED (resubmitted after rejection)
  await prisma.weeklyAllocation.create({
    data: {
      phaseAllocationId: phase2Alloc2.id,
      consultantId: shaana.id,
      weekStartDate: week7Start,
      weekEndDate: endOfWeek(week7Start, { weekStartsOn: 1 }),
      weekNumber: getISOWeek(week7Start),
      year: getYear(week7Start),
      proposedHours: 15,
      approvedHours: 15,
      planningStatus: PlanningStatus.APPROVED,
      plannedBy: shaana.id,
      approvedBy: growthTeamMember.id,
      approvedAt: subWeeks(new Date(), 2)
    }
  });

  // Week 8: NOT PLANNED - Shaana was sick, 10 hours EXPIRED

  console.log('✅ Phase 2: Created with expired allocations');
  console.log('   - Luyanda: 60h planned out of 80h (20h expired)');
  console.log('   - Shaana: 40h planned out of 50h (10h expired, 1 rejection)\n');

  // Create UnplannedExpiredHours records
  await prisma.unplannedExpiredHours.create({
    data: {
      phaseAllocationId: phase2Alloc1.id,
      unplannedHours: 20,
      notes: 'Week 8 passed without weekly plan submission',
      detectedAt: new Date(),
      status: ExpiredHoursStatus.EXPIRED
    }
  });

  await prisma.unplannedExpiredHours.create({
    data: {
      phaseAllocationId: phase2Alloc2.id,
      unplannedHours: 10,
      notes: 'Consultant was sick during week 8, unable to complete planned work',
      detectedAt: new Date(),
      status: ExpiredHoursStatus.EXPIRED
    }
  });

  console.log('✅ Expired hours records created for Phase 2\n');

  // ============================================================================
  // STEP 7: Phase 3 Allocations (UPCOMING - PENDING APPROVAL)
  // ============================================================================
  console.log('📋 STEP 7: Creating Phase 3 allocations (pending)...');

  // Ciaran PM: 20 hours PENDING
  await prisma.phaseAllocation.create({
    data: {
      phaseId: phase3.id,
      consultantId: ciaranPM.id,
      totalHours: 20,
      approvalStatus: ApprovalStatus.PENDING
    }
  });

  // Luyanda: 60 hours PENDING
  await prisma.phaseAllocation.create({
    data: {
      phaseId: phase3.id,
      consultantId: luyanda.id,
      totalHours: 60,
      approvalStatus: ApprovalStatus.PENDING
    }
  });

  // Shaana: 80 hours PENDING
  await prisma.phaseAllocation.create({
    data: {
      phaseId: phase3.id,
      consultantId: shaana.id,
      totalHours: 80,
      approvalStatus: ApprovalStatus.PENDING
    }
  });

  console.log('✅ Phase 3: Pending allocations created (awaiting Growth Team approval)\n');

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎉 DEMO DATA CREATION COMPLETE!');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('📊 PROJECT SUMMARY:');
  console.log(`   Project: ${project.title}`);
  console.log(`   PM: ${ciaranPM.name}`);
  console.log(`   Team: ${luyanda.name}, ${shaana.name}`);
  console.log(`   Budget: ${project.budgetedHours} hours\n`);

  console.log('📋 PHASE BREAKDOWN:');
  console.log('   Phase 1: Discovery (COMPLETED)');
  console.log('   ├─ Ciaran PM: 20h (all approved & completed)');
  console.log('   ├─ Luyanda: 60h (all approved & completed)');
  console.log('   └─ Shaana: 40h (all approved & completed)\n');

  console.log('   Phase 2: Backend Development (IN PROGRESS - EXPIRED ALLOCATIONS)');
  console.log('   ├─ Ciaran PM: 20h/20h planned (all approved)');
  console.log('   ├─ Luyanda: 60h/80h planned (20h EXPIRED)');
  console.log('   └─ Shaana: 40h/50h planned (10h EXPIRED, 1 REJECTED week)\n');

  console.log('   Phase 3: Frontend Development (UPCOMING - PENDING)');
  console.log('   ├─ Ciaran PM: 20h (PENDING approval)');
  console.log('   ├─ Luyanda: 60h (PENDING approval)');
  console.log('   └─ Shaana: 80h (PENDING approval)\n');

  console.log('🎯 DEMONSTRATION FEATURES:');
  console.log('   ✅ Expired allocations (30h total)');
  console.log('   ✅ Rejected weekly plans (1 rejection with reason)');
  console.log('   ✅ Multiple phase statuses (completed, in-progress, upcoming)');
  console.log('   ✅ Realistic timeline (8 weeks in, 4 weeks remaining)');
  console.log('   ✅ All status indicators working');
  console.log('   ✅ Real-world scenario (consultant got sick)\n');

  console.log('🔑 LOGIN CREDENTIALS (all users):');
  console.log('   Password: Password123!\n');

  console.log('👥 USER EMAILS:');
  console.log(`   Growth Team: ${growthTeamMember.email}`);
  console.log(`   Product Manager: ${ciaranPM.email}`);
  console.log(`   Senior Developer: ${luyanda.email}`);
  console.log(`   UI/UX Designer: ${shaana.email}\n`);

  console.log('═══════════════════════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('❌ Error creating demo data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
