import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { syncPhaseToCalendar } from '@/lib/google-calendar';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phaseId } = await req.json();

    const phase = await prisma.phase.findUnique({
      where: { id: phaseId },
      include: {
        project: true,
        allocations: {
          where: { consultantId: session.user.id }
        }
      }
    });

    if (!phase) {
      return NextResponse.json({ error: 'Phase not found' }, { status: 404 });
    }

    // Only sync if user is allocated to this phase
    if (phase.allocations.length === 0) {
      return NextResponse.json({ error: 'Not allocated to this phase' }, { status: 403 });
    }

    const success = await syncPhaseToCalendar(session.user.id, {
      name: phase.name,
      description: phase.description || undefined,
      startDate: phase.startDate,
      endDate: phase.endDate,
      projectTitle: phase.project.title
    });

    if (success) {
      return NextResponse.json({ success: true, message: 'Phase synced to calendar' });
    } else {
      return NextResponse.json({ error: 'Failed to sync to calendar' }, { status: 500 });
    }

  } catch (error) {
    console.error('Calendar sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}