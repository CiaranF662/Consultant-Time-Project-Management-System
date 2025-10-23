import { PrismaClient, UserRole, UserStatus, ApprovalStatus, PlanningStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createDemoProjects(pmUser: any, realPmUser: any, consultants: any[]) {
  const now = new Date();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
  startOfThisWeek.setHours(0, 0, 0, 0);

  // Helper function to get week start date
  const getWeekStart = (weeksFromNow: number) => {
    const date = new Date(startOfThisWeek);
    date.setDate(date.getDate() + (weeksFromNow * 7));
    return date;
  };

  // Helper function to get week end date
  const getWeekEnd = (weeksFromNow: number) => {
    const date = getWeekStart(weeksFromNow);
    date.setDate(date.getDate() + 6);
    date.setHours(23, 59, 59, 999);
    return date;
  };

  // Project 1: E-Commerce Platform (Current - High activity)
  const project1 = await prisma.project.create({
    data: {
      title: 'E-Commerce Platform Redesign',
      description: 'Complete overhaul of the existing e-commerce platform with modern UI/UX and enhanced functionality',
      startDate: getWeekStart(-2),
      endDate: getWeekEnd(8),
      budgetedHours: 1200,
      productManagerId: pmUser.id,
      consultants: {
        create: [
          { userId: consultants[0].id }, // Alice Smith
          { userId: consultants[1].id }, // Bob Consultant
          { userId: consultants[2].id }, // Carol Developer
          { userId: pmUser.id } // John PM
        ]
      }
    }
  });

  // Project 2: Mobile App Development (Current - Medium activity)
  const project2 = await prisma.project.create({
    data: {
      title: 'Mobile Banking App',
      description: 'Native iOS and Android banking application with advanced security features',
      startDate: getWeekStart(-1),
      endDate: getWeekEnd(12),
      budgetedHours: 1600,
      productManagerId: realPmUser.id,
      consultants: {
        create: [
          { userId: consultants[2].id }, // Carol Developer
          { userId: consultants[3].id }, // Dave Designer
          { userId: consultants[4].id }, // Ron Consultant
          { userId: realPmUser.id } // Ciaran PM
        ]
      }
    }
  });

  // Project 3: Data Analytics Dashboard (Upcoming)
  const project3 = await prisma.project.create({
    data: {
      title: 'Enterprise Analytics Dashboard',
      description: 'Real-time analytics dashboard for enterprise clients with advanced reporting capabilities',
      startDate: getWeekStart(2),
      endDate: getWeekEnd(16),
      budgetedHours: 800,
      productManagerId: pmUser.id,
      consultants: {
        create: [
          { userId: consultants[0].id }, // Alice Smith
          { userId: consultants[3].id }, // Dave Designer
          { userId: consultants[4].id }, // Ron Consultant
        ]
      }
    }
  });

  // Create sprints for each project
  const sprints1 = [];
  const sprints2 = [];
  const sprints3 = [];

  // Project 1 sprints (11 sprints total, 2-week each)
  for (let i = 0; i < 11; i++) {
    const sprint = await prisma.sprint.create({
      data: {
        sprintNumber: i + 1,
        startDate: getWeekStart(-2 + (i * 2)),
        endDate: getWeekEnd(-2 + (i * 2) + 1),
        projectId: project1.id
      }
    });
    sprints1.push(sprint);
  }

  // Project 2 sprints (13 sprints total)
  for (let i = 0; i < 13; i++) {
    const sprint = await prisma.sprint.create({
      data: {
        sprintNumber: i + 1,
        startDate: getWeekStart(-1 + (i * 2)),
        endDate: getWeekEnd(-1 + (i * 2) + 1),
        projectId: project2.id
      }
    });
    sprints2.push(sprint);
  }

  // Project 3 sprints (14 sprints total)
  for (let i = 0; i < 14; i++) {
    const sprint = await prisma.sprint.create({
      data: {
        sprintNumber: i + 1,
        startDate: getWeekStart(2 + (i * 2)),
        endDate: getWeekEnd(2 + (i * 2) + 1),
        projectId: project3.id
      }
    });
    sprints3.push(sprint);
  }

  // Create phases for Project 1
  const phase1_1 = await prisma.phase.create({
    data: {
      name: 'Discovery & Planning',
      projectId: project1.id,
      startDate: sprints1[0].startDate,
      endDate: sprints1[1].endDate
    }
  });

  // Connect sprints to phase
  await prisma.sprint.updateMany({
    where: { id: { in: [sprints1[0].id, sprints1[1].id] } },
    data: { phaseId: phase1_1.id }
  });

  const phase1_2 = await prisma.phase.create({
    data: {
      name: 'Frontend Development',
      projectId: project1.id,
      startDate: sprints1[2].startDate,
      endDate: sprints1[4].endDate
    }
  });

  await prisma.sprint.updateMany({
    where: { id: { in: [sprints1[2].id, sprints1[3].id, sprints1[4].id] } },
    data: { phaseId: phase1_2.id }
  });

  const phase1_3 = await prisma.phase.create({
    data: {
      name: 'Backend Integration',
      projectId: project1.id,
      startDate: sprints1[4].startDate,
      endDate: sprints1[6].endDate
    }
  });

  await prisma.sprint.updateMany({
    where: { id: { in: [sprints1[4].id, sprints1[5].id, sprints1[6].id] } },
    data: { phaseId: phase1_3.id }
  });

  const phase1_4 = await prisma.phase.create({
    data: {
      name: 'Testing & Deployment',
      projectId: project1.id,
      startDate: sprints1[7].startDate,
      endDate: sprints1[8].endDate
    }
  });

  await prisma.sprint.updateMany({
    where: { id: { in: [sprints1[7].id, sprints1[8].id] } },
    data: { phaseId: phase1_4.id }
  });

  // Create phases for Project 2
  const phase2_1 = await prisma.phase.create({
    data: {
      name: 'Architecture & Setup',
      projectId: project2.id,
      startDate: sprints2[0].startDate,
      endDate: sprints2[1].endDate
    }
  });

  await prisma.sprint.updateMany({
    where: { id: { in: [sprints2[0].id, sprints2[1].id] } },
    data: { phaseId: phase2_1.id }
  });

  const phase2_2 = await prisma.phase.create({
    data: {
      name: 'Core Features',
      projectId: project2.id,
      startDate: sprints2[2].startDate,
      endDate: sprints2[5].endDate
    }
  });

  await prisma.sprint.updateMany({
    where: { id: { in: [sprints2[2].id, sprints2[3].id, sprints2[4].id, sprints2[5].id] } },
    data: { phaseId: phase2_2.id }
  });

  const phase2_3 = await prisma.phase.create({
    data: {
      name: 'Security Implementation',
      projectId: project2.id,
      startDate: sprints2[6].startDate,
      endDate: sprints2[7].endDate
    }
  });

  await prisma.sprint.updateMany({
    where: { id: { in: [sprints2[6].id, sprints2[7].id] } },
    data: { phaseId: phase2_3.id }
  });

  // Create phases for Project 3
  const phase3_1 = await prisma.phase.create({
    data: {
      name: 'Data Infrastructure',
      projectId: project3.id,
      startDate: sprints3[0].startDate,
      endDate: sprints3[2].endDate
    }
  });

  await prisma.sprint.updateMany({
    where: { id: { in: [sprints3[0].id, sprints3[1].id, sprints3[2].id] } },
    data: { phaseId: phase3_1.id }
  });

  // Create Phase Allocations with realistic hour distributions
  const allocations = [
    // Project 1 Phase Allocations
    { phaseId: phase1_1.id, consultantId: consultants[0].id, totalHours: 60, approvalStatus: ApprovalStatus.APPROVED }, // Alice - Discovery
    { phaseId: phase1_1.id, consultantId: pmUser.id, totalHours: 40, approvalStatus: ApprovalStatus.APPROVED }, // John PM - Discovery

    { phaseId: phase1_2.id, consultantId: consultants[0].id, totalHours: 120, approvalStatus: ApprovalStatus.APPROVED }, // Alice - Frontend
    { phaseId: phase1_2.id, consultantId: consultants[1].id, totalHours: 100, approvalStatus: ApprovalStatus.APPROVED }, // Bob - Frontend
    { phaseId: phase1_2.id, consultantId: consultants[2].id, totalHours: 80, approvalStatus: ApprovalStatus.APPROVED }, // Carol - Frontend

    { phaseId: phase1_3.id, consultantId: consultants[1].id, totalHours: 100, approvalStatus: ApprovalStatus.APPROVED }, // Bob - Backend
    { phaseId: phase1_3.id, consultantId: consultants[2].id, totalHours: 120, approvalStatus: ApprovalStatus.APPROVED }, // Carol - Backend

    { phaseId: phase1_4.id, consultantId: consultants[0].id, totalHours: 80, approvalStatus: ApprovalStatus.APPROVED }, // Alice - Testing
    { phaseId: phase1_4.id, consultantId: consultants[1].id, totalHours: 60, approvalStatus: ApprovalStatus.APPROVED }, // Bob - Testing

    // Project 2 Phase Allocations
    { phaseId: phase2_1.id, consultantId: consultants[2].id, totalHours: 80, approvalStatus: ApprovalStatus.APPROVED }, // Carol - Architecture
    { phaseId: phase2_1.id, consultantId: realPmUser.id, totalHours: 40, approvalStatus: ApprovalStatus.APPROVED }, // Ciaran PM - Architecture

    { phaseId: phase2_2.id, consultantId: consultants[2].id, totalHours: 160, approvalStatus: ApprovalStatus.APPROVED }, // Carol - Core Features
    { phaseId: phase2_2.id, consultantId: consultants[3].id, totalHours: 120, approvalStatus: ApprovalStatus.APPROVED }, // Dave - Core Features
    { phaseId: phase2_2.id, consultantId: consultants[4].id, totalHours: 140, approvalStatus: ApprovalStatus.APPROVED }, // Ron - Core Features

    { phaseId: phase2_3.id, consultantId: consultants[2].id, totalHours: 80, approvalStatus: ApprovalStatus.APPROVED }, // Carol - Security
    { phaseId: phase2_3.id, consultantId: consultants[4].id, totalHours: 60, approvalStatus: ApprovalStatus.APPROVED }, // Ron - Security

    // Project 3 Phase Allocations (Future)
    { phaseId: phase3_1.id, consultantId: consultants[0].id, totalHours: 100, approvalStatus: ApprovalStatus.PENDING }, // Alice - Data Infrastructure
    { phaseId: phase3_1.id, consultantId: consultants[3].id, totalHours: 80, approvalStatus: ApprovalStatus.PENDING }, // Dave - Data Infrastructure
  ];

  // Create phase allocations and weekly allocations
  for (const allocation of allocations) {
    const phaseAllocation = await prisma.phaseAllocation.create({
      data: allocation
    });

    // Create weekly allocations for approved allocations
    if (allocation.approvalStatus === ApprovalStatus.APPROVED) {
      // Get the phase details to determine sprint weeks
      const phase = await prisma.phase.findUnique({
        where: { id: allocation.phaseId },
        include: { sprints: { orderBy: { startDate: 'asc' } } }
      });

      if (phase && phase.sprints.length > 0) {
        const totalWeeks = phase.sprints.length * 2; // 2 weeks per sprint
        const hoursPerWeek = Math.floor(allocation.totalHours / totalWeeks);
        const remainderHours = allocation.totalHours % totalWeeks;

        // Distribute hours across weeks
        for (let week = 0; week < totalWeeks; week++) {
          const weekStartDate = getWeekStart(-2 + week); // Adjust based on actual project start
          const weekEndDate = getWeekEnd(-2 + week);
          const adjustedHours = week < remainderHours ? hoursPerWeek + 1 : hoursPerWeek;

          if (adjustedHours > 0) {
            await prisma.weeklyAllocation.create({
              data: {
                phaseAllocationId: phaseAllocation.id,
                consultantId: allocation.consultantId,
                weekNumber: week + 1,
                year: weekStartDate.getFullYear(),
                proposedHours: adjustedHours,
                approvedHours: adjustedHours,
                weekStartDate: weekStartDate,
                weekEndDate: weekEndDate,
                planningStatus: PlanningStatus.APPROVED
              }
            });
          }
        }
      }
    }
  }

  console.log('✅ Demo projects with comprehensive allocations created successfully!');
  console.log('📊 Created 3 projects with phases, sprints, and realistic weekly allocations');
  console.log('👥 All consultants have been allocated across multiple projects');
  console.log('📈 Resource allocation table will now show rich, realistic data');
}

async function main() {
  // Create or find Growth Team user
  const growthTeamPassword = await bcrypt.hash('GrowthTeam123#', 12);
  const growthUser = await prisma.user.upsert({
    where: { email: 'ciaranformby@outlook.com' },
    update: {},
    create: {
      email: 'ciaranformby@outlook.com',
      name: 'Growth Team Admin',
      password: growthTeamPassword,
      role: UserRole.GROWTH_TEAM,
      status: UserStatus.APPROVED,
    },
  });

  // Create or find Product Manager (as a consultant with PM privileges)
  const pmPassword = await bcrypt.hash('PM123#', 12);
  const pmUser = await prisma.user.upsert({
    where: { email: 'pm@example.com' },
    update: {},
    create: {
      email: 'pm@example.com',
      name: 'John PM',
      password: pmPassword,
      role: UserRole.CONSULTANT, // PMs are consultants with special project role
      status: UserStatus.APPROVED,
    },
  });

  // Create or find Consultants
  const consultantPassword = await bcrypt.hash('Consultant123#', 12);
  const consultant1 = await prisma.user.upsert({
    where: { email: 'consultant1@example.com' },
    update: {},
    create: {
      email: 'consultant1@example.com',
      name: 'Alice Smith',
      password: consultantPassword,
      role: UserRole.CONSULTANT,
      status: UserStatus.APPROVED,
    },
  });

  const consultant2 = await prisma.user.upsert({
    where: { email: 'consultant2@example.com' },
    update: {},
    create: {
      email: 'consultant2@example.com',
      name: 'Bob Consultant',
      password: consultantPassword,
      role: UserRole.CONSULTANT,
      status: UserStatus.APPROVED,
    },
  });

  const consultant3 = await prisma.user.upsert({
    where: { email: 'consultant3@example.com' },
    update: {},
    create: {
      email: 'consultant3@example.com',
      name: 'Carol Developer',
      password: consultantPassword,
      role: UserRole.CONSULTANT,
      status: UserStatus.APPROVED,
    },
  });

  const consultant4 = await prisma.user.upsert({
    where: { email: 'consultant4@example.com' },
    update: {},
    create: {
      email: 'consultant4@example.com',
      name: 'Dave Designer',
      password: consultantPassword,
      role: UserRole.CONSULTANT,
      status: UserStatus.APPROVED,
    },
  });

  // Additional real email users for testing
  const realPmPassword = await bcrypt.hash('PM123#', 12);
  const realPmUser = await prisma.user.upsert({
    where: { email: 'ciaranformby@gmail.com' },
    update: {},
    create: {
      email: 'ciaranformby@gmail.com',
      name: 'Ciaran PM',
      password: realPmPassword,
      role: UserRole.CONSULTANT,
      status: UserStatus.APPROVED,
    },
  });

  const realConsultantPassword = await bcrypt.hash('Consultant123#', 12);
  const realConsultantUser = await prisma.user.upsert({
    where: { email: 'ronformby@gmail.com' },
    update: {},
    create: {
      email: 'ronformby@gmail.com',
      name: 'Ron Consultant',
      password: realConsultantPassword,
      role: UserRole.CONSULTANT,
      status: UserStatus.APPROVED,
    },
  });

  // Clean up existing project data first
  console.log('🧹 Cleaning up existing project data...');
  await prisma.weeklyAllocation.deleteMany({});
  await prisma.phaseAllocation.deleteMany({});
  await prisma.sprint.deleteMany({});
  await prisma.phase.deleteMany({});
  await prisma.consultantsOnProjects.deleteMany({});
  await prisma.project.deleteMany({});

  // Create comprehensive demo projects with allocations
  await createDemoProjects(pmUser, realPmUser, [consultant1, consultant2, consultant3, consultant4, realConsultantUser]);

  console.log('User seed data created successfully!');
  console.log('\nLogin credentials:');
  console.log('=====================================');
  console.log('Growth Team: ciaranformby@outlook.com / GrowthTeam123#');
  console.log('Product Manager: pm@example.com / PM123#');
  console.log('Real PM: ciaranformby@gmail.com / PM123#');
  console.log('Real Consultant: ronformby@gmail.com / Consultant123#');
  console.log('Consultant 1: consultant1@example.com / Consultant123#');
  console.log('Consultant 2: consultant2@example.com / Consultant123#');
  console.log('Consultant 3: consultant3@example.com / Consultant123#');
  console.log('Consultant 4: consultant4@example.com / Consultant123#');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });