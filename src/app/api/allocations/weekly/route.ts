import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/api-auth';
import { NotificationType } from '@prisma/client';
import { startOfWeek, endOfWeek, getISOWeek, getYear, format } from 'date-fns';
import { getGrowthTeamMemberIds, createNotificationsForUsers, NotificationTemplates } from '@/lib/notifications';

import { prisma } from "@/lib/prisma";

// Helper function to handle batch weekly allocations
async function handleBatchWeeks(
  session: any,
  phaseAllocationId: string,
  weeks: Array<{ weekStartDate: string; plannedHours: number; clearRejection?: boolean }>,
  consultantDescription?: string
) {
  // Validate phase allocation
  if (!phaseAllocationId) {
    return new NextResponse(JSON.stringify({ error: 'phaseAllocationId is required' }), { status: 400 });
  }

  if (!weeks || weeks.length === 0) {
    return new NextResponse(JSON.stringify({ error: 'weeks array is required and must not be empty' }), { status: 400 });
  }

  // Verify the consultant owns this allocation and it's approved
  const phaseAllocation = await prisma.phaseAllocation.findUnique({
    where: { id: phaseAllocationId },
    include: {
      phase: {
        include: {
          project: {
            select: { title: true }
          }
        }
      }
    }
  });

  if (!phaseAllocation || phaseAllocation.consultantId !== session.user.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
  }

  if (phaseAllocation.approvalStatus !== 'APPROVED') {
    return new NextResponse(JSON.stringify({ error: 'Phase allocation must be approved before weekly planning' }), { status: 400 });
  }

  // Update consultant description if provided
  if (consultantDescription !== undefined) {
    await prisma.phaseAllocation.update({
      where: { id: phaseAllocationId },
      data: { consultantDescription }
    });
  }

  // Process all weeks
  const allocations = [];
  let totalHoursPlanned = 0;

  for (const week of weeks) {
    const { weekStartDate, plannedHours, clearRejection } = week;

    // Convert plannedHours to number
    let numericPlannedHours: number;
    if (typeof plannedHours === 'string') {
      numericPlannedHours = parseFloat(plannedHours);
      if (isNaN(numericPlannedHours)) {
        continue; // Skip invalid hours
      }
    } else if (typeof plannedHours === 'number') {
      numericPlannedHours = plannedHours;
    } else {
      continue; // Skip invalid type
    }

    if (numericPlannedHours < 0) {
      continue; // Skip negative hours
    }

    const weekStart = startOfWeek(new Date(weekStartDate), { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(new Date(weekStartDate), { weekStartsOn: 1 });
    const weekNumber = getISOWeek(weekStart);
    const year = getYear(weekStart);

    // Check if allocation exists
    const existing = await prisma.weeklyAllocation.findUnique({
      where: {
        phaseAllocationId_weekNumber_year: {
          phaseAllocationId,
          weekNumber,
          year
        }
      }
    });

    // Don't create new allocations with 0 hours if no existing allocation
    if (numericPlannedHours === 0 && !existing) {
      continue;
    }

    // Use upsert to handle both create and update cases
    const allocation = await prisma.weeklyAllocation.upsert({
      where: {
        phaseAllocationId_weekNumber_year: {
          phaseAllocationId,
          weekNumber,
          year
        }
      },
      update: {
        proposedHours: numericPlannedHours,
        planningStatus: 'PENDING',
        plannedBy: session.user.id,
        approvedHours: null,
        approvedBy: null,
        approvedAt: null,
        rejectionReason: null
      },
      create: {
        phaseAllocationId,
        consultantId: session.user.id,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        weekNumber,
        year,
        proposedHours: numericPlannedHours,
        planningStatus: 'PENDING',
        plannedBy: session.user.id
      }
    });

    allocations.push(allocation);
    if (numericPlannedHours > 0) {
      totalHoursPlanned += numericPlannedHours;
    }
  }

  console.log(`Batch upserted ${allocations.length} weekly allocations for phase ${phaseAllocationId}`);

  // Send ONE batch notification to Growth Team for all weekly allocations
  if (allocations.length > 0 && totalHoursPlanned > 0) {
    try {
      const growthTeamIds = await getGrowthTeamMemberIds();

      if (growthTeamIds.length > 0) {
        // Get consultant info
        const consultant = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { name: true, email: true }
        });

        if (consultant) {
          const consultantName = consultant.name || consultant.email || 'Consultant';

          // Calculate date range
          const sortedAllocations = allocations.filter(a => a.proposedHours && a.proposedHours > 0)
            .sort((a, b) => a.weekStartDate.getTime() - b.weekStartDate.getTime());

          const firstWeek = sortedAllocations[0].weekStartDate;
          const lastWeek = sortedAllocations[sortedAllocations.length - 1].weekStartDate;
          const totalWeeks = sortedAllocations.length;

          const dateRange = totalWeeks === 1
            ? format(firstWeek, 'MMM dd, yyyy')
            : `${format(firstWeek, 'MMM dd')} - ${format(lastWeek, 'MMM dd, yyyy')}`;

          // Send batch notification
          const title = 'New Weekly Allocations Pending Approval';
          const message = `${consultantName} has submitted weekly planning for "${phaseAllocation.phase.name}" in project "${phaseAllocation.phase.project.title}" (${totalWeeks} week${totalWeeks !== 1 ? 's' : ''}, ${totalHoursPlanned}h total, ${dateRange}).`;

          await createNotificationsForUsers(
            growthTeamIds,
            NotificationType.WEEKLY_ALLOCATION_PENDING,
            title,
            message,
            `/dashboard/hour-approvals`,
            {
              projectId: phaseAllocation.phase.project.title,
              phaseId: phaseAllocation.phase.id,
              phaseAllocationId: phaseAllocation.id,
              consultantId: session.user.id,
              totalWeeks,
              totalHours: totalHoursPlanned,
              dateRange
            }
          );

          console.log(`Batch notification sent for phase allocation ${phaseAllocationId}: ${totalWeeks} weeks, ${totalHoursPlanned}h`);
        }
      }
    } catch (notificationError) {
      console.error('Failed to send batch notification:', notificationError);
      // Don't fail the allocation creation if notification fails
    }
  }

  return NextResponse.json({
    success: true,
    allocations,
    totalWeeks: allocations.length,
    totalHoursPlanned
  });
}

