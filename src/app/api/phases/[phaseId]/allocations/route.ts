import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/api-auth';
import { ProjectRole, NotificationType, UserRole } from '@prisma/client';
import { getGrowthTeamMemberIds, createNotificationsForUsers, NotificationTemplates } from '@/lib/notifications';
import { createPhaseAllocationSchema, safeValidateRequestBody, formatValidationErrors } from '@/lib/validation-schemas';
import { logError, logApiRequest, logValidationError, logAuthorizationFailure } from '@/lib/error-logger';
import { isPhaseLocked } from '@/lib/phase-lock';

import { prisma } from "@/lib/prisma";

// GET all allocations for a phase
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ phaseId: string }> }
) {
  const { phaseId } = await params;
  logApiRequest('GET', `/api/phases/${phaseId}/allocations`);

  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { session } = auth;

  try {
    const allocations = await prisma.phaseAllocation.findMany({
      where: { phaseId },
      include: {
        consultant: {
          select: { id: true, name: true, email: true }
        },
        weeklyAllocations: {
          orderBy: { weekStartDate: 'asc' }
        }
      }
    });

    return NextResponse.json(allocations);
  } catch (error) {
    logError('Failed to fetch phase allocations', error as Error, {
      userId: session.user.id,
      phaseId,
      endpoint: `/api/phases/${phaseId}/allocations`
    });
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch allocations' }), { status: 500 });
  }
}

