import { NextResponse } from 'next/server';
import { requireGrowthTeam, isAuthError } from '@/lib/api-auth';
import { UserRole, NotificationType } from '@prisma/client';

import { prisma } from "@/lib/prisma";

// POST approve, modify, or reject weekly allocation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ allocationId: string }> }
) {
  const auth = await requireGrowthTeam();
  if (isAuthError(auth)) return auth;
  const { session, user } = auth;

  const { allocationId } = await params;

  try {
    const body = await request.json();
    const { action, approvedHours, rejectionReason } = body;

    if (!['approve', 'modify', 'reject'].includes(action)) {
      return new NextResponse(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
    }

    if (action === 'reject' && !rejectionReason) {
      return new NextResponse(JSON.stringify({ error: 'Rejection reason is required' }), { status: 400 });
    }

    if ((action === 'approve' || action === 'modify') && (approvedHours === undefined || approvedHours < 0)) {
      return new NextResponse(JSON.stringify({ error: 'Approved hours must be provided and non-negative' }), { status: 400 });
    }

    // Get the allocation with related data
    const allocation = await prisma.weeklyAllocation.findUnique({
      where: { id: allocationId },
      include: {
        consultant: true,
        phaseAllocation: {
          include: {
            phase: {
              include: {
                project: true
              }
            }
          }
        }
      }
    });

    if (!allocation) {
      return new NextResponse(JSON.stringify({ error: 'Allocation not found' }), { status: 404 });
    }

    if (allocation.planningStatus !== 'PENDING') {
      return new NextResponse(JSON.stringify({ error: 'Allocation is not pending approval' }), { status: 400 });
    }

    // Special handling for 0 hours approval - delete the allocation entirely
    if ((action === 'approve' || action === 'modify') && approvedHours === 0) {
      // Delete the allocation as it represents removing the consultant from this week
      await prisma.weeklyAllocation.delete({
        where: { id: allocationId }
      });

      // Create notification for the consultant about deletion
      await prisma.notification.create({
        data: {
          userId: allocation.consultantId,
          type: NotificationType.WEEKLY_ALLOCATION_APPROVED,
          title: 'Weekly Allocation Removed',
          message: `Your weekly allocation for ${allocation.phaseAllocation.phase.name} (Week ${allocation.weekNumber}, ${allocation.year}) has been approved for removal (0 hours).`,
          actionUrl: `/dashboard/weekly-planner?phaseAllocationId=${allocation.phaseAllocationId}`,
          metadata: {
            projectId: allocation.phaseAllocation.phase.project.id,
            phaseId: allocation.phaseAllocation.phase.id,
            allocationId: allocation.id,
            weekNumber: allocation.weekNumber,
            year: allocation.year,
            deleted: true
          }
        }
      });

      return NextResponse.json({
        message: 'Weekly allocation deleted (approved for 0 hours)',
        deleted: true,
        allocation: allocation
      });
    }

    // Update the allocation
    const planningStatus = action === 'reject' ? 'REJECTED' :
                         (action === 'modify' && approvedHours !== allocation.proposedHours) ? 'MODIFIED' : 'APPROVED';

    const updatedAllocation = await prisma.weeklyAllocation.update({
      where: { id: allocationId },
      data: {
        planningStatus,
        approvedHours: action === 'reject' ? null : approvedHours,
        approvedBy: session.user.id,
        approvedAt: new Date(),
        rejectionReason: action === 'reject' ? rejectionReason : null,
      },
      include: {
        consultant: true,
        phaseAllocation: {
          include: {
            phase: {
              include: {
                project: true
              }
            }
          }
        }
      }
    });

    // Create notification for the consultant
    let notificationType: NotificationType;
    let notificationTitle: string;
    let notificationMessage: string;

    switch (planningStatus) {
      case 'APPROVED':
        notificationType = NotificationType.WEEKLY_ALLOCATION_APPROVED;
        notificationTitle = 'Weekly Allocation Approved';
        notificationMessage = `Your weekly allocation for ${allocation.phaseAllocation.phase.name} (Week ${allocation.weekNumber}, ${allocation.year}) has been approved for ${approvedHours}h.`;
        break;
      case 'MODIFIED':
        notificationType = NotificationType.WEEKLY_ALLOCATION_MODIFIED;
        notificationTitle = 'Weekly Allocation Modified';
        notificationMessage = `Your weekly allocation for ${allocation.phaseAllocation.phase.name} (Week ${allocation.weekNumber}, ${allocation.year}) has been modified from ${allocation.proposedHours}h to ${approvedHours}h.`;
        break;
      case 'REJECTED':
        notificationType = NotificationType.WEEKLY_ALLOCATION_REJECTED;
        notificationTitle = 'Weekly Allocation Rejected';
        notificationMessage = `Your weekly allocation for ${allocation.phaseAllocation.phase.name} (Week ${allocation.weekNumber}, ${allocation.year}) has been rejected. Reason: ${rejectionReason}`;
        break;
    }

    await prisma.notification.create({
      data: {
        userId: allocation.consultantId,
        type: notificationType,
        title: notificationTitle,
        message: notificationMessage,
        actionUrl: `/dashboard/weekly-planner?phaseAllocationId=${allocation.phaseAllocationId}`,
        metadata: {
          projectId: allocation.phaseAllocation.phase.project.id,
          phaseId: allocation.phaseAllocation.phase.id,
          allocationId: allocation.id,
          weekNumber: allocation.weekNumber,
          year: allocation.year
        }
      }
    });

    return NextResponse.json(updatedAllocation);
  } catch (error) {
    console.error('Error processing weekly allocation approval:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to process approval' }), { status: 500 });
  }
}