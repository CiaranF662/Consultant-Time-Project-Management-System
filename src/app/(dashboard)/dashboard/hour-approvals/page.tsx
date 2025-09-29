import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';
import DashboardLayout from '@/app/components/DashboardLayout';
import ApprovalsDashboard from '@/app/components/approvals/ApprovalsDashboard';

const prisma = new PrismaClient();

async function getHourApprovalsData() {
  // Get all pending phase allocations that need approval
  const pendingAllocations = await prisma.phaseAllocation.findMany({
    where: {
      approvalStatus: 'PENDING'
    },
    include: {
      consultant: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      phase: {
        select: {
          id: true,
          name: true,
          description: true,
          startDate: true,
          endDate: true,
          project: {
            select: {
              id: true,
              title: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Get pending hour change requests
  const pendingHourChanges = await prisma.hourChangeRequest.findMany({
    where: {
      status: 'PENDING'
    },
    include: {
      requester: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Fetch phase allocation data for each request
  const hourChangesWithPhaseData = await Promise.all(
    pendingHourChanges.map(async (request) => {
      let phaseAllocation = null;

      if (request.phaseAllocationId) {
        phaseAllocation = await prisma.phaseAllocation.findUnique({
          where: { id: request.phaseAllocationId },
          include: {
            phase: {
              include: {
                project: {
                  select: {
                    id: true,
                    title: true
                  }
                }
              }
            }
          }
        });
      }

      return {
        ...request,
        phaseAllocation
      };
    })
  );

  // Get pending weekly allocations
  const pendingWeeklyAllocations = await prisma.weeklyAllocation.findMany({
    where: {
      planningStatus: 'PENDING'
    },
    include: {
      consultant: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      phaseAllocation: {
        include: {
          phase: {
            include: {
              project: {
                select: {
                  id: true,
                  title: true
                }
              },
              sprints: {
                orderBy: {
                  sprintNumber: 'asc'
                }
              }
            }
          }
        }
      }
    },
    orderBy: [
      { weekStartDate: 'asc' },
      { consultant: { name: 'asc' } }
    ]
  });

  // Group weekly allocations by week and consultant for easier approval UI
  const groupedWeeklyAllocations = pendingWeeklyAllocations.reduce((acc, allocation) => {
    const weekKey = new Date(allocation.weekStartDate).toISOString().split('T')[0];
    const consultantId = allocation.consultantId;

    if (!acc[weekKey]) {
      acc[weekKey] = {};
    }

    if (!acc[weekKey][consultantId]) {
      acc[weekKey][consultantId] = {
        consultant: allocation.consultant,
        totalProposed: 0,
        allocations: []
      };
    }

    acc[weekKey][consultantId].totalProposed += allocation.proposedHours || 0;
    acc[weekKey][consultantId].allocations.push(allocation);

    return acc;
  }, {} as any);

  return {
    pendingAllocations,
    pendingHourChanges: hourChangesWithPhaseData,
    pendingWeeklyAllocations: { grouped: groupedWeeklyAllocations, raw: pendingWeeklyAllocations }
  };
}

export default async function HourApprovalsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== UserRole.GROWTH_TEAM) {
    redirect('/dashboard');
  }

  const data = await getHourApprovalsData();

  return (
    <DashboardLayout>
      <ApprovalsDashboard
        userRole={session.user.role}
        pendingAllocations={data.pendingAllocations}
        pendingHourChanges={data.pendingHourChanges}
        pendingWeeklyAllocations={data.pendingWeeklyAllocations}
        showFullInterface={true}
      />
    </DashboardLayout>
  );
}