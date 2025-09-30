import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/api-auth';
import { PrismaClient } from '@prisma/client';

import { prisma } from "@/lib/prisma";

// GET handler to fetch existing hours for the logged-in user for a specific sprint
export async function GET(
  request: Request,
  context: { params: Promise<{ sprintId: string }> }
) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { session, user } = auth;

  const params = await context.params;

  const hours = await prisma.consultantSprintHours.findMany({
    where: {
      sprintId: params.sprintId,
      consultantId: session.user.id,
    },
  });

  return NextResponse.json(hours);
}


// POST handler to create or update hours for a sprint
export async function POST(
  request: Request,
  context: { params: Promise<{ sprintId: string }> }
) {
  const params = await context.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  try {
    const { sprintId } = params;
    const { week1Hours, week2Hours, projectId } = await request.json();
    const consultantId = session.user.id;

    if (week1Hours === undefined || week2Hours === undefined || !projectId) {
        return new NextResponse(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    // Use a transaction to perform "upserts" for both weeks
    // Upsert means it will UPDATE the record if it exists, or CREATE it if it doesn't.
    const transaction = await prisma.$transaction([
      prisma.consultantSprintHours.upsert({
        where: {
          consultantId_sprintId_projectId_weekNumber: {
            consultantId,
            sprintId,
            projectId,
            weekNumber: 1,
          },
        },
        update: { hours: parseFloat(week1Hours) },
        create: {
          hours: parseFloat(week1Hours),
          weekNumber: 1,
          consultantId,
          sprintId,
          projectId,
        },
      }),
      prisma.consultantSprintHours.upsert({
        where: {
          consultantId_sprintId_projectId_weekNumber: {
            consultantId,
            sprintId,
            projectId,
            weekNumber: 2,
          },
        },
        update: { hours: parseFloat(week2Hours) },
        create: {
          hours: parseFloat(week2Hours),
          weekNumber: 2,
          consultantId,
          sprintId,
          projectId,
        },
      }),
    ]);
    
    return NextResponse.json(transaction, { status: 200 });

  } catch (error) {
    console.error('Error logging time:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to log time' }), { status: 500 });
  }
}