// POST create or update phase allocation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ phaseId: string }> }
) {
  const { phaseId } = await params;
  logApiRequest('POST', `/api/phases/${phaseId}/allocations`);

  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { session } = auth;

  // Check if user is Growth Team or PM for this project
  const phase = await prisma.phase.findUnique({
    where: { id: phaseId },
    include: {
      project: {
        include: {
          consultants: {
            where: {
              userId: session.user.id,
              role: ProjectRole.PRODUCT_MANAGER
            }
          }
        }
      }
    }
  });

  if (!phase) {
    logError('Phase not found', undefined, { userId: session.user.id, phaseId });
    return new NextResponse(JSON.stringify({ error: 'Phase not found' }), { status: 404 });
  }

  const isPM = phase.project.consultants.length > 0;
  if (!isPM) {
    logAuthorizationFailure(session.user.id, 'create phase allocation', `phase:${phaseId}`);
    return new NextResponse(JSON.stringify({ error: 'Only Product Managers can create phase allocations' }), { status: 403 });
  }

  // Check if phase is locked (past end date)
  // Growth Team can override for corrections
  const isGrowthTeam = session.user.role === UserRole.GROWTH_TEAM;
  if (isPhaseLocked(phase) && !isGrowthTeam) {
    return new NextResponse(
      JSON.stringify({ error: 'Cannot modify allocations for a phase that has already ended. Contact Growth Team if corrections are needed.' }),
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    // Validate request body with Zod
    const validation = safeValidateRequestBody(createPhaseAllocationSchema, body);
    if (!validation.success) {
      logValidationError(`/api/phases/${phaseId}/allocations`, formatValidationErrors(validation.error).details);
      return new NextResponse(
        JSON.stringify(formatValidationErrors(validation.error)),
        { status: 400 }
      );
    }

    const { consultantId, totalHours } = validation.data;

    // Get consultant name for error messages
    const consultant = await prisma.user.findUnique({
      where: { id: consultantId },
      select: { name: true, email: true }
    });
    const consultantName = consultant?.name || consultant?.email || 'Consultant';

    // BUDGET VALIDATION 1: Per-Consultant Project Budget
    // Get consultant's project assignment to check their allocated hours budget
    const consultantAssignment = await prisma.consultantsOnProjects.findUnique({
      where: {
        userId_projectId: {
          userId: consultantId,
          projectId: phase.project.id
        }
      }
    });

    if (consultantAssignment && consultantAssignment.allocatedHours) {
      // Calculate total hours already allocated to this consultant across all phases in this project
      const allPhaseAllocations = await prisma.phaseAllocation.findMany({
        where: {
          phase: { projectId: phase.project.id },
          consultantId: consultantId,
          approvalStatus: { in: ['PENDING', 'APPROVED'] }, // Count both pending and approved
          parentAllocationId: null // Only count parent allocations (not child reallocations)
        } as any
      });

      // Sum up total hours, excluding the current allocation if updating
      const currentAllocationTotal = allPhaseAllocations
        .filter(alloc => alloc.phaseId !== phaseId) // Exclude current phase (will be replaced)
        .reduce((sum, alloc) => sum + alloc.totalHours, 0);

      // Add child reallocations that are pending
      const pendingChildAllocations = await prisma.phaseAllocation.findMany({
        where: {
          phase: { projectId: phase.project.id },
          consultantId: consultantId,
          approvalStatus: 'PENDING',
          parentAllocationId: { not: null } // Only child reallocations
        } as any
      });

      const pendingChildTotal = pendingChildAllocations.reduce((sum, alloc) => sum + alloc.totalHours, 0);

      const newTotal = currentAllocationTotal + pendingChildTotal + totalHours;
      const budget = consultantAssignment.allocatedHours;

      if (newTotal > budget) {
        return new NextResponse(JSON.stringify({
          error: `Budget exceeded: This allocation would bring ${consultantName || 'the consultant'}'s total to ${newTotal}h, exceeding their project budget of ${budget}h.`,
          consultantId,
          currentTotal: currentAllocationTotal + pendingChildTotal,
          requestedHours: totalHours,
          newTotal,
          budget,
          overage: newTotal - budget
        }), { status: 400 });
      }
    }

    // BUDGET VALIDATION 2: Project Total Budget (Warning)
    // Calculate total allocated hours across all consultants in the project
    const allProjectAllocations = await prisma.phaseAllocation.findMany({
      where: {
        phase: { projectId: phase.project.id },
        approvalStatus: { in: ['PENDING', 'APPROVED'] },
        parentAllocationId: null // Only parent allocations
      } as any
    });

    const projectAllocatedTotal = allProjectAllocations
      .filter(alloc => !(alloc.phaseId === phaseId && alloc.consultantId === consultantId)) // Exclude current if updating
      .reduce((sum, alloc) => sum + alloc.totalHours, 0);

    // Include pending child reallocations
    const allPendingChildren = await prisma.phaseAllocation.findMany({
      where: {
        phase: { projectId: phase.project.id },
        approvalStatus: 'PENDING',
        parentAllocationId: { not: null }
      } as any
    });

    const projectPendingChildTotal = allPendingChildren.reduce((sum, alloc) => sum + alloc.totalHours, 0);

    const newProjectTotal = projectAllocatedTotal + projectPendingChildTotal + totalHours;
    const projectBudget = phase.project.budgetedHours;

    // Store warning for response (don't block, just warn)
    let budgetWarning = null;
    if (projectBudget && newProjectTotal > projectBudget) {
      budgetWarning = {
        message: `Warning: Project total allocations (${newProjectTotal}h) would exceed project budget (${projectBudget}h) by ${newProjectTotal - projectBudget}h`,
        projectTotal: newProjectTotal,
        projectBudget,
        overage: newProjectTotal - projectBudget
      };
    }

    // Check if allocation already exists (find the parent allocation, not child reallocations)
    const existing = await prisma.phaseAllocation.findFirst({
      where: {
        phaseId,
        consultantId,
        isReallocation: false, // Only find parent allocations, not child reallocations
        parentAllocationId: null
      } as any,
      include: {
        weeklyAllocations: {
          where: {
            planningStatus: 'APPROVED'
          }
        }
      }
    });

    let allocation;
    if (existing) {
      // Calculate total planned hours from approved weekly allocations
      const totalPlannedHours = existing.weeklyAllocations.reduce((sum, weekly) => {
        return sum + (weekly.approvedHours || weekly.proposedHours || 0);
      }, 0);

      // Business rule validation for hour changes
      if (existing.totalHours !== totalHours) {
        // If consultant has fully utilized their allocation, PM can only increase hours
        if (totalPlannedHours >= existing.totalHours && totalHours < existing.totalHours) {
          return new NextResponse(JSON.stringify({
            error: 'Cannot reduce hours below planned amount. This consultant has already planned or used all their allocated hours. You can only increase their allocation.',
            plannedHours: totalPlannedHours,
            currentAllocation: existing.totalHours
          }), { status: 400 });
        }

        // If consultant has not used all hours, PM can only reduce by the unplanned amount
        if (totalHours < existing.totalHours && totalHours < totalPlannedHours) {
          return new NextResponse(JSON.stringify({
            error: `Cannot reduce hours below ${totalPlannedHours}. This consultant has already planned ${totalPlannedHours} hours. You can reduce the allocation to a minimum of ${totalPlannedHours} hours or increase it.`,
            plannedHours: totalPlannedHours,
            minimumAllowedHours: totalPlannedHours,
            currentAllocation: existing.totalHours
          }), { status: 400 });
        }
      }

      // HYBRID REALLOCATION LOGIC
      // Check if this is a reallocation (from query params or body)
      const url = new URL(request.url);
      const isReallocation = url.searchParams.get('isReallocation') === 'true' || body.isReallocation === true;
      const reallocatedFromPhaseId = url.searchParams.get('reallocatedFromPhaseId') || body.reallocatedFromPhaseId;
      const reallocatedFromUnplannedId = url.searchParams.get('reallocatedFromUnplannedId') || body.reallocatedFromUnplannedId;

      if (isReallocation && reallocatedFromPhaseId) {
        const reallocatedHours = totalHours - existing.totalHours;

        // Scenario 1: Original APPROVED + Reallocation PENDING → Keep separate
        if (existing.approvalStatus === 'APPROVED') {
          // Create a new child allocation for the reallocation
          allocation = await prisma.phaseAllocation.create({
            data: {
              phaseId,
              consultantId,
              totalHours: reallocatedHours,
              approvalStatus: 'PENDING',
              isReallocation: true,
              reallocatedFromPhaseId,
              reallocatedFromUnplannedId,
              parentAllocationId: existing.id
            } as any,
            include: {
              consultant: true,
              phase: {
                include: {
                  project: {
                    include: {
                      consultants: {
                        where: { role: ProjectRole.PRODUCT_MANAGER },
                        include: { user: true }
                      }
                    }
                  }
                }
              }
            }
          } as any);

          console.log(`[SCENARIO 1] Created separate reallocation ${allocation.id} as child of approved allocation ${existing.id}`);
        }
        // Scenario 2: Both PENDING → Merge into one allocation
        else if (existing.approvalStatus === 'PENDING') {
          // Update existing allocation with merged hours and composition metadata
          const existingAny = existing as any;
          const compositionMetadata = existingAny.isComposite && existingAny.compositionMetadata
            ? [...(existingAny.compositionMetadata as any[]), {
                reallocatedHours,
                reallocatedFromPhaseId,
                reallocatedFromUnplannedId,
                timestamp: new Date().toISOString()
              }]
            : [{
                originalHours: existing.totalHours,
                timestamp: existing.createdAt.toISOString()
              }, {
                reallocatedHours,
                reallocatedFromPhaseId,
                reallocatedFromUnplannedId,
                timestamp: new Date().toISOString()
              }];

          allocation = await prisma.phaseAllocation.update({
            where: { id: existing.id },
            data: {
              totalHours,
              isComposite: true,
              compositionMetadata,
              updatedAt: new Date() // Update timestamp to reflect latest activity
            } as any,
            include: {
              consultant: true,
              phase: {
                include: {
                  project: {
                    include: {
                      consultants: {
                        where: { role: ProjectRole.PRODUCT_MANAGER },
                        include: { user: true }
                      }
                    }
                  }
                }
              }
            }
          } as any);

          console.log(`[SCENARIO 2] Merged reallocation into existing pending allocation ${existing.id}. New total: ${totalHours}h`);
        } else {
          // Shouldn't happen, but handle gracefully
          return new NextResponse(JSON.stringify({
            error: 'Cannot reallocate to an allocation with status: ' + existing.approvalStatus
          }), { status: 400 });
        }

        // Send notifications for reallocation
        try {
          const growthTeamIds = await getGrowthTeamMemberIds();
          const allocationAny = allocation as any;
          const consultantName = allocationAny.consultant?.name || allocationAny.consultant?.email || 'Consultant';
          const pmName = allocationAny.phase?.project?.consultants?.[0]?.user?.name || 'Product Manager';

          if (growthTeamIds.length > 0) {
            const message = existing.approvalStatus === 'APPROVED'
              ? `${pmName} reallocated ${reallocatedHours}h from another phase to "${allocationAny.phase?.name}" for ${consultantName}. This is in addition to their existing ${existing.totalHours}h allocation (already approved).`
              : `${pmName} reallocated ${reallocatedHours}h from another phase to "${allocationAny.phase?.name}" for ${consultantName}. This has been merged with their pending ${existing.totalHours}h allocation for a total of ${totalHours}h.`;

            await createNotificationsForUsers(
              growthTeamIds,
              NotificationType.PHASE_ALLOCATION_PENDING,
              'Phase Reallocation Requires Approval',
              message,
              `/dashboard/hour-approvals`,
              {
                projectId: allocationAny.phase?.project?.id,
                phaseId: allocationAny.phase?.id,
                allocationId: allocation.id,
                isReallocation: true
              }
            );
          }
        } catch (error) {
          console.error('Failed to send reallocation notifications:', error);
        }

        // Include budget warning if present
        const response: any = { ...allocation };
        if (budgetWarning) {
          response.budgetWarning = budgetWarning;
        }
        return NextResponse.json(response, { status: 201 });
      }

      // Normal update (not a reallocation)
      const dataToUpdate: any = { totalHours };
      const hoursChanged = existing.totalHours !== totalHours;

      // If hours changed, reset to PENDING approval status
      if (hoursChanged) {
        dataToUpdate.approvalStatus = 'PENDING';
        dataToUpdate.approvedBy = null;
        dataToUpdate.approvedAt = null;
        dataToUpdate.rejectionReason = null;
      }

      allocation = await prisma.phaseAllocation.update({
        where: { id: existing.id },
        data: dataToUpdate,
        include: {
          consultant: true,
          phase: {
            include: {
              project: {
                include: {
                  consultants: {
                    where: { role: ProjectRole.PRODUCT_MANAGER },
                    include: { user: true }
                  }
                }
              }
            }
          }
        }
      });

      // Send notifications if hours changed (requires new approval)
      if (hoursChanged) {
        try {
          const growthTeamIds = await getGrowthTeamMemberIds();
          const productManagerId = session.user.id;
          const allocationAny = allocation as any;
          const consultantName = allocationAny.consultant?.name || allocationAny.consultant?.email || 'Consultant';
          const pmName = allocationAny.phase?.project?.consultants?.[0]?.user?.name || 'Product Manager';

          // Notify Growth Team about updated allocation
          if (growthTeamIds.length > 0) {
            const growthTemplate = NotificationTemplates.PHASE_ALLOCATION_PENDING_FOR_GROWTH(
              consultantName,
              allocationAny.phase?.name || 'Phase',
              allocationAny.phase?.project?.title || 'Project',
              allocation.totalHours,
              pmName
            );

            await createNotificationsForUsers(
              growthTeamIds,
              NotificationType.PHASE_ALLOCATION_PENDING,
              growthTemplate.title,
              growthTemplate.message,
              `/dashboard/hour-approvals`,
              {
                projectId: allocationAny.phase?.project?.id,
                phaseId: allocationAny.phase?.id,
                allocationId: allocation.id,
                updated: true
              }
            );
          }

          // Notify Product Manager about resubmission (only if different from consultant to avoid duplicates)
          if (productManagerId !== session.user.id) {
            const pmTemplate = NotificationTemplates.PHASE_ALLOCATION_PENDING_FOR_PM(
              consultantName,
              allocationAny.phase?.name || 'Phase',
              allocation.totalHours
            );

            await createNotificationsForUsers(
              [productManagerId],
              NotificationType.PHASE_ALLOCATION_PENDING,
              pmTemplate.title,
              pmTemplate.message,
              `/dashboard/projects/${allocationAny.phase?.project?.id}`,
              {
                projectId: allocationAny.phase?.project?.id,
                phaseId: allocationAny.phase?.id,
                allocationId: allocation.id,
                updated: true
              }
            );
          }
        } catch (error) {
          console.error('Failed to send update notifications:', error);
        }
      }
    } else {
      // No existing allocation - check if this is a reallocation
      const url = new URL(request.url);
      const isReallocation = url.searchParams.get('isReallocation') === 'true' || body.isReallocation === true;
      const reallocatedFromPhaseId = url.searchParams.get('reallocatedFromPhaseId') || body.reallocatedFromPhaseId;
      const reallocatedFromUnplannedId = url.searchParams.get('reallocatedFromUnplannedId') || body.reallocatedFromUnplannedId;

      // Create new allocation (requires Growth Team approval)
      allocation = await prisma.phaseAllocation.create({
        data: {
          phaseId,
          consultantId,
          totalHours,
          approvalStatus: 'PENDING',
          // If this is a reallocation, mark it as such
          isReallocation: isReallocation || false,
          reallocatedFromPhaseId: isReallocation ? reallocatedFromPhaseId : null,
          reallocatedFromUnplannedId: isReallocation ? reallocatedFromUnplannedId : null
        } as any,
        include: {
          consultant: true,
          phase: {
            include: {
              project: {
                include: {
                  consultants: {
                    where: { role: ProjectRole.PRODUCT_MANAGER },
                    include: { user: true }
                  }
                }
              }
            }
          }
        }
      } as any);

      // Send notifications for new allocation
      try {
        const growthTeamIds = await getGrowthTeamMemberIds();
        const productManagerId = session.user.id;
        const allocationAny = allocation as any;
        const consultantName = allocationAny.consultant?.name || allocationAny.consultant?.email || 'Consultant';
        const pmName = allocationAny.phase?.project?.consultants?.[0]?.user?.name || 'Product Manager';

        // Notify Growth Team about pending allocation
        console.log('Growth Team IDs found:', growthTeamIds);
        if (growthTeamIds.length > 0) {
          const growthTemplate = NotificationTemplates.PHASE_ALLOCATION_PENDING_FOR_GROWTH(
            consultantName,
            allocationAny.phase?.name || 'Phase',
            allocationAny.phase?.project?.title || 'Project',
            allocation.totalHours,
            pmName
          );

          console.log('Sending notifications to Growth Team:', {
            recipients: growthTeamIds,
            template: growthTemplate,
            type: NotificationType.PHASE_ALLOCATION_PENDING
          });

          await createNotificationsForUsers(
            growthTeamIds,
            NotificationType.PHASE_ALLOCATION_PENDING,
            growthTemplate.title,
            growthTemplate.message,
            `/dashboard/hour-approvals`,
            {
              projectId: allocationAny.phase?.project?.id,
              phaseId: allocationAny.phase?.id,
              allocationId: allocation.id
            }
          );
        } else {
          console.log('No Growth Team members found for notifications');
        }

        // Notify Product Manager about submission (only if different from consultant to avoid duplicates)
        if (productManagerId !== consultantId) {
          const pmTemplate = NotificationTemplates.PHASE_ALLOCATION_PENDING_FOR_PM(
            consultantName,
            allocationAny.phase?.name || 'Phase',
            allocation.totalHours
          );

          await createNotificationsForUsers(
            [productManagerId],
            NotificationType.PHASE_ALLOCATION_PENDING,
            pmTemplate.title,
            pmTemplate.message,
            `/dashboard/projects/${allocationAny.phase?.project?.id}`,
            {
              projectId: allocationAny.phase?.project?.id,
              phaseId: allocationAny.phase?.id,
              allocationId: allocation.id
            }
          );
        }

        // Note: Email notifications are sent only when allocation is approved, not when pending
      } catch (error) {
        console.error('Failed to send notifications/email:', error);
        // Don't fail the allocation creation if notifications fail
      }
    }

    // Include budget warning if present
    const response: any = { ...allocation };
    if (budgetWarning) {
      response.budgetWarning = budgetWarning;
    }
    return NextResponse.json(response, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error('Error creating/updating phase allocation:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to save allocation' }), { status: 500 });
  }
}

