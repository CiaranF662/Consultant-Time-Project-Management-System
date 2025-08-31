import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, ChangeType } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  try {
    const whereClause: any = {};
    
    // Filter by status if provided
    if (status) {
      whereClause.status = status;
    }

    // If not Growth Team, only show own requests
    if (session.user.role !== 'GROWTH_TEAM') {
      whereClause.consultantId = session.user.id;
    }

    const requests = await prisma.hourChangeRequest.findMany({
      where: whereClause,
      include: {
        requester: {
          select: { id: true, name: true, email: true }
        },
        approver: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error('Error fetching hour change requests:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch requests' }), { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  try {
    const body = await request.json();
    const { 
      changeType, 
      phaseAllocationId, 
      originalHours, 
      requestedHours, 
      fromConsultantId,
      toConsultantId,
      shiftHours,
      phaseId,
      weekNumber,
      year,
      reason 
    } = body;

    if (!reason) {
      return new NextResponse(JSON.stringify({ error: 'Reason is required' }), { status: 400 });
    }

    const changeRequest = await prisma.hourChangeRequest.create({
      data: {
        changeType: changeType as ChangeType,
        phaseAllocationId,
        originalHours: originalHours || 0,
        requestedHours: requestedHours || 0,
        fromConsultantId,
        toConsultantId,
        shiftHours,
        phaseId,
        weekNumber,
        year,
        reason,
        consultantId: session.user.id
      },
      include: {
        requester: true
      }
    });

    return NextResponse.json(changeRequest, { status: 201 });
  } catch (error) {
    console.error('Error creating hour change request:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to create request' }), { status: 500 });
  }
}
