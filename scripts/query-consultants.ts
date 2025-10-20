import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get all consultants
  const consultants = await prisma.user.findMany({
    where: { role: 'CONSULTANT' },
    orderBy: { name: 'asc' }
  });

  console.log('\n=== EXISTING CONSULTANTS ===');
  consultants.forEach(c => {
    console.log(`ID: ${c.id}`);
    console.log(`Name: ${c.name}`);
    console.log(`Email: ${c.email}`);
    console.log('---');
  });

  // Get existing projects count
  const projectCount = await prisma.project.count();
  console.log(`\nTotal existing projects: ${projectCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
