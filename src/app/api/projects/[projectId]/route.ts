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

  const whereClause =
    userRole === UserRole.GROWTH_TEAM
      ? { id: projectId }
      : { id: projectId, consultants: { some: { userId: userId } } };

  try {
    const project = await prisma.project.findFirst({
      where: whereClause,
      include: {
        sprints: {
          orderBy: { sprintNumber: 'asc' }
        },
        phases: {
          orderBy: { startDate: 'asc' },
          include: {
            sprints: {
              orderBy: { sprintNumber: 'asc' },
            },
            allocations: {
              include: {
                consultant: {
                  select: { id: true, name: true, email: true }
                },
                weeklyAllocations: {
                  orderBy: { weekStartDate: 'asc' }
                }
              }
            }
          },
        },
        consultants: {
          include: { 
            user: { 
              select: { id: true, name: true, email: true } 
            } 
          },
        },
        productManager: {
          select: { id: true, name: true, email: true }
        }
      },
    });

    if (!project) {
      return new NextResponse(JSON.stringify({ error: 'Project not found or not authorized' }), { status: 404 });
    }

    // Transform the data to match frontend expectations
    const transformedProject = {
      ...project,
      phases: project.phases.map(phase => ({
        ...phase,
        phaseAllocations: phase.allocations.map(allocation => ({
          id: allocation.id,
          consultantId: allocation.consultantId,
          consultantName: allocation.consultant.name || allocation.consultant.email || 'Unknown',
          hours: allocation.totalHours,
          usedHours: allocation.weeklyAllocations.reduce((sum, wa) => sum + wa.plannedHours, 0)
        })),
        // Remove the original allocations field to avoid confusion
        allocations: undefined
      }))
    };

    return NextResponse.json(transformedProject);
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