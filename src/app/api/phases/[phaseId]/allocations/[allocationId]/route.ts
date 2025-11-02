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
      // Get the UnplannedExpiredHours record
      const expiredRecord = await prisma.unplannedExpiredHours.findUnique({
        where: { phaseAllocationId: allocationId }
      });

      if (!expiredRecord) {
        return new NextResponse(
          JSON.stringify({ error: 'No unplanned expired hours found for this allocation' }),
          { status: 404 }
        );
      }

      if (expiredRecord.status !== 'EXPIRED') {
        return new NextResponse(
          JSON.stringify({ error: 'These hours have already been handled' }),
          { status: 400 }
        );
      }

      const unplannedHours = expiredRecord.unplannedHours;

      // Calculate planned hours
      const totalPlanned = allocation.weeklyAllocations.reduce(
        (sum, w) => sum + (w.approvedHours ?? w.proposedHours ?? 0),
        0
      );

      // Update in a transaction to ensure consistency
      await prisma.$transaction([
        // Update UnplannedExpiredHours status to FORFEITED
        prisma.unplannedExpiredHours.update({
          where: { id: expiredRecord.id },
          data: {
            status: 'FORFEITED',
            handledAt: new Date(),
            handledBy: session.user.id
          }
        }),
        // Reduce original allocation's totalHours and set status back to APPROVED
        prisma.phaseAllocation.update({
          where: { id: allocationId },
          data: {
            totalHours: totalPlanned, 
            approvalStatus: 'APPROVED' 
          }
        })
      ]);

      // Notify Growth Team (FYI)
      const growthTeamIds = await getGrowthTeamMemberIds();
      if (growthTeamIds.length > 0) {
        const pmName = session.user.name || session.user.email || 'Product Manager';
        const consultantName = allocation.consultant.name || allocation.consultant.email || 'Consultant';

        await createNotificationsForUsers(
          growthTeamIds,
          NotificationType.PHASE_ALLOCATION_REJECTED, // Reuse existing type
          'Unplanned Hours Forfeited',
          `${pmName} has forfeited ${unplannedHours.toFixed(1)}h for ${consultantName} in "${allocation.phase.name}" (${allocation.phase.project.title}). ${totalPlanned.toFixed(1)}h remain allocated.`,
          `/dashboard/projects/${allocation.phase.project.id}`,
          {
            phaseAllocationId: allocation.id,
            phaseId: allocation.phase.id,
            projectId: allocation.phase.project.id,
            consultantId: allocation.consultantId,
            forfeitedHours: Math.round(unplannedHours * 10) / 10,
            plannedHours: Math.round(totalPlanned * 10) / 10
          }
        );
      }

      // Notify Consultant (FYI)
      await createNotificationsForUsers(
        [allocation.consultantId],
        NotificationType.PHASE_ALLOCATION_REJECTED, // Reuse existing type
        'Unplanned Hours Forfeited',
        `Your unplanned hours (${unplannedHours.toFixed(1)}h) for "${allocation.phase.name}" have been forfeited. Your ${totalPlanned.toFixed(1)}h of planned work remains valid.`,
        `/dashboard/projects/${allocation.phase.project.id}`,
        {
          phaseAllocationId: allocation.id,
          phaseId: allocation.phase.id,
          projectId: allocation.phase.project.id,
          forfeitedHours: Math.round(unplannedHours * 10) / 10,
          plannedHours: Math.round(totalPlanned * 10) / 10
        }
      );

      return NextResponse.json({
        success: true,
        message: `Successfully forfeited ${unplannedHours.toFixed(1)} hours. ${totalPlanned.toFixed(1)} hours of planned work remain valid.`
      });
    }

    // Handle reallocate action
    if (action === 'reallocate') {
      const { targetPhaseId, newAllocationId, notes } = body;

      // Get the UnplannedExpiredHours record
      const expiredRecord = await prisma.unplannedExpiredHours.findUnique({
        where: { phaseAllocationId: allocationId }
      });

      if (!expiredRecord) {
        return new NextResponse(
          JSON.stringify({ error: 'No unplanned expired hours found for this allocation' }),
          { status: 404 }
        );
      }

      if (expiredRecord.status !== 'EXPIRED') {
        return new NextResponse(
          JSON.stringify({ error: 'These hours have already been handled' }),
          { status: 400 }
        );
      }

      const unplannedHours = expiredRecord.unplannedHours;

      // Calculate planned hours
      const totalPlanned = allocation.weeklyAllocations.reduce(
        (sum, w) => sum + (w.approvedHours ?? w.proposedHours ?? 0),
        0
      );

      // Update in a transaction to ensure consistency
      await prisma.$transaction([
        // Update UnplannedExpiredHours status to REALLOCATED
        prisma.unplannedExpiredHours.update({
          where: { id: expiredRecord.id },
          data: {
            status: 'REALLOCATED',
            handledAt: new Date(),
            handledBy: session.user.id,
            reallocatedToPhaseId: targetPhaseId,
            reallocatedToAllocationId: newAllocationId,
            notes: notes
          }
        }),
        // Reduce original allocation's totalHours and set status back to APPROVED
        prisma.phaseAllocation.update({
          where: { id: allocationId },
          data: {
            totalHours: totalPlanned, 
            approvalStatus: 'APPROVED' 
          }
        })
      ]);

      // Get target phase info
      const targetPhase = await prisma.phase.findUnique({
        where: { id: targetPhaseId },
        select: { name: true }
      });

      // Notify Growth Team (needs approval)
      const growthTeamIds = await getGrowthTeamMemberIds();
      if (growthTeamIds.length > 0) {
        const pmName = session.user.name || session.user.email || 'Product Manager';
        const consultantName = allocation.consultant.name || allocation.consultant.email || 'Consultant';

        await createNotificationsForUsers(
          growthTeamIds,
          NotificationType.PHASE_ALLOCATION_PENDING, 
          'Reallocation Request Pending Approval',
          `${pmName} requests to reallocate ${unplannedHours.toFixed(1)}h for ${consultantName} from "${allocation.phase.name}" to "${targetPhase?.name}". ${totalPlanned.toFixed(1)}h remain in original phase.`,
          `/dashboard/hour-approvals`,
          {
            phaseAllocationId: newAllocationId,
            originalPhaseId: allocation.phase.id,
            targetPhaseId: targetPhaseId,
            consultantId: allocation.consultantId,
            reallocatedHours: Math.round(unplannedHours * 10) / 10,
            plannedHours: Math.round(totalPlanned * 10) / 10
          }
        );
      }

      // Notify Consultant (FYI)
      await createNotificationsForUsers(
        [allocation.consultantId],
        NotificationType.PHASE_ALLOCATION_PENDING,
        'Hours Reallocation Pending',
        `Your ${unplannedHours.toFixed(1)}h of unplanned hours from "${allocation.phase.name}" are being reallocated to "${targetPhase?.name}". Pending Growth Team approval. Your ${totalPlanned.toFixed(1)}h of planned work remains valid.`,
        `/dashboard/projects/${allocation.phase.project.id}`,
        {
          phaseAllocationId: newAllocationId,
          originalPhaseId: allocation.phase.id,
          targetPhaseId: targetPhaseId,
          reallocatedHours: Math.round(unplannedHours * 10) / 10,
          plannedHours: Math.round(totalPlanned * 10) / 10
        }
      );

      return NextResponse.json({
        success: true,
        message: `Successfully created reallocation request for ${unplannedHours.toFixed(1)} hours. Pending Growth Team approval.`
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
