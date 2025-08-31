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
    const { phaseAllocationId, weekStartDate, plannedHours } = body;

    // Verify the consultant owns this allocation
    const phaseAllocation = await prisma.phaseAllocation.findUnique({
      where: { id: phaseAllocationId }
    });

    if (!phaseAllocation || phaseAllocation.consultantId !== session.user.id) {
      return new NextResponse(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
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

    let allocation;
    if (existing) {
      allocation = await prisma.weeklyAllocation.update({
        where: { id: existing.id },
        data: { plannedHours }
      });
    } else {
      allocation = await prisma.weeklyAllocation.create({
        data: {
          phaseAllocationId,
          consultantId: session.user.id,
          weekStartDate: weekStart,
          weekEndDate: weekEnd,
          weekNumber,
          year,
          plannedHours
        }
      });
    }

    return NextResponse.json(allocation);
  } catch (error) {
    console.error('Error saving weekly allocation:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to save allocation' }), { status: 500 });
  }
}
