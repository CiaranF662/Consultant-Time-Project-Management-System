import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

export async function PATCH(
  request: Request,
  { params }: { params: { phaseId: string } }
) {
  const session = await getServerSession(authOptions);

  if (session?.user.role !== UserRole.GROWTH_TEAM) {
    return new NextResponse(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
  }

  try {
    const { phaseId } = params;
    const { sprintIds } = await request.json();

    if (!sprintIds || !Array.isArray(sprintIds)) {
      return new NextResponse(JSON.stringify({ error: 'An array of sprintIds is required' }), { status: 400 });
    }

    // --- NEW VALIDATION LOGIC ---

    // 1. Fetch the phase's date range
    const phase = await prisma.phase.findUnique({
      where: { id: phaseId },
      select: { startDate: true, endDate: true },
    });

    if (!phase) {
      return new NextResponse(JSON.stringify({ error: 'Phase not found' }), { status: 404 });
    }

    // 2. Fetch the sprints the user is trying to assign
    const sprintsToAssign = await prisma.sprint.findMany({
      where: {
        id: { in: sprintIds },
      },
      select: { startDate: true, endDate: true, sprintNumber: true },
    });

    // 3. Check if any sprint falls outside the phase's date range
    for (const sprint of sprintsToAssign) {
      if (sprint.startDate < phase.startDate || sprint.endDate > phase.endDate) {
        return new NextResponse(
          JSON.stringify({
            error: `Sprint ${sprint.sprintNumber} (${sprint.startDate.toLocaleDateString()} - ${sprint.endDate.toLocaleDateString()}) is outside the date range of the phase.`,
          }),
          { status: 400 } // Bad Request
        );
      }
    }
    // --- END VALIDATION LOGIC ---

    // If all sprints are valid, proceed with the update
    await prisma.sprint.updateMany({
      where: {
        id: {
          in: sprintIds,
        },
      },
      data: {
        phaseId: phaseId,
      },
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error assigning sprints:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to assign sprints' }), { status: 500 });
  }
}