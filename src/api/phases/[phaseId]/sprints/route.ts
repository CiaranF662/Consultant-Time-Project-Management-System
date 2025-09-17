import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ phaseId: string }> }
) {
  const session = await getServerSession(authOptions);
  const { phaseId } = await params;

  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  // Check if user is Product Manager of this project (only PMs can assign sprints)
  const phase = await prisma.phase.findUnique({
    where: { id: phaseId },
    include: { 
      project: {
        select: { productManagerId: true }
      }
    }
  });

  if (!phase) {
    return new NextResponse(JSON.stringify({ error: 'Phase not found' }), { status: 404 });
  }

  const isProductManager = phase.project.productManagerId === session.user.id;
  if (!isProductManager) {
    return new NextResponse(JSON.stringify({ error: 'Only Product Managers can manage phase sprints' }), { status: 403 });
  }

  try {
    const body = await request.json();

    if (body.sprintIds) {
      const { sprintIds } = body;
      if (!Array.isArray(sprintIds)) {
        return new NextResponse(JSON.stringify({ error: 'An array of sprintIds is required' }), { status: 400 });
      }

      const phase = await prisma.phase.findUnique({ where: { id: phaseId }, select: { startDate: true, endDate: true } });
      if (!phase) {
        return new NextResponse(JSON.stringify({ error: 'Phase not found' }), { status: 404 });
      }

      const sprintsToAssign = await prisma.sprint.findMany({ where: { id: { in: sprintIds } } });
      for (const sprint of sprintsToAssign) {
        if (sprint.startDate < phase.startDate || sprint.endDate > phase.endDate) {
          return new NextResponse(JSON.stringify({ error: `Sprint ${sprint.sprintNumber} is outside the phase's date range.` }), { status: 400 });
        }
      }

      await prisma.sprint.updateMany({ where: { id: { in: sprintIds } }, data: { phaseId: phaseId } });
      return NextResponse.json({ success: true, message: 'Sprints assigned.' });
    }

    else if (body.name) {
      const { name, description, startDate, endDate } = body;
      const updatedPhase = await prisma.phase.update({
        where: { id: phaseId },
        data: { name, description, startDate: new Date(startDate), endDate: new Date(endDate) },
      });
      return NextResponse.json(updatedPhase);
    }

    return new NextResponse(JSON.stringify({ error: 'Invalid request body' }), { status: 400 });

  } catch (error) {
    console.error('Error updating phase:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to update phase' }), { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ phaseId: string }> }
) {
  const session = await getServerSession(authOptions);
  const { phaseId } = await params;

  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  // Check if user is Product Manager of this project (only PMs can delete phase sprints)
  const phase = await prisma.phase.findUnique({
    where: { id: phaseId },
    include: { 
      project: {
        select: { productManagerId: true }
      }
    }
  });

  if (!phase) {
    return new NextResponse(JSON.stringify({ error: 'Phase not found' }), { status: 404 });
  }

  const isProductManager = phase.project.productManagerId === session.user.id;
  if (!isProductManager) {
    return new NextResponse(JSON.stringify({ error: 'Only Product Managers can manage phase sprints' }), { status: 403 });
  }

    try {
        
        await prisma.sprint.updateMany({
            where: { phaseId: phaseId },
            data: { phaseId: null },
        });

        await prisma.phase.delete({ where: { id: phaseId } });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error deleting phase:', error);
        return new NextResponse(JSON.stringify({ error: 'Failed to delete phase' }), { status: 500 });
    }
}