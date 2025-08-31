import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole, ProjectRole } from '@prisma/client';

const prisma = new PrismaClient();

// GET all allocations for a phase
export async function GET(
  request: Request,
  { params }: { params: { phaseId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  try {
    const allocations = await prisma.phaseAllocation.findMany({
      where: { phaseId: params.phaseId },
      include: {
        consultant: {
          select: { id: true, name: true, email: true }
        },
        weeklyAllocations: {
          orderBy: { weekStartDate: 'asc' }
        }
      }
    });

    return NextResponse.json(allocations);
  } catch (error) {
    console.error('Error fetching phase allocations:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch allocations' }), { status: 500 });
  }
}

// POST create or update phase allocation
export async function POST(
  request: Request,
  { params }: { params: { phaseId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  // Check if user is Growth Team or PM for this project
  const phase = await prisma.phase.findUnique({
    where: { id: params.phaseId },
    include: { 
      project: {
        include: {
          consultants: {
            where: { 
              userId: session.user.id,
              role: ProjectRole.PRODUCT_MANAGER
            }
          }
        }
      }
    }
  });

  if (!phase) {
    return new NextResponse(JSON.stringify({ error: 'Phase not found' }), { status: 404 });
  }

  const isPM = phase.project.consultants.length > 0;
  if (session.user.role !== UserRole.GROWTH_TEAM && !isPM) {
    return new NextResponse(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
  }

  try {
    const body = await request.json();
    const { consultantId, totalHours } = body;

    // Check if allocation already exists
    const existing = await prisma.phaseAllocation.findUnique({
      where: {
        phaseId_consultantId: {
          phaseId: params.phaseId,
          consultantId
        }
      }
    });

    let allocation;
    if (existing) {
      // Update existing allocation
      allocation = await prisma.phaseAllocation.update({
        where: { id: existing.id },
        data: { totalHours },
        include: { consultant: true }
      });
    } else {
      // Create new allocation
      allocation = await prisma.phaseAllocation.create({
        data: {
          phaseId: params.phaseId,
          consultantId,
          totalHours
        },
        include: { consultant: true }
      });
    }

    return NextResponse.json(allocation, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error('Error creating/updating phase allocation:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to save allocation' }), { status: 500 });
  }
}