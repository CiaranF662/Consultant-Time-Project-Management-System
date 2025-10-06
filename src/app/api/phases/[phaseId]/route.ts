import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/api-auth';
import { logError, logApiRequest, logAuthorizationFailure } from '@/lib/error-logger';
import { prisma } from "@/lib/prisma";

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
