import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  try {
    const body = await request.json();
    const { sprintId, projectId, week1Hours, week2Hours, originalWeek1, originalWeek2, reason } = body;
    const consultantId = session.user.id;

    if (!sprintId || !projectId || !reason) {
      return new NextResponse(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    // Create a request for Week 1 if the hours have changed
    if (originalWeek1 !== week1Hours) {
        await prisma.hourChangeRequest.create({
            data: {
                sprintId,
                projectId,
                consultantId,
                weekNumber: 1,
                originalHours: originalWeek1,
                requestedHours: week1Hours,
                reason,
            }
        });
    }

    // Create a request for Week 2 if the hours have changed
    if (originalWeek2 !== week2Hours) {
        await prisma.hourChangeRequest.create({
            data: {
                sprintId,
                projectId,
                consultantId,
                weekNumber: 2,
                originalHours: originalWeek2,
                requestedHours: week2Hours,
                reason,
            }
        });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error creating hour change request:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to create request' }), { status: 500 });
  }
}