import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/api-auth';
import { UserRole } from '@prisma/client';

import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ consultantId: string }> }
) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { session, user } = auth;

  const { consultantId } = await params;
  const { id: userId, role } = session.user;
  const userRole = role as UserRole;

  // Check authorization - consultants can only see their own data, Growth Team can see all
  if (userRole !== UserRole.GROWTH_TEAM && userId !== consultantId) {
    return new NextResponse(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
  }

  try {
    // Get all phase allocations for the consultant
    const phaseAllocations = await prisma.phaseAllocation.findMany({
      where: { consultantId },
      include: {
        phase: {
          include: {
            project: true,
            sprints: true
          }
        },
        weeklyAllocations: {
          orderBy: { weekStartDate: 'asc' }
        }
      }
    });

    // Get all weekly allocations for the consultant
    const weeklyAllocations = await prisma.weeklyAllocation.findMany({
      where: { consultantId },
      include: {
        phaseAllocation: {
          include: {
            phase: {
              include: {
                project: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      phaseAllocations,
      weeklyAllocations
    });
  } catch (error) {
    console.error('Failed to fetch consultant allocations:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}