import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  const session = await getServerSession(authOptions);

  if (session?.user.role !== UserRole.GROWTH_TEAM) {
    return new NextResponse(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
  }

  try {
    const { projectId } = params;
    const body = await request.json();
    const { name, description, startDate, endDate } = body;

    if (!name || !startDate || !endDate) {
      return new NextResponse(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const newPhaseStart = new Date(startDate);
    const newPhaseEnd = new Date(endDate);

    if (newPhaseStart >= newPhaseEnd) {
      return new NextResponse(JSON.stringify({ error: 'The phase start date must be before the end date.' }), { status: 400 });
    }

    // --- NEW VALIDATION LOGIC ---
    // 1. Get all existing phases for this project
    const existingPhases = await prisma.phase.findMany({
      where: { projectId: projectId },
    });

    // 2. Check for overlaps
    for (const phase of existingPhases) {
      const existingStart = new Date(phase.startDate);
      const existingEnd = new Date(phase.endDate);

      // Overlap condition: (StartA <= EndB) and (EndA >= StartB)
      if (newPhaseStart <= existingEnd && newPhaseEnd >= existingStart) {
        return new NextResponse(
          JSON.stringify({
            error: `Date range overlaps with existing phase "${phase.name}".`,
          }),
          { status: 400 } // Bad Request
        );
      }
    }
    // --- END VALIDATION LOGIC ---

    const newPhase = await prisma.phase.create({
      data: {
        name,
        description,
        startDate: newPhaseStart,
        endDate: newPhaseEnd,
        projectId: projectId,
      },
    });

    return NextResponse.json(newPhase, { status: 201 });
  } catch (error) {
    console.error('Error creating phase:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to create phase' }), { status: 500 });
  }
}