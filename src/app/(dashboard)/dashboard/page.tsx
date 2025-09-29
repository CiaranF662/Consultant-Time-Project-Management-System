
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole, UserStatus, ChangeStatus, ProjectRole } from '@prisma/client';
import DashboardLayout from '@/app/components/DashboardLayout';
import GrowthTeamDashboard from '@/app/components/dashboards/GrowthTeamDashboard';
import ConsultantDashboard from '@/app/components/dashboards/ConsultantDashboard';
import IntegratedPMDashboard from '@/app/components/dashboards/IntegratedPMDashboard';
const prisma = new PrismaClient();


async function getGrowthTeamData() {
  // Get pending approvals count
  const pendingUserCount = await prisma.user.count({
    where: { status: UserStatus.PENDING }
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
      },
      sprints: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return { pendingUserCount, consultants, projects };
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

  // Get all phase allocations for the consultant with related data (same as allocations page)
  const phaseAllocations = await prisma.phaseAllocation.findMany({
    where: { consultantId: userId },
    include: {
      phase: {
        include: {
          project: {
            select: { id: true, title: true, budgetedHours: true }
          },
          sprints: {
            orderBy: { sprintNumber: 'asc' }
          }
        }
      },
      weeklyAllocations: {
        orderBy: { weekStartDate: 'asc' }
      }
    },
    orderBy: {
      phase: {
        startDate: 'asc'
      }
    }
  });

  // Get upcoming weeks where allocation is needed
  const today = new Date();
  const fourWeeksFromNow = new Date(today);
  fourWeeksFromNow.setDate(today.getDate() + 28);

  const upcomingAllocations = await prisma.weeklyAllocation.findMany({
    where: {
      consultantId: userId,
      weekStartDate: {
        gte: today,
        lte: fourWeeksFromNow
      }
    },
    include: {
      phaseAllocation: {
        include: {
          phase: {
            include: {
              project: {
                select: { title: true }
              }
            }
          }
        }
      }
    },
    orderBy: { weekStartDate: 'asc' }
  });

  // Calculate allocation statistics
  const totalAllocatedHours = phaseAllocations.reduce((sum, alloc) => sum + alloc.totalHours, 0);
  const totalDistributedHours = phaseAllocations.reduce((sum, alloc) => {
    return sum + alloc.weeklyAllocations.reduce((weekSum, week) => weekSum + (week.approvedHours || week.proposedHours || 0), 0);
  }, 0);

  return {
    isPM,
    pmProjects,
    phaseAllocations,
    upcomingAllocations,
    stats: {
      totalAllocatedHours,
      totalDistributedHours,
      remainingToDistribute: totalAllocatedHours - totalDistributedHours,
      activePhases: phaseAllocations.length,
      upcomingWeeks: upcomingAllocations.length
    }
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
        <GrowthTeamDashboard data={data} userRole={session.user.role} />
      </DashboardLayout>
    );
  } else {
    const data = await getConsultantData(session.user.id);

    // If user is a Product Manager, show the Integrated PM Dashboard with role switcher
    if (data.isPM) {
      return (
        <DashboardLayout>
          <IntegratedPMDashboard
            userId={session.user.id}
            userName={session.user.name || session.user.email || 'User'}
          />
        </DashboardLayout>
      );
    }

    // Otherwise show the regular Consultant Dashboard
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