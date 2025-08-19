import { NextResponse } from 'next/server';
import { PrismaClient, ChangeStatus } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'GROWTH_TEAM') {
      return new NextResponse(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
    }
  
    try {
      const requests = await prisma.hourChangeRequest.findMany({
        where: { status: ChangeStatus.PENDING },
        include: {
          requester: true,
          sprint: {
            include: {
              project: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
      return NextResponse.json(requests);
    } catch (error) {
      console.error('Error fetching hour change requests:', error);
      return new NextResponse(JSON.stringify({ error: 'Failed to fetch requests' }), { status: 500 });
    }
  }
  
export async function PATCH(
  request: Request,
  { params }: { params: { requestId: string } }
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'GROWTH_TEAM') {
    return new NextResponse(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
  }

  try {
    const { requestId } = params;
    const { status } = await request.json();

    if (!Object.values(ChangeStatus).includes(status)) {
      return new NextResponse(JSON.stringify({ error: 'Invalid status' }), { status: 400 });
    }

    // Use a transaction to ensure data consistency
    const transaction = await prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.hourChangeRequest.update({
        where: { id: requestId },
        data: { status, approverId: session.user.id },
      });

      // If approved, update the consultant's sprint hours
      if (status === ChangeStatus.APPROVED) {
        await tx.consultantSprintHours.updateMany({
          where: {
            consultantId: updatedRequest.consultantId,
            sprintId: updatedRequest.sprintId,
            weekNumber: updatedRequest.weekNumber,
          },
          data: {
            hours: updatedRequest.requestedHours,
          },
        });
      }

      return updatedRequest;
    });

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Error updating hour change request:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to update request' }), { status: 500 });
  }
}