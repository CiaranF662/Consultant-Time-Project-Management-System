import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PUT update consultant description for a phase allocation
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ phaseId: string; allocationId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  const { phaseId, allocationId } = await params;

  try {
    const body = await request.json();
    const { consultantDescription } = body;

    // Verify the allocation exists and belongs to the consultant
    const allocation = await prisma.phaseAllocation.findUnique({
      where: { id: allocationId },
      include: { phase: true }
    });

    if (!allocation) {
      return new NextResponse(JSON.stringify({ error: 'Allocation not found' }), { status: 404 });
    }

    if (allocation.consultantId !== session.user.id) {
      return new NextResponse(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
    }

    if (allocation.phaseId !== phaseId) {
      return new NextResponse(JSON.stringify({ error: 'Phase mismatch' }), { status: 400 });
    }

    // Update the consultant description
    const updatedAllocation = await prisma.phaseAllocation.update({
      where: { id: allocationId },
      data: { consultantDescription }
    });

    return NextResponse.json(updatedAllocation);
  } catch (error) {
    console.error('Error updating consultant description:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to update description' }), { status: 500 });
  }
}