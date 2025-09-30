const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try {
    const count = await prisma.timeEntry.count();
    console.log('timeEntry count:', count);
  } catch (err) {
    console.error('Error checking timeEntry:', err);
  } finally {
    await prisma.$disconnect();
  }
})();
