import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  const { projectId } = await params;
  const { id: userId, role } = session.user;
  const userRole = role as UserRole;

  try {
    // Check if user has access to this project
    const project = await prisma.project.findFirst({
      where: userRole === UserRole.GROWTH_TEAM 
        ? { id: projectId }
        : { 
            id: projectId,
            OR: [
              { productManagerId: userId },
              { consultants: { some: { userId: userId } } }
            ]
          }
    });

    if (!project) {
      return new NextResponse(JSON.stringify({ error: 'Project not found or not authorized' }), { status: 404 });
    }

    // Get consultants assigned to this project
    const consultants = await prisma.user.findMany({
      where: {
        projectAssignments: {
          some: { projectId: projectId }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(consultants);
  } catch (error) {
    console.error('Failed to fetch project consultants:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}