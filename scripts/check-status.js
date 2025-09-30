const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    const res = await prisma.$queryRaw`
      SELECT table_schema, table_name, column_name
      FROM information_schema.columns
      WHERE (table_name = 'User' OR table_name = 'user')
        AND column_name = 'status'
      ORDER BY table_schema, table_name;
    `;
    console.log('Query result:', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('Error running check:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
