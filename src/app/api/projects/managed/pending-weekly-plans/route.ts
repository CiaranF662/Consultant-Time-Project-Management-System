import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient, ProjectRole } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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