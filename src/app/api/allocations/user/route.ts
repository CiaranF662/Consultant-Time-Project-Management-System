import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;
    const { session } = auth;

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