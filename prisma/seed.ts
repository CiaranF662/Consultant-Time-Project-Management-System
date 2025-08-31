import { PrismaClient, UserRole, UserStatus, ProjectRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create Growth Team user
  const growthTeamPassword = await bcrypt.hash('GrowthTeam123#', 12);
  const growthUser = await prisma.user.create({
    data: {
      email: 'ciaranformby@outlook.com',
      name: 'GrowthTeam123#',
      password: growthTeamPassword,
      role: UserRole.GROWTH_TEAM,
      status: UserStatus.APPROVED,
    },
  });

  // Create Product Manager (as a consultant with PM privileges)
  const pmPassword = await bcrypt.hash('PM123#', 12);
  const pmUser = await prisma.user.create({
    data: {
      email: 'pm@example.com',
      name: 'John PM',
      password: pmPassword,
      role: UserRole.CONSULTANT, // PMs are consultants with special project role
      status: UserStatus.APPROVED,
    },
  });

  // Create Consultants
  const consultantPassword = await bcrypt.hash('Consultant123#', 12);
  const consultant1 = await prisma.user.create({
    data: {
      email: 'consultant1@example.com',
      name: '12345678',
      password: consultantPassword,
      role: UserRole.CONSULTANT,
      status: UserStatus.APPROVED,
    },
  });


  const consultant2 = await prisma.user.create({
    data: {
      email: 'consultant2@example.com',
      name: 'Bob Consultant',
      password: consultantPassword,
      role: UserRole.CONSULTANT,
      status: UserStatus.APPROVED,
    },
  });

  // Create a sample project
  const project = await prisma.project.create({
    data: {
      title: 'Sample Resource Project',
      description: 'A demo project for the new resource allocation system',
      startDate: new Date('2025-09-01'),
      endDate: new Date('2025-12-31'),
      budgetedHours: 500,
      productManagerId: pmUser.id,
      consultants: {
        create: [
          { userId: pmUser.id, role: ProjectRole.PRODUCT_MANAGER },
          { userId: consultant1.id, role: ProjectRole.TEAM_MEMBER },
          { userId: consultant2.id, role: ProjectRole.TEAM_MEMBER },
        ],
      },
    },
  });

  // Generate sprints for the project
  const sprintStartDate = new Date('2025-09-01');
  const sprints = [];
  
  for (let i = 0; i < 8; i++) {
    const startDate = new Date(sprintStartDate);
    startDate.setDate(startDate.getDate() + (i * 14));
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 13);
    
    sprints.push({
      sprintNumber: i + 1,
      startDate,
      endDate,
      projectId: project.id,
    });
  }
  
  await prisma.sprint.createMany({
    data: sprints,
  });

  // Create sample phases
  const sprintRecords = await prisma.sprint.findMany({
    where: { projectId: project.id },
    orderBy: { sprintNumber: 'asc' }
  });

  const phase1 = await prisma.phase.create({
    data: {
      name: 'Discovery & Planning',
      description: 'Initial research and project setup',
      startDate: sprintRecords[0].startDate,
      endDate: sprintRecords[1].endDate,
      projectId: project.id,
      sprints: {
        connect: [
          { id: sprintRecords[0].id },
          { id: sprintRecords[1].id }
        ]
      }
    }
  });

  const phase2 = await prisma.phase.create({
    data: {
      name: 'Development',
      description: 'Core development work',
      startDate: sprintRecords[2].startDate,
      endDate: sprintRecords[5].endDate,
      projectId: project.id,
      sprints: {
        connect: [
          { id: sprintRecords[2].id },
          { id: sprintRecords[3].id },
          { id: sprintRecords[4].id },
          { id: sprintRecords[5].id }
        ]
      }
    }
  });

  // Create phase allocations
  await prisma.phaseAllocation.create({
    data: {
      phaseId: phase1.id,
      consultantId: consultant1.id,
      totalHours: 80,
    }
  });

  await prisma.phaseAllocation.create({
    data: {
      phaseId: phase1.id,
      consultantId: consultant2.id,
      totalHours: 60,
    }
  });

  await prisma.phaseAllocation.create({
    data: {
      phaseId: phase2.id,
      consultantId: consultant1.id,
      totalHours: 160,
    }
  });

  await prisma.phaseAllocation.create({
    data: {
      phaseId: phase2.id,
      consultantId: consultant2.id,
      totalHours: 120,
    }
  });

  // Create additional consultants for the second project
  const consultant3 = await prisma.user.create({
    data: {
      email: 'consultant3@example.com',
      name: 'Carol Developer',
      password: consultantPassword,
      role: UserRole.CONSULTANT,
      status: UserStatus.APPROVED,
    },
  });

  const consultant4 = await prisma.user.create({
    data: {
      email: 'consultant4@example.com',
      name: 'Dave Designer',
      password: consultantPassword,
      role: UserRole.CONSULTANT,
      status: UserStatus.APPROVED,
    },
  });

  // Create second project
  const project2 = await prisma.project.create({
    data: {
      title: 'E-Commerce Platform Redesign',
      description: 'Complete redesign and modernization of the e-commerce platform with new features',
      startDate: new Date('2025-10-01'),
      endDate: new Date('2026-03-31'),
      budgetedHours: 800,
      productManagerId: pmUser.id, // Same PM manages both projects
      consultants: {
        create: [
          { userId: pmUser.id, role: ProjectRole.PRODUCT_MANAGER },
          { userId: consultant2.id, role: ProjectRole.TEAM_MEMBER }, // Consultant2 works on both projects
          { userId: consultant3.id, role: ProjectRole.TEAM_MEMBER },
          { userId: consultant4.id, role: ProjectRole.TEAM_MEMBER },
        ],
      },
    },
  });

  // Generate sprints for the second project (6 months = ~12 sprints)
  const project2SprintStartDate = new Date('2025-10-01');
  const project2Sprints = [];
  
  for (let i = 0; i < 12; i++) {
    const startDate = new Date(project2SprintStartDate);
    startDate.setDate(startDate.getDate() + (i * 14));
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 13);
    
    project2Sprints.push({
      sprintNumber: i + 1,
      startDate,
      endDate,
      projectId: project2.id,
    });
  }
  
  await prisma.sprint.createMany({
    data: project2Sprints,
  });

  // Get sprints for second project
  const project2SprintRecords = await prisma.sprint.findMany({
    where: { projectId: project2.id },
    orderBy: { sprintNumber: 'asc' }
  });

  // Create phases for second project
  const project2Phase1 = await prisma.phase.create({
    data: {
      name: 'UI/UX Design',
      description: 'Design system and user interface mockups',
      startDate: project2SprintRecords[0].startDate,
      endDate: project2SprintRecords[2].endDate,
      projectId: project2.id,
      sprints: {
        connect: [
          { id: project2SprintRecords[0].id },
          { id: project2SprintRecords[1].id },
          { id: project2SprintRecords[2].id }
        ]
      }
    }
  });

  const project2Phase2 = await prisma.phase.create({
    data: {
      name: 'Frontend Development',
      description: 'React components and user interface implementation',
      startDate: project2SprintRecords[3].startDate,
      endDate: project2SprintRecords[7].endDate,
      projectId: project2.id,
      sprints: {
        connect: [
          { id: project2SprintRecords[3].id },
          { id: project2SprintRecords[4].id },
          { id: project2SprintRecords[5].id },
          { id: project2SprintRecords[6].id },
          { id: project2SprintRecords[7].id }
        ]
      }
    }
  });

  const project2Phase3 = await prisma.phase.create({
    data: {
      name: 'Backend Integration',
      description: 'API development and database optimization',
      startDate: project2SprintRecords[8].startDate,
      endDate: project2SprintRecords[11].endDate,
      projectId: project2.id,
      sprints: {
        connect: [
          { id: project2SprintRecords[8].id },
          { id: project2SprintRecords[9].id },
          { id: project2SprintRecords[10].id },
          { id: project2SprintRecords[11].id }
        ]
      }
    }
  });

  // Create phase allocations for second project
  // Phase 1: UI/UX Design
  await prisma.phaseAllocation.create({
    data: {
      phaseId: project2Phase1.id,
      consultantId: consultant4.id, // Dave Designer leads design
      totalHours: 120,
    }
  });

  await prisma.phaseAllocation.create({
    data: {
      phaseId: project2Phase1.id,
      consultantId: consultant3.id, // Carol helps with design
      totalHours: 80,
    }
  });

  // Phase 2: Frontend Development
  await prisma.phaseAllocation.create({
    data: {
      phaseId: project2Phase2.id,
      consultantId: consultant3.id, // Carol leads frontend
      totalHours: 200,
    }
  });

  await prisma.phaseAllocation.create({
    data: {
      phaseId: project2Phase2.id,
      consultantId: consultant2.id, // Bob helps with frontend
      totalHours: 160,
    }
  });

  await prisma.phaseAllocation.create({
    data: {
      phaseId: project2Phase2.id,
      consultantId: consultant4.id, // Dave contributes to frontend
      totalHours: 120,
    }
  });

  // Phase 3: Backend Integration
  await prisma.phaseAllocation.create({
    data: {
      phaseId: project2Phase3.id,
      consultantId: consultant2.id, // Bob leads backend
      totalHours: 180,
    }
  });

  await prisma.phaseAllocation.create({
    data: {
      phaseId: project2Phase3.id,
      consultantId: consultant3.id, // Carol assists with backend
      totalHours: 140,
    }
  });

  console.log('Seed data created successfully!');
  console.log('\nLogin credentials:');
  console.log('=====================================');
  console.log('Growth Team: ciaranformby@outlook.com / GrowthTeam123#');
  console.log('Product Manager: pm@example.com / PM123#');
  console.log('Consultant 1: consultant1@example.com / Consultant123#');
  console.log('Consultant 2: consultant2@example.com / Consultant123#');
  console.log('Consultant 3: consultant3@example.com / Consultant123#');
  console.log('Consultant 4: consultant4@example.com / Consultant123#');
  console.log('\nProjects created:');
  console.log('=====================================');
  console.log('1. Sample Resource Project (Sep 2025 - Dec 2025)');
  console.log('   - 2 phases: Discovery & Planning, Development');
  console.log('   - Team: Consultant1, Consultant2');
  console.log('   - Budget: 500 hours');
  console.log('');
  console.log('2. E-Commerce Platform Redesign (Oct 2025 - Mar 2026)');
  console.log('   - 3 phases: UI/UX Design, Frontend Development, Backend Integration'); 
  console.log('   - Team: Consultant2, Consultant3, Consultant4');
  console.log('   - Budget: 800 hours');
  console.log('');
  console.log('Note: Consultant2 (Bob) works on both projects for overlap testing');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });