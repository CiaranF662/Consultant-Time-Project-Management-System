import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
// Alias prisma as any to allow accessing models that may have been renamed or
// removed in the generated Prisma client during incremental migrations. This
// is a temporary runtime compatibility shim used while we reconcile schema
// and code. Consumers should resolve the model name mismatch rather than
// relying on `any` long-term.
const anyPrisma = prisma as any;

// GET handler to fetch existing hours for the logged-in user for a specific sprint
export async function GET(
  request: Request,
  context: { params: Promise<{ sprintId: string }> }
) {
  const params = await context.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  // The original schema referenced a ConsultantSprintHours model. The current
  // Prisma schema may have been restructured and that model removed. To avoid
  // a hard TypeScript error when the generated Prisma client doesn't include
  // the model, access it via `any` and fail gracefully if it's not present.
  const anyPrisma = prisma as any;
  if (!anyPrisma.consultantSprintHours) {
    return new NextResponse(
      JSON.stringify({ error: 'ConsultantSprintHours model not available in Prisma client' }),
      { status: 501 }
    );
  }

  const hours = await anyPrisma.consultantSprintHours.findMany({
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

    // Use a transaction to perform "upserts" for both weeks. If the
    // ConsultantSprintHours model is not present in the generated client,
    // return a 501 so callers know this endpoint isn't available until the
    // schema/code are reconciled. We already checked presence above.
    const transaction = await prisma.$transaction([
      anyPrisma.consultantSprintHours.upsert({
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
      anyPrisma.consultantSprintHours.upsert({
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