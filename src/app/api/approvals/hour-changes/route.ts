import { NextRequest, NextResponse } from 'next/server';
import { requireGrowthTeam, isAuthError } from '@/lib/api-auth';
import { UserRole } from '@prisma/client';

import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireGrowthTeam();
    if (isAuthError(auth)) return auth;
    const { session, user } = auth;

    // Get pending hour change requests
    const pendingHourChanges = await prisma.hourChangeRequest.findMany({
      where: {
        status: 'PENDING'
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Fetch phase allocation data for each request
    const requestsWithPhaseData = await Promise.all(
      pendingHourChanges.map(async (request) => {
        let phaseAllocation = null;

        if (request.phaseAllocationId) {
          phaseAllocation = await prisma.phaseAllocation.findUnique({
            where: { id: request.phaseAllocationId },
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
              }
            }
          });
        }

        return {
          ...request,
          phaseAllocation
        };
      })
    );

    return NextResponse.json(requestsWithPhaseData);
  } catch (error) {
    console.error('Error fetching hour change requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}