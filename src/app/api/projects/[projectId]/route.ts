import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  const { projectId } = params;
  const { id: userId, role } = session.user;
  const userRole = role as UserRole;

  const whereClause =
    userRole === UserRole.GROWTH_TEAM
      ? { id: projectId }
      : { id: projectId, consultants: { some: { userId: userId } } };

  try {
    const project = await prisma.project.findFirst({
      where: whereClause,
      include: {
        sprints: {
          orderBy: { sprintNumber: 'asc' },
          include: {
            tasks: { include: { assignee: true }, orderBy: { createdAt: 'asc' } },
            // THIS IS THE FIX: Always include the consultant's name
            sprintHours: {
              where: userRole === UserRole.CONSULTANT ? { consultantId: userId } : {},
              include: {
                consultant: { select: { name: true } },
              },
            },
          },
        },
        phases: {
          orderBy: { startDate: 'asc' },
          include: {
            sprints: {
              orderBy: { sprintNumber: 'asc' },
            },
          },
        },
        consultants: {
          include: { user: { select: { name: true } } },
        },
      },
    });

    if (!project) {
      return new NextResponse(JSON.stringify({ error: 'Project not found or not authorized' }), { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Failed to fetch project details:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}