import { PrismaClient, ApprovalStatus, PlanningStatus, ProjectRole } from '@prisma/client';

// Helper function to get ISO week number
function getWeekNumber(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { week: weekNo, year: d.getUTCFullYear() };
}

const prisma = new PrismaClient();

/**
 * SEED SCRIPT: Historical Project with EXPIRED ALLOCATIONS (Various Planning States)
 *
 * PURPOSE: Demonstrate how the system handles expired allocations in different planning states
 *
 * WHAT THIS CREATES:
 * =================
 * 1. Project: "Legacy E-Commerce Platform Upgrade" (3 months ago → 1 month ago)
 *    - Realistic past project timeline
 *    - Total budget: 480 hours
 *
 * 2. Team Structure:
 *    - Product Manager: Ciaran PM (ciaranformby@gmail.com) - also a CONSULTANT
 *    - 3 Other CONSULTANT role users (NO Growth Team members!)
 *
 * 3. Sprints: 6 sprints (2 weeks each) in the past
 *
 * 4. Phases: 3 phases with DIFFERENT planning states
 *    - Phase 1: "Discovery" - Mix of FULLY planned and UNPLANNED allocations
 *    - Phase 2: "Development" - Mix of PARTIALLY planned and UNPLANNED
 *    - Phase 3: "Testing" - COMPLETELY UNPLANNED (demonstrates expired unplanned allocations)
 *
 * 5. Phase Allocations (ALL APPROVED):
 *    - Phase 1: 160h total
 *      • Consultant 1: 60h - FULLY planned (all weeks have allocations)
 *      • Consultant 2: 60h - FULLY planned
 *      • Consultant 3: 40h - UNPLANNED (no weekly allocations)
 *    - Phase 2: 200h total
 *      • Consultant 1: 80h - PARTIALLY planned (only 2/4 weeks)
 *      • Consultant 2: 80h - PARTIALLY planned (only 3/4 weeks)
 *      • Consultant 3: 40h - UNPLANNED
 *    - Phase 3: 120h total
 *      • Consultant 1: 60h - UNPLANNED (demonstrates expired + unplanned)
 *      • Consultant 4 (PM): 60h - UNPLANNED
 *
 * 6. This demonstrates:
 *    ✅ Expired allocations that were fully planned (consultant completed planning)
 *    ⚠️ Expired allocations that were partially planned (consultant didn't finish)
 *    ❌ Expired allocations that were never planned (consultant never started)
 *
 * SAFETY:
 * =======
 * - Creates ONLY new data (doesn't modify existing)
 * - Uses only CONSULTANT role users (Growth Team excluded)
 * - All dates in the past (expired)
 */

