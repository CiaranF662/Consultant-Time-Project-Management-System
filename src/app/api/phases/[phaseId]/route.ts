import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/api-auth';
import { logError, logApiRequest, logAuthorizationFailure } from '@/lib/error-logger';
import { prisma } from "@/lib/prisma";
import { isPhaseLocked } from '@/lib/phase-lock';
import { UserRole } from '@prisma/client';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ phaseId: string }> }
) {
  const { phaseId } = await params;
  logApiRequest('PUT', `/api/phases/${phaseId}`);

  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { session } = auth;

  try {
    const body = await request.json();
    const { name, description, sprintIds } = body;

    // Validate input
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Phase name is required' },
        { status: 400 }
      );
    }

    if (!sprintIds || !Array.isArray(sprintIds) || sprintIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one sprint must be selected' },
        { status: 400 }
      );
    }

    // Get the phase with project info
    const phase = await prisma.phase.findUnique({
      where: { id: phaseId },
      include: {
        project: {
          select: {
            id: true,
            productManagerId: true
          }
        },
        sprints: true
      }
    });

    if (!phase) {
      return NextResponse.json(
        { error: 'Phase not found' },
        { status: 404 }
      );
    }

    // Check if user is Product Manager of this project
    const isProductManager = phase.project.productManagerId === session.user.id;
    if (!isProductManager) {
      logAuthorizationFailure(session.user.id, 'update phase', `phase:${phaseId}`);
      return NextResponse.json(
        { error: 'Only Product Managers can update phases' },
        { status: 403 }
      );
    }

    // Check if phase is locked (past end date)
    // Growth Team can override for corrections
    const isGrowthTeam = session.user.role === UserRole.GROWTH_TEAM;
    if (isPhaseLocked(phase) && !isGrowthTeam) {
      return NextResponse.json(
        { error: 'Cannot update a phase that has already ended. Contact Growth Team if corrections are needed.' },
        { status: 403 }
      );
    }

    // Verify all sprints exist and belong to the project
    const sprints = await prisma.sprint.findMany({
      where: {
        id: { in: sprintIds },
        projectId: phase.project.id
      }
    });

    if (sprints.length !== sprintIds.length) {
      return NextResponse.json(
        { error: 'One or more selected sprints are invalid' },
        { status: 400 }
      );
    }

    // Verify sprints are consecutive
    const sortedSprints = sprints.sort((a, b) => a.sprintNumber - b.sprintNumber);
    for (let i = 1; i < sortedSprints.length; i++) {
      if (sortedSprints[i].sprintNumber !== sortedSprints[i - 1].sprintNumber + 1) {
        return NextResponse.json(
          { error: 'Selected sprints must be consecutive' },
          { status: 400 }
        );
      }
    }

    // Calculate phase dates from sprints
    const startDate = new Date(Math.min(...sprints.map(s => new Date(s.startDate).getTime())));
    const endDate = new Date(Math.max(...sprints.map(s => new Date(s.endDate).getTime())));

    // Update phase and sprint assignments in a transaction
    await prisma.$transaction(async (tx) => {
      // Update the phase
      await tx.phase.update({
        where: { id: phaseId },
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          startDate,
          endDate
        }
      });

      // Remove phase reference from old sprints
      await tx.sprint.updateMany({
        where: { phaseId: phaseId },
        data: { phaseId: null }
      });

      // Assign phase to new sprints
      await tx.sprint.updateMany({
        where: { id: { in: sprintIds } },
        data: { phaseId: phaseId }
      });
    });

    return NextResponse.json(
      { message: 'Phase updated successfully' },
      { status: 200 }
    );

  } catch (error) {
    logError('Failed to update phase', error as Error, {
      userId: session.user.id,
      phaseId,
      endpoint: `/api/phases/${phaseId}`
    });
    return NextResponse.json(
      { error: 'Failed to update phase' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ phaseId: string }> }
) {
  const { phaseId } = await params;
  logApiRequest('DELETE', `/api/phases/${phaseId}`);

  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { session } = auth;

  try {
    // Get the phase with project info
    const phase = await prisma.phase.findUnique({
      where: { id: phaseId },
      include: {
        project: {
          select: {
            id: true,
            productManagerId: true
          }
        },
        allocations: {
          select: { id: true }
        }
      }
    });

    if (!phase) {
      return NextResponse.json(
        { error: 'Phase not found' },
        { status: 404 }
      );
    }

    // Check if user is Product Manager of this project
    const isProductManager = phase.project.productManagerId === session.user.id;
    if (!isProductManager) {
      logAuthorizationFailure(session.user.id, 'delete phase', `phase:${phaseId}`);
      return NextResponse.json(
        { error: 'Only Product Managers can delete phases' },
        { status: 403 }
      );
    }

    // Check if phase is locked (past end date)
    // Growth Team can override for corrections
    const isGrowthTeam = session.user.role === UserRole.GROWTH_TEAM;
    if (isPhaseLocked(phase) && !isGrowthTeam) {
      return NextResponse.json(
        { error: 'Cannot delete a phase that has already ended. Contact Growth Team if corrections are needed.' },
        { status: 403 }
      );
    }

    // Use transaction to safely delete phase, allocations, and update sprints
    await prisma.$transaction(async (tx) => {
      // Delete all weekly allocations associated with phase allocations
      const phaseAllocationIds = phase.allocations.map(a => a.id);
      if (phaseAllocationIds.length > 0) {
        await tx.weeklyAllocation.deleteMany({
          where: { phaseAllocationId: { in: phaseAllocationIds } }
        });

        // Delete all phase allocations
        await tx.phaseAllocation.deleteMany({
          where: { phaseId: phaseId }
        });
      }

      // Remove phase reference from sprints
      await tx.sprint.updateMany({
        where: { phaseId: phaseId },
        data: { phaseId: null }
      });

      // Delete the phase
      await tx.phase.delete({
        where: { id: phaseId }
      });
    });

    return NextResponse.json(
      { message: 'Phase deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    logError('Failed to delete phase', error as Error, {
      userId: session.user.id,
      phaseId,
      endpoint: `/api/phases/${phaseId}`
    });
    return NextResponse.json(
      { error: 'Failed to delete phase' },
      { status: 500 }
    );
  }
}
