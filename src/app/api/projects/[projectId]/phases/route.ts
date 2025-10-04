import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/api-auth';
import { UserRole } from '@prisma/client';
import { createPhaseSchema, safeValidateRequestBody, formatValidationErrors } from '@/lib/validation-schemas';
import { logError, logApiRequest, logValidationError, logAuthorizationFailure } from '@/lib/error-logger';

import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  logApiRequest('POST', `/api/projects/${projectId}/phases`);

  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { session, user } = auth;

  // Check if user is Product Manager of this project (only PMs can create phases)
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { productManagerId: true }
  });

  if (!project) {
    logError('Project not found', undefined, { userId: session.user.id, projectId });
    return new NextResponse(JSON.stringify({ error: 'Project not found' }), { status: 404 });
  }

  const isProductManager = project.productManagerId === session.user.id;
  if (!isProductManager) {
    logAuthorizationFailure(session.user.id, 'create phase', `project:${projectId}`);
    return new NextResponse(JSON.stringify({ error: 'Only Product Managers can create phases' }), { status: 403 });
  }

  try {
    const body = await request.json();

    // Validate request body with Zod
    const validation = safeValidateRequestBody(createPhaseSchema, body);
    if (!validation.success) {
      logValidationError(`/api/projects/${projectId}/phases`, formatValidationErrors(validation.error).details);
      return new NextResponse(
        JSON.stringify(formatValidationErrors(validation.error)),
        { status: 400 }
      );
    }

    const { name, description, sprintIds } = validation.data;

    // Get sprint dates to calculate phase start/end dates
    const sprints = await prisma.sprint.findMany({
      where: { id: { in: sprintIds }, projectId },
      orderBy: { startDate: 'asc' }
    });

    if (sprints.length === 0) {
      return new NextResponse(JSON.stringify({ error: 'No valid sprints found' }), { status: 400 });
    }

    const newPhaseStart = sprints[0].startDate;
    const newPhaseEnd = sprints[sprints.length - 1].endDate;

    // Use a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create the phase
      const newPhase = await tx.phase.create({
        data: {
          name,
          description,
          startDate: newPhaseStart,
          endDate: newPhaseEnd,
          projectId: projectId,
        },
      });

      // Assign sprints to the phase
      await tx.sprint.updateMany({
        where: { id: { in: sprintIds } },
        data: { phaseId: newPhase.id }
      });

      return newPhase;
    });

    // Return the complete phase with allocations for frontend use
    const completePhase = await prisma.phase.findUnique({
      where: { id: result.id },
      include: {
        allocations: {
          include: {
            consultant: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        sprints: {
          select: { id: true, sprintNumber: true, startDate: true, endDate: true }
        }
      }
    });

    return NextResponse.json(completePhase, { status: 201 });
  } catch (error) {
    logError('Failed to create phase', error as Error, {
      userId: session.user.id,
      projectId,
      endpoint: `/api/projects/${projectId}/phases`
    });
    return new NextResponse(JSON.stringify({ error: 'Failed to create phase' }), { status: 500 });
  }
}