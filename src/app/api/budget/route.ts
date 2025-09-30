import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

// GET all projects budget overview - only for Growth Team
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  // Only Growth Team can access budget overview
  if (session.user.role !== UserRole.GROWTH_TEAM) {
    return new NextResponse(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
  }

  try {
    // Get all projects with phases and allocations
    const projects = await prisma.project.findMany({
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
        },
        consultants: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate budget data for each project
    const budgetData = projects.map(project => {
      const totalAllocated = project.phases.reduce((sum, phase) => {
        return sum + phase.allocations.reduce((phaseSum, allocation) => {
          return phaseSum + allocation.totalHours;
        }, 0);
      }, 0);

      const totalPlanned = project.phases.reduce((sum, phase) => {
        return sum + phase.allocations.reduce((phaseSum, allocation) => {
          return phaseSum + allocation.weeklyAllocations.reduce((weekSum, week) => {
            return weekSum + (week.proposedHours || 0);
          }, 0);
        }, 0);
      }, 0);

      return {
        id: project.id,
        title: project.title,
        budgetedHours: project.budgetedHours,
        totalAllocated,
        totalPlanned,
        remaining: project.budgetedHours - totalAllocated,
        utilizationRate: project.budgetedHours > 0
          ? ((totalAllocated / project.budgetedHours) * 100).toFixed(1)
          : 0,
        teamSize: project.consultants.length,
        phaseCount: project.phases.length
      };
    });

    return NextResponse.json({ projects: budgetData });
  } catch (error) {
    console.error('Error fetching budget overview:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch budget overview' }), { status: 500 });
  }
}