import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createNotificationsForUsers, getGrowthTeamMemberIds } from '@/lib/notifications';
import { NotificationType } from '@prisma/client';

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

    for (const allocation of potentiallyExpired) {
      // Calculate total planned hours (approved or modified)
      const totalPlanned = allocation.weeklyAllocations.reduce(
        (sum, w) => sum + (w.approvedHours ?? w.proposedHours ?? 0),
        0
      );

      const unplannedHours = allocation.totalHours - totalPlanned;

      // Only mark as expired if there are unplanned hours (more than 0.01h to account for floating point)
      if (unplannedHours > 0.01) {
        // Update status to EXPIRED
        await prisma.phaseAllocation.update({
          where: { id: allocation.id },
          data: { approvalStatus: 'EXPIRED' }
        });

        expiredCount++;

        const consultantName = allocation.consultant.name || allocation.consultant.email || 'Consultant';

        // Notify Product Manager (primary notification)
        if (allocation.phase.project.productManagerId) {
          await createNotificationsForUsers(
            [allocation.phase.project.productManagerId],
            NotificationType.PHASE_ALLOCATION_EXPIRED,
            'Phase Allocation Expired',
            `${consultantName} has ${unplannedHours.toFixed(1)}h unplanned in "${allocation.phase.name}" (${allocation.phase.project.title}). Please forfeit or reallocate these hours.`,
            `/dashboard/projects/${allocation.phase.project.id}`,
            {
              phaseAllocationId: allocation.id,
              phaseId: allocation.phase.id,
              projectId: allocation.phase.project.id,
              consultantId: allocation.consultantId,
              unplannedHours: Math.round(unplannedHours * 10) / 10 // Round to 1 decimal
            }
          );
        }

        // Notify Growth Team (FYI/oversight notification)
        const growthTeamIds = await getGrowthTeamMemberIds();
        if (growthTeamIds.length > 0) {
          await createNotificationsForUsers(
            growthTeamIds,
            NotificationType.PHASE_ALLOCATION_EXPIRED,
            'Expired Allocation Alert',
            `Phase allocation expired: ${consultantName} has ${unplannedHours.toFixed(1)}h unplanned in "${allocation.phase.name}" (${allocation.phase.project.title}).`,
            `/dashboard/projects/${allocation.phase.project.id}`,
            {
              phaseAllocationId: allocation.id,
              phaseId: allocation.phase.id,
              projectId: allocation.phase.project.id,
              consultantId: allocation.consultantId,
              unplannedHours: Math.round(unplannedHours * 10) / 10
            }
          );
        }

        // Notify Consultant (FYI)
        await createNotificationsForUsers(
          [allocation.consultantId],
          NotificationType.PHASE_ALLOCATION_EXPIRED,
          'Phase Ended with Unplanned Hours',
          `Your allocation for "${allocation.phase.name}" has expired with ${unplannedHours.toFixed(1)}h unplanned. Contact your Product Manager if these hours need to be reallocated.`,
          `/dashboard/projects/${allocation.phase.project.id}`,
          {
            phaseAllocationId: allocation.id,
            phaseId: allocation.phase.id,
            projectId: allocation.phase.project.id,
            unplannedHours: Math.round(unplannedHours * 10) / 10
          }
        );

        console.log(
          `[CRON] Marked allocation ${allocation.id} as EXPIRED`,
          `(${unplannedHours.toFixed(1)}h unplanned out of ${allocation.totalHours}h)`
        );
      }
    }

    console.log(`[CRON] Completed: Expired ${expiredCount} allocations out of ${potentiallyExpired.length} checked`);

    return NextResponse.json({
      success: true,
      checked: potentiallyExpired.length,
      expired: expiredCount,
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
