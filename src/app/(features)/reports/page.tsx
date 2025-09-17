// src/app/(dashboard)/dashboard/gantt/page.tsx
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { UserRole, ProjectRole } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import DashboardLayout from '@/app/(features)/dashboard/components/DashboardLayout';
import GrowthTeamGanttClient from '@/app/(features)/reports/components/GrowthTeamGanttClient';
import ProductManagerGanttClient from '@/app/(features)/reports/components//ProductManagerGanttClient';
import ConsultantGanttClient from '@/app/(features)/reports/components//ConsultantGanttClient';

const prisma = new PrismaClient();

// Growth Team Data Fetcher
async function getGrowthTeamGanttData() {
  const projects = await prisma.project.findMany({
    include: {
      phases: {
        include: {
          sprints: {
            orderBy: { sprintNumber: 'asc' }
          },
          allocations: {
            include: {
              consultant: {
                select: { name: true }
              }
            }
          }
        }
      },
      consultants: {
        include: {
          user: {
            select: { name: true }
          }
        }
      }
    }
  });

  return { projects };
}

// Product Manager Data Fetcher
async function getProductManagerGanttData(userId: string) {
  const projects = await prisma.project.findMany({
    where: {
      consultants: {
        some: {
          userId: userId,
          role: ProjectRole.PRODUCT_MANAGER
        }
      }
    },
    include: {
      phases: {
        include: {
          sprints: {
            orderBy: { sprintNumber: 'asc' }
          },
          allocations: {
            include: {
              consultant: {
                select: { id: true, name: true, email: true }
              },
              weeklyAllocations: {
                orderBy: { weekStartDate: 'asc' }
              }
            }
          }
        },
        orderBy: { startDate: 'asc' }
      },
      sprints: {
        orderBy: { sprintNumber: 'asc' }
      },
      consultants: {
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return { projects };
}

// Consultant Data Fetcher
async function getConsultantGanttData(userId: string) {
  const { getWeekNumber, getYear } = await import('@/lib/dates');
  const today = new Date();
  const currentWeekNumber = getWeekNumber(today);
  const currentYear = getYear(today);

  const weeklyAllocations = await prisma.weeklyAllocation.findMany({
    where: {
      consultantId: userId
    },
    include: {
      phaseAllocation: {
        include: {
          phase: {
            include: {
              project: {
                select: {
                  id: true,
                  title: true,
                  startDate: true,
                  endDate: true
                }
              },
              sprints: {
                orderBy: { sprintNumber: 'asc' }
              }
            }
          }
        }
      }
    },
    orderBy: { weekStartDate: 'asc' }
  });

  const phaseAllocations = await prisma.phaseAllocation.findMany({
    where: { consultantId: userId },
    include: {
      phase: {
        include: {
          project: {
            select: {
              id: true,
              title: true,
              description: true,
              startDate: true,
              endDate: true
            }
          },
          sprints: {
            orderBy: { sprintNumber: 'asc' }
          }
        }
      },
      weeklyAllocations: {
        orderBy: { weekStartDate: 'asc' }
      }
    }
  });

  const projects = await prisma.project.findMany({
    where: {
      consultants: {
        some: { userId }
      }
    },
    include: {
      phases: {
        include: {
          sprints: {
            orderBy: { sprintNumber: 'asc' }
          }
        }
      },
      consultants: {
        include: { user: true }
      }
    }
  });

  return {
    weeklyAllocations,
    phaseAllocations,
    projects,
    currentWeekNumber,
    currentYear
  };
}

export default async function GanttPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login');
  }

  const userRole = session.user.role as UserRole;

  // Route to appropriate Gantt view based on user role
  if (userRole === UserRole.GROWTH_TEAM) {
    const data = await getGrowthTeamGanttData();
    return (
      <DashboardLayout>
        <GrowthTeamGanttClient />
      </DashboardLayout>
    );
  }

  // Check if user is a Product Manager
  const pmProjects = await prisma.project.findMany({
    where: {
      consultants: {
        some: {
          userId: session.user.id,
          role: ProjectRole.PRODUCT_MANAGER
        }
      }
    },
    select: { id: true }
  });

  if (pmProjects.length > 0) {
    // User is a Product Manager
    const data = await getProductManagerGanttData(session.user.id);
    return (
      <DashboardLayout>
        <ProductManagerGanttClient data={data} userId={session.user.id} />
      </DashboardLayout>
    );
  }

  // User is a regular Consultant
  const data = await getConsultantGanttData(session.user.id);
  return (
    <DashboardLayout>
      <ConsultantGanttClient 
        data={data} 
        userId={session.user.id}
        userName={session.user.name || session.user.email || 'User'}
      />
    </DashboardLayout>
  );
}