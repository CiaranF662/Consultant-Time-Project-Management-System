import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  const userId = session.user.id;

  try {
    // Get all phase allocations for the consultant with related data (same as allocations page)
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

    const consultantData = {
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

    return NextResponse.json(consultantData);
  } catch (error) {
    console.error('Failed to fetch consultant data:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}