// GET weekly allocations for a consultant
export async function GET(request: Request) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { session, user } = auth;

  const { searchParams } = new URL(request.url);
  const consultantId = searchParams.get('consultantId') || session.user.id;
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    const whereClause: any = { consultantId };
    
    if (startDate && endDate) {
      whereClause.weekStartDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const allocations = await prisma.weeklyAllocation.findMany({
      where: whereClause,
      include: {
        phaseAllocation: {
          include: {
            phase: {
              include: {
                project: {
                  select: { id: true, title: true }
                }
              }
            }
          }
        }
      },
      orderBy: { weekStartDate: 'asc' }
    });

    return NextResponse.json(allocations);
  } catch (error) {
    console.error('Error fetching weekly allocations:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch allocations' }), { status: 500 });
  }
}

// POST create or update weekly allocation(s)
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { session, user } = auth;

  try {
    const body = await request.json();
    const { phaseAllocationId, weekStartDate, plannedHours, consultantDescription, clearRejection, skipNotification, weeks } = body;

    // Handle batch weeks array (new approach)
    if (weeks && Array.isArray(weeks)) {
      return handleBatchWeeks(session, phaseAllocationId, weeks, consultantDescription);
    }

    // Legacy single week handling (for backward compatibility)
    console.log('Weekly allocation request:', {
      phaseAllocationId,
      weekStartDate,
      plannedHours: typeof plannedHours,
      plannedHoursValue: plannedHours,
      consultantId: session.user.id,
      clearRejection
    });

    // Validate required fields
    if (!phaseAllocationId) {
      return new NextResponse(JSON.stringify({ error: 'phaseAllocationId is required' }), { status: 400 });
    }

    if (!weekStartDate) {
      return new NextResponse(JSON.stringify({ error: 'weekStartDate is required' }), { status: 400 });
    }

    if (plannedHours === undefined || plannedHours === null) {
      return new NextResponse(JSON.stringify({ error: 'plannedHours is required' }), { status: 400 });
    }

    // Convert plannedHours to number if it's a string
    let numericPlannedHours: number;
    if (typeof plannedHours === 'string') {
      numericPlannedHours = parseFloat(plannedHours);
      if (isNaN(numericPlannedHours)) {
        return new NextResponse(JSON.stringify({ error: 'plannedHours must be a valid number' }), { status: 400 });
      }
    } else if (typeof plannedHours === 'number') {
      numericPlannedHours = plannedHours;
    } else {
      return new NextResponse(JSON.stringify({ error: 'plannedHours must be a number' }), { status: 400 });
    }

    if (numericPlannedHours < 0) {
      return new NextResponse(JSON.stringify({ error: 'plannedHours must be non-negative' }), { status: 400 });
    }

    // Use the numeric value from here on
    const finalPlannedHours = numericPlannedHours;

    // Verify the consultant owns this allocation and it's approved
    const phaseAllocation = await prisma.phaseAllocation.findUnique({
      where: { id: phaseAllocationId }
    });

    if (!phaseAllocation || phaseAllocation.consultantId !== session.user.id) {
      return new NextResponse(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
    }

    if (phaseAllocation.approvalStatus !== 'APPROVED') {
      return new NextResponse(JSON.stringify({ error: 'Phase allocation must be approved before weekly planning' }), { status: 400 });
    }

    const weekStart = startOfWeek(new Date(weekStartDate), { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(new Date(weekStartDate), { weekStartsOn: 1 });
    const weekNumber = getISOWeek(weekStart);
    const year = getYear(weekStart);

    // Check if allocation exists
    const existing = await prisma.weeklyAllocation.findUnique({
      where: {
        phaseAllocationId_weekNumber_year: {
          phaseAllocationId,
          weekNumber,
          year
        }
      }
    });

    // Update consultant description if provided
    if (consultantDescription !== undefined) {
      await prisma.phaseAllocation.update({
        where: { id: phaseAllocationId },
        data: { consultantDescription }
      });

      // If this is a description-only update (finalPlannedHours is 0), don't create/update weekly allocation
      if (finalPlannedHours === 0) {
        return NextResponse.json({ message: 'Description updated successfully' });
      }
    }

    // Don't create new allocations with 0 hours if no existing allocation
    if (finalPlannedHours === 0 && !existing) {
      return NextResponse.json({ message: 'No allocation created for 0 hours' });
    }

    // Use upsert to handle both create and update cases, preventing race conditions
    const allocation = await prisma.weeklyAllocation.upsert({
      where: {
        phaseAllocationId_weekNumber_year: {
          phaseAllocationId,
          weekNumber,
          year
        }
      },
      update: {
        proposedHours: finalPlannedHours,
        planningStatus: 'PENDING',
        plannedBy: session.user.id,
        approvedHours: null,
        approvedBy: null,
        approvedAt: null,
        rejectionReason: null
      },
      create: {
        phaseAllocationId,
        consultantId: session.user.id,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        weekNumber,
        year,
        proposedHours: finalPlannedHours,
        planningStatus: 'PENDING',
        plannedBy: session.user.id
      }
    });

    console.log('Upserted allocation:', {
      id: allocation.id,
      operation: existing ? 'updated' : 'created',
      proposedHours: allocation.proposedHours,
      status: allocation.planningStatus
    });

    // Send notification to Growth Team for new/updated weekly allocation
    // Skip if skipNotification flag is set (used for batch processing)
    if (!skipNotification) {
      try {
        const growthTeamIds = await getGrowthTeamMemberIds();

        if (growthTeamIds.length > 0 && allocation.proposedHours && allocation.proposedHours > 0) {
        // Get consultant and project info for notification
        const consultant = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { name: true, email: true }
        });

        const phaseAllocation = await prisma.phaseAllocation.findUnique({
          where: { id: phaseAllocationId },
          include: {
            phase: {
              include: {
                project: {
                  select: { title: true }
                }
              }
            }
          }
        });

        if (consultant && phaseAllocation) {
          const consultantName = consultant.name || consultant.email || 'Consultant';
          const weekDateString = format(weekStart, 'MMM dd, yyyy');

          const template = NotificationTemplates.WEEKLY_ALLOCATION_PENDING(
            consultantName,
            phaseAllocation.phase.name,
            phaseAllocation.phase.project.title,
            allocation.proposedHours,
            weekDateString
          );

          await createNotificationsForUsers(
            growthTeamIds,
            NotificationType.WEEKLY_ALLOCATION_PENDING,
            template.title,
            template.message,
            `/dashboard/hour-approvals`,
            {
              projectId: phaseAllocation.phase.project.title,
              phaseId: phaseAllocation.phase.id,
              allocationId: allocation.id,
              weekNumber: allocation.weekNumber,
              year: allocation.year,
              consultantId: session.user.id
            }
          );
        }
      }
      } catch (notificationError) {
        console.error('Failed to send weekly allocation notification:', notificationError);
        // Don't fail the allocation creation if notification fails
      }
    }

    // Note: Timeline update is handled on the client side after successful API response
    // This ensures real-time updates when allocation data changes
    return NextResponse.json(allocation);
  } catch (error: any) {
    console.error('Error saving weekly allocation:', error);
    console.error('Error details:', error?.message);
    if (error?.code) console.error('Error code:', error.code);
    return new NextResponse(JSON.stringify({ 
      error: 'Failed to save allocation',
      details: error?.message || 'Unknown error'
    }), { status: 500 });
  }
}
