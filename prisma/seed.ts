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

  console.log('Seed data created successfully!');
  console.log('\nLogin credentials:');
  console.log('=====================================');
  console.log('Growth Team: growth@example.com / GrowthTeam123#');
  console.log('Product Manager: pm@example.com / PM123#');
  console.log('Consultant 1: consultant1@example.com / Consultant123#');
  console.log('Consultant 2: consultant2@example.com / Consultant123#');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });