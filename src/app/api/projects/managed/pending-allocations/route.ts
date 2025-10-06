import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/api-auth';
import { ProjectRole } from '@prisma/client';

import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;
    const { session, user } = auth;

    // Get pending phase allocations for projects where this user is the Product Manager
    const pendingAllocations = await prisma.phaseAllocation.findMany({
      where: {
        approvalStatus: 'PENDING',
        phase: {
          project: {
            consultants: {
              some: {
                userId: session.user.id,
                role: ProjectRole.PRODUCT_MANAGER
              }
            }
          }
        }
      },
      include: {
        consultant: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        phase: {
          include: {
            project: {
              select: {
                id: true,
                title: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(pendingAllocations);
  } catch (error) {
    console.error('Error fetching pending allocations:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}