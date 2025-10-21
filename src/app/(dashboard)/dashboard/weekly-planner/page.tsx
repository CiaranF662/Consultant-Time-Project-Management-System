import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import WeeklyPlannerEnhanced from '@/components/consultant/dashboard/WeeklyPlannerEnhanced';

import { prisma } from "@/lib/prisma";

async function getPhaseAllocationsForPlanner(userId: string, includeCompleted: boolean = false) {
  // Get all phase allocations for the consultant (excluding child reallocations - they'll be nested in parent)
  const phaseAllocations = await prisma.phaseAllocation.findMany({
    where: {
      consultantId: userId,
      parentAllocationId: null // Only get parent allocations (not child reallocations)
    } as any,
    include: {
      phase: {
        include: {
          project: {
            select: { id: true, title: true, endDate: true }
          },
          sprints: {
            orderBy: { sprintNumber: 'asc' }
          }
        }
      },
      weeklyAllocations: {
        orderBy: { weekStartDate: 'asc' }
      },
      // Include child reallocations (pending hours being added to this allocation)
      childAllocations: {
        where: {
          consultantId: userId, // Only child allocations for the same consultant
          approvalStatus: 'PENDING' // Only pending child reallocations
        },
        select: {
          id: true,
          totalHours: true,
          approvalStatus: true,
          createdAt: true
        }
      }
    } as any,
    orderBy: {
      phase: {
        startDate: 'asc'
      }
    }
  }) as any;

  // Filter out completed projects if requested
  if (!includeCompleted) {
    const today = new Date();
    return phaseAllocations.filter(allocation => {
      const projectEndDate = allocation.phase.project.endDate;
      // Keep if no end date OR end date is in the future
      return !projectEndDate || new Date(projectEndDate) >= today;
    });
  }

  return phaseAllocations;
}

export default async function WeeklyPlannerPage({
  searchParams,
}: {
  searchParams: Promise<{
    includeCompleted?: string;
    phaseAllocationId?: string;
    week?: string;
  }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/auth/login');
  }

  // Redirect Growth Team to their dashboard
  if (session.user.role === UserRole.GROWTH_TEAM) {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const includeCompleted = params.includeCompleted === 'true';
  const phaseAllocations = await getPhaseAllocationsForPlanner(session.user.id, includeCompleted);

  return (

      <div className="p-6">
        <WeeklyPlannerEnhanced
          consultantId={session.user.id}
          phaseAllocations={phaseAllocations}
          includeCompleted={includeCompleted}
          initialPhaseAllocationId={params.phaseAllocationId}
          initialWeek={params.week}
        />
      </div>

  );
}