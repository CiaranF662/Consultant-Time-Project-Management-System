import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole, UserStatus, ChangeStatus, ProjectRole } from '@prisma/client';
import DashboardLayout from '@/app/components/DashboardLayout';
import GrowthTeamDashboard from '@/app/components/dashboards/GrowthTeamDashboard';
import ConsultantDashboard from '@/app/components/dashboards/ConsultantDashboard';

const prisma = new PrismaClient();

async function getGrowthTeamData() {
  // Get pending approvals count
  const pendingUserCount = await prisma.user.count({
    where: { status: UserStatus.PENDING }
  });
  
  const pendingHoursCount = await prisma.hourChangeRequest.count({
    where: { status: ChangeStatus.PENDING }
  });

  // Get all consultants for timeline
  const consultants = await prisma.user.findMany({
    where: { role: UserRole.CONSULTANT },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: { name: 'asc' }
  });

  // Get recent projects
  const projects = await prisma.project.findMany({
    include: {
      phases: {
        include: {
          allocations: true
        }
      },
      consultants: {
        include: {
          user: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  return { pendingUserCount, pendingHoursCount, consultants, projects };
}

async function getConsultantData(userId: string) {
  // Check if user is a PM
  const pmProjects = await prisma.project.findMany({
    where: {
      consultants: {
        some: {
          userId: userId,
          role: ProjectRole.PRODUCT_MANAGER
        }
      }
    },
    select: {
      id: true,
      title: true
    }
  });

  const isPM = pmProjects.length > 0;

  // Get current week allocations
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday

  // Get current week allocations for stats
  const currentWeekAllocations = await prisma.weeklyAllocation.findMany({
    where: {
      consultantId: userId,
      weekStartDate: {
        gte: startOfWeek,
        lte: endOfWeek
      }
    },
    include: {
      phaseAllocation: {
        include: {
          phase: {
            include: {
              project: true
            }
          }
        }
      }
    }
  });

  // Get ALL weekly allocations for the consultant (for weekly planner)
  const allWeeklyAllocations = await prisma.weeklyAllocation.findMany({
    where: {
      consultantId: userId
    },
    include: {
      phaseAllocation: {
        include: {
          phase: {
            include: {
              project: true
            }
          }
        }
      }
    },
    orderBy: { weekStartDate: 'asc' }
  });

  // Get all phase allocations for the consultant
  const phaseAllocations = await prisma.phaseAllocation.findMany({
    where: { consultantId: userId },
    include: {
      phase: {
        include: {
          project: true,
          sprints: true
        }
      },
      weeklyAllocations: {
        orderBy: { weekStartDate: 'asc' }
      }
    }
  });

  // Get pending hour change requests
  const pendingRequests = await prisma.hourChangeRequest.findMany({
    where: {
      consultantId: userId,
      status: ChangeStatus.PENDING
    }
  });

  // Get assigned projects
  const projects = await prisma.project.findMany({
    where: {
      consultants: {
        some: { userId }
      }
    },
    include: {
      phases: true,
      consultants: {
        include: { user: true }
      }
    }
  });

  return {
    isPM,
    pmProjects,
    weeklyAllocations: allWeeklyAllocations, // Pass ALL weekly allocations for planner
    currentWeekAllocations, // Pass current week for stats
    phaseAllocations,
    pendingRequests,
    projects
  };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login');
  }

  const isGrowthTeam = session.user.role === UserRole.GROWTH_TEAM;

  if (isGrowthTeam) {
    const data = await getGrowthTeamData();
    return (
      <DashboardLayout>
        <GrowthTeamDashboard data={data} />
      </DashboardLayout>
    );
  } else {
    const data = await getConsultantData(session.user.id);
    return (
      <DashboardLayout>
        <ConsultantDashboard 
          data={data} 
          userId={session.user.id}
          userName={session.user.name || session.user.email || 'User'}
        />
      </DashboardLayout>
    );
  }
}