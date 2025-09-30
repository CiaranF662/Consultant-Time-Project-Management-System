import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import WeeklyPlannerEnhanced from '@/components/consultant/dashboard/WeeklyPlannerEnhanced';

import { prisma } from "@/lib/prisma";

async function getPhaseAllocationsForPlanner(userId: string) {
  // Get all phase allocations for the consultant - this is what WeeklyPlannerEnhanced needs
  const phaseAllocations = await prisma.phaseAllocation.findMany({
    where: { consultantId: userId },
    include: {
      phase: {
        include: {
          project: {
            select: { id: true, title: true }
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

  return phaseAllocations;
}

export default async function WeeklyPlannerPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login');
  }

  // Redirect Growth Team to their dashboard
  if (session.user.role === UserRole.GROWTH_TEAM) {
    redirect('/dashboard');
  }

  const phaseAllocations = await getPhaseAllocationsForPlanner(session.user.id);

  return (
    
      <div className="p-6">
        <WeeklyPlannerEnhanced
          consultantId={session.user.id}
          phaseAllocations={phaseAllocations}
        />
      </div>
    
  );
}