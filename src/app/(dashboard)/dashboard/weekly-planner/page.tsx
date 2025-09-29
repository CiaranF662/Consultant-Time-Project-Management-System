import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';
import DashboardLayout from '@/app/components/DashboardLayout';
import WeeklyPlannerEnhanced from '@/app/components/allocation/WeeklyPlannerEnhanced';

const prisma = new PrismaClient();

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
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Weekly Planner</h1>
          <p className="text-lg text-gray-600">
            Plan and distribute your weekly hours across project phases
          </p>
        </div>

        {/* Weekly Planner Component */}
        <div className="bg-white rounded-lg shadow-md border">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold text-gray-800">Hour Distribution</h2>
            <p className="text-sm text-gray-600">Distribute your allocated hours across weeks</p>
          </div>
          <WeeklyPlannerEnhanced
            consultantId={session.user.id}
            phaseAllocations={phaseAllocations}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}