async function seedExpiredProject() {
  console.log('🌱 Starting seed for EXPIRED allocations with various planning states...\n');

  try {
    // ============================================
    // STEP 1: Get existing CONSULTANT users only
    // ============================================
    console.log('📋 Step 1: Finding Product Manager and Consultants...');

    // Find Ciaran PM specifically
    const productManager = await prisma.user.findUnique({
      where: { email: 'ciaranformby@gmail.com' }
    });

    if (!productManager) {
      throw new Error('❌ Product Manager not found! Please ensure user with email "ciaranformby@gmail.com" exists.');
    }

    if (productManager.role === 'GROWTH_TEAM') {
      throw new Error('❌ Ciaran PM has GROWTH_TEAM role. Growth Team members cannot be allocated to projects. Please ensure this user has CONSULTANT role.');
    }

    // Get CONSULTANT role users only (excluding Growth Team)
    const consultants = await prisma.user.findMany({
      where: {
        status: 'APPROVED',
        role: 'CONSULTANT', // CRITICAL: Only consultants, never Growth Team
        email: { not: 'ciaranformby@gmail.com' } // Exclude PM
      },
      take: 3, // Need 3 more consultants
      orderBy: { createdAt: 'asc' }
    });

    if (consultants.length < 3) {
      throw new Error(`❌ Need at least 3 CONSULTANT role users (found ${consultants.length}). Growth Team members cannot be allocated to projects.`);
    }

    console.log(`   ✅ Product Manager: ${productManager.name || productManager.email} (${productManager.email})`);
    console.log(`   ✅ Role: ${productManager.role} ← Must be CONSULTANT`);
    console.log(`   ✅ Team Consultants: ${consultants.map(c => c.name || c.email).join(', ')}`);
    console.log(`   ✅ All users have CONSULTANT role (Growth Team excluded)\n`);

    // ============================================
    // STEP 2: Calculate dates (all in the past)
    // ============================================
    console.log('📅 Step 2: Calculating historical dates (all EXPIRED)...');

    const today = new Date();
    const projectStartDate = new Date(today);
    projectStartDate.setDate(today.getDate() - 90); // 3 months ago
    projectStartDate.setHours(0, 0, 0, 0);

    const projectEndDate = new Date(today);
    projectEndDate.setDate(today.getDate() - 30); // 1 month ago
    projectEndDate.setHours(23, 59, 59, 999);

    console.log(`   📆 Project: ${projectStartDate.toLocaleDateString()} → ${projectEndDate.toLocaleDateString()}`);
    console.log(`   ⏰ Status: ALL EXPIRED (in the past)\n`);

    // ============================================
    // STEP 3: Create the project
    // ============================================
    console.log('🏗️  Step 3: Creating historical project...');

    const project = await prisma.project.create({
      data: {
        title: 'Legacy E-Commerce Platform Upgrade',
        description: 'EXPIRED project demonstrating various planning states: fully planned, partially planned, and unplanned allocations.',
        startDate: projectStartDate,
        endDate: projectEndDate,
        budgetedHours: 480,
        productManagerId: productManager.id,
        consultants: {
          create: [
            { userId: productManager.id, role: ProjectRole.PRODUCT_MANAGER }, // PM is also on the team
            ...consultants.map(c => ({ userId: c.id, role: ProjectRole.TEAM_MEMBER }))
          ]
        }
      }
    });

    console.log(`   ✅ Project: "${project.title}"`);
    console.log(`   💰 Budget: ${project.budgetedHours} hours`);
    console.log(`   👥 Team: PM + 3 consultants (all CONSULTANT role)\n`);

    // ============================================
    // STEP 4: Create 6 past sprints
    // ============================================
    console.log('🏃 Step 4: Creating 6 past sprints...');

    const sprints = [];
    for (let i = 0; i < 6; i++) {
      const sprintStart = new Date(projectStartDate);
      sprintStart.setDate(projectStartDate.getDate() + (i * 14));

      const sprintEnd = new Date(sprintStart);
      sprintEnd.setDate(sprintStart.getDate() + 13);
      sprintEnd.setHours(23, 59, 59, 999);

      const sprint = await prisma.sprint.create({
        data: {
          sprintNumber: i + 1,
          startDate: sprintStart,
          endDate: sprintEnd,
          projectId: project.id
        }
      });

      sprints.push(sprint);
      console.log(`   ✅ Sprint ${i + 1}: ${sprintStart.toLocaleDateString()} → ${sprintEnd.toLocaleDateString()}`);
    }
    console.log('');

    // ============================================
    // STEP 5: Create phases
    // ============================================
    console.log('📊 Step 5: Creating 3 phases...');

    const phase1 = await prisma.phase.create({
      data: {
        name: 'Discovery & Planning',
        description: 'Requirements and architecture - demonstrates FULLY PLANNED and UNPLANNED',
        startDate: sprints[0].startDate,
        endDate: sprints[1].endDate,
        projectId: project.id
      }
    });
    await prisma.sprint.updateMany({
      where: { id: { in: [sprints[0].id, sprints[1].id] } },
      data: { phaseId: phase1.id }
    });
    console.log(`   ✅ Phase 1: "${phase1.name}" (Sprint 1-2) - Will show FULLY planned + UNPLANNED`);

    const phase2 = await prisma.phase.create({
      data: {
        name: 'Development',
        description: 'Core development - demonstrates PARTIALLY PLANNED allocations',
        startDate: sprints[2].startDate,
        endDate: sprints[3].endDate,
        projectId: project.id
      }
    });
    await prisma.sprint.updateMany({
      where: { id: { in: [sprints[2].id, sprints[3].id] } },
      data: { phaseId: phase2.id }
    });
    console.log(`   ✅ Phase 2: "${phase2.name}" (Sprint 3-4) - Will show PARTIALLY planned`);

    const phase3 = await prisma.phase.create({
      data: {
        name: 'Testing & Deployment',
        description: 'Final testing - demonstrates COMPLETELY UNPLANNED expired allocations',
        startDate: sprints[4].startDate,
        endDate: sprints[5].endDate,
        projectId: project.id
      }
    });
    await prisma.sprint.updateMany({
      where: { id: { in: [sprints[4].id, sprints[5].id] } },
      data: { phaseId: phase3.id }
    });
    console.log(`   ✅ Phase 3: "${phase3.name}" (Sprint 5-6) - Will be COMPLETELY UNPLANNED\n`);

    // ============================================
    // STEP 6: Create phase allocations (ALL APPROVED)
    // ============================================
    console.log('💼 Step 6: Creating APPROVED phase allocations...\n');

    // Phase 1 allocations
    console.log('   📌 PHASE 1 Allocations (Discovery):');
    const phase1Alloc1 = await prisma.phaseAllocation.create({
      data: {
        phaseId: phase1.id,
        consultantId: consultants[0].id,
        totalHours: 60,
        consultantDescription: 'Requirements gathering',
        approvalStatus: ApprovalStatus.APPROVED,
        approvedBy: productManager.id,
        approvedAt: new Date(phase1.startDate.getTime() - 86400000)
      }
    });
    console.log(`      ✅ ${consultants[0].name}: 60h - Will be FULLY PLANNED`);

    const phase1Alloc2 = await prisma.phaseAllocation.create({
      data: {
        phaseId: phase1.id,
        consultantId: consultants[1].id,
        totalHours: 60,
        consultantDescription: 'Architecture design',
        approvalStatus: ApprovalStatus.APPROVED,
        approvedBy: productManager.id,
        approvedAt: new Date(phase1.startDate.getTime() - 86400000)
      }
    });
    console.log(`      ✅ ${consultants[1].name}: 60h - Will be FULLY PLANNED`);

    const phase1Alloc3 = await prisma.phaseAllocation.create({
      data: {
        phaseId: phase1.id,
        consultantId: consultants[2].id,
        totalHours: 40,
        consultantDescription: 'UX research',
        approvalStatus: ApprovalStatus.APPROVED,
        approvedBy: productManager.id,
        approvedAt: new Date(phase1.startDate.getTime() - 86400000)
      }
    });
    console.log(`      ❌ ${consultants[2].name}: 40h - Will be UNPLANNED (no weekly allocations)\n`);

    // Phase 2 allocations
    console.log('   📌 PHASE 2 Allocations (Development):');
    const phase2Alloc1 = await prisma.phaseAllocation.create({
      data: {
        phaseId: phase2.id,
        consultantId: consultants[0].id,
        totalHours: 80,
        consultantDescription: 'Backend development',
        approvalStatus: ApprovalStatus.APPROVED,
        approvedBy: productManager.id,
        approvedAt: new Date(phase2.startDate.getTime() - 86400000)
      }
    });
    console.log(`      ⚠️  ${consultants[0].name}: 80h - Will be PARTIALLY PLANNED (2/4 weeks)`);

    const phase2Alloc2 = await prisma.phaseAllocation.create({
      data: {
        phaseId: phase2.id,
        consultantId: consultants[1].id,
        totalHours: 80,
        consultantDescription: 'Frontend development',
        approvalStatus: ApprovalStatus.APPROVED,
        approvedBy: productManager.id,
        approvedAt: new Date(phase2.startDate.getTime() - 86400000)
      }
    });
    console.log(`      ⚠️  ${consultants[1].name}: 80h - Will be PARTIALLY PLANNED (3/4 weeks)`);

    const phase2Alloc3 = await prisma.phaseAllocation.create({
      data: {
        phaseId: phase2.id,
        consultantId: consultants[2].id,
        totalHours: 40,
        consultantDescription: 'UI/UX implementation',
        approvalStatus: ApprovalStatus.APPROVED,
        approvedBy: productManager.id,
        approvedAt: new Date(phase2.startDate.getTime() - 86400000)
      }
    });
    console.log(`      ❌ ${consultants[2].name}: 40h - Will be UNPLANNED\n`);

    // Phase 3 allocations (all unplanned)
    console.log('   📌 PHASE 3 Allocations (Testing - ALL EXPIRED & UNPLANNED):');
    const phase3Alloc1 = await prisma.phaseAllocation.create({
      data: {
        phaseId: phase3.id,
        consultantId: consultants[0].id,
        totalHours: 60,
        consultantDescription: 'Integration testing',
        approvalStatus: ApprovalStatus.APPROVED,
        approvedBy: productManager.id,
        approvedAt: new Date(phase3.startDate.getTime() - 86400000)
      }
    });
    console.log(`      ❌ ${consultants[0].name}: 60h - UNPLANNED (expired + never planned)`);

    const phase3Alloc2 = await prisma.phaseAllocation.create({
      data: {
        phaseId: phase3.id,
        consultantId: productManager.id, // PM also has allocation
        totalHours: 60,
        consultantDescription: 'QA and deployment',
        approvalStatus: ApprovalStatus.APPROVED,
        approvedBy: productManager.id, // Self-approved before phase started
        approvedAt: new Date(phase3.startDate.getTime() - 86400000)
      }
    });
    console.log(`      ❌ ${productManager.name} (PM): 60h - UNPLANNED\n`);

    // ============================================
    // STEP 7: Create weekly allocations (various states)
    // ============================================
    console.log('📅 Step 7: Creating weekly allocations (demonstrating different planning states)...\n');

    // Phase 1 - Week structure
    const phase1Weeks = [
      sprints[0].startDate,
      new Date(sprints[0].startDate.getTime() + 7 * 24 * 60 * 60 * 1000),
      sprints[1].startDate,
      new Date(sprints[1].startDate.getTime() + 7 * 24 * 60 * 60 * 1000)
    ];

    // Consultant 1: FULLY PLANNED (all 4 weeks)
    console.log('   ✅ Creating FULLY PLANNED weekly allocations (Phase 1, Consultant 1)...');
    for (let i = 0; i < 4; i++) {
      const weekEnd = new Date(phase1Weeks[i]);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      const { week, year } = getWeekNumber(phase1Weeks[i]);

      await prisma.weeklyAllocation.create({
        data: {
          phaseAllocationId: phase1Alloc1.id,
          consultantId: consultants[0].id,
          weekStartDate: phase1Weeks[i],
          weekEndDate: weekEnd,
          weekNumber: week,
          year: year,
          proposedHours: 15,
          approvedHours: 15,
          planningStatus: PlanningStatus.APPROVED,
          plannedBy: consultants[0].id,
          approvedBy: productManager.id,
          approvedAt: new Date(phase1Weeks[i].getTime() - 43200000)
        }
      });
    }
    console.log(`      ✅ 4/4 weeks planned (FULLY PLANNED)\n`);

    // Consultant 2: FULLY PLANNED (all 4 weeks)
    console.log('   ✅ Creating FULLY PLANNED weekly allocations (Phase 1, Consultant 2)...');
    for (let i = 0; i < 4; i++) {
      const weekEnd = new Date(phase1Weeks[i]);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      const { week, year } = getWeekNumber(phase1Weeks[i]);

      await prisma.weeklyAllocation.create({
        data: {
          phaseAllocationId: phase1Alloc2.id,
          consultantId: consultants[1].id,
          weekStartDate: phase1Weeks[i],
          weekEndDate: weekEnd,
          weekNumber: week,
          year: year,
          proposedHours: 15,
          approvedHours: 15,
          planningStatus: PlanningStatus.APPROVED,
          plannedBy: consultants[1].id,
          approvedBy: productManager.id,
          approvedAt: new Date(phase1Weeks[i].getTime() - 43200000)
        }
      });
    }
    console.log(`      ✅ 4/4 weeks planned (FULLY PLANNED)\n`);

    // Consultant 3 Phase 1: NO WEEKLY ALLOCATIONS (unplanned)
    console.log(`   ❌ Consultant 3 Phase 1: NO weekly allocations (UNPLANNED)\n`);

    // Phase 2 - Week structure
    const phase2Weeks = [
      sprints[2].startDate,
      new Date(sprints[2].startDate.getTime() + 7 * 24 * 60 * 60 * 1000),
      sprints[3].startDate,
      new Date(sprints[3].startDate.getTime() + 7 * 24 * 60 * 60 * 1000)
    ];

    // Consultant 1 Phase 2: PARTIALLY PLANNED (2/4 weeks)
    console.log('   ⚠️  Creating PARTIALLY PLANNED allocations (Phase 2, Consultant 1 - only 2/4 weeks)...');
    for (let i = 0; i < 2; i++) { // Only first 2 weeks
      const weekEnd = new Date(phase2Weeks[i]);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      const { week, year } = getWeekNumber(phase2Weeks[i]);

      await prisma.weeklyAllocation.create({
        data: {
          phaseAllocationId: phase2Alloc1.id,
          consultantId: consultants[0].id,
          weekStartDate: phase2Weeks[i],
          weekEndDate: weekEnd,
          weekNumber: week,
          year: year,
          proposedHours: 20,
          approvedHours: 20,
          planningStatus: PlanningStatus.APPROVED,
          plannedBy: consultants[0].id,
          approvedBy: productManager.id,
          approvedAt: new Date(phase2Weeks[i].getTime() - 43200000)
        }
      });
    }
    console.log(`      ⚠️  2/4 weeks planned (PARTIALLY PLANNED - 40h/80h allocated)\n`);

    // Consultant 2 Phase 2: PARTIALLY PLANNED (3/4 weeks)
    console.log('   ⚠️  Creating PARTIALLY PLANNED allocations (Phase 2, Consultant 2 - only 3/4 weeks)...');
    for (let i = 0; i < 3; i++) { // First 3 weeks
      const weekEnd = new Date(phase2Weeks[i]);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      const { week, year } = getWeekNumber(phase2Weeks[i]);

      await prisma.weeklyAllocation.create({
        data: {
          phaseAllocationId: phase2Alloc2.id,
          consultantId: consultants[1].id,
          weekStartDate: phase2Weeks[i],
          weekEndDate: weekEnd,
          weekNumber: week,
          year: year,
          proposedHours: 20,
          approvedHours: 20,
          planningStatus: PlanningStatus.APPROVED,
          plannedBy: consultants[1].id,
          approvedBy: productManager.id,
          approvedAt: new Date(phase2Weeks[i].getTime() - 43200000)
        }
      });
    }
    console.log(`      ⚠️  3/4 weeks planned (PARTIALLY PLANNED - 60h/80h allocated)\n`);

    // Consultant 3 Phase 2: UNPLANNED
    console.log(`   ❌ Consultant 3 Phase 2: NO weekly allocations (UNPLANNED)\n`);

    // Phase 3: ALL UNPLANNED (no weekly allocations created)
    console.log('   ❌ Phase 3: ALL allocations COMPLETELY UNPLANNED (expired + never planned)\n');

    // ============================================
    // SUMMARY
    // ============================================
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ SEED COMPLETED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('📊 WHAT WAS CREATED:');
    console.log('───────────────────────────────────────────────────────────────');
    console.log(`✅ Project: "${project.title}" (ALL EXPIRED)`);
    console.log(`   📅 ${projectStartDate.toLocaleDateString()} → ${projectEndDate.toLocaleDateString()}`);
    console.log(`   💰 Budget: ${project.budgetedHours}h`);
    console.log(`   👥 Team: 1 PM + 3 Consultants (ALL CONSULTANT role)\n`);

    console.log('✅ 6 Sprints (all expired)\n');

    console.log('✅ 3 Phases with DIFFERENT planning states:\n');

    console.log('   📌 PHASE 1 (Discovery) - 160h total:');
    console.log('      ✅ Consultant 1: 60h FULLY PLANNED (4/4 weeks)');
    console.log('      ✅ Consultant 2: 60h FULLY PLANNED (4/4 weeks)');
    console.log('      ❌ Consultant 3: 40h UNPLANNED (0/4 weeks)\n');

    console.log('   📌 PHASE 2 (Development) - 200h total:');
    console.log('      ⚠️  Consultant 1: 80h PARTIALLY PLANNED (2/4 weeks = 40h/80h)');
    console.log('      ⚠️  Consultant 2: 80h PARTIALLY PLANNED (3/4 weeks = 60h/80h)');
    console.log('      ❌ Consultant 3: 40h UNPLANNED (0/4 weeks)\n');

    console.log('   📌 PHASE 3 (Testing) - 120h total:');
    console.log('      ❌ Consultant 1: 60h UNPLANNED (0/4 weeks)');
    console.log('      ❌ PM (Ciaran): 60h UNPLANNED (0/4 weeks)');
    console.log('      ⚠️  ALL Phase 3 allocations are EXPIRED + UNPLANNED\n');

    console.log('🎯 DEMONSTRATION SCENARIOS:');
    console.log('───────────────────────────────────────────────────────────────');
    console.log('✅ FULLY PLANNED: Consultant completed all weekly planning');
    console.log('⚠️  PARTIALLY PLANNED: Consultant started but didn\'t finish planning');
    console.log('❌ UNPLANNED: Consultant never planned (especially Phase 3 - all expired!)');
    console.log('⏰ ALL dates are in the PAST (expired allocations)\n');

    console.log('🔍 HOW TO VIEW:');
    console.log('───────────────────────────────────────────────────────────────');
    console.log('1. Dashboard → Projects → "Legacy E-Commerce Platform Upgrade"');
    console.log('2. View Phase Allocations - notice approval status');
    console.log('3. Check Weekly Planning status for each consultant');
    console.log('4. Phase 3 shows the critical scenario: expired + unplanned!\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedExpiredProject()
  .then(() => {
    console.log('🎉 Seed completed!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed:', error);
    process.exit(1);
  });
