import { NextResponse } from 'next/server';
import { requireGrowthTeam, isAuthError } from '@/lib/api-auth';
import { UserRole, NotificationType } from '@prisma/client';
import { sendEmail, renderEmailTemplate } from '@/lib/email';
import WeeklyPlanApprovalEmail from '@/emails/WeeklyPlanApprovalEmail';

import { prisma } from "@/lib/prisma";

// POST batch approve/modify/reject weekly allocations
export async function POST(request: Request) {
  const auth = await requireGrowthTeam();
  if (isAuthError(auth)) return auth;
  const { session, user } = auth;

  try {
    const body = await request.json();
    const { allocations, defaultAction } = body;

    if (!Array.isArray(allocations) || allocations.length === 0) {
      return new NextResponse(JSON.stringify({ error: 'No allocations provided' }), { status: 400 });
    }

    if (!['approve', 'reject'].includes(defaultAction)) {
      return new NextResponse(JSON.stringify({ error: 'Invalid default action' }), { status: 400 });
    }

    // Validate all allocation IDs exist and are pending
    const allocationIds = allocations.map(alloc => alloc.id);
    const existingAllocations = await prisma.weeklyAllocation.findMany({
      where: {
        id: { in: allocationIds },
        planningStatus: 'PENDING'
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

    if (existingAllocations.length !== allocationIds.length) {
      return new NextResponse(JSON.stringify({ error: 'Some allocations not found or not pending' }), { status: 400 });
    }

    // Process batch updates
    const results = await prisma.$transaction(async (tx) => {
      const updateResults = [];
      const notifications = [];
      const emailDataByPhase: Map<string, any> = new Map();

      for (const allocation of allocations) {
        const dbAllocation = existingAllocations.find(a => a.id === allocation.id);
        if (!dbAllocation) continue;

        const action = allocation.action || defaultAction;
        const approvedHours = allocation.approvedHours !== undefined ? allocation.approvedHours : dbAllocation.proposedHours;
        const rejectionReason = allocation.rejectionReason;

        // Determine planning status
        let planningStatus: string;
        if (action === 'reject') {
          planningStatus = 'REJECTED';
        } else if (approvedHours !== dbAllocation.proposedHours) {
          planningStatus = 'MODIFIED';
        } else {
          planningStatus = 'APPROVED';
        }

        // Update allocation
        const updatedAllocation = await tx.weeklyAllocation.update({
          where: { id: allocation.id },
          data: {
            planningStatus: planningStatus as any,
            approvedHours: action === 'reject' ? null : approvedHours,
            approvedBy: session.user.id,
            approvedAt: new Date(),
            rejectionReason: action === 'reject' ? rejectionReason : null,
          }
        });

        updateResults.push(updatedAllocation);

        // Prepare notification
        let notificationType: NotificationType;
        let notificationTitle: string;
        let notificationMessage: string;

        switch (planningStatus) {
          case 'APPROVED':
            notificationType = NotificationType.WEEKLY_ALLOCATION_APPROVED;
            notificationTitle = 'Weekly Allocation Approved';
            notificationMessage = `Your weekly allocation for ${dbAllocation.phaseAllocation.phase.name} (Week ${dbAllocation.weekNumber}, ${dbAllocation.year}) has been approved for ${approvedHours}h.`;
            break;
          case 'MODIFIED':
            notificationType = NotificationType.WEEKLY_ALLOCATION_MODIFIED;
            notificationTitle = 'Weekly Allocation Modified';
            notificationMessage = `Your weekly allocation for ${dbAllocation.phaseAllocation.phase.name} (Week ${dbAllocation.weekNumber}, ${dbAllocation.year}) has been modified from ${dbAllocation.proposedHours}h to ${approvedHours}h.`;
            break;
          case 'REJECTED':
            notificationType = NotificationType.WEEKLY_ALLOCATION_REJECTED;
            notificationTitle = 'Weekly Allocation Rejected';
            notificationMessage = `Your weekly allocation for ${dbAllocation.phaseAllocation.phase.name} (Week ${dbAllocation.weekNumber}, ${dbAllocation.year}) has been rejected. ${rejectionReason ? `Reason: ${rejectionReason}` : ''}`;
            break;
          default:
            notificationType = NotificationType.WEEKLY_ALLOCATION_APPROVED;
            notificationTitle = 'Weekly Allocation Updated';
            notificationMessage = `Your weekly allocation has been updated.`;
            break;
        }

        notifications.push({
          userId: dbAllocation.consultantId,
          type: notificationType,
          title: notificationTitle,
          message: notificationMessage,
          actionUrl: `/dashboard/weekly-planner?phaseAllocationId=${dbAllocation.phaseAllocationId}`,
          metadata: {
            projectId: dbAllocation.phaseAllocation.phase.project.id,
            phaseId: dbAllocation.phaseAllocation.phase.id,
            allocationId: dbAllocation.id,
            weekNumber: dbAllocation.weekNumber,
            year: dbAllocation.year
          }
        });

        // Group allocations by phase for email sending
        const phaseKey = `${dbAllocation.phaseAllocationId}-${dbAllocation.consultantId}`;
        if (!emailDataByPhase.has(phaseKey)) {
          emailDataByPhase.set(phaseKey, {
            consultant: dbAllocation.consultant,
            phaseName: dbAllocation.phaseAllocation.phase.name,
            projectTitle: dbAllocation.phaseAllocation.phase.project.title,
            phaseAllocationId: dbAllocation.phaseAllocationId,
            weeklyAllocations: [],
            overallStatus: planningStatus,
            rejectionReason: rejectionReason,
          });
        }

        const phaseData = emailDataByPhase.get(phaseKey);
        phaseData.weeklyAllocations.push({
          weekStartDate: dbAllocation.weekStartDate.toISOString(),
          weekEndDate: dbAllocation.weekEndDate.toISOString(),
          proposedHours: approvedHours || 0,
          approvalStatus: planningStatus,
        });

        // Update overall status (prioritize REJECTED > MODIFIED > APPROVED)
        if (planningStatus === 'REJECTED' ||
            (planningStatus === 'MODIFIED' && phaseData.overallStatus !== 'REJECTED')) {
          phaseData.overallStatus = planningStatus;
        }
        if (rejectionReason) {
          phaseData.rejectionReason = rejectionReason;
        }
      }

      // Create all notifications
      if (notifications.length > 0) {
        await tx.notification.createMany({
          data: notifications
        });
      }

      return { updateResults, emailDataByPhase };
    });

    // Send emails grouped by phase (outside transaction)
    const emailPromises = [];
    for (const [phaseKey, phaseData] of results.emailDataByPhase) {
      if (!phaseData.consultant.email) continue;

      try {
        const emailTemplate = WeeklyPlanApprovalEmail({
          consultantName: phaseData.consultant.name || 'Consultant',
          phaseName: phaseData.phaseName,
          projectTitle: phaseData.projectTitle,
          approvalStatus: phaseData.overallStatus === 'REJECTED' ? 'REJECTED' : 'APPROVED',
          weeklyAllocations: phaseData.weeklyAllocations,
          dashboardUrl: `${process.env.NEXTAUTH_URL}/dashboard/weekly-planner?phaseAllocationId=${phaseData.phaseAllocationId}`,
          rejectionReason: phaseData.rejectionReason,
        });

        const { html, text } = await renderEmailTemplate(emailTemplate);

        const emailPromise = sendEmail({
          to: phaseData.consultant.email,
          subject: `Weekly Plan ${phaseData.overallStatus === 'REJECTED' ? 'Rejected' : 'Approved'}: ${phaseData.phaseName}`,
          html,
          text,
        }).catch(error => {
          console.error(`Failed to send email to ${phaseData.consultant.email}:`, error);
        });

        emailPromises.push(emailPromise);
      } catch (error) {
        console.error('Error preparing email for phase:', phaseKey, error);
      }
    }

    // Send all emails in parallel
    await Promise.allSettled(emailPromises);

    return NextResponse.json({
      success: true,
      updated: results.updateResults.length,
      message: `Successfully processed ${results.updateResults.length} allocations`
    });

  } catch (error) {
    console.error('Error processing batch weekly allocation approvals:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to process batch approvals' }), { status: 500 });
  }
}