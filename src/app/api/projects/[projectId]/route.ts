// This file defines an API route to manage a single project. It provides GET, PATCH, and DELETE
// operations with role-based authorization. The GET endpoint allows any assigned user to view a
// project's details (with filtered data), while the PATCH and DELETE endpoints are restricted
// to 'GROWTH_TEAM' users for updating and deleting the project.

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
            // THIS IS THE FIX: Deeply include sprint details within phases
            sprints: {
              orderBy: { sprintNumber: 'asc' },
              include: {
                tasks: { include: { assignee: true }, orderBy: { createdAt: 'asc' } },
                sprintHours: {
                  where: userRole === UserRole.CONSULTANT ? { consultantId: userId } : {},
                  include: {
                    consultant: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
        consultants: {
          include: { user: { select: { id: true, name: true } } },
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

export async function PATCH(
    request: Request,
    { params }: { params: { projectId: string } }
) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'GROWTH_TEAM') {
        return new NextResponse(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
    }

    try {
        const { projectId } = params;
        const body = await request.json();
        const { title, description } = body;

        const updatedProject = await prisma.project.update({
            where: { id: projectId },
            data: {
                title,
                description,
            },
        });

        return NextResponse.json(updatedProject);
    } catch (error) {
        console.error('Error updating project:', error);
        return new NextResponse(JSON.stringify({ error: 'Failed to update project' }), { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { projectId: string } }
) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'GROWTH_TEAM') {
        return new NextResponse(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
    }

    try {
        const { projectId } = params;
        await prisma.project.delete({
            where: { id: projectId },
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error deleting project:', error);
        return new NextResponse(JSON.stringify({ error: 'Failed to delete project' }), { status: 500 });
    }
}