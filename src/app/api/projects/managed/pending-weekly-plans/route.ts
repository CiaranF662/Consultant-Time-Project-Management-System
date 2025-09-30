import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/api-auth';
import { ProjectRole } from '@prisma/client';

import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;
    const { session, user } = auth;

    // Get pending weekly planning requests from consultants in projects where this user is the Product Manager
    const pendingWeeklyRequests = await prisma.weeklyAllocation.findMany({
      where: {
        planningStatus: 'PENDING',
        phaseAllocation: {
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
        phaseAllocation: {
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
        }
      },
      orderBy: [
        { weekStartDate: 'asc' },
        { consultant: { name: 'asc' } }
      ]
    });

    return NextResponse.json(pendingWeeklyRequests);
  } catch (error) {
    console.error('Error fetching pending weekly plans:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}