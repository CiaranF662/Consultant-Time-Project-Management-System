import {
  PrismaClient,
  UserRole,
  UserStatus,
  ApprovalStatus,
  PlanningStatus,
  ProjectRole,
  Phase,
  User,
  PhaseAllocation,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// =============================================
// ANCHOR DATE & DATE HELPERS
// =============================================
const DEMO_DATE = new Date(); // Use today as the anchor

const startOfThisWeek = new Date(DEMO_DATE);
startOfThisWeek.setDate(DEMO_DATE.getDate() - (DEMO_DATE.getDay() + 6) % 7); // Set to Monday
startOfThisWeek.setHours(0, 0, 0, 0);

const getWeekStart = (weeksFromNow: number): Date => {
  const date = new Date(startOfThisWeek);
  date.setDate(date.getDate() + weeksFromNow * 7);
  return date;
};

const getWeekEnd = (weeksFromNow: number): Date => {
  const date = getWeekStart(weeksFromNow);
  date.setDate(date.getDate() + 6);
  date.setHours(23, 59, 59, 999);
  return date;
};

// =============================================
// SEEDING HELPER FUNCTIONS
// =============================================

/**
 * Creates fully approved weekly allocations summing exactly to the phase allocation total.
 */
const createApprovedWeeklyAllocations = async (
  phaseAlloc: PhaseAllocation,
  startWeek: number,
  endWeek: number,
  planner: User,
  approver: User,
): Promise<void> => {
  const totalWeeks = endWeek - startWeek + 1;
  if (totalWeeks <= 0 || phaseAlloc.totalHours <= 0) {
    // console.log(`Skipping weekly allocation for PhaseAlloc ${phaseAlloc.id} - 0 weeks or 0 hours.`);
    return; // No weeks or no hours to allocate
  }

  const baseHoursPerWeek = Math.floor(phaseAlloc.totalHours / totalWeeks);
  let remainderHours = phaseAlloc.totalHours % totalWeeks;
  let allocatedSoFar = 0;

  // console.log(`Allocating ${phaseAlloc.totalHours}h over ${totalWeeks} weeks for PA ${phaseAlloc.id}. Base: ${baseHoursPerWeek}, Rem: ${remainderHours}`);

  for (let i = 0; i < totalWeeks; i++) {
    const currentWeekOffset = startWeek + i;
    const weekStart = getWeekStart(currentWeekOffset);
    const weekEnd = getWeekEnd(currentWeekOffset);

    let hoursThisWeek = baseHoursPerWeek;
    if (remainderHours > 0) {
      hoursThisWeek += 1;
      remainderHours -= 1;
    }

    if (allocatedSoFar + hoursThisWeek > phaseAlloc.totalHours) {
      hoursThisWeek = phaseAlloc.totalHours - allocatedSoFar; // Clamp to total
      // console.warn(`Clamping hours for week ${i+1} of PA ${phaseAlloc.id}`);
    }

    if (hoursThisWeek > 0) {
      await prisma.weeklyAllocation.create({
        data: {
          phaseAllocationId: phaseAlloc.id,
          consultantId: phaseAlloc.consultantId,
          weekStartDate: weekStart,
          weekEndDate: weekEnd,
          weekNumber: i + 1, // Week number within the phase allocation timeframe
          year: weekStart.getFullYear(),
          proposedHours: hoursThisWeek,
          approvedHours: hoursThisWeek,
          planningStatus: PlanningStatus.APPROVED,
          plannedBy: planner.id,
          approvedBy: approver.id,
          approvedAt: new Date(),
        },
      });
      allocatedSoFar += hoursThisWeek;
      // console.log(`  Week ${i+1} (${currentWeekOffset}): Allocated ${hoursThisWeek}h`);
    } else if (allocatedSoFar >= phaseAlloc.totalHours) {
        // console.log(`  All hours allocated for PA ${phaseAlloc.id}. Stopping.`);
        break; // Stop if all hours are allocated
    }
  }

   if (Math.abs(allocatedSoFar - phaseAlloc.totalHours) > 0.01) { // Use tolerance for float comparison
     console.error(`ERROR: Mismatch in weekly allocation for PhaseAlloc ${phaseAlloc.id}. Expected ${phaseAlloc.totalHours}, got ${allocatedSoFar}`);
   }
};


/**
 * Helper to create Sprints for a Phase, ensuring project-wide unique numbering.
 * (REVISED: Robustly finds the next available sprint number)
 */
const createSprintsForPhase = async (
  phase: Phase,
  startWeek: number,
  endWeek: number,
): Promise<void> => {
  const phaseDurationWeeks = endWeek - startWeek + 1;
  if (phaseDurationWeeks <= 0) return;

  let nextSprintNumber: number;

  // Special case for Sprint 0 in the Kickoff phase
  if (phase.name === "Project Kickoff") {
    // Check if Sprint 0 already exists for this project
    const sprint0Exists = await prisma.sprint.findUnique({
      where: { projectId_sprintNumber: { projectId: phase.projectId, sprintNumber: 0 } },
    });
    if (sprint0Exists) {
      console.warn(`Sprint 0 already exists for project ${phase.projectId}. Skipping creation for Kickoff phase.`);
      return; // Avoid creating duplicate Sprint 0
    }
    nextSprintNumber = 0;
  } else {
    // For all other phases, find the highest existing sprint number for the project
    const lastSprint = await prisma.sprint.findFirst({
      where: { projectId: phase.projectId },
      orderBy: { sprintNumber: 'desc' },
      select: { sprintNumber: true },
    });
    // If sprints exist (including 0), start from last + 1. Otherwise, start from 1.
    nextSprintNumber = lastSprint ? lastSprint.sprintNumber + 1 : 1;
  }

  // Calculate the number of sprints needed for this phase's duration
  const numSprints = Math.ceil(phaseDurationWeeks / 2); // 2 weeks per sprint normally

  for (let i = 0; i < numSprints; i++) {
    const currentSprintNumber = nextSprintNumber + i;
    const sprintStartOffset = startWeek + i * 2;
    const sprintEndOffset = startWeek + i * 2 + 1;

    const sprintStart = getWeekStart(sprintStartOffset);
    let sprintEnd = getWeekEnd(sprintEndOffset);

    // Ensure sprint end doesn't exceed phase end
    if (sprintEnd > phase.endDate) {
      sprintEnd = phase.endDate;
    }

    // Handle single-week phases creating a single 1-week sprint
    if (phaseDurationWeeks === 1 && numSprints === 1) {
      sprintEnd = getWeekEnd(startWeek); // End of the single week
       if (sprintEnd > phase.endDate) sprintEnd = phase.endDate;
    }

    // Double-check just before creation (paranoid check)
     const existingSprint = await prisma.sprint.findUnique({
        where: { projectId_sprintNumber: { projectId: phase.projectId, sprintNumber: currentSprintNumber } },
    });
    if(existingSprint) {
        console.warn(`Paranoid check failed: Sprint ${currentSprintNumber} somehow exists for project ${phase.projectId}. Skipping.`);
        // If it already exists, maybe increment nextSprintNumber for subsequent loops?
        // Or just log and continue, assuming the initial check should have caught this.
        continue;
    }


    try {
        await prisma.sprint.create({
          data: {
            sprintNumber: currentSprintNumber,
            startDate: sprintStart,
            endDate: sprintEnd,
            projectId: phase.projectId,
            phaseId: phase.id,
          },
        });
    } catch (error: any) {
        // Catch potential race conditions or other errors during creation
        if (error.code === 'P2002') { // Unique constraint violation
             console.warn(`Caught unique constraint violation for Sprint ${currentSprintNumber} on project ${phase.projectId} during create. Skipping.`);
        } else {
            console.error(`Error creating Sprint ${currentSprintNumber} for project ${phase.projectId}:`, error);
            throw error; // Re-throw unexpected errors
        }
    }
  }
};


/**
 * Creates the initial Kickoff Phase and Sprint 0 for a project.
 */
const createKickoffPhaseAndSprint0 = async (
    projectId: string,
    pm: User,
    leadConsultant: User | null, // Optional lead consultant
    startWeek: number,
    nalediGT: User,
): Promise<{ phase: Phase, pmAllocation: PhaseAllocation, leadAllocation: PhaseAllocation | null }> => {
    const kickoffPhase = await prisma.phase.create({
        data: {
            name: "Project Kickoff",
            projectId: projectId,
            startDate: getWeekStart(startWeek),
            endDate: getWeekEnd(startWeek), // 1 week duration
        }
    });

    // Create Sprint 0 linked to this phase
    await createSprintsForPhase(kickoffPhase, startWeek, startWeek); // ** FIXED: Removed 4th argument **

    // Allocate PM hours
    const pmKickoffAllocation = await prisma.phaseAllocation.create({
        data: {
            phaseId: kickoffPhase.id,
            consultantId: pm.id,
            totalHours: 8, // Example: 1 day for PM
            approvalStatus: ApprovalStatus.APPROVED,
            approvedBy: nalediGT.id,
            approvedAt: getWeekStart(startWeek),
        }
    });
    await createApprovedWeeklyAllocations(pmKickoffAllocation, startWeek, startWeek, pm, nalediGT);

    // Allocate Lead Consultant hours if provided
    let leadKickoffAllocation = null;
    if (leadConsultant) {
        leadKickoffAllocation = await prisma.phaseAllocation.create({
            data: {
                phaseId: kickoffPhase.id,
                consultantId: leadConsultant.id,
                totalHours: 4, // Example: Half day for Lead
                approvalStatus: ApprovalStatus.APPROVED,
                approvedBy: nalediGT.id,
                approvedAt: getWeekStart(startWeek),
            }
        });
        await createApprovedWeeklyAllocations(leadKickoffAllocation, startWeek, startWeek, pm, nalediGT);
    }

    return { phase: kickoffPhase, pmAllocation: pmKickoffAllocation, leadAllocation: leadKickoffAllocation };
};

/**
 * Calculates and updates the total allocatedHours for each consultant on a project.
 */
const updateProjectConsultantAllocatedHours = async (projectId: string): Promise<void> => {
    const allocations = await prisma.phaseAllocation.findMany({
        where: { phase: { projectId: projectId } },
        select: { consultantId: true, totalHours: true },
    });

    const consultantTotals: { [key: string]: number } = {};
    allocations.forEach(alloc => {
        consultantTotals[alloc.consultantId] = (consultantTotals[alloc.consultantId] || 0) + alloc.totalHours;
    });

    for (const consultantId in consultantTotals) {
        try {
            await prisma.consultantsOnProjects.update({
                where: { userId_projectId: { userId: consultantId, projectId: projectId } },
                data: { allocatedHours: consultantTotals[consultantId] },
            });
        } catch (error) {
            console.warn(`Could not update allocatedHours for consultant ${consultantId} on project ${projectId}. Maybe they are not assigned?`)
        }
    }
    // console.log(`Updated allocatedHours for consultants on project ${projectId}`);
};


// =============================================
// MAIN DEMO SEED FUNCTION
// =============================================
async function createDemoProjects(
  nalediGT: any,
  ciaranPM: any,
  luyandaC: any,
  shaanaC: any,
  extraConsultant1: any,
) {
  console.log('Seeding projects for demo storyline...');

  // =================================================================
  // Project 0: Internal Systems Maintenance (Background Work)
  // =================================================================
  console.log("Seeding 'Internal Systems Maintenance' (Project 0)...");

  const p0_startWeek = -8;
  const p0_kickoffWeek = p0_startWeek; // Starts immediately
  const p0_mainPhaseStartWeek = p0_kickoffWeek + 1; // Starts after kickoff
  const p0_mainPhaseEndWeek = 4;
  const p0_endWeek = p0_mainPhaseEndWeek; // Project ends when phase ends

  // Define hours BEFORE creating project to calculate budget
  const p0_kickoff_pm_hrs = 8;
  const p0_kickoff_luyanda_hrs = 4; // Luyanda as lead here
  const p0_main_shaana_hrs = 10;
  const p0_main_luyanda_hrs = 15;
  const p0_main_pm_hrs = 20;

  const p0_total_budget =
    p0_kickoff_pm_hrs + p0_kickoff_luyanda_hrs +
    p0_main_shaana_hrs + p0_main_luyanda_hrs + p0_main_pm_hrs; // 57 hours

  const project0 = await prisma.project.create({
    data: {
      title: 'Internal Systems Maintenance', // Realistic Name
      description:
        'Ongoing maintenance and support for internal company systems.',
      startDate: getWeekStart(p0_startWeek),
      endDate: getWeekEnd(p0_endWeek),
      budgetedHours: p0_total_budget,
      productManagerId: ciaranPM.id,
      consultants: {
        create: [
          { userId: luyandaC.id, role: ProjectRole.TEAM_MEMBER }, // Luyanda Lead
          { userId: shaanaC.id, role: ProjectRole.TEAM_MEMBER },
          { userId: extraConsultant1.id, role: ProjectRole.TEAM_MEMBER },
          { userId: ciaranPM.id, role: ProjectRole.PRODUCT_MANAGER },
        ],
      },
    },
  });

  // Create Kickoff Phase & Sprint 0
  await createKickoffPhaseAndSprint0(project0.id, ciaranPM, luyandaC, p0_kickoffWeek, nalediGT);

  // Create Main Maintenance Phase (P0 - Phase 1)
  const p0_phase1 = await prisma.phase.create({
    data: {
      name: 'Ongoing Maintenance Q4/25',
      projectId: project0.id,
      startDate: getWeekStart(p0_mainPhaseStartWeek),
      endDate: getWeekEnd(p0_mainPhaseEndWeek),
    },
  });
  // Sprints for main phase start from 1
  await createSprintsForPhase(p0_phase1, p0_mainPhaseStartWeek, p0_mainPhaseEndWeek); // ** FIXED: Removed 4th argument **

  // Shaana's Allocation (For Availability Check in Demo Part 1) -> 10h This Week (Week 0)
  const p0_ph1_alloc_shaana = await prisma.phaseAllocation.create({
    data: {
      phaseId: p0_phase1.id, consultantId: shaanaC.id, totalHours: p0_main_shaana_hrs,
      approvalStatus: ApprovalStatus.APPROVED, approvedBy: nalediGT.id, approvedAt: new Date(),
    },
  });
  await createApprovedWeeklyAllocations( p0_ph1_alloc_shaana, 0, 0, ciaranPM, nalediGT ); // 10h in Week 0

  // Luyanda's Allocation (For "Wow" Feature in Demo Part 3) -> 15h Next Week (Week 1)
  const p0_ph1_alloc_luyanda = await prisma.phaseAllocation.create({
    data: {
      phaseId: p0_phase1.id, consultantId: luyandaC.id, totalHours: p0_main_luyanda_hrs,
      approvalStatus: ApprovalStatus.APPROVED, approvedBy: nalediGT.id, approvedAt: new Date(),
    },
  });
   await createApprovedWeeklyAllocations( p0_ph1_alloc_luyanda, 1, 1, ciaranPM, nalediGT ); // 15h in Week 1

  // PM's Allocation (Ongoing)
  const p0_ph1_alloc_pm = await prisma.phaseAllocation.create({
    data: {
      phaseId: p0_phase1.id, consultantId: ciaranPM.id, totalHours: p0_main_pm_hrs,
      approvalStatus: ApprovalStatus.APPROVED, approvedBy: nalediGT.id, approvedAt: new Date(),
    },
  });
  // Distribute PM's 20 hours across Week 0 to Week 3
  await createApprovedWeeklyAllocations( p0_ph1_alloc_pm, 0, 3, ciaranPM, nalediGT ); // 5h/week for 4 weeks (Weeks 0, 1, 2, 3)

  // Update total allocated hours per consultant for Project 0
  await updateProjectConsultantAllocatedHours(project0.id);

  console.log(
    '✅ Project 0: Luyanda has 15h approved for NEXT WEEK ("Wow" feature)',
  );
  console.log(
    '✅ Project 0: Shaana has 10h approved for THIS WEEK (availability check)',
  );
  console.log(
    `✅ Project 0: Realistic budget set to ${p0_total_budget}h. Kickoff Phase & Sprint 0 created.`,
  );


  // =================================================================
  // Project 1: RetailCo E-commerce Platform Revamp (Past & Expired)
  // =================================================================
  console.log(
    "Seeding 'RetailCo E-commerce Platform Revamp' (Project 1)...",
  );

  const p1_startWeek = -12;
  const p1_kickoffWeek = p1_startWeek;
  const p1_phase1StartWeek = p1_kickoffWeek + 1; // -11
  const p1_phase1EndWeek = -7; // 5 weeks long
  const p1_phase2StartWeek = p1_phase1EndWeek + 1; // -6
  const p1_phase2EndWeek = -1; // Ends last week, 6 weeks long
  const p1_phase3StartWeek = p1_phase1EndWeek + 1; // -6 (Concurrent with Phase 2)
  const p1_phase3EndWeek = -1; // Ends last week
  const p1_endWeek = Math.max(p1_phase2EndWeek, p1_phase3EndWeek); // Ends when last phase ends (-1)

  // Define hours
  const p1_kickoff_pm_hrs = 8;
  const p1_kickoff_shaana_hrs = 4; // Shaana lead
  const p1_ph1_shaana_hrs = 100;
  const p1_ph1_pm_hrs = 40;
  const p1_ph2_shaana_hrs = 80; // Intentionally leaving 20 unplanned
  const p1_ph2_pm_hrs = 24; // Fully planned (6 weeks * 4h/w)
  const p1_ph3_luyanda_hrs = 50; // Intentionally leaving all unplanned
  const p1_ph3_pm_hrs = 10; // Intentionally leaving all unplanned

  const p1_total_budget =
    p1_kickoff_pm_hrs + p1_kickoff_shaana_hrs +
    p1_ph1_shaana_hrs + p1_ph1_pm_hrs +
    p1_ph2_shaana_hrs + p1_ph2_pm_hrs +
    p1_ph3_luyanda_hrs + p1_ph3_pm_hrs; // 316 hours

  const project1 = await prisma.project.create({
    data: {
      title: 'RetailCo E-commerce Platform Revamp', // Realistic Name
      description:
        'Complete overhaul of RetailCo\'s online store. Demonstrates completion and expired allocation handling.',
      startDate: getWeekStart(p1_startWeek),
      endDate: getWeekEnd(p1_endWeek),
      budgetedHours: p1_total_budget,
      productManagerId: ciaranPM.id,
      consultants: {
        create: [
          { userId: shaanaC.id, role: ProjectRole.TEAM_MEMBER }, // Shaana Lead
          { userId: luyandaC.id, role: ProjectRole.TEAM_MEMBER },
          { userId: ciaranPM.id, role: ProjectRole.PRODUCT_MANAGER },
        ],
      },
    },
  });

  // Create Kickoff Phase & Sprint 0
  await createKickoffPhaseAndSprint0(project1.id, ciaranPM, shaanaC, p1_kickoffWeek, nalediGT);

  // Phase 1 (Past/Completed - Green)
  const p1_phase1 = await prisma.phase.create({
    data: {
      name: 'Phase 1: Discovery & Design',
      projectId: project1.id,
      startDate: getWeekStart(p1_phase1StartWeek),
      endDate: getWeekEnd(p1_phase1EndWeek),
    },
  });
  await createSprintsForPhase(p1_phase1, p1_phase1StartWeek, p1_phase1EndWeek); // ** FIXED: Removed 4th argument **
  // Allocations (Fully Planned)
  const p1_ph1_alloc_shaana = await prisma.phaseAllocation.create({
    data: { phaseId: p1_phase1.id, consultantId: shaanaC.id, totalHours: p1_ph1_shaana_hrs, approvalStatus: ApprovalStatus.APPROVED, approvedBy: nalediGT.id, approvedAt: getWeekStart(p1_phase1StartWeek) },
  });
  await createApprovedWeeklyAllocations(p1_ph1_alloc_shaana, p1_phase1StartWeek, p1_phase1EndWeek, ciaranPM, nalediGT);
  const p1_ph1_alloc_pm = await prisma.phaseAllocation.create({
    data: { phaseId: p1_phase1.id, consultantId: ciaranPM.id, totalHours: p1_ph1_pm_hrs, approvalStatus: ApprovalStatus.APPROVED, approvedBy: nalediGT.id, approvedAt: getWeekStart(p1_phase1StartWeek) },
  });
  await createApprovedWeeklyAllocations(p1_ph1_alloc_pm, p1_phase1StartWeek, p1_phase1EndWeek, ciaranPM, nalediGT);

  // Phase 2 (Expired - Partial - Red)
  const p1_phase2 = await prisma.phase.create({
    data: {
      name: 'Phase 2: Frontend Development',
      projectId: project1.id,
      startDate: getWeekStart(p1_phase2StartWeek),
      endDate: getWeekEnd(p1_phase2EndWeek),
    },
  });
  await createSprintsForPhase(p1_phase2, p1_phase2StartWeek, p1_phase2EndWeek); // ** FIXED: Removed 4th argument **
  // Shaana Allocation (60 / 80 Planned)
  const p1_ph2_alloc_shaana = await prisma.phaseAllocation.create({
    data: { phaseId: p1_phase2.id, consultantId: shaanaC.id, totalHours: p1_ph2_shaana_hrs, approvalStatus: ApprovalStatus.APPROVED, approvedBy: nalediGT.id, approvedAt: getWeekStart(p1_phase2StartWeek) },
  });
  // Seed only 60 hours: Plan 20h/week for first 3 weeks (-6, -5, -4)
  await createApprovedWeeklyAllocations( { ...p1_ph2_alloc_shaana, totalHours: 60 }, p1_phase2StartWeek, p1_phase2StartWeek + 2, ciaranPM, nalediGT);
  console.log('✅ P1-Phase 2 (Shaana): 20 hours left unplanned (Expired Demo)');
  // PM Allocation (Fully Planned)
  const p1_ph2_alloc_pm = await prisma.phaseAllocation.create({
    data: { phaseId: p1_phase2.id, consultantId: ciaranPM.id, totalHours: p1_ph2_pm_hrs, approvalStatus: ApprovalStatus.APPROVED, approvedBy: nalediGT.id, approvedAt: getWeekStart(p1_phase2StartWeek) },
  });
  await createApprovedWeeklyAllocations(p1_ph2_alloc_pm, p1_phase2StartWeek, p1_phase2EndWeek, ciaranPM, nalediGT); // 4h/week for 6 weeks


  // Phase 3 (Expired - Unplanned - Red)
  const p1_phase3 = await prisma.phase.create({
    data: {
      name: 'Phase 3: Backend Integration',
      projectId: project1.id,
      startDate: getWeekStart(p1_phase3StartWeek),
      endDate: getWeekEnd(p1_phase3EndWeek),
    },
  });
  await createSprintsForPhase(p1_phase3, p1_phase3StartWeek, p1_phase3EndWeek); // ** FIXED: Removed 4th argument **
  // Luyanda Allocation (0 Planned)
  await prisma.phaseAllocation.create({
    data: { phaseId: p1_phase3.id, consultantId: luyandaC.id, totalHours: p1_ph3_luyanda_hrs, approvalStatus: ApprovalStatus.APPROVED, approvedBy: nalediGT.id, approvedAt: getWeekStart(p1_phase3StartWeek) },
  });
  console.log('✅ P1-Phase 3 (Luyanda): 50 hours left unplanned (Expired Demo)');
  // PM Allocation (0 Planned)
  await prisma.phaseAllocation.create({
    data: { phaseId: p1_phase3.id, consultantId: ciaranPM.id, totalHours: p1_ph3_pm_hrs, approvalStatus: ApprovalStatus.APPROVED, approvedBy: nalediGT.id, approvedAt: getWeekStart(p1_phase3StartWeek) },
  });
  console.log('✅ P1-Phase 3 (PM): 10 hours left unplanned (Expired Demo)');

  // Update total allocated hours per consultant for Project 1
  await updateProjectConsultantAllocatedHours(project1.id);
  console.log(
    `✅ Project 1 realistic budget set to ${p1_total_budget}h. Kickoff Phase & Sprint 0 created.`,
  );


  // =================================================================
  // Project 2: FinTech Mobile Banking App Dev (Active)
  // =================================================================
  console.log("Seeding 'FinTech Mobile Banking App Dev' (Project 2)...");

  const p2_startWeek = -3;
  const p2_kickoffWeek = p2_startWeek;
  const p2_phase1StartWeek = p2_kickoffWeek + 1; // -2
  const p2_phase1EndWeek = 2; // In progress, 5 weeks long
  const p2_phase2StartWeek = p2_kickoffWeek + 1; // -2 (Concurrent with Phase 1)
  const p2_phase2EndWeek = 3; // Ends later, 6 weeks long
  const p2_endWeek = Math.max(p2_phase1EndWeek, p2_phase2EndWeek); // Ends at week 3

  // Define hours
  const p2_kickoff_pm_hrs = 8;
  const p2_kickoff_shaana_hrs = 4; // Shaana lead
  const p2_ph1_shaana_hrs = 100;
  const p2_ph1_pm_hrs = 40;
  const p2_ph2_shaana_hrs = 50; // Needs Planning
  const p2_ph2_pm_hrs = 20; // Needs Planning

  const p2_total_budget =
    p2_kickoff_pm_hrs + p2_kickoff_shaana_hrs +
    p2_ph1_shaana_hrs + p2_ph1_pm_hrs +
    p2_ph2_shaana_hrs + p2_ph2_pm_hrs; // 222 hours

  const project2 = await prisma.project.create({
    data: {
      title: 'FinTech Mobile Banking App Dev', // Realistic Name
      description:
        'Development of native iOS and Android banking app. Demonstrates "In Progress" and "Needs Planning".',
      startDate: getWeekStart(p2_startWeek),
      endDate: getWeekEnd(p2_endWeek),
      budgetedHours: p2_total_budget,
      productManagerId: ciaranPM.id,
      consultants: {
        create: [
          { userId: shaanaC.id, role: ProjectRole.TEAM_MEMBER }, // Shaana Lead
          { userId: ciaranPM.id, role: ProjectRole.PRODUCT_MANAGER },
        ],
      },
    },
  });

  // Create Kickoff Phase & Sprint 0
  await createKickoffPhaseAndSprint0(project2.id, ciaranPM, shaanaC, p2_kickoffWeek, nalediGT);

  // Phase 1 (In Progress - Blue)
  const p2_phase1 = await prisma.phase.create({
    data: {
      name: 'Phase 1: Core Features Implementation',
      projectId: project2.id,
      startDate: getWeekStart(p2_phase1StartWeek),
      endDate: getWeekEnd(p2_phase1EndWeek),
    },
  });
  await createSprintsForPhase(p2_phase1, p2_phase1StartWeek, p2_phase1EndWeek); // ** FIXED: Removed 4th argument **
  // Allocations (Fully Planned)
  const p2_ph1_alloc_shaana = await prisma.phaseAllocation.create({
    data: { phaseId: p2_phase1.id, consultantId: shaanaC.id, totalHours: p2_ph1_shaana_hrs, approvalStatus: ApprovalStatus.APPROVED, approvedBy: nalediGT.id, approvedAt: getWeekStart(p2_phase1StartWeek) },
  });
  await createApprovedWeeklyAllocations(p2_ph1_alloc_shaana, p2_phase1StartWeek, p2_phase1EndWeek, ciaranPM, nalediGT); // 20h/w for 5 weeks
  const p2_ph1_alloc_pm = await prisma.phaseAllocation.create({
    data: { phaseId: p2_phase1.id, consultantId: ciaranPM.id, totalHours: p2_ph1_pm_hrs, approvalStatus: ApprovalStatus.APPROVED, approvedBy: nalediGT.id, approvedAt: getWeekStart(p2_phase1StartWeek) },
  });
  await createApprovedWeeklyAllocations(p2_ph1_alloc_pm, p2_phase1StartWeek, p2_phase1EndWeek, ciaranPM, nalediGT); // 8h/w for 5 weeks
  console.log('✅ P2-Phase 1: Seeded for "In Progress" (Blue) demo');

  // Phase 2 (Needs Planning - Red)
  const p2_phase2 = await prisma.phase.create({
    data: {
      name: 'Phase 2: Security & Testing',
      projectId: project2.id,
      startDate: getWeekStart(p2_phase2StartWeek),
      endDate: getWeekEnd(p2_phase2EndWeek),
    },
  });
  await createSprintsForPhase(p2_phase2, p2_phase2StartWeek, p2_phase2EndWeek); // ** FIXED: Removed 4th argument **
  // Allocations (0 Planned)
  await prisma.phaseAllocation.create({
    data: { phaseId: p2_phase2.id, consultantId: shaanaC.id, totalHours: p2_ph2_shaana_hrs, approvalStatus: ApprovalStatus.APPROVED, approvedBy: nalediGT.id, approvedAt: getWeekStart(p2_phase2StartWeek) },
  });
  await prisma.phaseAllocation.create({
    data: { phaseId: p2_phase2.id, consultantId: ciaranPM.id, totalHours: p2_ph2_pm_hrs, approvalStatus: ApprovalStatus.APPROVED, approvedBy: nalediGT.id, approvedAt: getWeekStart(p2_phase2StartWeek) },
  });
  console.log('✅ P2-Phase 2: Seeded for "Needs Planning" (Red) demo');

  // Update total allocated hours per consultant for Project 2
  await updateProjectConsultantAllocatedHours(project2.id);
  console.log(
    `✅ Project 2 realistic budget set to ${p2_total_budget}h. Kickoff Phase & Sprint 0 created.`,
  );


  // =================================================================
  // Project 3: Enterprise Data Analytics Dashboard (Future)
  // =================================================================
  console.log(
    "Seeding 'Enterprise Data Analytics Dashboard' (Project 3)...",
  );

  const p3_startWeek = 2;
  const p3_kickoffWeek = p3_startWeek;
  const p3_phase1StartWeek = p3_kickoffWeek + 1; // Starts week 3
  const p3_phase1EndWeek = 10; // 8 weeks long
  const p3_endWeek = p3_phase1EndWeek;

  // Define hours
  const p3_kickoff_pm_hrs = 8;
  const p3_kickoff_luyanda_hrs = 4; // Luyanda lead
  const p3_ph1_luyanda_hrs = 180; // Pending
  const p3_ph1_shaana_hrs = 100; // Pending (for rejection demo)
  const p3_ph1_pm_hrs = 60; // Pending

  const p3_total_budget =
    p3_kickoff_pm_hrs + p3_kickoff_luyanda_hrs +
    p3_ph1_luyanda_hrs + p3_ph1_shaana_hrs + p3_ph1_pm_hrs; // 352 hours

  const project3 = await prisma.project.create({
    data: {
      title: 'Enterprise Data Analytics Dashboard', // Realistic Name
      description:
        'Build a real-time analytics dashboard. Demonstrates pending allocations.',
      startDate: getWeekStart(p3_startWeek),
      endDate: getWeekEnd(p3_endWeek),
      budgetedHours: p3_total_budget,
      productManagerId: ciaranPM.id,
      consultants: {
        create: [
          { userId: luyandaC.id, role: ProjectRole.TEAM_MEMBER }, // Luyanda Lead
          { userId: shaanaC.id, role: ProjectRole.TEAM_MEMBER },
          { userId: ciaranPM.id, role: ProjectRole.PRODUCT_MANAGER },
        ],
      },
    },
  });

  // Create Kickoff Phase & Sprint 0 (Future - Needs Planning)
  // Allocations are approved but not planned weekly yet.
   const kickoffResultP3 = await createKickoffPhaseAndSprint0(project3.id, ciaranPM, luyandaC, p3_kickoffWeek, nalediGT);
   // Delete the auto-created weekly plans as it's future
    await prisma.weeklyAllocation.deleteMany({ where: { phaseAllocationId: kickoffResultP3.pmAllocation.id }});
    if(kickoffResultP3.leadAllocation) {
        await prisma.weeklyAllocation.deleteMany({ where: { phaseAllocationId: kickoffResultP3.leadAllocation.id }});
    }

  // Phase 1 (Future - Pending Allocations - Yellow)
  const p3_phase1 = await prisma.phase.create({
    data: {
      name: 'Phase 1: Data Infrastructure & Pipeline',
      projectId: project3.id,
      startDate: getWeekStart(p3_phase1StartWeek),
      endDate: getWeekEnd(p3_phase1EndWeek),
    },
  });
  await createSprintsForPhase(p3_phase1, p3_phase1StartWeek, p3_phase1EndWeek); // ** FIXED: Removed 4th argument **
  // Luyanda's Allocation (Pending - for Shaana's Dashboard)
  await prisma.phaseAllocation.create({
    data: { phaseId: p3_phase1.id, consultantId: luyandaC.id, totalHours: p3_ph1_luyanda_hrs, approvalStatus: ApprovalStatus.PENDING },
  });
  // Shaana's Allocation (Pending - for Naledi's Rejection Demo)
  await prisma.phaseAllocation.create({
    data: { phaseId: p3_phase1.id, consultantId: shaanaC.id, totalHours: p3_ph1_shaana_hrs, approvalStatus: ApprovalStatus.PENDING },
  });
  // PM's Allocation (Pending)
  await prisma.phaseAllocation.create({
    data: { phaseId: p3_phase1.id, consultantId: ciaranPM.id, totalHours: p3_ph1_pm_hrs, approvalStatus: ApprovalStatus.PENDING },
  });

  console.log(
    '✅ P3-Phase 1: Seeded 3 PENDING allocations (Luyanda, Shaana, PM).',
  );

  // Update total allocated hours per consultant for Project 3
  await updateProjectConsultantAllocatedHours(project3.id);
  console.log(
    `✅ Project 3 realistic budget set to ${p3_total_budget}h. Kickoff Phase & Sprint 0 created.`,
  );

  console.log('\n✅✅✅ Demo project seeding complete! ✅✅✅');
  console.log('==================================================');
  console.log('REMINDER: Run the expired allocations cron job before demo:');
  console.log('POST to /api/cron/detect-expired-allocations');
  console.log('==================================================');
}

// =============================================
// MAIN SEED SCRIPT EXECUTION
// =============================================
async function main() {
  console.log('🚀 Starting database seed...');
  const consultantPassword = await bcrypt.hash('Consultant123#', 12);
  const pmPassword = await bcrypt.hash('PM123#', 12);
  const gtPassword = await bcrypt.hash('GrowthTeam123#', 12);

  // =============================================
  // 1. CREATE/UPSERT DEMO PERSONAS
  // =============================================
  console.log('👤 Creating/updating demo personas...');

  const nalediGT = await prisma.user.upsert({
    where: { email: 'naleditshapi04@gmail.com' },
    update: { name: 'Naledi (Growth Team)', role: UserRole.GROWTH_TEAM, status: UserStatus.APPROVED },
    create: { email: 'naleditshapi04@gmail.com', name: 'Naledi (Growth Team)', password: gtPassword, role: UserRole.GROWTH_TEAM, status: UserStatus.APPROVED },
  });

  const ciaranGT = await prisma.user.upsert({
    where: { email: 'ciaranformby@outlook.com' },
    update: { name: 'Ciaran (Growth Team)', role: UserRole.GROWTH_TEAM, status: UserStatus.APPROVED },
    create: { email: 'ciaranformby@outlook.com', name: 'Ciaran (Growth Team)', password: gtPassword, role: UserRole.GROWTH_TEAM, status: UserStatus.APPROVED },
  });

  const ciaranPM = await prisma.user.upsert({
    where: { email: 'ciaranformby@gmail.com' },
    update: { name: 'Ciaran (PM)', role: UserRole.CONSULTANT, status: UserStatus.APPROVED },
    create: { email: 'ciaranformby@gmail.com', name: 'Ciaran (PM)', password: pmPassword, role: UserRole.CONSULTANT, status: UserStatus.APPROVED },
  });

  const luyandaC = await prisma.user.upsert({
    where: { email: 'ndlluy021@myuct.ac.za' },
    update: { name: 'Luyanda (Consultant)', role: UserRole.CONSULTANT, status: UserStatus.APPROVED },
    create: { email: 'ndlluy021@myuct.ac.za', name: 'Luyanda (Consultant)', password: consultantPassword, role: UserRole.CONSULTANT, status: UserStatus.APPROVED },
  });

  const shaanaC = await prisma.user.upsert({
    where: { email: 'shaanandzenge@gmail.com' },
    update: { name: 'Shaana (Consultant)', role: UserRole.CONSULTANT, status: UserStatus.APPROVED },
    create: { email: 'shaanandzenge@gmail.com', name: 'Shaana (Consultant)', password: consultantPassword, role: UserRole.CONSULTANT, status: UserStatus.APPROVED },
  });

  const extraConsultant1 = await prisma.user.upsert({
    where: { email: 'frmcia001@myuct.ac.za' },
    update: { name: 'Ciaran Formby (UCT)', role: UserRole.CONSULTANT, status: UserStatus.APPROVED },
    create: { email: 'frmcia001@myuct.ac.za', name: 'Ciaran Formby (UCT)', password: consultantPassword, role: UserRole.CONSULTANT, status: UserStatus.APPROVED },
  });

  const extraConsultant2 = await prisma.user.upsert({
    where: { email: 'ndlovuluyanda@icloud.com' },
    update: { name: 'Luyanda Ndlovu (iCloud)', role: UserRole.CONSULTANT, status: UserStatus.APPROVED },
    create: { email: 'ndlovuluyanda@icloud.com', name: 'Luyanda Ndlovu (iCloud)', password: consultantPassword, role: UserRole.CONSULTANT, status: UserStatus.APPROVED },
  });

  console.log('✅ Personas created/updated.');

  // =============================================
  // 2. CLEANUP OLD DATA
  // =============================================
  console.log('🧹 Cleaning up old project data...');
  // Delete dependent records first
  await prisma.notification.deleteMany({});
  await prisma.weeklyAllocation.deleteMany({});
  await prisma.unplannedExpiredHours.deleteMany({});
  await prisma.hourChangeRequest.deleteMany({});
  await prisma.phaseAllocation.deleteMany({});
  await prisma.sprint.deleteMany({});
  await prisma.phase.deleteMany({});
  await prisma.consultantsOnProjects.deleteMany({});
  await prisma.project.deleteMany({});

  // Clean up any non-demo users (optional, good for clean slate)
  const demoUserEmails = [
    nalediGT.email, ciaranGT.email, ciaranPM.email, luyandaC.email,
    shaanaC.email, extraConsultant1.email, extraConsultant2.email,
  ].filter((email): email is string => !!email);

  await prisma.user.deleteMany({
    where: { email: { notIn: demoUserEmails } },
  });

  console.log('🧹 Cleanup complete.');

  // =============================================
  // 3. SEED DEMO PROJECTS
  // =============================================
  await createDemoProjects(
    nalediGT, ciaranPM, luyandaC, shaanaC, extraConsultant1,
  );

  // =============================================
  // 4. PRINT LOGIN CREDENTIALS
  // =============================================
  console.log('\n🎉🎉🎉 Seed complete! 🎉🎉🎉');
  console.log('\nYour demo logins:');
  console.log('=====================================');
  console.log(`Naledi (Growth Team): ${nalediGT.email} / GrowthTeam123#`);
  console.log(`Ciaran (Growth Team): ${ciaranGT.email} / GrowthTeam123#`);
  console.log(`Ciaran (PM):          ${ciaranPM.email} / PM123#`);
  console.log(`Luyanda (Consultant): ${luyandaC.email} / Consultant123#`);
  console.log(`Shaana (Consultant):  ${shaanaC.email} / Consultant123#`);
  console.log('\nOther seeded users (password: Consultant123#):');
  console.log(`- ${extraConsultant1.email} (Ciaran Formby UCT)`);
  console.log(`- ${extraConsultant2.email} (Luyanda Ndlovu iCloud)`);
  console.log('=====================================');
}

// =============================================
// RUN MAIN FUNCTION
// =============================================
main()
  .catch((e) => {
    console.error('SEED SCRIPT FAILED:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });