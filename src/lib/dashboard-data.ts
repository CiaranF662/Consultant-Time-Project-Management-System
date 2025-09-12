import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import { DashboardData, ConsultantUtilization, PersonalAllocation } from '@/types/dashboard';
import { startOfWeek, endOfWeek, addWeeks, format } from 'date-fns';

const prisma = new PrismaClient();

/**
 * Dashboard Data Aggregation Service
 * 
 * Centralizes all dashboard data fetching and processing logic
 * Optimized for role-based data access and performance
 */

export async function getDashboardData(userRole: UserRole, userId: string): Promise<DashboardData> {
  try {
    // Base dashboard structure
    const dashboardData: DashboardData = {
      userId,
      userRole,
      userName: await getUserName(userId),
    };

    // Fetch role-specific data in parallel
    const [
      activeProject,
      portfolioStats,
      resourceData,
      budgetData,
      personalData,
      notificationsData,
      teamData
    ] = await Promise.all([
      getActiveProjectData(userId, userRole),
      userRole === UserRole.GROWTH_TEAM ? getPortfolioStats() : null,
      getResourceUtilizationData(userId, userRole),
      getBudgetTrackingData(userId, userRole),
      userRole === UserRole.CONSULTANT ? getPersonalAllocationData(userId) : null,
      getNotificationsData(userId, userRole),
      userRole === UserRole.GROWTH_TEAM ? getTeamData() : null
    ]);

    // Assemble dashboard data
    return {
      ...dashboardData,
      activeProject,
      portfolioStats: portfolioStats || undefined,
      resourceUtilization: resourceData,
      budgetTracking: budgetData,
      myAllocations: personalData || undefined,
      ...notificationsData,
      teamAvailability: teamData?.teamAvailability,
      workloadBalance: teamData?.workloadBalance,
      quickStats: await getQuickStats(userId, userRole),
      upcomingDeadlines: await getUpcomingDeadlines(userId),
      currentSprint: await getCurrentSprint(userId, userRole),
      upcomingMilestone: await getUpcomingMilestone(userId, userRole)
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    // Return minimal dashboard data on error
    return {
      userId,
      userRole,
      userName: 'User',
      quickStats: { activeProjects: 0, teamSize: 0, utilizationRate: 0, completedTasks: 0 }
    };
  }
}

/**
 * Get user's display name
 */
async function getUserName(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true }
  });
  return user?.name || user?.email || 'User';
}

/**
 * Get active project context for user
 */
async function getActiveProjectData(userId: string, userRole: UserRole) {
  if (userRole === UserRole.GROWTH_TEAM) {
    // For Growth Team, get the most recently active project
    const recentProject = await prisma.project.findFirst({
      orderBy: { updatedAt: 'desc' },
      include: {
        consultants: true,
        phases: {
          include: { allocations: true }
        }
      }
    });

    if (!recentProject) return null;

    return {
      id: recentProject.id,
      title: recentProject.title,
      status: 'active' as const,
      currentPhase: recentProject.phases[0]?.name || 'Planning',
      teamSize: recentProject.consultants.length,
      budgetHealth: {
        utilizationRate: 85, // Calculate from actual data
        remaining: recentProject.budgetedHours,
        status: 'healthy' as const
      }
    };
  }

  // For consultants, get their active project
  const consultantProject = await prisma.consultantsOnProjects.findFirst({
    where: { userId },
    include: {
      project: {
        include: {
          consultants: true,
          phases: { include: { allocations: true } }
        }
      }
    },
    orderBy: { assignedAt: 'desc' }
  });

  if (!consultantProject) return null;

  const project = consultantProject.project;
  return {
    id: project.id,
    title: project.title,
    status: 'active' as const,
    currentPhase: project.phases[0]?.name || 'Planning',
    teamSize: project.consultants.length
  };
}

/**
 * Get portfolio statistics for Growth Team
 */
async function getPortfolioStats() {
  const [totalProjects, activeConsultants] = await Promise.all([
    prisma.project.count(),
    prisma.user.count({ where: { role: UserRole.CONSULTANT, status: UserStatus.APPROVED } })
  ]);

  // Calculate utilization from allocations
  const allocations = await prisma.weeklyAllocation.findMany({
    where: {
      weekStartDate: {
        gte: startOfWeek(new Date()),
        lte: endOfWeek(addWeeks(new Date(), 4))
      }
    }
  });

  const totalHours = allocations.reduce((sum, a) => sum + a.plannedHours, 0);
  const utilizationRate = Math.round((totalHours / (activeConsultants * 40 * 4)) * 100);

  return {
    totalProjects,
    activeProjects: Math.round(totalProjects * 0.7), // Estimate
    utilizationRate,
    activeConsultants,
    budgetHealth: utilizationRate > 85 ? 'Excellent' : utilizationRate > 70 ? 'Good' : 'Needs Attention',
    totalRevenue: totalProjects * 250000 // Estimate
  };
}

/**
 * Get resource utilization data
 */
async function getResourceUtilizationData(userId: string, userRole: UserRole) {
  const consultants = await prisma.user.findMany({
    where: { 
      role: UserRole.CONSULTANT, 
      status: UserStatus.APPROVED,
      ...(userRole === UserRole.CONSULTANT ? { id: userId } : {})
    },
    include: {
      weeklyAllocations: {
        where: {
          weekStartDate: {
            gte: startOfWeek(new Date()),
            lte: endOfWeek(addWeeks(new Date(), 4))
          }
        }
      }
    }
  });

  const consultantUtilization: ConsultantUtilization[] = consultants.map(consultant => {
    const totalAllocated = consultant.weeklyAllocations.reduce((sum, wa) => sum + wa.plannedHours, 0);
    const capacity = 40 * 4; // 40 hours/week * 4 weeks
    const utilization = Math.round((totalAllocated / capacity) * 100);

    return {
      id: consultant.id,
      name: consultant.name || consultant.email || 'Unknown',
      email: consultant.email || '',
      allocated: totalAllocated,
      capacity,
      utilization,
      status: utilization > 100 ? 'over' : utilization < 70 ? 'under' : 'optimal'
    };
  });

  const totalCapacity = consultantUtilization.reduce((sum, c) => sum + c.capacity, 0);
  const totalAllocated = consultantUtilization.reduce((sum, c) => sum + c.allocated, 0);

  return {
    totalCapacity,
    totalAllocated,
    utilizationRate: Math.round((totalAllocated / totalCapacity) * 100),
    consultants: consultantUtilization
  };
}

/**
 * Get budget tracking data
 */
async function getBudgetTrackingData(userId: string, userRole: UserRole) {
  // Get projects user has access to
  const projects = userRole === UserRole.GROWTH_TEAM 
    ? await prisma.project.findMany({ include: { phases: { include: { allocations: true } } } })
    : await prisma.project.findMany({
        where: { consultants: { some: { userId } } },
        include: { phases: { include: { allocations: true } } }
      });

  const totalBudget = projects.reduce((sum, p) => sum + p.budgetedHours, 0) * 150; // $150/hour rate
  const totalAllocated = projects.reduce((sum, p) => 
    sum + p.phases.reduce((phaseSum, phase) => 
      phaseSum + phase.allocations.reduce((allocSum, alloc) => allocSum + alloc.totalHours, 0), 0), 0);

  return {
    totalBudget,
    totalAllocated,
    remainingBudget: totalBudget - totalAllocated,
    budgetHealth:
      totalAllocated / totalBudget > 0.9
        ? "critical"
        : totalAllocated / totalBudget > 0.75
        ? "warning"
        : "healthy",
  };
}

/**
 * Get personal allocations for a consultant
 */
async function getPersonalAllocationData(userId: string): Promise<PersonalAllocation[]> {
  const allocations = await prisma.weeklyAllocation.findMany({
    where: { userId },
    include: { project: true },
    orderBy: { weekStartDate: "asc" },
    take: 8, // next 8 weeks
  });

  return allocations.map((a) => ({
    projectId: a.projectId,
    projectTitle: a.project.title,
    weekStartDate: format(a.weekStartDate, "yyyy-MM-dd"),
    plannedHours: a.plannedHours,
  }));
}

/**
 * Get notifications (system + role-based)
 */
async function getNotificationsData(userId: string, userRole: UserRole) {
  const systemNotifications = await prisma.notification.findMany({
    where: {
      OR: [
        { userId },
        { targetRole: userRole },
        { targetRole: null }, // broadcast
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return {
    notifications: systemNotifications.map((n) => ({
      id: n.id,
      message: n.message,
      type: n.type,
      createdAt: n.createdAt,
      read: n.read,
    })),
  };
}

/**
 * Get team availability + workload balance (Growth Team only)
 */
async function getTeamData() {
  const consultants = await prisma.user.findMany({
    where: { role: UserRole.CONSULTANT, status: UserStatus.APPROVED },
    include: {
      weeklyAllocations: {
        where: {
          weekStartDate: {
            gte: startOfWeek(new Date()),
            lte: endOfWeek(addWeeks(new Date(), 2)),
          },
        },
      },
    },
  });

  const teamAvailability = consultants.map((c) => {
    const totalPlanned = c.weeklyAllocations.reduce(
      (sum, wa) => sum + wa.plannedHours,
      0
    );
    const capacity = 40 * 2; // two weeks
    return {
      id: c.id,
      name: c.name || c.email || "Unknown",
      availability: capacity - totalPlanned,
    };
  });

  const avgUtilization =
    teamAvailability.reduce(
      (sum, t) => sum + (1 - t.availability / (40 * 2)),
      0
    ) / teamAvailability.length;

  return {
    teamAvailability,
    workloadBalance:
      avgUtilization > 0.9
        ? "high"
        : avgUtilization < 0.6
        ? "low"
        : "balanced",
  };
}

/**
 * Quick stats (shown on top of dashboard)
 */
async function getQuickStats(userId: string, userRole: UserRole) {
  const activeProjects =
    userRole === UserRole.GROWTH_TEAM
      ? await prisma.project.count({ where: { status: "ACTIVE" } })
      : await prisma.consultantsOnProjects.count({ where: { userId } });

  const teamSize =
    userRole === UserRole.GROWTH_TEAM
      ? await prisma.user.count({
          where: { role: UserRole.CONSULTANT, status: UserStatus.APPROVED },
        })
      : 1;

  const utilizationRateData = await getResourceUtilizationData(userId, userRole);

  return {
    activeProjects,
    teamSize,
    utilizationRate: utilizationRateData.utilizationRate,
    completedTasks: 0, // reserved for integration with Jira
  };
}

/**
 * Deadlines (deliverables or project dates)
 */
async function getUpcomingDeadlines(userId: string) {
  const deadlines = await prisma.milestone.findMany({
    where: { dueDate: { gte: new Date() } },
    orderBy: { dueDate: "asc" },
    take: 5,
  });

  return deadlines.map((d) => ({
    id: d.id,
    title: d.title,
    dueDate: d.dueDate,
  }));
}

/**
 * Current sprint placeholder (sync with Jira later)
 */
async function getCurrentSprint(userId: string, userRole: UserRole) {
  return {
    sprintName: "Sprint Alpha",
    startDate: startOfWeek(new Date()),
    endDate: endOfWeek(new Date()),
  };
}

/**
 * Next milestone (project-wide)
 */
async function getUpcomingMilestone(userId: string, userRole: UserRole) {
  const milestone = await prisma.milestone.findFirst({
    where: { dueDate: { gte: new Date() } },
    orderBy: { dueDate: "asc" },
  });

  return milestone
    ? {
        id: milestone.id,
        title: milestone.title,
        dueDate: milestone.dueDate,
      }
    : null;
}
