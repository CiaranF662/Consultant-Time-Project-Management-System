import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createNotificationsForUsers, getGrowthTeamMemberIds } from '@/lib/notifications';
import { NotificationType } from '@prisma/client';
import { sendEmail, renderEmailTemplate } from '@/lib/email';
import ExpiredAllocationsSummaryEmail from '@/emails/ExpiredAllocationsSummaryEmail';

interface ExpiredAllocationData {
  allocation: any;
  unplannedHours: number;
  plannedHours: number;
}

async function sendSummaryEmails(expiredAllocations: ExpiredAllocationData[]) {
  // Group expired allocations by Product Manager
  const pmGroups = new Map<string, ExpiredAllocationData[]>();
  // Group expired allocations by Consultant
  const consultantGroups = new Map<string, ExpiredAllocationData[]>();
  // Collect all for Growth Team
  const growthTeamAllocations = expiredAllocations;

  for (const expiredData of expiredAllocations) {
    const { allocation } = expiredData;
    const pmId = allocation.phase.project.productManagerId;
    const consultantId = allocation.consultantId;

    // Group by PM
    if (pmId) {
      if (!pmGroups.has(pmId)) {
        pmGroups.set(pmId, []);
      }
      pmGroups.get(pmId)!.push(expiredData);
    }

    // Group by Consultant
    if (!consultantGroups.has(consultantId)) {
      consultantGroups.set(consultantId, []);
    }
    consultantGroups.get(consultantId)!.push(expiredData);
  }

  // Send email to each Product Manager
  for (const [pmId, pmAllocations] of pmGroups.entries()) {
    try {
      const pm = await prisma.user.findUnique({
        where: { id: pmId },
        select: { name: true, email: true }
      });

      if (!pm?.email) {
        console.log(`[CRON] Skipping PM ${pmId} - no email found`);
        continue;
      }

      const expiredAllocationsForEmail = pmAllocations.map(({ allocation, unplannedHours, plannedHours }) => ({
        consultantName: allocation.consultant.name || allocation.consultant.email || 'Consultant',
        projectName: allocation.phase.project.title,
        phaseName: allocation.phase.name,
        unplannedHours,
        plannedHours,
        totalHours: allocation.totalHours,
        projectId: allocation.phase.project.id
      }));

      const emailTemplate = ExpiredAllocationsSummaryEmail({
        recipientName: pm.name || pm.email,
        recipientRole: 'PRODUCT_MANAGER',
        expiredAllocations: expiredAllocationsForEmail
      });

      const { html, text } = await renderEmailTemplate(emailTemplate);

      await sendEmail({
        to: pm.email,
        subject: `Action Required: ${pmAllocations.length} Phase${pmAllocations.length > 1 ? 's' : ''} ${pmAllocations.length > 1 ? 'Have' : 'Has'} Unplanned Hours`,
        html,
        text
      });

      console.log(`[CRON] Sent PM summary email to ${pm.email} (${pmAllocations.length} allocations)`);
    } catch (error) {
      console.error(`[CRON] Failed to send PM email to ${pmId}:`, error);
    }
  }

  // Send email to each Consultant
  for (const [consultantId, consultantAllocations] of consultantGroups.entries()) {
    try {
      const consultant = await prisma.user.findUnique({
        where: { id: consultantId },
        select: { name: true, email: true }
      });

      if (!consultant?.email) {
        console.log(`[CRON] Skipping consultant ${consultantId} - no email found`);
        continue;
      }

      // Get PM name for each allocation
      const expiredAllocationsForEmail = await Promise.all(
        consultantAllocations.map(async ({ allocation, unplannedHours, plannedHours }) => {
          const pm = allocation.phase.project.productManagerId
            ? await prisma.user.findUnique({
                where: { id: allocation.phase.project.productManagerId },
                select: { name: true }
              })
            : null;

          return {
            consultantName: allocation.consultant.name || allocation.consultant.email || 'Consultant',
            projectName: allocation.phase.project.title,
            phaseName: allocation.phase.name,
            unplannedHours,
            plannedHours,
            totalHours: allocation.totalHours,
            projectId: allocation.phase.project.id,
            productManagerName: pm?.name || undefined
          };
        })
      );

      const emailTemplate = ExpiredAllocationsSummaryEmail({
        recipientName: consultant.name || consultant.email,
        recipientRole: 'CONSULTANT',
        expiredAllocations: expiredAllocationsForEmail
      });

      const { html, text } = await renderEmailTemplate(emailTemplate);

      await sendEmail({
        to: consultant.email,
        subject: `${consultantAllocations.length} of Your Phase${consultantAllocations.length > 1 ? 's' : ''} Ended with Unplanned Hours`,
        html,
        text
      });

      console.log(`[CRON] Sent consultant summary email to ${consultant.email} (${consultantAllocations.length} allocations)`);
    } catch (error) {
      console.error(`[CRON] Failed to send consultant email to ${consultantId}:`, error);
    }
  }

  // Send one summary email to all Growth Team members
  try {
    const growthTeamIds = await getGrowthTeamMemberIds();
    const growthTeamMembers = await prisma.user.findMany({
      where: {
        id: { in: growthTeamIds },
        email: { not: null }
      },
      select: { id: true, name: true, email: true }
    });

    if (growthTeamMembers.length === 0) {
      console.log(`[CRON] No Growth Team members with email found`);
    } else {
      // Get PM names for all allocations
      const expiredAllocationsForEmail = await Promise.all(
        growthTeamAllocations.map(async ({ allocation, unplannedHours, plannedHours }) => {
          const pm = allocation.phase.project.productManagerId
            ? await prisma.user.findUnique({
                where: { id: allocation.phase.project.productManagerId },
                select: { name: true }
              })
            : null;

          return {
            consultantName: allocation.consultant.name || allocation.consultant.email || 'Consultant',
            projectName: allocation.phase.project.title,
            phaseName: allocation.phase.name,
            unplannedHours,
            plannedHours,
            totalHours: allocation.totalHours,
            projectId: allocation.phase.project.id,
            productManagerName: pm?.name || undefined
          };
        })
      );

      // Send to all Growth Team members
      for (const member of growthTeamMembers) {
        if (!member.email) continue;

        const emailTemplate = ExpiredAllocationsSummaryEmail({
          recipientName: member.name || member.email,
          recipientRole: 'GROWTH_TEAM',
          expiredAllocations: expiredAllocationsForEmail
        });

        const { html, text } = await renderEmailTemplate(emailTemplate);

        await sendEmail({
          to: member.email,
          subject: `Expired Allocations Detected: ${growthTeamAllocations.length} Phase${growthTeamAllocations.length > 1 ? 's' : ''} Across ${new Set(growthTeamAllocations.map(a => a.allocation.phase.project.id)).size} Project${new Set(growthTeamAllocations.map(a => a.allocation.phase.project.id)).size > 1 ? 's' : ''}`,
          html,
          text
        });

        console.log(`[CRON] Sent Growth Team summary email to ${member.email} (${growthTeamAllocations.length} allocations)`);
      }
    }
  } catch (error) {
    console.error(`[CRON] Failed to send Growth Team emails:`, error);
  }
}