// PUT bulk update phase allocations
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ phaseId: string }> }
) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { session } = auth;

  const { phaseId } = await params;

  try {
    const body = await request.json();
    const { allocations } = body;

    // Validate that the user is a PM for the project containing this phase
    const phase = await prisma.phase.findUnique({
      where: { id: phaseId },
      include: {
        project: {
          include: {
            consultants: true
          }
        }
      }
    });

    if (!phase) {
      return new NextResponse(JSON.stringify({ error: 'Phase not found' }), { status: 404 });
    }

    const isProductManager = phase.project.consultants.some(
      consultant => consultant.userId === session.user.id && consultant.role === ProjectRole.PRODUCT_MANAGER
    );

    if (!isProductManager) {
      return new NextResponse(JSON.stringify({ error: 'Only Product Managers can update phase allocations' }), { status: 403 });
    }

    // Check if phase is locked (past end date)
    // Growth Team can override for corrections
    const isGrowthTeam = session.user.role === UserRole.GROWTH_TEAM;
    if (isPhaseLocked(phase) && !isGrowthTeam) {
      return new NextResponse(
        JSON.stringify({ error: 'Cannot modify allocations for a phase that has already ended. Contact Growth Team if corrections are needed.' }),
        { status: 403 }
      );
    }

    // Validate allocations
    if (!Array.isArray(allocations)) {
      return new NextResponse(JSON.stringify({ error: 'Invalid allocations data' }), { status: 400 });
    }

    // Ensure all consultants are part of the project
    const projectConsultantIds = phase.project.consultants.map(c => c.userId);
    const invalidConsultants = allocations.filter(
      alloc => !projectConsultantIds.includes(alloc.consultantId)
    );

    if (invalidConsultants.length > 0) {
      return new NextResponse(JSON.stringify({ error: 'Some consultants are not part of the project' }), { status: 400 });
    }

    // Get existing allocations to preserve their approval status and validate hour changes
    const existingAllocations = await prisma.phaseAllocation.findMany({
      where: { phaseId },
      include: {
        weeklyAllocations: {
          where: {
            planningStatus: 'APPROVED'
          }
        }
      }
    });

    // Validate hour changes against existing weekly planning
    for (const allocation of allocations) {
      const existing = existingAllocations.find(ea => ea.consultantId === allocation.consultantId);
      if (existing && existing.totalHours !== parseFloat(allocation.totalHours)) {
        // Calculate total planned hours from approved weekly allocations
        const totalPlannedHours = existing.weeklyAllocations.reduce((sum, weekly) => {
          return sum + (weekly.approvedHours || weekly.proposedHours || 0);
        }, 0);

        const newHours = parseFloat(allocation.totalHours);

        // Business rule validation for hour changes
        if (totalPlannedHours >= existing.totalHours && newHours < existing.totalHours) {
          return new NextResponse(JSON.stringify({
            error: `Cannot reduce hours for consultant below planned amount. The consultant has already planned or used all ${existing.totalHours} allocated hours. You can only increase their allocation.`,
            consultantId: allocation.consultantId,
            plannedHours: totalPlannedHours,
            currentAllocation: existing.totalHours
          }), { status: 400 });
        }

        if (newHours < existing.totalHours && newHours < totalPlannedHours) {
          return new NextResponse(JSON.stringify({
            error: `Cannot reduce hours below ${totalPlannedHours} for this consultant. They have already planned ${totalPlannedHours} hours. You can reduce the allocation to a minimum of ${totalPlannedHours} hours or increase it.`,
            consultantId: allocation.consultantId,
            plannedHours: totalPlannedHours,
            minimumAllowedHours: totalPlannedHours,
            currentAllocation: existing.totalHours
          }), { status: 400 });
        }
      }
    }

    // BUDGET VALIDATION for bulk updates
    // Validate each allocation against per-consultant budget
    for (const allocation of allocations) {
      const consultantId = allocation.consultantId;
      const newHours = parseFloat(allocation.totalHours);

      // Get consultant assignment for budget
      const consultantAssignment = await prisma.consultantsOnProjects.findUnique({
        where: {
          userId_projectId: {
            userId: consultantId,
            projectId: phase.project.id
          }
        }
      });

      if (consultantAssignment && consultantAssignment.allocatedHours) {
        // Calculate total hours already allocated to this consultant across all phases
        const allPhaseAllocations = await prisma.phaseAllocation.findMany({
          where: {
            phase: { projectId: phase.project.id },
            consultantId: consultantId,
            approvalStatus: { in: ['PENDING', 'APPROVED'] },
            parentAllocationId: null
          } as any
        });

        // Sum up total hours, excluding the current phase allocation
        const currentAllocationTotal = allPhaseAllocations
          .filter(alloc => alloc.phaseId !== phaseId)
          .reduce((sum, alloc) => sum + alloc.totalHours, 0);

        // Add pending child reallocations
        const pendingChildAllocations = await prisma.phaseAllocation.findMany({
          where: {
            phase: { projectId: phase.project.id },
            consultantId: consultantId,
            approvalStatus: 'PENDING',
            parentAllocationId: { not: null }
          } as any
        });

        const pendingChildTotal = pendingChildAllocations.reduce((sum, alloc) => sum + alloc.totalHours, 0);

        const newTotal = currentAllocationTotal + pendingChildTotal + newHours;
        const budget = consultantAssignment.allocatedHours;

        if (newTotal > budget) {
          const consultant = await prisma.user.findUnique({
            where: { id: consultantId },
            select: { name: true, email: true }
          });
          const consultantName = consultant?.name || consultant?.email || 'Consultant';

          return new NextResponse(JSON.stringify({
            error: `Budget exceeded: Allocating ${newHours}h to ${consultantName} would bring their total to ${newTotal}h, exceeding their project budget of ${budget}h.`,
            consultantId,
            currentTotal: currentAllocationTotal + pendingChildTotal,
            requestedHours: newHours,
            newTotal,
            budget,
            overage: newTotal - budget
          }), { status: 400 });
        }
      }
    }

    // Use transaction to update allocations
    await prisma.$transaction(async (tx) => {

      // Create a map of existing allocations with full data
      const existingApprovalMap = new Map(
        existingAllocations.map(alloc => [
          alloc.consultantId,
          {
            id: alloc.id,
            totalHours: alloc.totalHours,
            approvalStatus: alloc.approvalStatus,
            approvedBy: alloc.approvedBy,
            approvedAt: alloc.approvedAt,
            rejectionReason: alloc.rejectionReason
          }
        ])
      );

      // Get the consultant IDs from the new allocations
      const newConsultantIds = new Set(allocations.map((a: any) => a.consultantId));
      const existingConsultantIds = new Set(existingAllocations.map(a => a.consultantId));

      // Find consultant IDs to delete (were in existing but not in new)
      const consultantsToDelete = Array.from(existingConsultantIds).filter(id => !newConsultantIds.has(id));

      // Delete only the allocations for consultants that were removed
      if (consultantsToDelete.length > 0) {
        await tx.phaseAllocation.deleteMany({
          where: {
            phaseId,
            consultantId: { in: consultantsToDelete }
          }
        });
      }

      // Process each allocation: update existing or create new
      for (const alloc of allocations) {
        const existingApproval = existingApprovalMap.get(alloc.consultantId);
        const newHours = parseFloat(alloc.totalHours);

        if (existingApproval) {
          // Update existing allocation
          const hoursChanged = existingApproval.totalHours !== newHours;

          await tx.phaseAllocation.update({
            where: { id: existingApproval.id },
            data: {
              totalHours: newHours,
              // Reset to PENDING if hours changed, otherwise preserve existing status
              approvalStatus: hoursChanged ? 'PENDING' : existingApproval.approvalStatus,
              approvedBy: hoursChanged ? null : existingApproval.approvedBy,
              approvedAt: hoursChanged ? null : existingApproval.approvedAt,
              rejectionReason: hoursChanged ? null : existingApproval.rejectionReason
            }
          });
        } else {
          // Create new allocation for new consultant
          await tx.phaseAllocation.create({
            data: {
              phaseId,
              consultantId: alloc.consultantId,
              totalHours: newHours,
              approvalStatus: 'PENDING'
            }
          });
        }
      }
    });

    // Fetch updated phase with allocations and send emails for new allocations
    const updatedPhase = await prisma.phase.findUnique({
      where: { id: phaseId },
      include: {
        project: {
          include: {
            consultants: {
              where: { role: ProjectRole.PRODUCT_MANAGER },
              include: { user: true }
            }
          }
        },
        allocations: {
          include: {
            consultant: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });
    
    // Note: Email notifications are sent only when allocations are approved, not when pending

    return NextResponse.json(updatedPhase);

  } catch (error) {
    console.error('Error updating phase allocations:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to update allocations' }), { status: 500 });
  }
}