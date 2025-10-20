import { NextResponse } from 'next/server';
import { requireGrowthTeam, isAuthError } from '@/lib/api-auth';
import { UserRole, NotificationType, ProjectRole } from '@prisma/client';
import { createNotificationsForUsers, NotificationTemplates } from '@/lib/notifications';
import { sendEmail, renderEmailTemplate } from '@/lib/email';
import PhaseAllocationEmail from '@/emails/PhaseAllocationEmail';

import { prisma } from "@/lib/prisma";

// POST approve or reject phase allocation
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
    const { action, rejectionReason, modifiedHours } = body;

    if (!['approve', 'reject', 'modify'].includes(action)) {
      return new NextResponse(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
    }

    if (action === 'reject' && !rejectionReason) {
      return new NextResponse(JSON.stringify({ error: 'Rejection reason is required' }), { status: 400 });
    }

    if (action === 'modify' && (!modifiedHours || modifiedHours <= 0)) {
      return new NextResponse(JSON.stringify({ error: 'Modified hours must be greater than 0' }), { status: 400 });
    }

    // Get the allocation with related data
    const allocation = await prisma.phaseAllocation.findUnique({
      where: { id: allocationId },
      include: {
        consultant: true,
        phase: {
          include: {
            project: {
              include: {
                consultants: {
                  where: { role: ProjectRole.PRODUCT_MANAGER },
                  include: { user: true }
                }
              }
            }
          }
        }
      }
    });

    if (!allocation) {
      return new NextResponse(JSON.stringify({ error: 'Allocation not found' }), { status: 404 });
    }

    if (allocation.approvalStatus !== 'PENDING') {
      return new NextResponse(JSON.stringify({ error: 'Allocation is not pending approval' }), { status: 400 });
    }

    // Check if this allocation is a reallocation (find UnplannedExpiredHours pointing to it)
    const isReallocation = await prisma.unplannedExpiredHours.findFirst({
      where: {
        reallocatedToAllocationId: allocationId,
        status: 'REALLOCATED'
      },
      include: {
        phaseAllocation: true // The original allocation
      }
    });

    let updatedAllocation: typeof allocation | null = null;

    // If rejecting a reallocation, we need to revert the original allocation
    if (action === 'reject' && isReallocation) {
      // Perform revert in a transaction to ensure atomicity
      updatedAllocation = await prisma.$transaction(async (tx) => {
        // 1. Delete the rejected reallocation (this new allocation that was rejected)
        await tx.phaseAllocation.delete({
          where: { id: allocationId }
        });

        // 2. Restore the original allocation's totalHours
        const originalTotalHours = isReallocation.phaseAllocation.totalHours + isReallocation.unplannedHours;
        await tx.phaseAllocation.update({
          where: { id: isReallocation.phaseAllocationId },
          data: {
            totalHours: originalTotalHours, // Add back the unplanned hours
            approvalStatus: 'EXPIRED' // Set back to EXPIRED so PM can handle again
          }
        });

        // 3. Set UnplannedExpiredHours back to EXPIRED status
        await tx.unplannedExpiredHours.update({
          where: { id: isReallocation.id },
          data: {
            status: 'EXPIRED',
            handledAt: null,
            handledBy: null,
            reallocatedToPhaseId: null,
            reallocatedToAllocationId: null,
            notes: `Reallocation rejected by Growth Team: ${rejectionReason}`
          }
        });

        // Return the original allocation for notification purposes
        const originalAllocation = await tx.phaseAllocation.findUnique({
          where: { id: isReallocation.phaseAllocationId },
          include: {
            consultant: true,
            phase: {
              include: {
                project: {
                  include: {
                    consultants: {
                      where: { role: ProjectRole.PRODUCT_MANAGER },
                      include: { user: true }
                    }
                  }
                }
              }
            }
          }
        });

        if (!originalAllocation) {
          throw new Error('Original allocation not found after revert');
        }

        return originalAllocation;
      });
    } else {
      // Normal approval/rejection flow
      updatedAllocation = await prisma.phaseAllocation.update({
        where: { id: allocationId },
        data: {
          approvalStatus: action === 'approve' || action === 'modify' ? 'APPROVED' : 'REJECTED',
          approvedBy: session.user.id,
          approvedAt: new Date(),
          rejectionReason: action === 'reject' ? rejectionReason : null,
          totalHours: action === 'modify' ? modifiedHours : allocation.totalHours,
        },
        include: {
          consultant: true,
          phase: {
            include: {
              project: {
                include: {
                  consultants: {
                    where: { role: ProjectRole.PRODUCT_MANAGER },
                    include: { user: true }
                  }
                }
              }
            }
          }
        }
      });
    }

    // Safety check - should never happen but TypeScript needs it
    if (!updatedAllocation) {
      return new NextResponse(JSON.stringify({ error: 'Failed to process allocation' }), { status: 500 });
    }

    // Send notifications to both consultant and Product Manager
    try {
      const consultantName = allocation.consultant.name || allocation.consultant.email || 'Consultant';
      const productManagerId = updatedAllocation.phase.project.consultants[0]?.userId;
      const recipientIds = [allocation.consultantId];

      if (productManagerId) {
        recipientIds.push(productManagerId);
      }

      if (action === 'approve') {
        // Notify consultant
        const consultantTemplate = NotificationTemplates.PHASE_ALLOCATION_APPROVED_FOR_CONSULTANT(
          allocation.phase.name,
          allocation.phase.project.title,
          updatedAllocation.totalHours
        );

        await createNotificationsForUsers(
          [allocation.consultantId],
          NotificationType.PHASE_ALLOCATION_APPROVED,
          consultantTemplate.title,
          consultantTemplate.message,
          `/dashboard/weekly-planner?phaseAllocationId=${allocation.id}`,
          {
            projectId: allocation.phase.project.id,
            phaseId: allocation.phase.id,
            allocationId: allocation.id
          }
        );

        // Notify Product Manager (only if different from consultant to avoid duplicates)
        if (productManagerId && productManagerId !== allocation.consultantId) {
          const pmTemplate = NotificationTemplates.PHASE_ALLOCATION_APPROVED_FOR_PM(
            consultantName,
            allocation.phase.name,
            updatedAllocation.totalHours
          );

          await createNotificationsForUsers(
            [productManagerId],
            NotificationType.PHASE_ALLOCATION_APPROVED,
            pmTemplate.title,
            pmTemplate.message,
            `/dashboard/projects/${allocation.phase.project.id}`,
            {
              projectId: allocation.phase.project.id,
              phaseId: allocation.phase.id,
              allocationId: allocation.id
            }
          );
        }

        // Send email notification to consultant when approved
        try {
          const emailTemplate = PhaseAllocationEmail({
            type: "allocated",
            consultantName: allocation.consultant.name || allocation.consultant.email || 'Consultant',
            projectName: allocation.phase.project.title,
            phaseName: allocation.phase.name,
            phaseDescription: allocation.phase.description || undefined,
            totalHours: updatedAllocation.totalHours,
            productManagerName: allocation.phase.project.consultants[0]?.user.name || undefined,
            startDate: allocation.phase.startDate.toISOString(),
            endDate: allocation.phase.endDate.toISOString()
          });

          const { html, text } = await renderEmailTemplate(emailTemplate);

          await sendEmail({
            to: allocation.consultant.email!,
            subject: `Phase Allocation Approved: ${allocation.phase.name}`,
            html,
            text
          });
        } catch (emailError) {
          console.error(`Failed to send approval email to ${allocation.consultant.email}:`, emailError);
        }

      } else if (action === 'modify') {
        // Notify consultant
        const consultantTemplate = NotificationTemplates.PHASE_ALLOCATION_MODIFIED_FOR_CONSULTANT(
          allocation.phase.name,
          allocation.phase.project.title,
          modifiedHours,
          allocation.totalHours
        );

        await createNotificationsForUsers(
          [allocation.consultantId],
          NotificationType.PHASE_ALLOCATION_MODIFIED,
          consultantTemplate.title,
          consultantTemplate.message,
          `/dashboard/weekly-planner?phaseAllocationId=${allocation.id}`,
          {
            projectId: allocation.phase.project.id,
            phaseId: allocation.phase.id,
            allocationId: allocation.id
          }
        );

        // Notify Product Manager (only if different from consultant to avoid duplicates)
        if (productManagerId && productManagerId !== allocation.consultantId) {
          const pmTemplate = NotificationTemplates.PHASE_ALLOCATION_MODIFIED_FOR_PM(
            consultantName,
            allocation.phase.name,
            modifiedHours,
            allocation.totalHours
          );

          await createNotificationsForUsers(
            [productManagerId],
            NotificationType.PHASE_ALLOCATION_MODIFIED,
            pmTemplate.title,
            pmTemplate.message,
            `/dashboard/projects/${allocation.phase.project.id}`,
            {
              projectId: allocation.phase.project.id,
              phaseId: allocation.phase.id,
              allocationId: allocation.id
            }
          );
        }

      } else if (action === 'reject') {
        // Check if this was a reallocation rejection (allocation was deleted and reverted)
        if (isReallocation && updatedAllocation) {
          // Special notification for reverted reallocation
          // Notify Product Manager that reallocation was rejected and needs to be handled again
          if (productManagerId) {
            await createNotificationsForUsers(
              [productManagerId],
              NotificationType.PHASE_ALLOCATION_REJECTED,
              'Reallocation Request Rejected',
              `Growth Team rejected your reallocation of ${isReallocation.unplannedHours}h for ${consultantName} from "${updatedAllocation.phase.name}" to another phase. Reason: ${rejectionReason}. The hours are back in the original phase as "Expired - Click to Handle".`,
              `/dashboard/projects/${updatedAllocation.phase.project.id}`,
              {
                projectId: updatedAllocation.phase.project.id,
                phaseId: updatedAllocation.phase.id,
                allocationId: updatedAllocation.id,
                reallocationReverted: true
              }
            );
          }

          // Notify Consultant that reallocation was rejected
          await createNotificationsForUsers(
            [allocation.consultantId],
            NotificationType.PHASE_ALLOCATION_REJECTED,
            'Reallocation Request Rejected',
            `Growth Team rejected the reallocation of your ${isReallocation.unplannedHours}h from "${updatedAllocation.phase.name}". Reason: ${rejectionReason}. Your Product Manager will need to handle these hours again.`,
            `/dashboard/projects/${updatedAllocation.phase.project.id}`,
            {
              projectId: updatedAllocation.phase.project.id,
              phaseId: updatedAllocation.phase.id,
              allocationId: updatedAllocation.id
            }
          );
        } else {
          // Normal rejection notification
          const consultantTemplate = NotificationTemplates.PHASE_ALLOCATION_REJECTED_FOR_CONSULTANT(
            allocation.phase.name,
            allocation.phase.project.title,
            rejectionReason
          );

          await createNotificationsForUsers(
            [allocation.consultantId],
            NotificationType.PHASE_ALLOCATION_REJECTED,
            consultantTemplate.title,
            consultantTemplate.message,
            `/dashboard/projects/${allocation.phase.project.id}`,
            {
              projectId: allocation.phase.project.id,
              phaseId: allocation.phase.id,
              allocationId: allocation.id
            }
          );

          // Notify Product Manager (only if different from consultant to avoid duplicates)
          if (productManagerId && productManagerId !== allocation.consultantId) {
            const pmTemplate = NotificationTemplates.PHASE_ALLOCATION_REJECTED_FOR_PM(
              consultantName,
              allocation.phase.name,
              rejectionReason
            );

            await createNotificationsForUsers(
              [productManagerId],
              NotificationType.PHASE_ALLOCATION_REJECTED,
              pmTemplate.title,
              pmTemplate.message,
              `/dashboard/projects/${allocation.phase.project.id}`,
              {
                projectId: allocation.phase.project.id,
                phaseId: allocation.phase.id,
                allocationId: allocation.id
              }
            );
          }
        }
      }
    } catch (notificationError) {
      console.error('Failed to send approval notifications:', notificationError);
      // Don't fail the approval process if notifications fail
    }

    return NextResponse.json(updatedAllocation);
  } catch (error) {
    console.error('Error processing phase allocation approval:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to process approval' }), { status: 500 });
  }
}