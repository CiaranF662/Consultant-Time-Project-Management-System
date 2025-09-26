import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== UserRole.GROWTH_TEAM) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get pending phase allocations count
    const pendingPhaseAllocations = await prisma.phaseAllocation.count({
      where: {
        approvalStatus: 'PENDING'
      }
    });

    // Get pending weekly plans count (grouped by weeks)
    const pendingWeeklyAllocations = await prisma.weeklyAllocation.findMany({
      where: {
        planningStatus: 'PENDING'
      },
      select: {
        weekNumber: true,
        year: true
      },
      distinct: ['weekNumber', 'year']
    });

    // Get pending hour change requests count
    const pendingHourChanges = await prisma.hourChangeRequest.count({
      where: {
        status: 'PENDING'
      }
    });

    const summary = {
      pendingPhaseAllocations,
      pendingWeeklyPlans: pendingWeeklyAllocations.length,
      pendingHourChanges,
      totalPending: pendingPhaseAllocations + pendingWeeklyAllocations.length + pendingHourChanges
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching approvals summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}