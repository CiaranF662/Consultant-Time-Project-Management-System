import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole, ProjectRole } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  try {
    // Get project with all phases and allocations
    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
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
      }
    });

    if (!project) {
      return new NextResponse(JSON.stringify({ error: 'Project not found' }), { status: 404 });
    }

    // Calculate budget summary
    const totalAllocated = project.phases.reduce((sum, phase) => {
      return sum + phase.allocations.reduce((phaseSum, allocation) => {
        return phaseSum + allocation.totalHours;
      }, 0);
    }, 0);

    const totalPlanned = project.phases.reduce((sum, phase) => {
      return sum + phase.allocations.reduce((phaseSum, allocation) => {
        return phaseSum + allocation.weeklyAllocations.reduce((weekSum, week) => {
          return weekSum + week.plannedHours;
        }, 0);
      }, 0);
    }, 0);

    const budgetSummary = {
      totalBudget: project.budgetedHours,
      totalAllocated,
      totalPlanned,
      remaining: project.budgetedHours - totalAllocated,
      utilizationRate: project.budgetedHours > 0 
        ? ((totalAllocated / project.budgetedHours) * 100).toFixed(1)
        : 0
    };

    // Phase breakdown
    const phaseBreakdown = project.phases.map(phase => {
      const phaseAllocated = phase.allocations.reduce((sum, a) => sum + a.totalHours, 0);
      const phasePlanned = phase.allocations.reduce((sum, a) => {
        return sum + a.weeklyAllocations.reduce((weekSum, w) => weekSum + w.plannedHours, 0);
      }, 0);

      return {
        phaseId: phase.id,
        phaseName: phase.name,
        allocated: phaseAllocated,
        planned: phasePlanned,
        consultants: phase.allocations.map(a => ({
          consultantId: a.consultant.id,
          consultantName: a.consultant.name || a.consultant.email,
          allocated: a.totalHours,
          planned: a.weeklyAllocations.reduce((sum, w) => sum + w.plannedHours, 0)
        }))
      };
    });

    return NextResponse.json({
      project: {
        id: project.id,
        title: project.title,
        budgetedHours: project.budgetedHours
      },
      summary: budgetSummary,
      phaseBreakdown
    });
  } catch (error) {
    console.error('Error fetching budget data:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch budget' }), { status: 500 });
  }
}
