import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

// GET pending weekly allocations for Growth Team approval
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  // Check if user is Growth Team
  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  });

  if (user?.role !== UserRole.GROWTH_TEAM) {
    return new NextResponse(JSON.stringify({ error: 'Only Growth Team can access weekly allocation approvals' }), { status: 403 });
  }

  const url = new URL(request.url);
  const weekStartDate = url.searchParams.get('weekStartDate');

  try {
    let whereClause: any = {
      planningStatus: 'PENDING'
    };

    // Filter by specific week if provided
    if (weekStartDate) {
      whereClause.weekStartDate = new Date(weekStartDate);
    }

    const pendingAllocations = await prisma.weeklyAllocation.findMany({
      where: whereClause,
      include: {
        consultant: {
          select: { id: true, name: true, email: true }
        },
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
      orderBy: [
        { weekStartDate: 'asc' },
        { consultant: { name: 'asc' } }
      ]
    });

    // Group by week and consultant for easier approval UI
    const groupedAllocations = pendingAllocations.reduce((acc, allocation) => {
      const weekKey = allocation.weekStartDate.toISOString().split('T')[0];
      const consultantId = allocation.consultantId;

      if (!acc[weekKey]) {
        acc[weekKey] = {};
      }

      if (!acc[weekKey][consultantId]) {
        acc[weekKey][consultantId] = {
          consultant: allocation.consultant,
          totalProposed: 0,
          allocations: []
        };
      }

      acc[weekKey][consultantId].totalProposed += allocation.proposedHours || 0;
      acc[weekKey][consultantId].allocations.push(allocation);

      return acc;
    }, {} as any);

    return NextResponse.json({ grouped: groupedAllocations, raw: pendingAllocations });
  } catch (error) {
    console.error('Error fetching pending weekly allocations:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch pending allocations' }), { status: 500 });
  }
}