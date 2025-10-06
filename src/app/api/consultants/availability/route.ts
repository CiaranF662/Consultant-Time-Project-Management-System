import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { logError, logApiRequest } from '@/lib/error-logger';

import { prisma } from "@/lib/prisma";

// Helper function to get ISO week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export async function GET(request: NextRequest) {
  logApiRequest('GET', '/api/consultants/availability');

  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const projectId = searchParams.get('projectId'); // Optional: filter to project consultants only

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Generate all weeks in the date range
    const weeks: Array<{ weekStart: Date; weekEnd: Date; weekNumber: number; year: number }> = [];
    let currentWeekStart = new Date(start);

    while (currentWeekStart <= end) {
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

    // Get consultants - optionally filter by project
    let consultantsQuery: any = {
      role: UserRole.CONSULTANT,
      status: 'APPROVED',
    };

    if (projectId) {
      // Get only consultants assigned to the project
      const projectConsultants = await prisma.consultantsOnProjects.findMany({
        where: { projectId },
        select: { userId: true, allocatedHours: true }
      });
      consultantsQuery.id = { in: projectConsultants.map(pc => pc.userId) };
    }

    const consultants = await prisma.user.findMany({
      where: consultantsQuery,
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // Get project allocation hours if projectId is provided
    let projectAllocationsMap: Record<string, number> = {};
    if (projectId) {
      const projectConsultants = await prisma.consultantsOnProjects.findMany({
        where: { projectId },
        select: { userId: true, allocatedHours: true }
      });
      projectAllocationsMap = Object.fromEntries(
        projectConsultants.map(pc => [pc.userId, pc.allocatedHours || 0])
      );
    }

    // Calculate weekly availability for each consultant
    const consultantAvailability = await Promise.all(
      consultants.map(async (consultant) => {
        // Get weekly breakdown
        const weeklyBreakdown = await Promise.all(
          weeks.map(async (week) => {
            // Get ALL allocations for this consultant for this week across ALL projects
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
              const projId = alloc.phaseAllocation.phase.project.id;
              const projTitle = alloc.phaseAllocation.phase.project.title;

              if (!acc[projId]) {
                acc[projId] = {
                  projectId: projId,
                  projectTitle: projTitle,
                  hours: 0
                };
              }

              acc[projId].hours += alloc.approvedHours || alloc.proposedHours || 0;

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
          allocatedHours: projectAllocationsMap[consultant.id] || 0,
          overallStatus,
          averageHoursPerWeek: Math.round(averageHoursPerWeek * 10) / 10,
          totalAllocatedHours: Math.round(totalAllocatedHours * 10) / 10,
          weeklyBreakdown
        };
      })
    );

    return NextResponse.json({
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
      endpoint: '/api/consultants/availability'
    });
    return NextResponse.json(
      { error: 'Failed to fetch consultant availability' },
      { status: 500 }
    );
  }
}
