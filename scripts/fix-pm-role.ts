import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🔧 Fixing Product Manager role for Legacy Mobile App Modernization\n');

  // Find the project
  const project = await prisma.project.findFirst({
    where: {
      title: 'Legacy Mobile App Modernization'
    },
    include: {
      productManager: true,
      consultants: true
    }
  });

  if (!project) {
    console.log('❌ Project not found!');
    return;
  }

  console.log(`✅ Found project: ${project.title}`);
  console.log(`   Product Manager ID: ${project.productManagerId}`);
  console.log(`   PM Name: ${project.productManager?.name}\n`);

  // Update the PM's role in ConsultantsOnProjects
  const updated = await prisma.consultantsOnProjects.update({
    where: {
      userId_projectId: {
        userId: project.productManagerId!,
        projectId: project.id
      }
    },
    data: {
      role: 'PRODUCT_MANAGER'
    }
  });

  console.log(`✅ Updated ${project.productManager?.name} role to PRODUCT_MANAGER\n`);

  // Verify the fix
  const verification = await prisma.consultantsOnProjects.findUnique({
    where: {
      userId_projectId: {
        userId: project.productManagerId!,
        projectId: project.id
      }
    },
    include: {
      user: true
    }
  });

  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ VERIFICATION:');
  console.log(`   User: ${verification?.user.name}`);
  console.log(`   Role: ${verification?.role}`);
  console.log(`   Allocated Hours: ${verification?.allocatedHours}h`);
  console.log('═══════════════════════════════════════════════════════════\n');
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