export async function GET(request: Request) {
  // Security: Verify this is coming from Vercel Cron or authorized source
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.log('[CRON] Unauthorized access attempt');
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log(`[CRON] Running expired allocation detection at ${new Date().toISOString()}`);

    // Find all APPROVED allocations where phase has ended
    const potentiallyExpired = await prisma.phaseAllocation.findMany({
      where: {
        approvalStatus: 'APPROVED',
        phase: {
          endDate: { lt: today } // Phase ended before today
        }
      },
      include: {
        weeklyAllocations: {
          where: {
            planningStatus: { in: ['APPROVED', 'MODIFIED'] }
          }
        },
        consultant: {
          select: { id: true, name: true, email: true }
        },
        phase: {
          include: {
            project: {
              select: {
                id: true,
                title: true,
                productManagerId: true
              }
            }
          }
        }
      }
    });

    console.log(`[CRON] Found ${potentiallyExpired.length} potentially expired allocations`);

    let expiredCount = 0;
    const newlyExpiredAllocations: ExpiredAllocationData[] = [];

    for (const allocation of potentiallyExpired) {
      // Calculate total planned hours (approved or modified)
      const totalPlanned = allocation.weeklyAllocations.reduce(
        (sum, w) => sum + (w.approvedHours ?? w.proposedHours ?? 0),
        0
      );

      const unplannedHours = allocation.totalHours - totalPlanned;

      // Only create expired record if there are unplanned hours (more than 0.01h to account for floating point)
      if (unplannedHours > 0.01) {
        // Check if we already created an UnplannedExpiredHours record
        const existingExpired = await prisma.unplannedExpiredHours.findUnique({
          where: { phaseAllocationId: allocation.id }
        });

        if (existingExpired) {
          console.log(`[CRON] Skipping allocation ${allocation.id} - already has expired record`);
          continue;
        }

        // Create UnplannedExpiredHours record (keeps PhaseAllocation status as APPROVED)
        await prisma.unplannedExpiredHours.create({
          data: {
            phaseAllocationId: allocation.id,
            unplannedHours: unplannedHours,
            status: 'EXPIRED'
          }
        });

        expiredCount++;

        const consultantName = allocation.consultant.name || allocation.consultant.email || 'Consultant';
        const plannedHours = totalPlanned;

        // Add to newly expired list for summary email
        newlyExpiredAllocations.push({
          allocation,
          unplannedHours,
          plannedHours
        });

        // Notify Product Manager (primary notification)
        if (allocation.phase.project.productManagerId) {
          await createNotificationsForUsers(
            [allocation.phase.project.productManagerId],
            NotificationType.PHASE_ALLOCATION_EXPIRED,
            'Phase Allocation Has Unplanned Hours',
            `${consultantName} has ${unplannedHours.toFixed(1)}h unplanned in "${allocation.phase.name}" (${allocation.phase.project.title}). ${plannedHours.toFixed(1)}h were successfully planned. Please forfeit or reallocate the unplanned hours.`,
            `/dashboard/projects/${allocation.phase.project.id}`,
            {
              phaseAllocationId: allocation.id,
              phaseId: allocation.phase.id,
              projectId: allocation.phase.project.id,
              consultantId: allocation.consultantId,
              unplannedHours: Math.round(unplannedHours * 10) / 10,
              plannedHours: Math.round(plannedHours * 10) / 10
            }
          );
        }

        // Notify Growth Team (FYI/oversight notification)
        const growthTeamIds = await getGrowthTeamMemberIds();
        if (growthTeamIds.length > 0) {
          await createNotificationsForUsers(
            growthTeamIds,
            NotificationType.PHASE_ALLOCATION_EXPIRED,
            'Unplanned Hours Detected',
            `Phase ended: ${consultantName} has ${unplannedHours.toFixed(1)}h unplanned in "${allocation.phase.name}" (${allocation.phase.project.title}). ${plannedHours.toFixed(1)}h were planned.`,
            `/dashboard/projects/${allocation.phase.project.id}`,
            {
              phaseAllocationId: allocation.id,
              phaseId: allocation.phase.id,
              projectId: allocation.phase.project.id,
              consultantId: allocation.consultantId,
              unplannedHours: Math.round(unplannedHours * 10) / 10,
              plannedHours: Math.round(plannedHours * 10) / 10
            }
          );
        }

        // Notify Consultant (FYI)
        await createNotificationsForUsers(
          [allocation.consultantId],
          NotificationType.PHASE_ALLOCATION_EXPIRED,
          'Phase Ended with Unplanned Hours',
          `Your allocation for "${allocation.phase.name}" has ended. ${plannedHours.toFixed(1)}h were successfully planned, but ${unplannedHours.toFixed(1)}h remained unplanned. Contact your Product Manager if these hours need to be reallocated.`,
          `/dashboard/projects/${allocation.phase.project.id}`,
          {
            phaseAllocationId: allocation.id,
            phaseId: allocation.phase.id,
            projectId: allocation.phase.project.id,
            unplannedHours: Math.round(unplannedHours * 10) / 10,
            plannedHours: Math.round(plannedHours * 10) / 10
          }
        );

        console.log(
          `[CRON] Created UnplannedExpiredHours for allocation ${allocation.id}`,
          `(${unplannedHours.toFixed(1)}h unplanned, ${plannedHours.toFixed(1)}h planned out of ${allocation.totalHours}h total)`
        );
      }
    }

    console.log(`[CRON] Completed: Expired ${expiredCount} allocations out of ${potentiallyExpired.length} checked`);

    // Send summary emails if there are any newly expired allocations
    if (newlyExpiredAllocations.length > 0) {
      console.log(`[CRON] Sending summary emails for ${newlyExpiredAllocations.length} expired allocations`);

      try {
        await sendSummaryEmails(newlyExpiredAllocations);
        console.log(`[CRON] Successfully sent summary emails`);
      } catch (emailError) {
        console.error('[CRON] Error sending summary emails:', emailError);
        // Don't fail the cron job if email sending fails
      }
    }

    return NextResponse.json({
      success: true,
      checked: potentiallyExpired.length,
      expired: expiredCount,
      emailsSent: newlyExpiredAllocations.length > 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[CRON] Error detecting expired allocations:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
