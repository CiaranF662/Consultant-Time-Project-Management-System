import { NextResponse } from 'next/server';
import { requireGrowthTeam, isAuthError } from '@/lib/api-auth';
import { UserRole, NotificationType, ProjectRole } from '@prisma/client';
import { createNotificationsForUsers, NotificationTemplates } from '@/lib/notifications';
import { sendEmail, renderEmailTemplate } from '@/lib/email';
import PhaseAllocationEmail from '@/emails/PhaseAllocationEmail';
import PhaseAllocationRejectionEmail from '@/emails/PhaseAllocationRejectionEmail';

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

    if (!['approve', 'reject', 'modify', 'delete', 'reject-deletion'].includes(action)) {
      return new NextResponse(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
    }

    if (action === 'reject' && !rejectionReason) {
      return new NextResponse(JSON.stringify({ error: 'Rejection reason is required' }), { status: 400 });
    }

    if (action === 'reject-deletion' && !rejectionReason) {
      return new NextResponse(JSON.stringify({ error: 'Rejection reason is required for deletion rejection' }), { status: 400 });
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
        },
        parentAllocation: true, // For Scenario 1 reallocations
        childAllocations: true  // To check if parent has children
      }
    }) as any;

    if (!allocation) {
      return new NextResponse(JSON.stringify({ error: 'Allocation not found' }), { status: 404 });
    }

    // Allow PENDING for normal approvals and DELETION_PENDING for deletion requests
    if (action === 'delete' || action === 'reject-deletion') {
      if (allocation.approvalStatus !== 'DELETION_PENDING') {
        return new NextResponse(JSON.stringify({ error: 'Allocation is not pending deletion' }), { status: 400 });
      }
    } else {
      if (allocation.approvalStatus !== 'PENDING') {
        return new NextResponse(JSON.stringify({ error: 'Allocation is not pending approval' }), { status: 400 });
      }
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

    // HYBRID REALLOCATION REJECTION HANDLING
    // Handle Scenario 1: Reject child reallocation (has parentAllocationId)
    if (action === 'reject' && allocation.isReallocation && allocation.parentAllocationId) {
      console.log(`[SCENARIO 1 REJECTION] Rejecting child reallocation ${allocationId}`);

      updatedAllocation = await prisma.$transaction(async (tx) => {
        // 1. Find the related UnplannedExpiredHours record
        const unplannedRecord = await tx.unplannedExpiredHours.findFirst({
          where: {
            reallocatedToAllocationId: allocationId,
            status: 'REALLOCATED'
          }
        });

        // 2. Delete the rejected child reallocation
        await tx.phaseAllocation.delete({
          where: { id: allocationId }
        });

        // 3. Revert UnplannedExpiredHours back to EXPIRED status
        if (unplannedRecord) {
          await tx.unplannedExpiredHours.update({
            where: { id: unplannedRecord.id },
            data: {
              status: 'EXPIRED',
              handledAt: null,
              handledBy: null,
              reallocatedToPhaseId: null,
              reallocatedToAllocationId: null,
              notes: `Reallocation rejected by Growth Team: ${rejectionReason}`
            }
          });
        }

        // 4. Return parent allocation for notification purposes
        const parentAllocation = await tx.phaseAllocation.findUnique({
          where: { id: allocation.parentAllocationId! },
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

        return parentAllocation;
      });

      console.log(`[SCENARIO 1 REJECTION] Reverted reallocation to expired state in original phase`);
    }
    // If rejecting a reallocation (old system), we need to revert the original allocation
    else if (action === 'reject' && isReallocation) {
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
    }
    // HYBRID REALLOCATION APPROVAL HANDLING - Scenario 1: Merge child with parent
    else if ((action === 'approve' || action === 'modify') && allocation.isReallocation && allocation.parentAllocationId) {
      console.log(`[SCENARIO 1 APPROVAL] Merging child reallocation ${allocationId} with parent ${allocation.parentAllocationId}`);

      updatedAllocation = await prisma.$transaction(async (tx) => {
        const hoursToAdd = action === 'modify' ? modifiedHours : allocation.totalHours;

        // 1. Merge: Add child allocation hours to parent allocation
        const mergedParent = await tx.phaseAllocation.update({
          where: { id: allocation.parentAllocationId! },
          data: {
            totalHours: {
              increment: hoursToAdd
            }
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

        // 2. Delete the child reallocation since it's merged
        await tx.phaseAllocation.delete({
          where: { id: allocationId }
        });

        console.log(`[SCENARIO 1 APPROVAL] Merged ${hoursToAdd}h into parent. Parent now has ${mergedParent.totalHours}h`);

        return mergedParent;
      });
    }
    // DELETION HANDLING
    else if (action === 'delete') {
      console.log(`[DELETION APPROVED] Deleting allocation ${allocationId}`);

      // Delete the allocation (cascade will delete weekly allocations)
      await prisma.phaseAllocation.delete({
        where: { id: allocationId }
      });

      // Notify Product Manager of deletion approval
      const productManagerId = allocation.phase.project.consultants[0]?.userId;
      if (productManagerId) {
        const consultantName = allocation.consultant.name || allocation.consultant.email || 'Consultant';
        await createNotificationsForUsers(
          [productManagerId],
          NotificationType.PHASE_ALLOCATION_APPROVED,
          'Phase Allocation Deletion Approved',
          `Your request to remove ${consultantName} from "${allocation.phase.name}" in ${allocation.phase.project.title} has been approved.`,
          `/dashboard/projects/${allocation.phase.project.id}`,
          {
            projectId: allocation.phase.project.id,
            phaseId: allocation.phase.id,
            allocationId: allocation.id,
            isDeletion: true
          }
        );
      }

      return NextResponse.json({ success: true, deleted: true });
    }
    else if (action === 'reject-deletion') {
      console.log(`[DELETION REJECTED] Reverting allocation ${allocationId} to APPROVED`);

      // Revert to APPROVED status
      updatedAllocation = await prisma.phaseAllocation.update({
        where: { id: allocationId },
        data: {
          approvalStatus: 'APPROVED',
          rejectionReason
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

      // Notify Product Manager of deletion rejection
      const productManagerId = allocation.phase.project.consultants[0]?.userId;
      if (productManagerId) {
        const consultantName = allocation.consultant.name || allocation.consultant.email || 'Consultant';
        await createNotificationsForUsers(
          [productManagerId],
          NotificationType.PHASE_ALLOCATION_REJECTED,
          'Phase Allocation Deletion Rejected',
          `Your request to remove ${consultantName} from "${allocation.phase.name}" in ${allocation.phase.project.title} was rejected. Reason: ${rejectionReason || 'No reason provided'}`,
          `/dashboard/projects/${allocation.phase.project.id}`,
          {
            projectId: allocation.phase.project.id,
            phaseId: allocation.phase.id,
            allocationId: allocation.id,
            isDeletion: true
          }
        );
      }

      return NextResponse.json(updatedAllocation);
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

          // Send rejection emails to both consultant and PM
          try {
            const emailPromises = [];

            // Email to consultant
            if (allocation.consultant.email) {
              const consultantEmailTemplate = PhaseAllocationRejectionEmail({
                recipientName: allocation.consultant.name || 'Consultant',
                recipientRole: 'consultant',
                consultantName: consultantName,
                phaseName: allocation.phase.name,
                projectTitle: allocation.phase.project.title,
                totalHours: allocation.totalHours,
                rejectionReason,
                dashboardUrl: `${process.env.NEXTAUTH_URL}/dashboard/weekly-planner`,
              });

              const { html: consultantHtml, text: consultantText } = await renderEmailTemplate(consultantEmailTemplate);

              emailPromises.push(
                sendEmail({
                  to: allocation.consultant.email,
                  subject: `Phase Allocation Rejected: ${allocation.phase.name}`,
                  html: consultantHtml,
                  text: consultantText,
                }).catch(error => {
                  console.error(`Failed to send rejection email to consultant ${allocation.consultant.email}:`, error);
                })
              );
            }

            // Email to Product Manager
            if (productManagerId && productManagerId !== allocation.consultantId) {
              const pmUser = updatedAllocation.phase.project.consultants[0]?.user;
              if (pmUser?.email) {
                const pmEmailTemplate = PhaseAllocationRejectionEmail({
                  recipientName: pmUser.name || 'Product Manager',
                  recipientRole: 'pm',
                  consultantName: consultantName,
                  phaseName: allocation.phase.name,
                  projectTitle: allocation.phase.project.title,
                  totalHours: allocation.totalHours,
                  rejectionReason,
                  dashboardUrl: `${process.env.NEXTAUTH_URL}/dashboard/projects/${allocation.phase.project.id}`,
                });

                const { html: pmHtml, text: pmText } = await renderEmailTemplate(pmEmailTemplate);

                emailPromises.push(
                  sendEmail({
                    to: pmUser.email,
                    subject: `Phase Allocation Rejected: ${consultantName} - ${allocation.phase.name}`,
                    html: pmHtml,
                    text: pmText,
                  }).catch(error => {
                    console.error(`Failed to send rejection email to PM ${pmUser.email}:`, error);
                  })
                );
              }
            }

            // Send all emails in parallel
            await Promise.allSettled(emailPromises);
          } catch (emailError) {
            console.error('Failed to send rejection emails:', emailError);
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