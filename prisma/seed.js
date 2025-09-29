const { PrismaClient, UserRole, UserStatus, ProjectRole } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Hash password for dummy users
  const hashedPassword = await bcrypt.hash('password123', 12);

  // Create Growth Team user
  const growthTeamUser = await prisma.user.upsert({
    where: { email: 'admin@agilets.com' },
    update: {},
    create: {
      email: 'admin@agilets.com',
      name: 'Growth Team Admin',
      password: hashedPassword,
      role: UserRole.GROWTH_TEAM,
      status: UserStatus.APPROVED,
    },
  });

  // Create Product Manager (Consultant with PM role)
  const pmUser = await prisma.user.upsert({
    where: { email: 'pm@agilets.com' },
    update: {},
    create: {
      email: 'pm@agilets.com',
      name: 'Product Manager',
      password: hashedPassword,
      role: UserRole.CONSULTANT,
      status: UserStatus.APPROVED,
    },
  });

  // Create a sample project
  const project = await prisma.project.upsert({
    where: { id: 'sample-project-1' },
    update: {},
    create: {
      id: 'sample-project-1',
      title: 'Sample Client Project',
      description: 'A sample project for testing PM functionality',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-06-30'),
      budgetedHours: 1000,
      productManagerId: pmUser.id,
    },
  });

  // Assign PM user as Product Manager to the project
  await prisma.consultantsOnProjects.upsert({
    where: {
      userId_projectId: {
        projectId: project.id,
        userId: pmUser.id,
      },
    },
    update: {},
    create: {
      projectId: project.id,
      userId: pmUser.id,
      role: ProjectRole.PRODUCT_MANAGER,
    },
  });

  console.log('Dummy users created successfully!');
  console.log('Growth Team User: admin@agilets.com / password123');
  console.log('Product Manager: pm@agilets.com / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });