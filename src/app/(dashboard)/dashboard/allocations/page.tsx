import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import DashboardLayout from '@/app/components/DashboardLayout';
import AllocationsDashboard from '@/app/components/allocation/AllocationsDashboard';

const prisma = new PrismaClient();

async function getUserAllocationData(userId: string) {
  // Get all phase allocations for the consultant with related data
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

export default async function AllocationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login');
  }

  const data = await getUserAllocationData(session.user.id);

  return (
    <DashboardLayout>
      <AllocationsDashboard 
        data={data}
        userId={session.user.id}
        userName={session.user.name || session.user.email || 'User'}
      />
    </DashboardLayout>
  );
}