import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== UserRole.GROWTH_TEAM) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, rejectionReason } = await request.json();
    const requestId = params.id;

    // Get the hour change request
    const hourChangeRequest = await prisma.hourChangeRequest.findUnique({
      where: { id: requestId },
      include: {
        requester: true,
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

    if (!hourChangeRequest) {
      return NextResponse.json({ error: 'Hour change request not found' }, { status: 404 });
    }

    if (hourChangeRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'Hour change request is not pending' }, { status: 400 });
    }

    if (action === 'approve') {
      // Update the phase allocation based on the request type
      const currentAllocation = hourChangeRequest.phaseAllocation;
      let newTotalHours = currentAllocation.totalHours;

      if (hourChangeRequest.requestType === 'INCREASE') {
        newTotalHours += hourChangeRequest.requestedHours;
      } else if (hourChangeRequest.requestType === 'DECREASE') {
        newTotalHours -= hourChangeRequest.requestedHours;
        if (newTotalHours < 0) newTotalHours = 0;
      }
      // Note: TRANSFER requests would require additional logic to handle the transfer

      // Update the phase allocation
      await prisma.phaseAllocation.update({
        where: { id: currentAllocation.id },
        data: { totalHours: newTotalHours }
      });

      // Update the hour change request status
      await prisma.hourChangeRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          approverId: session.user.id
        }
      });

      // Create notification for the requester
      await prisma.notification.create({
        data: {
          userId: hourChangeRequest.requesterId,
          type: 'HOUR_CHANGE_APPROVED',
          title: 'Hour Change Request Approved',
          message: `Your request to ${hourChangeRequest.requestType.toLowerCase()} ${hourChangeRequest.requestedHours} hours for ${currentAllocation.phase.name} in ${currentAllocation.phase.project.title} has been approved.`,
          data: {
            hourChangeRequestId: requestId,
            phaseAllocationId: currentAllocation.id,
            projectId: currentAllocation.phase.project.id
          }
        }
      });

    } else if (action === 'reject') {
      // Update the hour change request status
      await prisma.hourChangeRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          rejectedAt: new Date(),
          rejectionReason: rejectionReason,
          approverId: session.user.id
        }
      });

      // Create notification for the requester
      await prisma.notification.create({
        data: {
          userId: hourChangeRequest.requesterId,
          type: 'HOUR_CHANGE_REJECTED',
          title: 'Hour Change Request Rejected',
          message: `Your request to ${hourChangeRequest.requestType.toLowerCase()} ${hourChangeRequest.requestedHours} hours for ${hourChangeRequest.phaseAllocation.phase.name} in ${hourChangeRequest.phaseAllocation.phase.project.title} has been rejected. Reason: ${rejectionReason}`,
          data: {
            hourChangeRequestId: requestId,
            phaseAllocationId: hourChangeRequest.phaseAllocation.id,
            projectId: hourChangeRequest.phaseAllocation.phase.project.id
          }
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing hour change approval:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}