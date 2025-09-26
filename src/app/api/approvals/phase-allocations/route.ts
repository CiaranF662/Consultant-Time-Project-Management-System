import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

// GET pending phase allocations for Growth Team approval
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
    return new NextResponse(JSON.stringify({ error: 'Only Growth Team can access phase allocation approvals' }), { status: 403 });
  }

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