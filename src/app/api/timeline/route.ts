import { NextResponse } from 'next/server';
import { requireGrowthTeam, isAuthError } from '@/lib/api-auth';
import { UserRole } from '@prisma/client';
import { startOfWeek, endOfWeek, addWeeks, format } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

import { prisma } from "@/lib/prisma";

// South African Standard Time (UTC+2, no DST)
const TIMEZONE = 'Africa/Johannesburg';

// Add type definition for week structure
type WeekInfo = {
  weekStart: Date;
  weekEnd: Date;
  weekNumber: string;
  year: string;
  label: string;
};

// Function to determine sprint info for a given week
function getSprintInfoForWeek(weekStart: Date, sprints: any[]): { sprint: any; weekOfSprint: number } | null {
  // Sort sprints by sprint number to ensure proper ordering
  const sortedSprints = sprints.sort((a, b) => a.sprintNumber - b.sprintNumber);
  
  for (const sprint of sortedSprints) {
    const sprintStart = new Date(sprint.startDate);
    const sprintEnd = new Date(sprint.endDate);
    
    // Check if the week falls within this sprint
    if (weekStart >= sprintStart && weekStart <= sprintEnd) {
      // Calculate which week of the sprint this is
      const daysDiff = Math.floor((weekStart.getTime() - sprintStart.getTime()) / (1000 * 60 * 60 * 24));
      const weekOfSprint = Math.floor(daysDiff / 7) + 1; // 1-based week numbering
      
      return {
        sprint,
        weekOfSprint: Math.min(weekOfSprint, 2) // Cap at week 2 for 2-week sprints
      };
    }
  }
  
  return null;
}

export async function GET(request: Request) {
  const auth = await requireGrowthTeam();
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(request.url);

  // Helper to get current date in SAST timezone
  const getSASTDate = (): Date => {
    const now = new Date();
    // Get the current time in SAST by adding the offset
    return toZonedTime(now, TIMEZONE);
  };

  // Parse start date and align to Monday (week start) in SAST
  // We need to ensure the date-fns operations happen on SAST dates
  const rawStartDate = searchParams.get('startDate')
    ? toZonedTime(new Date(searchParams.get('startDate')!), TIMEZONE)
    : getSASTDate();

  // Calculate start of week in SAST context
  const startDateSAST = startOfWeek(rawStartDate, { weekStartsOn: 1 });

  // Convert back to UTC for database operations
  const startDate = fromZonedTime(startDateSAST, TIMEZONE);

  // Calculate weeks to show based on endDate if provided, otherwise use weeks parameter
  let weeksToShow: number;
  if (searchParams.get('endDate')) {
    const rawEndDate = toZonedTime(new Date(searchParams.get('endDate')!), TIMEZONE);
    const endDateSAST = endOfWeek(rawEndDate, { weekStartsOn: 1 });

    const diffTime = Math.abs(endDateSAST.getTime() - startDateSAST.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    // Calculate weeks to fully cover the date range
    weeksToShow = Math.max(1, Math.ceil(diffDays / 7));
  } else {
    weeksToShow = parseInt(searchParams.get('weeks') || '12');
  }

  try {
    // Get all consultants with their PM status
    const consultants = await prisma.user.findMany({
      where: { role: UserRole.CONSULTANT },
      orderBy: { name: 'asc' },
      include: {
        managedProjects: {
          select: { 
            id: true, 
            title: true 
          }
        }
      }
    });

    // Generate week ranges in SAST timezone
    const weeks: WeekInfo[] = [];
    for (let i = 0; i < weeksToShow; i++) {
      // Add weeks in SAST context
      const weekStartSAST = addWeeks(startDateSAST, i);
      const weekEndSAST = endOfWeek(weekStartSAST, { weekStartsOn: 1 });

      // Convert to UTC for database comparison
      const weekStartUTC = fromZonedTime(weekStartSAST, TIMEZONE);
      const weekEndUTC = fromZonedTime(weekEndSAST, TIMEZONE);

      weeks.push({
        weekStart: weekStartUTC,
        weekEnd: weekEndUTC,
        weekNumber: format(weekStartSAST, 'w'),
        year: format(weekStartSAST, 'yyyy'),
        label: format(weekStartSAST, 'MMM d')
      });
    }

    // Get allocations for all consultants in the date range - only approved hours
    const allocations = await prisma.weeklyAllocation.findMany({
      where: {
        weekStartDate: {
          gte: startDate,
          lte: addWeeks(startDate, weeksToShow)
        },
        planningStatus: 'APPROVED' // Only show approved weekly allocations
      },
      include: {
        phaseAllocation: {
          include: {
            phase: {
              include: {
                project: {
                  select: { 
                    id: true, 
                    title: true,
                    productManagerId: true
                  }
                },
                sprints: {
                  select: {
                    id: true,
                    sprintNumber: true,
                    startDate: true,
                    endDate: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // Build timeline data structure ensuring each consultant has exactly the same weeks
    const timeline = consultants.map(consultant => {
      const consultantAllocations = allocations.filter(a => a.consultantId === consultant.id);
      
      const weeklyData = weeks.map((week) => {
        const weekAllocations = consultantAllocations.filter(a => {
          const allocWeekStart = new Date(a.weekStartDate);

          // Both are now in UTC, compare by normalizing to date-only (ignoring time)
          const allocStartTime = allocWeekStart.getTime();
          const weekStartTime = week.weekStart.getTime();
          const weekEndTime = week.weekEnd.getTime();

          // Check if allocation falls within this week (allowing for some tolerance)
          return allocStartTime >= weekStartTime && allocStartTime <= weekEndTime;
        });

        const totalHours = weekAllocations.reduce((sum, a) => sum + (a.approvedHours || 0), 0);
        
        return {
          week: week.label,
          weekStart: week.weekStart,
          weekEnd: week.weekEnd,
          totalHours,
          allocations: weekAllocations.map(a => {
            const sprintInfo = getSprintInfoForWeek(week.weekStart, a.phaseAllocation.phase.sprints);
            
            return {
              id: a.id,
              hours: a.approvedHours || 0,
              project: a.phaseAllocation.phase.project.title,
              projectId: a.phaseAllocation.phase.project.id,
              phase: a.phaseAllocation.phase.name,
              phaseId: a.phaseAllocation.phase.id,
              phaseAllocationId: a.phaseAllocation.id,
              consultantDescription: a.phaseAllocation.consultantDescription,
              isProductManager: a.phaseAllocation.phase.project.productManagerId === consultant.id,
              sprint: sprintInfo ? {
                sprintNumber: sprintInfo.sprint.sprintNumber,
                weekOfSprint: sprintInfo.weekOfSprint,
                sprintId: sprintInfo.sprint.id
              } : null
            };
          })
        };
      });

      // Verify we have exactly the right number of weeks
      if (weeklyData.length !== weeksToShow) {
        console.warn(`Consultant ${consultant.id} has ${weeklyData.length} weeks instead of ${weeksToShow}`);
      }

      return {
        consultantId: consultant.id,
        consultantName: consultant.name || consultant.email,
        isProductManager: consultant.managedProjects.length > 0,
        managedProjects: consultant.managedProjects,
        weeklyData
      };
    });

    return NextResponse.json({ timeline, weeks });
  } catch (error) {
    console.error('Error fetching timeline data:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch timeline' }), { status: 500 });
  }
}