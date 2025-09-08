import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, ProjectRole } from '@prisma/client';

const prisma = new PrismaClient();

// GET all allocations for a phase
export async function GET(
  request: Request,
  { params }: { params: Promise<{ phaseId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  const { phaseId } = await params;

  try {
    const allocations = await prisma.phaseAllocation.findMany({
      where: { phaseId },
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
  { params }: { params: Promise<{ phaseId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  const { phaseId } = await params;

  // Check if user is Growth Team or PM for this project
  const phase = await prisma.phase.findUnique({
    where: { id: phaseId },
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
  if (!isPM) {
    return new NextResponse(JSON.stringify({ error: 'Only Product Managers can create phase allocations' }), { status: 403 });
  }

  try {
    const body = await request.json();
    const { consultantId, totalHours } = body;

    // Check if allocation already exists
    const existing = await prisma.phaseAllocation.findUnique({
      where: {
        phaseId_consultantId: {
          phaseId,
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
          phaseId,
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

// PUT bulk update phase allocations
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ phaseId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  const { phaseId } = await params;

  try {
    const body = await request.json();
    const { allocations } = body;

    // Validate that the user is a PM for the project containing this phase
    const phase = await prisma.phase.findUnique({
      where: { id: phaseId },
      include: {
        project: {
          include: {
            consultants: true
          }
        }
      }
    });

    if (!phase) {
      return new NextResponse(JSON.stringify({ error: 'Phase not found' }), { status: 404 });
    }

    const isProductManager = phase.project.consultants.some(
      consultant => consultant.userId === session.user.id && consultant.role === ProjectRole.PRODUCT_MANAGER
    );

    if (!isProductManager) {
      return new NextResponse(JSON.stringify({ error: 'Only Product Managers can update phase allocations' }), { status: 403 });
    }

    // Validate allocations
    if (!Array.isArray(allocations)) {
      return new NextResponse(JSON.stringify({ error: 'Invalid allocations data' }), { status: 400 });
    }

    // Ensure all consultants are part of the project
    const projectConsultantIds = phase.project.consultants.map(c => c.userId);
    const invalidConsultants = allocations.filter(
      alloc => !projectConsultantIds.includes(alloc.consultantId)
    );

    if (invalidConsultants.length > 0) {
      return new NextResponse(JSON.stringify({ error: 'Some consultants are not part of the project' }), { status: 400 });
    }

    // Use transaction to update allocations
    await prisma.$transaction(async (tx) => {
      // Delete existing allocations
      await tx.phaseAllocation.deleteMany({
        where: { phaseId }
      });

      // Create new allocations
      if (allocations.length > 0) {
        await tx.phaseAllocation.createMany({
          data: allocations.map((alloc: any) => ({
            phaseId,
            consultantId: alloc.consultantId,
            totalHours: parseFloat(alloc.totalHours)
          }))
        });
      }
    });

    // Fetch updated phase with allocations
    const updatedPhase = await prisma.phase.findUnique({
      where: { id: phaseId },
      include: {
        allocations: {
          include: {
            consultant: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });

    return NextResponse.json(updatedPhase);

  } catch (error) {
    console.error('Error updating phase allocations:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to update allocations' }), { status: 500 });
  }
}