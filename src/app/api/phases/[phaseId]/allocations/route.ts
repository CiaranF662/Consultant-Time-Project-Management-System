import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, ProjectRole, NotificationType } from '@prisma/client';
import { getGrowthTeamMemberIds, createNotificationsForUsers, NotificationTemplates } from '@/lib/notifications';

const prisma = new PrismaClient();

// GET all allocations for a phase
export async function GET(
  request: Request,
  { params }: { params: Promise<{ phaseId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  const { phaseId } = await params;

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
    console.error('Error fetching phase allocations:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch allocations' }), { status: 500 });
  }
}

// POST create or update phase allocation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ phaseId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  const { phaseId } = await params;

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
    return new NextResponse(JSON.stringify({ error: 'Phase not found' }), { status: 404 });
  }

  const isPM = phase.project.consultants.length > 0;
  if (!isPM) {
    return new NextResponse(JSON.stringify({ error: 'Only Product Managers can create phase allocations' }), { status: 403 });
  }

  try {
    const body = await request.json();
    const { consultantId, totalHours } = body;

    // Check if allocation already exists
    const existing = await prisma.phaseAllocation.findUnique({
      where: {
        phaseId_consultantId: {
          phaseId,
          consultantId
        }
      },
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
        const unplannedHours = existing.totalHours - totalPlannedHours;

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

      // Update existing allocation - requires Growth Team approval if hours changed
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
          const consultantName = allocation.consultant.name || allocation.consultant.email || 'Consultant';
          const pmName = allocation.phase.project.consultants[0]?.user.name || 'Product Manager';

          // Notify Growth Team about updated allocation
          if (growthTeamIds.length > 0) {
            const growthTemplate = NotificationTemplates.PHASE_ALLOCATION_PENDING_FOR_GROWTH(
              consultantName,
              allocation.phase.name,
              allocation.phase.project.title,
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
                projectId: allocation.phase.project.id,
                phaseId: allocation.phase.id,
                allocationId: allocation.id,
                updated: true
              }
            );
          }

          // Notify Product Manager about resubmission (only if different from consultant to avoid duplicates)
          if (productManagerId !== session.user.id) {
            const pmTemplate = NotificationTemplates.PHASE_ALLOCATION_PENDING_FOR_PM(
              consultantName,
              allocation.phase.name,
              allocation.totalHours
            );

            await createNotificationsForUsers(
              [productManagerId],
              NotificationType.PHASE_ALLOCATION_PENDING,
              pmTemplate.title,
              pmTemplate.message,
              `/dashboard/projects/${allocation.phase.project.id}`,
              {
                projectId: allocation.phase.project.id,
                phaseId: allocation.phase.id,
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
      // Create new allocation (requires Growth Team approval)
      allocation = await prisma.phaseAllocation.create({
        data: {
          phaseId,
          consultantId,
          totalHours,
          approvalStatus: 'PENDING'
        },
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
      
      // Send notifications for new allocation
      try {
        const growthTeamIds = await getGrowthTeamMemberIds();
        const productManagerId = session.user.id;
        const consultantName = allocation.consultant.name || allocation.consultant.email || 'Consultant';
        const pmName = allocation.phase.project.consultants[0]?.user.name || 'Product Manager';

        // Notify Growth Team about pending allocation
        console.log('Growth Team IDs found:', growthTeamIds);
        if (growthTeamIds.length > 0) {
          const growthTemplate = NotificationTemplates.PHASE_ALLOCATION_PENDING_FOR_GROWTH(
            consultantName,
            allocation.phase.name,
            allocation.phase.project.title,
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
              projectId: allocation.phase.project.id,
              phaseId: allocation.phase.id,
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
            allocation.phase.name,
            allocation.totalHours
          );

          await createNotificationsForUsers(
            [productManagerId],
            NotificationType.PHASE_ALLOCATION_PENDING,
            pmTemplate.title,
            pmTemplate.message,
            `/dashboard/projects/${allocation.phase.project.id}`,
            {
              projectId: allocation.phase.project.id,
              phaseId: allocation.phase.id,
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

    return NextResponse.json(allocation, { status: existing ? 200 : 201 });
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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

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

    // Use transaction to update allocations
    await prisma.$transaction(async (tx) => {

      // Create a map of existing approval statuses and hours
      const existingApprovalMap = new Map(
        existingAllocations.map(alloc => [
          alloc.consultantId,
          {
            totalHours: alloc.totalHours,
            approvalStatus: alloc.approvalStatus,
            approvedBy: alloc.approvedBy,
            approvedAt: alloc.approvedAt,
            rejectionReason: alloc.rejectionReason
          }
        ])
      );

      // Delete existing allocations
      await tx.phaseAllocation.deleteMany({
        where: { phaseId }
      });

      // Create new allocations, preserving approval status for existing consultants
      if (allocations.length > 0) {
        const allocationData = allocations.map((alloc: any) => {
          const existingApproval = existingApprovalMap.get(alloc.consultantId);
          const newHours = parseFloat(alloc.totalHours);

          // Check if hours have changed - if so, reset to PENDING approval
          const hoursChanged = existingApproval && existingApproval.totalHours !== newHours;

          return {
            phaseId,
            consultantId: alloc.consultantId,
            totalHours: newHours,
            // Reset to PENDING if hours changed, otherwise preserve existing status, or set to PENDING for new consultants
            approvalStatus: hoursChanged ? 'PENDING' : (existingApproval?.approvalStatus || 'PENDING'),
            approvedBy: hoursChanged ? null : (existingApproval?.approvedBy || null),
            approvedAt: hoursChanged ? null : (existingApproval?.approvedAt || null),
            rejectionReason: hoursChanged ? null : (existingApproval?.rejectionReason || null)
          };
        });

        await tx.phaseAllocation.createMany({
          data: allocationData
        });
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