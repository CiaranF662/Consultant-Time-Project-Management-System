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

    // Update the allocation
    const updatedAllocation = await prisma.phaseAllocation.update({
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
            project: true
          }
        }
      }
    });

    // Send notifications to both consultant and Product Manager
    try {
      const consultantName = allocation.consultant.name || allocation.consultant.email || 'Consultant';
      const productManagerId = allocation.phase.project.consultants[0]?.userId;
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
          `/dashboard/projects/${allocation.phase.project.id}`,
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
          `/dashboard/projects/${allocation.phase.project.id}`,
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
        // Notify consultant
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