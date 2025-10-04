import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/api-auth';
import { logError, logApiRequest } from '@/lib/error-logger';
import { prisma } from "@/lib/prisma";

/**
 * GET consultant availability for a specific phase
 * Shows week-by-week breakdown of consultant workload during phase sprints
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ phaseId: string }> }
) {
  const { phaseId } = await params;
  logApiRequest('GET', `/api/phases/${phaseId}/consultant-availability`);

  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { session } = auth;

  try {
    // Get phase with sprints and project details
    const phase = await prisma.phase.findUnique({
      where: { id: phaseId },
      include: {
        sprints: {
          orderBy: { startDate: 'asc' }
        },
        project: {
          include: {
            consultants: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!phase) {
      return new NextResponse(JSON.stringify({ error: 'Phase not found' }), { status: 404 });
    }

    // Get all weeks from phase sprints
    const weeks: Array<{ weekStart: Date; weekEnd: Date; weekNumber: number; year: number }> = [];

    phase.sprints.forEach(sprint => {
      let currentWeekStart = new Date(sprint.startDate);
      const sprintEnd = new Date(sprint.endDate);

      while (currentWeekStart <= sprintEnd) {
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const weekNumber = getWeekNumber(currentWeekStart);
        const year = currentWeekStart.getFullYear();

        weeks.push({
          weekStart: new Date(currentWeekStart),
          weekEnd,
          weekNumber,
          year
        });

        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      }
    });

    // Get availability for each consultant
    const consultantAvailability = await Promise.all(
      phase.project.consultants.map(async (assignment) => {
        const consultant = assignment.user;

        // Get weekly breakdown
        const weeklyBreakdown = await Promise.all(
          weeks.map(async (week) => {
            // Get ALL allocations for this consultant for this week across ALL projects
            // This includes approved, pending, and modified allocations
            const allocations = await prisma.weeklyAllocation.findMany({
              where: {
                consultantId: consultant.id,
                weekNumber: week.weekNumber,
                year: week.year,
                planningStatus: {
                  in: ['APPROVED', 'PENDING', 'MODIFIED']
                }
              },
              include: {
                phaseAllocation: {
                  include: {
                    phase: {
                      include: {
                        project: {
                          select: {
                            id: true,
                            title: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            });

            const totalHours = allocations.reduce(
              (sum, alloc) => sum + (alloc.approvedHours || alloc.proposedHours || 0),
              0
            );

            // Group by project for details
            const projectBreakdown = allocations.reduce((acc, alloc) => {
              const projectId = alloc.phaseAllocation.phase.project.id;
              const projectTitle = alloc.phaseAllocation.phase.project.title;

              if (!acc[projectId]) {
                acc[projectId] = {
                  projectId,
                  projectTitle,
                  hours: 0
                };
              }

              acc[projectId].hours += alloc.approvedHours || alloc.proposedHours || 0;

              return acc;
            }, {} as Record<string, { projectId: string; projectTitle: string; hours: number }>);

            return {
              weekStart: week.weekStart,
              weekEnd: week.weekEnd,
              weekNumber: week.weekNumber,
              year: week.year,
              totalHours,
              availableHours: Math.max(0, 40 - totalHours),
              status: totalHours <= 15 ? 'available' : totalHours <= 30 ? 'partially-busy' : totalHours <= 40 ? 'busy' : 'overloaded',
              projects: Object.values(projectBreakdown)
            };
          })
        );

        // Calculate overall stats
        const totalAllocatedHours = weeklyBreakdown.reduce((sum, week) => sum + week.totalHours, 0);
        const averageHoursPerWeek = weeks.length > 0 ? totalAllocatedHours / weeks.length : 0;

        let overallStatus: 'available' | 'partially-busy' | 'busy' | 'overloaded';
        if (averageHoursPerWeek <= 15) {
          overallStatus = 'available';
        } else if (averageHoursPerWeek <= 30) {
          overallStatus = 'partially-busy';
        } else if (averageHoursPerWeek <= 40) {
          overallStatus = 'busy';
        } else {
          overallStatus = 'overloaded';
        }

        return {
          consultant: {
            id: consultant.id,
            name: consultant.name,
            email: consultant.email
          },
          allocatedHours: assignment.allocatedHours || 0,
          overallStatus,
          averageHoursPerWeek: Math.round(averageHoursPerWeek * 10) / 10,
          totalAllocatedHours: Math.round(totalAllocatedHours * 10) / 10,
          weeklyBreakdown
        };
      })
    );

    return NextResponse.json({
      phase: {
        id: phase.id,
        name: phase.name,
        startDate: phase.startDate,
        endDate: phase.endDate
      },
      weeks: weeks.map(w => ({
        weekStart: w.weekStart,
        weekEnd: w.weekEnd,
        weekNumber: w.weekNumber,
        year: w.year
      })),
      consultants: consultantAvailability
    });

  } catch (error) {
    logError('Failed to fetch consultant availability', error as Error, {
      userId: session.user.id,
      phaseId,
      endpoint: `/api/phases/${phaseId}/consultant-availability`
    });
    return new NextResponse(
      JSON.stringify({ error: 'Failed to fetch consultant availability' }),
      { status: 500 }
    );
  }
}

// Helper function to get ISO week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
