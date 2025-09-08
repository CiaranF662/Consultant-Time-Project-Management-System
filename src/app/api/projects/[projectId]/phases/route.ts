import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getServerSession(authOptions);
  const { projectId } = await params;

  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  // Check if user is Product Manager of this project (only PMs can create phases)
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { productManagerId: true }
  });

  if (!project) {
    return new NextResponse(JSON.stringify({ error: 'Project not found' }), { status: 404 });
  }

  const isProductManager = project.productManagerId === session.user.id;
  if (!isProductManager) {
    return new NextResponse(JSON.stringify({ error: 'Only Product Managers can create phases' }), { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, description, startDate, endDate, sprintIds } = body;

    if (!name || !startDate || !endDate) {
      return new NextResponse(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const newPhaseStart = new Date(startDate);
    const newPhaseEnd = new Date(endDate);

    if (newPhaseStart >= newPhaseEnd) {
      return new NextResponse(JSON.stringify({ error: 'The phase start date must be before the end date.' }), { status: 400 });
    }

    // Note: Phases are allowed to overlap since they can share sprints

    const newPhase = await prisma.phase.create({
      data: {
        name,
        description,
        startDate: newPhaseStart,
        endDate: newPhaseEnd,
        projectId: projectId,
      },
    });

    // Assign sprints to the phase if sprintIds are provided
    if (sprintIds && Array.isArray(sprintIds) && sprintIds.length > 0) {
      await prisma.sprint.updateMany({
        where: { id: { in: sprintIds } },
        data: { phaseId: newPhase.id }
      });
    }

    return NextResponse.json(newPhase, { status: 201 });
  } catch (error) {
    console.error('Error creating phase:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to create phase' }), { status: 500 });
  }
}