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
    const { name, description, startDate, endDate, sprintIds, consultantAllocations } = body;

    if (!name || !startDate || !endDate) {
      return new NextResponse(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const newPhaseStart = new Date(startDate);
    const newPhaseEnd = new Date(endDate);

    if (newPhaseStart >= newPhaseEnd) {
      return new NextResponse(JSON.stringify({ error: 'The phase start date must be before the end date.' }), { status: 400 });
    }

    // Validate consultantAllocations if provided - ensure they're part of the project
    if (consultantAllocations && Array.isArray(consultantAllocations) && consultantAllocations.length > 0) {
      const projectConsultants = await prisma.consultantsOnProjects.findMany({
        where: { projectId: projectId },
        select: { userId: true }
      });
      
      const projectConsultantIds = projectConsultants.map(pc => pc.userId);
      const allocationConsultantIds = consultantAllocations.map(ca => ca.consultantId);
      const invalidConsultants = allocationConsultantIds.filter(id => !projectConsultantIds.includes(id));
      
      if (invalidConsultants.length > 0) {
        return new NextResponse(JSON.stringify({ error: 'Some selected consultants are not assigned to this project' }), { status: 400 });
      }

      // Validate hours are non-negative
      const invalidHours = consultantAllocations.some(ca => ca.hours < 0);
      if (invalidHours) {
        return new NextResponse(JSON.stringify({ error: 'Hour allocations must be non-negative' }), { status: 400 });
      }
    }

    // Use a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create the phase
      const newPhase = await tx.phase.create({
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
        await tx.sprint.updateMany({
          where: { id: { in: sprintIds } },
          data: { phaseId: newPhase.id }
        });
      }

      // Create phase allocations for selected consultants with specified hours
      if (consultantAllocations && Array.isArray(consultantAllocations) && consultantAllocations.length > 0) {
        const phaseAllocations = consultantAllocations.map(allocation => ({
          phaseId: newPhase.id,
          consultantId: allocation.consultantId,
          totalHours: allocation.hours || 0,
        }));

        await tx.phaseAllocation.createMany({
          data: phaseAllocations
        });
      }

      return newPhase;
    });

    // Return the complete phase with allocations for frontend use
    const completePhase = await prisma.phase.findUnique({
      where: { id: result.id },
      include: {
        allocations: {
          include: {
            consultant: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        sprints: {
          select: { id: true, sprintNumber: true, startDate: true, endDate: true }
        }
      }
    });

    return NextResponse.json(completePhase, { status: 201 });
  } catch (error) {
    console.error('Error creating phase:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to create phase' }), { status: 500 });
  }
}