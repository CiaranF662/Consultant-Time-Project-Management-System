import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  const { projectId } = await params;
  const { id: userId, role } = session.user;
  const userRole = role as UserRole;

  // Check authorization - Growth Team can see all projects, others only assigned projects
  const whereClause =
    userRole === UserRole.GROWTH_TEAM
      ? { id: projectId }
      : { id: projectId, consultants: { some: { userId: userId } } };

  try {
    const project = await prisma.project.findFirst({
      where: whereClause,
      include: {
        phases: {
          include: {
            allocations: {
              include: {
                consultant: {
                  select: { id: true, name: true, email: true }
                },
                weeklyAllocations: true
              }
            }
          }
        }
      },
    });

    if (!project) {
      return new NextResponse(JSON.stringify({ error: 'Project not found or not authorized' }), { status: 404 });
    }

    // Calculate budget data
    const phases = project.phases.map(phase => {
      const consultants = phase.allocations.map(allocation => {
        const usedHours = allocation.weeklyAllocations.reduce((sum, wa) => sum + wa.plannedHours, 0);
        
        return {
          id: allocation.consultant.id,
          name: allocation.consultant.name || allocation.consultant.email || 'Unknown',
          allocatedHours: allocation.totalHours,
          usedHours: usedHours
        };
      });

      return {
        id: phase.id,
        name: phase.name,
        allocatedHours: phase.allocations.reduce((sum, a) => sum + a.totalHours, 0),
        usedHours: consultants.reduce((sum, c) => sum + c.usedHours, 0),
        consultants
      };
    });

    const summary = {
      totalAllocated: phases.reduce((sum, p) => sum + p.allocatedHours, 0),
      totalUsed: phases.reduce((sum, p) => sum + p.usedHours, 0),
      totalRemaining: project.budgetedHours - phases.reduce((sum, p) => sum + p.usedHours, 0),
      utilizationPercentage: project.budgetedHours > 0 ? 
        (phases.reduce((sum, p) => sum + p.usedHours, 0) / project.budgetedHours) * 100 : 0,
      allocationPercentage: project.budgetedHours > 0 ? 
        (phases.reduce((sum, p) => sum + p.allocatedHours, 0) / project.budgetedHours) * 100 : 0
    };

    const budgetData = {
      projectId: project.id,
      projectTitle: project.title,
      totalBudgetHours: project.budgetedHours,
      phases,
      summary
    };

    return NextResponse.json(budgetData);
  } catch (error) {
    console.error('Failed to fetch budget data:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}