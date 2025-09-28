import { PrismaClient } from '@prisma/client';

// #region Database Singleton
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
// #endregion

// #region Query Helpers
export async function findUserWithProjects(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      projectAssignments: {
        include: {
          project: {
            select: {
              id: true,
              title: true,
              startDate: true,
              endDate: true,
              budgetedHours: true
            }
          }
        }
      },
      phaseAllocations: {
        include: {
          phase: {
            select: {
              id: true,
              name: true,
              startDate: true,
              endDate: true
            }
          }
        }
      }
    }
  });
}

export async function getProjectsWithStats() {
  return prisma.project.findMany({
    include: {
      phases: {
        include: {
          allocations: {
            select: {
              totalHours: true
            }
          }
        }
      },
      consultants: {
        select: {
          userId: true
        }
      },
      _count: {
        select: {
          phases: true,
          consultants: true
        }
      }
    }
  });
}
// #endregion