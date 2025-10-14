import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/api-auth';
import { PrismaClient } from '@prisma/client';

import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { session, user } = auth;

  const userId = session.user.id;

  try {
    // Get current and upcoming phase allocations for the consultant (exclude past phases)
    const today = new Date();
    const phaseAllocations = await prisma.phaseAllocation.findMany({
      where: {
        consultantId: userId,
        phase: {
          endDate: {
            gte: today // Only phases that haven't ended yet
          }
        }
      },
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
          startDate: 'asc' // Sort by most recent start date (earliest first)
        }
      }
    });

    // Get upcoming weeks where allocation is needed
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