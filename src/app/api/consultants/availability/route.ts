import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';

import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get all consultants
    const consultants = await prisma.user.findMany({
      where: {
        role: UserRole.CONSULTANT,
        status: 'APPROVED',
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // Calculate weekly availability for each consultant
    const consultantAvailability = await Promise.all(
      consultants.map(async (consultant) => {
        // Get all weekly allocations for this consultant during the project period
        const weeklyAllocations = await prisma.weeklyAllocation.findMany({
          where: {
            consultantId: consultant.id,
            weekStartDate: {
              gte: start,
              lte: end,
            },
            planningStatus: {
              in: ['APPROVED', 'PENDING'], // Include both approved and pending
            },
          },
          include: {
            phaseAllocation: {
              include: {
                phase: {
                  include: {
                    project: {
                      select: {
                        title: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        // Calculate total allocated hours during the project period
        const totalAllocatedHours = weeklyAllocations.reduce(
          (sum, allocation) => sum + (allocation.approvedHours || allocation.proposedHours || 0),
          0
        );

        // Calculate number of weeks in the project
        const projectDurationWeeks = Math.ceil(
          (end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)
        );

        // Calculate average hours per week
        const averageHoursPerWeek = projectDurationWeeks > 0 ? totalAllocatedHours / projectDurationWeeks : 0;

        // Calculate availability status based on average
        let availabilityStatus: 'available' | 'partially-busy' | 'busy' | 'overloaded';
        let availabilityColor: string;
        let availabilityLabel: string;

        if (averageHoursPerWeek <= 15) {
          availabilityStatus = 'available';
          availabilityColor = 'bg-green-100 text-green-800 border-green-200';
          availabilityLabel = 'Available';
        } else if (averageHoursPerWeek <= 30) {
          availabilityStatus = 'partially-busy';
          availabilityColor = 'bg-yellow-100 text-yellow-800 border-yellow-200';
          availabilityLabel = 'Partially Busy';
        } else if (averageHoursPerWeek <= 40) {
          availabilityStatus = 'busy';
          availabilityColor = 'bg-orange-100 text-orange-800 border-orange-200';
          availabilityLabel = 'Busy';
        } else {
          availabilityStatus = 'overloaded';
          availabilityColor = 'bg-red-100 text-red-800 border-red-200';
          availabilityLabel = 'Overloaded';
        }

        // Group allocations by project for tooltip details
        const projectAllocations = weeklyAllocations.reduce((acc, allocation) => {
          const projectTitle = allocation.phaseAllocation.phase.project.title;
          if (!acc[projectTitle]) {
            acc[projectTitle] = 0;
          }
          acc[projectTitle] += allocation.approvedHours || allocation.proposedHours || 0;
          return acc;
        }, {} as Record<string, number>);

        return {
          consultant,
          totalAllocatedHours,
          averageHoursPerWeek: Math.round(averageHoursPerWeek * 10) / 10,
          availableHoursPerWeek: Math.max(0, Math.round((40 - averageHoursPerWeek) * 10) / 10),
          projectDurationWeeks,
          availabilityStatus,
          availabilityColor,
          availabilityLabel,
          projectAllocations,
        };
      })
    );

    return NextResponse.json(consultantAvailability);
  } catch (error) {
    console.error('Error fetching consultant availability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch consultant availability' },
      { status: 500 }
    );
  }
}