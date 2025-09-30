import { NextResponse } from 'next/server';
import { requireGrowthTeam, isAuthError } from '@/lib/api-auth';
import { UserRole } from '@prisma/client';

import { prisma } from "@/lib/prisma";

// GET pending phase allocations for Growth Team approval
export async function GET(request: Request) {
  const auth = await requireGrowthTeam();
  if (isAuthError(auth)) return auth;
  const { session, user } = auth;

  try {
    const pendingAllocations = await prisma.phaseAllocation.findMany({
      where: {
        approvalStatus: 'PENDING'
      },
      include: {
        consultant: {
          select: { id: true, name: true, email: true }
        },
        phase: {
          include: {
            project: {
              select: { id: true, title: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json(pendingAllocations);
  } catch (error) {
    console.error('Error fetching pending phase allocations:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch pending allocations' }), { status: 500 });
  }
}