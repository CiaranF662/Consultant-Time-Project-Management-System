import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all phase allocations for the current user
    const phaseAllocations = await prisma.phaseAllocation.findMany({
      where: {
        consultantId: session.user.id,
        approvalStatus: 'APPROVED' // Only show approved allocations
      },
      include: {
        phase: {
          include: {
            project: {
              select: {
                id: true,
                title: true
              }
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

    return NextResponse.json(phaseAllocations);
  } catch (error) {
    console.error('Error fetching user allocations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}