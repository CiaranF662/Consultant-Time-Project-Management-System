import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create Growth Team user
  const growthTeamPassword = await bcrypt.hash('GrowthTeam123#', 12);
  const growthUser = await prisma.user.create({
    data: {
      email: 'ciaranformby@outlook.com',
      name: 'Growth Team Admin',
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
      name: 'Alice Smith',
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

  // Additional real email users for testing
  const realPmPassword = await bcrypt.hash('PM123#', 12);
  const realPmUser = await prisma.user.create({
    data: {
      email: 'ciaranformby@gmail.com',
      name: 'Ciaran PM',
      password: realPmPassword,
      role: UserRole.CONSULTANT,
      status: UserStatus.APPROVED,
    },
  });

  const realConsultantPassword = await bcrypt.hash('Consultant123#', 12);
  const realConsultantUser = await prisma.user.create({
    data: {
      email: 'ronformby@gmail.com',
      name: 'Ron Consultant',
      password: realConsultantPassword,
      role: UserRole.CONSULTANT,
      status: UserStatus.APPROVED,
    },
  });

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