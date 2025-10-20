import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/api-auth';
import { UserRole } from '@prisma/client';
import { updateProjectSchema, safeValidateRequestBody, formatValidationErrors } from '@/lib/validation-schemas';
import { logError, logApiRequest, logValidationError, logAuthorizationFailure } from '@/lib/error-logger';

import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  logApiRequest('GET', `/api/projects/${projectId}`);

  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { session, user } = auth;
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
                },
                unplannedExpiredHours: true
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
    }) as any;

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
      phases: project.phases.map((phase: any) => ({
        ...phase,
        phaseAllocations: phase.allocations.map((allocation: any) => {
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
            approvalStatus: allocation.approvalStatus,
            rejectionReason: allocation.rejectionReason,
            unplannedExpiredHours: allocation.unplannedExpiredHours
          };
        }),
        // Keep allocations for phase status calculation
        allocations: phase.allocations.map((allocation: any) => {
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
            rejectionReason: allocation.rejectionReason,
            weeklyAllocations: combinedWeeklyAllocations,
            unplannedExpiredHours: allocation.unplannedExpiredHours
          };
        })
      }))
    };

    return NextResponse.json(transformedProject);
  } catch (error) {
    logError('Failed to fetch project details', error as Error, {
      userId: session.user.id,
      projectId,
      endpoint: `/api/projects/${projectId}`
    });
    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ projectId: string }> }
) {
    const { projectId } = await params;
    logApiRequest('PATCH', `/api/projects/${projectId}`);

    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;
    const { session } = auth;

    if (session.user.role !== 'GROWTH_TEAM') {
        logAuthorizationFailure(session.user.id, 'update project', `project:${projectId}`);
        return new NextResponse(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
    }

    try {
        const { projectId } = await params;
        const body = await request.json();

        // Validate request body with Zod
        const validation = safeValidateRequestBody(updateProjectSchema, body);
        if (!validation.success) {
            logValidationError(`/api/projects/${projectId}`, formatValidationErrors(validation.error).details);
            return new NextResponse(
                JSON.stringify(formatValidationErrors(validation.error)),
                { status: 400 }
            );
        }

        const { title, description, budgetedHours, startDate, endDate } = validation.data;

        // Additional business validation for dates
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);

            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 7) {
                return new NextResponse(JSON.stringify({ error: 'Project must be at least 1 week long' }), { status: 400 });
            }
        }

        // Build update data object dynamically
        const updateData: any = {};

        if (title !== undefined) {
            updateData.title = title.trim();
        }

        if (description !== undefined) {
            updateData.description = description?.trim() || null;
        }

        if (budgetedHours !== undefined) {
            updateData.budgetedHours = budgetedHours;
        }

        if (startDate) {
            updateData.startDate = new Date(startDate);
        }

        if (endDate) {
            updateData.endDate = new Date(endDate);
        }

        const updatedProject = await prisma.project.update({
            where: { id: projectId },
            data: updateData,
        });

        return NextResponse.json(updatedProject);
    } catch (error) {
        logError('Failed to update project', error as Error, {
            userId: session.user.id,
            projectId,
            endpoint: `/api/projects/${projectId}`
        });
        return new NextResponse(JSON.stringify({ error: 'Failed to update project' }), { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ projectId: string }> }
) {
    const { projectId } = await params;
    logApiRequest('DELETE', `/api/projects/${projectId}`);

    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;
    const { session } = auth;

    if (session.user.role !== 'GROWTH_TEAM') {
        logAuthorizationFailure(session.user.id, 'delete project', `project:${projectId}`);
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
        logError('Failed to delete project', error as Error, {
            userId: session.user.id,
            projectId,
            endpoint: `/api/projects/${projectId}`
        });
        return new NextResponse(JSON.stringify({
            error: 'Failed to delete project',
            details: error instanceof Error ? error.message : 'Unknown error'
        }), { status: 500 });
    }
}