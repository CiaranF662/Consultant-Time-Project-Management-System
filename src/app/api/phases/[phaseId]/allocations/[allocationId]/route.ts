import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { createNotificationsForUsers, getGrowthTeamMemberIds } from '@/lib/notifications';
import { NotificationType, ProjectRole } from '@prisma/client';

// PATCH update phase allocation (for forfeit action)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ phaseId: string; allocationId: string }> }
) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { session, user } = auth;

  const { phaseId, allocationId } = await params;

  try {
    const body = await request.json();
    const { action } = body;

    // Get the allocation with full context
    const allocation = await prisma.phaseAllocation.findUnique({
      where: { id: allocationId },
      include: {
        phase: {
          include: {
            project: {
              select: {
                id: true,
                title: true,
                productManagerId: true,
                consultants: {
                  where: { role: ProjectRole.PRODUCT_MANAGER },
                  include: { user: true }
                }
              }
            }
          }
        },
        consultant: {
          select: { id: true, name: true, email: true }
        },
        weeklyAllocations: {
          where: {
            planningStatus: { in: ['APPROVED', 'MODIFIED'] }
          }
        }
      }
    });

    if (!allocation) {
      return new NextResponse(JSON.stringify({ error: 'Allocation not found' }), { status: 404 });
    }

    if (allocation.phaseId !== phaseId) {
      return new NextResponse(JSON.stringify({ error: 'Phase mismatch' }), { status: 400 });
    }

    // Check authorization: Only PM of the project can forfeit
    const isPM = allocation.phase.project.consultants.some(c => c.userId === session.user.id);
    if (!isPM) {
      return new NextResponse(JSON.stringify({ error: 'Only the Product Manager can perform this action' }), { status: 403 });
    }

    // Handle forfeit action
    if (action === 'forfeit') {
      // Verify allocation is EXPIRED
      if (allocation.approvalStatus !== 'EXPIRED') {
        return new NextResponse(
          JSON.stringify({ error: 'Only EXPIRED allocations can be forfeited' }),
          { status: 400 }
        );
      }

      // Calculate unplanned hours
      const totalPlanned = allocation.weeklyAllocations.reduce(
        (sum, w) => sum + (w.approvedHours ?? w.proposedHours ?? 0),
        0
      );
      const unplannedHours = allocation.totalHours - totalPlanned;

      // Update status to FORFEITED
      await prisma.phaseAllocation.update({
        where: { id: allocationId },
        data: { approvalStatus: 'FORFEITED' }
      });

      // Notify Growth Team (FYI)
      const growthTeamIds = await getGrowthTeamMemberIds();
      if (growthTeamIds.length > 0) {
        const pmName = session.user.name || session.user.email || 'Product Manager';
        const consultantName = allocation.consultant.name || allocation.consultant.email || 'Consultant';

        await createNotificationsForUsers(
          growthTeamIds,
          NotificationType.PHASE_ALLOCATION_REJECTED, // Reuse existing type
          'Phase Allocation Forfeited',
          `${pmName} has forfeited ${unplannedHours.toFixed(1)}h for ${consultantName} in "${allocation.phase.name}" (${allocation.phase.project.title}).`,
          `/dashboard/projects/${allocation.phase.project.id}`,
          {
            phaseAllocationId: allocation.id,
            phaseId: allocation.phase.id,
            projectId: allocation.phase.project.id,
            consultantId: allocation.consultantId,
            forfeitedHours: Math.round(unplannedHours * 10) / 10
          }
        );
      }

      // Notify Consultant (FYI)
      await createNotificationsForUsers(
        [allocation.consultantId],
        NotificationType.PHASE_ALLOCATION_REJECTED, // Reuse existing type
        'Phase Allocation Forfeited',
        `Your unplanned hours (${unplannedHours.toFixed(1)}h) for "${allocation.phase.name}" have been forfeited and will not be allocated to another phase.`,
        `/dashboard/projects/${allocation.phase.project.id}`,
        {
          phaseAllocationId: allocation.id,
          phaseId: allocation.phase.id,
          projectId: allocation.phase.project.id,
          forfeitedHours: Math.round(unplannedHours * 10) / 10
        }
      );

      return NextResponse.json({
        success: true,
        message: `Successfully forfeited ${unplannedHours.toFixed(1)} hours`
      });
    }

    return new NextResponse(JSON.stringify({ error: 'Invalid action' }), { status: 400 });

  } catch (error) {
    console.error('Error updating allocation:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to update allocation' }),
      { status: 500 }
    );
  }
}
