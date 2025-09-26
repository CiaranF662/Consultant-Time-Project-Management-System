import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { startOfWeek, endOfWeek, getISOWeek, getYear } from 'date-fns';

const prisma = new PrismaClient();

// GET weekly allocations for a consultant
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const consultantId = searchParams.get('consultantId') || session.user.id;
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    const whereClause: any = { consultantId };
    
    if (startDate && endDate) {
      whereClause.weekStartDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const allocations = await prisma.weeklyAllocation.findMany({
      where: whereClause,
      include: {
        phaseAllocation: {
          include: {
            phase: {
              include: {
                project: {
                  select: { id: true, title: true }
                }
              }
            }
          }
        }
      },
      orderBy: { weekStartDate: 'asc' }
    });

    return NextResponse.json(allocations);
  } catch (error) {
    console.error('Error fetching weekly allocations:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch allocations' }), { status: 500 });
  }
}

// POST create or update weekly allocation
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  try {
    const body = await request.json();
    const { phaseAllocationId, weekStartDate, plannedHours, consultantDescription, clearRejection } = body;
    
    console.log('Weekly allocation request:', {
      phaseAllocationId,
      weekStartDate,
      plannedHours: typeof plannedHours,
      plannedHoursValue: plannedHours,
      consultantId: session.user.id,
      clearRejection
    });

    // Validate required fields
    if (!phaseAllocationId) {
      return new NextResponse(JSON.stringify({ error: 'phaseAllocationId is required' }), { status: 400 });
    }

    if (!weekStartDate) {
      return new NextResponse(JSON.stringify({ error: 'weekStartDate is required' }), { status: 400 });
    }

    if (plannedHours === undefined || plannedHours === null) {
      return new NextResponse(JSON.stringify({ error: 'plannedHours is required' }), { status: 400 });
    }

    if (typeof plannedHours !== 'number' || plannedHours < 0) {
      return new NextResponse(JSON.stringify({ error: 'plannedHours must be a non-negative number' }), { status: 400 });
    }

    // Verify the consultant owns this allocation and it's approved
    const phaseAllocation = await prisma.phaseAllocation.findUnique({
      where: { id: phaseAllocationId }
    });

    if (!phaseAllocation || phaseAllocation.consultantId !== session.user.id) {
      return new NextResponse(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
    }

    if (phaseAllocation.approvalStatus !== 'APPROVED') {
      return new NextResponse(JSON.stringify({ error: 'Phase allocation must be approved before weekly planning' }), { status: 400 });
    }

    const weekStart = startOfWeek(new Date(weekStartDate), { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(new Date(weekStartDate), { weekStartsOn: 1 });
    const weekNumber = getISOWeek(weekStart);
    const year = getYear(weekStart);

    // Check if allocation exists
    const existing = await prisma.weeklyAllocation.findUnique({
      where: {
        phaseAllocationId_weekNumber_year: {
          phaseAllocationId,
          weekNumber,
          year
        }
      }
    });

    // Update consultant description if provided
    if (consultantDescription !== undefined) {
      await prisma.phaseAllocation.update({
        where: { id: phaseAllocationId },
        data: { consultantDescription }
      });
    }

    let allocation;
    if (existing) {
      console.log('Updating existing allocation:', {
        id: existing.id,
        currentStatus: existing.planningStatus,
        currentRejectionReason: existing.rejectionReason,
        newHours: plannedHours
      });

      // Update existing allocation (reset to PENDING if modifying)
      allocation = await prisma.weeklyAllocation.update({
        where: { id: existing.id },
        data: {
          proposedHours: plannedHours,
          planningStatus: 'PENDING',
          plannedBy: session.user.id,
          approvedHours: null,
          approvedBy: null,
          approvedAt: null,
          rejectionReason: null
        }
      });

      console.log('Updated allocation:', {
        id: allocation.id,
        newStatus: allocation.planningStatus,
        newRejectionReason: allocation.rejectionReason,
        proposedHours: allocation.proposedHours
      });
    } else {
      // Create new allocation (requires Growth Team approval)
      allocation = await prisma.weeklyAllocation.create({
        data: {
          phaseAllocationId,
          consultantId: session.user.id,
          weekStartDate: weekStart,
          weekEndDate: weekEnd,
          weekNumber,
          year,
          proposedHours: plannedHours,
          planningStatus: 'PENDING',
          plannedBy: session.user.id
        }
      });
    }

    // Note: Timeline update is handled on the client side after successful API response
    // This ensures real-time updates when allocation data changes
    return NextResponse.json(allocation);
  } catch (error: any) {
    console.error('Error saving weekly allocation:', error);
    console.error('Error details:', error?.message);
    if (error?.code) console.error('Error code:', error.code);
    return new NextResponse(JSON.stringify({ 
      error: 'Failed to save allocation',
      details: error?.message || 'Unknown error'
    }), { status: 500 });
  }
}
