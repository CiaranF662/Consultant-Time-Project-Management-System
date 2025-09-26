import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole, NotificationType } from '@prisma/client';

const prisma = new PrismaClient();

// POST approve or reject phase allocation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ allocationId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  const { allocationId } = await params;

  // Check if user is Growth Team
  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  });

  if (user?.role !== UserRole.GROWTH_TEAM) {
    return new NextResponse(JSON.stringify({ error: 'Only Growth Team can approve phase allocations' }), { status: 403 });
  }

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
            project: true
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

    // Create notification for the consultant
    const notificationType = action === 'approve' || action === 'modify'
      ? NotificationType.PHASE_ALLOCATION_APPROVED
      : NotificationType.PHASE_ALLOCATION_REJECTED;

    const notificationMessage = action === 'approve'
      ? `Your phase allocation for ${allocation.phase.name} (${allocation.totalHours}h) has been approved.`
      : action === 'modify'
      ? `Your phase allocation for ${allocation.phase.name} has been approved with modified hours (${modifiedHours}h instead of ${allocation.totalHours}h).`
      : `Your phase allocation for ${allocation.phase.name} has been rejected. Reason: ${rejectionReason}`;

    await prisma.notification.create({
      data: {
        userId: allocation.consultantId,
        type: notificationType,
        title: `Phase Allocation ${action === 'approve' || action === 'modify' ? 'Approved' : 'Rejected'}`,
        message: notificationMessage,
        actionUrl: `/dashboard/projects/${allocation.phase.project.id}`,
        metadata: {
          projectId: allocation.phase.project.id,
          phaseId: allocation.phase.id,
          allocationId: allocation.id
        }
      }
    });

    return NextResponse.json(updatedAllocation);
  } catch (error) {
    console.error('Error processing phase allocation approval:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to process approval' }), { status: 500 });
  }
}