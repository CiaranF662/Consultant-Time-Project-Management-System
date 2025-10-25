import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import ApprovalsDashboard from '@/components/growth-team/approvals/ApprovalsDashboard';

import { prisma } from "@/lib/prisma";

async function getHourApprovalsData() {
  // Get all pending phase allocations that need approval (including deletion requests)
  const pendingAllocations = await prisma.phaseAllocation.findMany({
    where: {
      approvalStatus: {
        in: ['PENDING', 'DELETION_PENDING']
      }
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
        include: {
          project: {
            include: {
              productManager: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          },
          sprints: {
            orderBy: {
              sprintNumber: 'asc'
            }
          }
        }
      },
      weeklyAllocations: {
        where: {
          planningStatus: 'APPROVED'
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // For each pending allocation, check if it's a reallocation by looking for UnplannedExpiredHours pointing to it
  // Also fetch parent allocation if this is a Scenario 1 reallocation (child of approved allocation)
  const allocationsWithReallocationInfo = await Promise.all(
    pendingAllocations.map(async (allocation: any) => {
      const reallocationSource = await prisma.unplannedExpiredHours.findFirst({
        where: {
          reallocatedToAllocationId: allocation.id,
          status: 'REALLOCATED'
        },
        include: {
          phaseAllocation: {
            include: {
              phase: {
                select: {
                  id: true,
                  name: true,
                  project: {
                    select: {
                      id: true,
                      title: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      // Fetch parent allocation if this is a child reallocation (Scenario 1)
      let parentAllocation = null;
      if (allocation.parentAllocationId) {
        parentAllocation = await prisma.phaseAllocation.findUnique({
          where: { id: allocation.parentAllocationId },
          select: {
            id: true,
            totalHours: true,
            approvalStatus: true,
            createdAt: true,
            approvedAt: true
          }
        });
      }

      // Debug: Log product manager data
      console.log('Allocation:', allocation.id, 'PM:', allocation.phase?.project?.productManager);

      return {
        ...allocation,
        reallocationSource,
        parentAllocation
      };
    })
  );

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

  // Get all weekly allocations for the same weeks to show consultant workload context
  const weekStartDates = [...new Set(pendingWeeklyAllocations.map(a => a.weekStartDate))];
  const consultantIds = [...new Set(pendingWeeklyAllocations.map(a => a.consultantId))];

  const allWeeklyAllocations = await prisma.weeklyAllocation.findMany({
    where: {
      weekStartDate: { in: weekStartDates },
      consultantId: { in: consultantIds },
      planningStatus: { in: ['APPROVED', 'MODIFIED'] } // Only show approved work
    },
    include: {
      phaseAllocation: {
        include: {
          phase: {
            include: {
              project: {
                select: { id: true, title: true }
              }
            }
          }
        }
      }
    }
  });

  // Group approved allocations by consultant and week for context
  const workloadContext = allWeeklyAllocations.reduce((acc, allocation) => {
    const weekKey = new Date(allocation.weekStartDate).toISOString().split('T')[0];
    const consultantId = allocation.consultantId;

    if (!acc[consultantId]) {
      acc[consultantId] = {};
    }

    if (!acc[consultantId][weekKey]) {
      acc[consultantId][weekKey] = {
        totalApprovedHours: 0,
        projects: []
      };
    }

    // Use approvedHours if available (for MODIFIED status), otherwise use proposedHours (for APPROVED status)
    const hours = allocation.approvedHours ?? allocation.proposedHours ?? 0;

    acc[consultantId][weekKey].totalApprovedHours += hours;
    acc[consultantId][weekKey].projects.push({
      projectTitle: allocation.phaseAllocation.phase.project.title,
      phaseName: allocation.phaseAllocation.phase.name,
      hours
    });

    return acc;
  }, {} as any);

  // Group weekly allocations by week and consultant for easier approval UI, including workload context
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
        allocations: [],
        weeklyWorkload: workloadContext[consultantId]?.[weekKey] || { totalApprovedHours: 0, projects: [] }
      };
    }

    acc[weekKey][consultantId].totalProposed += allocation.proposedHours || 0;
    acc[weekKey][consultantId].allocations.push(allocation);

    return acc;
  }, {} as any);

  return {
    pendingAllocations: allocationsWithReallocationInfo,
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
    
      <ApprovalsDashboard
        userRole={session.user.role}
        pendingAllocations={data.pendingAllocations}
        pendingHourChanges={data.pendingHourChanges}
        pendingWeeklyAllocations={data.pendingWeeklyAllocations}
        showFullInterface={true}
      />
    
  );
}