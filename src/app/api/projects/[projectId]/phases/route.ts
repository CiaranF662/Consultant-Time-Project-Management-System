import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  const session = await getServerSession(authOptions);

  // Security: Only allow Growth Team members to create phases
  if (session?.user.role !== UserRole.GROWTH_TEAM) {
    return new NextResponse(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
  }

  try {
    const { projectId } = params;
    const body = await request.json();
    const { name, description, startDate, endDate } = body;

    if (!name || !startDate || !endDate) {
      return new NextResponse(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const newPhase = await prisma.phase.create({
      data: {
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        projectId: projectId,
      },
    });

    return NextResponse.json(newPhase, { status: 201 });
  } catch (error) {
    console.error('Error creating phase:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to create phase' }), { status: 500 });
  }
}