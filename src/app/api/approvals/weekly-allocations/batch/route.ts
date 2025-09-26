import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole, NotificationType } from '@prisma/client';

const prisma = new PrismaClient();

// POST batch approve/modify/reject weekly allocations
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  // Check if user is Growth Team
  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  });

  if (user?.role !== UserRole.GROWTH_TEAM) {
    return new NextResponse(JSON.stringify({ error: 'Only Growth Team can batch approve weekly allocations' }), { status: 403 });
  }

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
          actionUrl: '/dashboard/allocations',
          metadata: {
            projectId: dbAllocation.phaseAllocation.phase.project.id,
            phaseId: dbAllocation.phaseAllocation.phase.id,
            allocationId: dbAllocation.id,
            weekNumber: dbAllocation.weekNumber,
            year: dbAllocation.year
          }
        });
      }

      // Create all notifications
      if (notifications.length > 0) {
        await tx.notification.createMany({
          data: notifications
        });
      }

      return updateResults;
    });

    return NextResponse.json({
      success: true,
      updated: results.length,
      message: `Successfully processed ${results.length} allocations`
    });

  } catch (error) {
    console.error('Error processing batch weekly allocation approvals:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to process batch approvals' }), { status: 500 });
  }
}