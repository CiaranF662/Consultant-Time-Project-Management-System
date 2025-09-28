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
          select: {
            userId: true,
            role: true,
            allocatedHours: true,
            assignedAt: true,
            user: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { assignedAt: 'asc' }
        },
        productManager: {
          select: { id: true, name: true, email: true }
        }
      },
    });

    // Get all approved weekly allocations for this project
    const approvedWeeklyAllocations = await prisma.weeklyAllocation.findMany({
      where: {
        phaseAllocation: {
          phase: {
            projectId: projectId
          }
        },
        planningStatus: { in: ['APPROVED', 'MODIFIED'] }
      }
    });

    if (!project) {
      return new NextResponse(JSON.stringify({ error: 'Project not found or not authorized' }), { status: 404 });
    }

    // Debug: Log consultant data to see what's being retrieved
    console.log('Consultant data from database:', JSON.stringify(project.consultants, null, 2));

    // Transform the data to match frontend expectations
    const transformedProject = {
      ...project,
      phases: project.phases.map(phase => ({
        ...phase,
        phaseAllocations: phase.allocations.map(allocation => {
          // Get approved weekly allocations for this specific allocation
          const approvedWeeklyForThisAllocation = approvedWeeklyAllocations.filter(
            wa => wa.phaseAllocationId === allocation.id
          );

          // Calculate planned hours from approved weekly allocations only
          const totalPlannedHours = approvedWeeklyForThisAllocation.reduce((sum, wa) => sum + (wa.approvedHours || 0), 0);

          return {
            id: allocation.id,
            consultantId: allocation.consultantId,
            consultantName: allocation.consultant.name || allocation.consultant.email || 'Unknown',
            hours: allocation.totalHours,
            plannedHours: totalPlannedHours,
            approvalStatus: allocation.approvalStatus
          };
        }),
        // Keep allocations for phase status calculation
        allocations: phase.allocations.map(allocation => {
          // Get approved weekly allocations for this specific allocation
          const approvedWeeklyForThisAllocation = approvedWeeklyAllocations.filter(
            wa => wa.phaseAllocationId === allocation.id
          );

          // Use only approved weekly allocations for phase status calculation
          const combinedWeeklyAllocations = approvedWeeklyForThisAllocation.map(wa => ({
            id: wa.id,
            plannedHours: wa.approvedHours || 0,
            weekStartDate: wa.weekStartDate,
            weekEndDate: wa.weekEndDate,
            weekNumber: wa.weekNumber,
            year: wa.year
          }));

          return {
            id: allocation.id,
            consultantId: allocation.consultantId,
            totalHours: allocation.totalHours,
            approvalStatus: allocation.approvalStatus,
            weeklyAllocations: combinedWeeklyAllocations
          };
        })
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
    { params }: { params: Promise<{ projectId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'GROWTH_TEAM') {
        return new NextResponse(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
    }

    try {
        const { projectId } = await params;
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
    { params }: { params: Promise<{ projectId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'GROWTH_TEAM') {
        return new NextResponse(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
    }

    try {
        const { projectId } = await params;
        
        // First, check if the project exists
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
                phases: {
                    include: {
                        allocations: {
                            include: {
                                weeklyAllocations: true
                            }
                        }
                    }
                },
                consultants: true,
                sprints: true
            }
        });

        if (!project) {
            return new NextResponse(JSON.stringify({ error: 'Project not found' }), { status: 404 });
        }

        // Use a transaction to ensure all deletions are atomic
        await prisma.$transaction(async (tx) => {
            // 1. Delete any HourChangeRequests related to this project's phase allocations
            const phaseAllocationIds = project.phases.flatMap(phase => 
                phase.allocations.map(allocation => allocation.id)
            );
            
            if (phaseAllocationIds.length > 0) {
                await tx.hourChangeRequest.deleteMany({
                    where: {
                        phaseAllocationId: {
                            in: phaseAllocationIds
                        }
                    }
                });
            }

            // 2. Delete weekly allocations (should cascade from phase allocations, but being explicit)
            for (const phase of project.phases) {
                for (const allocation of phase.allocations) {
                    await tx.weeklyAllocation.deleteMany({
                        where: { phaseAllocationId: allocation.id }
                    });
                }
            }

            // 3. Delete phase allocations (should cascade from phases, but being explicit)
            for (const phase of project.phases) {
                await tx.phaseAllocation.deleteMany({
                    where: { phaseId: phase.id }
                });
            }

            // 4. Delete phases (should cascade from project, but being explicit)
            await tx.phase.deleteMany({
                where: { projectId: projectId }
            });

            // 5. Delete sprints (should cascade from project)
            await tx.sprint.deleteMany({
                where: { projectId: projectId }
            });

            // 6. Delete consultant assignments (this is the key missing cascade)
            await tx.consultantsOnProjects.deleteMany({
                where: { projectId: projectId }
            });

            // 7. Finally, delete the project itself
            await tx.project.delete({
                where: { id: projectId }
            });
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error deleting project:', error);
        return new NextResponse(JSON.stringify({ 
            error: 'Failed to delete project', 
            details: error instanceof Error ? error.message : 'Unknown error' 
        }), { status: 500 });
    }
}