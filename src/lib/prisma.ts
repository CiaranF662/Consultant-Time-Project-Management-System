import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
  prismaPromise: Promise<void> | undefined;
};

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Ensure connection on initialization - store promise to prevent race conditions
if (!globalForPrisma.prismaPromise) {
  globalForPrisma.prismaPromise = prisma.$connect()
    .then(() => {
      console.log('Database connected successfully');
    })
    .catch((err) => {
      console.error('Failed to connect to database:', err);
      throw err;
    });
}

export default prisma;
