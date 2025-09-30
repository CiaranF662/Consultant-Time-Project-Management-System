import { NextResponse } from 'next/server';
import { requireGrowthTeam, isAuthError } from '@/lib/api-auth';
import { UserRole } from '@prisma/client';

import { prisma } from "@/lib/prisma";

// GET pending weekly allocations for Growth Team approval
export async function GET(request: Request) {
  const auth = await requireGrowthTeam();
  if (isAuthError(auth)) return auth;
  const { session, user } = auth;

  const url = new URL(request.url);
  const weekStartDate = url.searchParams.get('weekStartDate');

  try {
    let whereClause: any = {
      planningStatus: 'PENDING'
    };

    // Filter by specific week if provided
    if (weekStartDate) {
      whereClause.weekStartDate = new Date(weekStartDate);
    }

    const pendingAllocations = await prisma.weeklyAllocation.findMany({
      where: whereClause,
      include: {
        consultant: {
          select: { id: true, name: true, email: true }
        },
        phaseAllocation: {
          select: {
            id: true,
            totalHours: true,
            phase: {
              select: {
                id: true,
                name: true,
                project: {
                  select: { id: true, title: true }
                }
              }
            }
          }
        }
      },
      orderBy: [
        { weekStartDate: 'asc' },
        { consultant: { name: 'asc' } }
      ]
    });

    // Get all weekly allocations for the same weeks to show consultant workload context
    const weekStartDates = [...new Set(pendingAllocations.map(a => a.weekStartDate))];
    const consultantIds = [...new Set(pendingAllocations.map(a => a.consultantId))];

    const allWeeklyAllocations = await prisma.weeklyAllocation.findMany({
      where: {
        weekStartDate: { in: weekStartDates },
        consultantId: { in: consultantIds },
        planningStatus: { in: ['APPROVED', 'MODIFIED'] } // Only show approved work
      },
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
      }
    });

    // Group approved allocations by consultant and week for context
    const workloadContext = allWeeklyAllocations.reduce((acc, allocation) => {
      const weekKey = new Date(allocation.weekStartDate).toISOString().split('T')[0];
      const consultantId = allocation.consultantId;

      if (!acc[consultantId]) {
        acc[consultantId] = {};
      }

      if (!acc[consultantId][weekKey]) {
        acc[consultantId][weekKey] = {
          totalApprovedHours: 0,
          projects: []
        };
      }

      acc[consultantId][weekKey].totalApprovedHours += allocation.approvedHours || 0;
      acc[consultantId][weekKey].projects.push({
        projectTitle: allocation.phaseAllocation.phase.project.title,
        phaseName: allocation.phaseAllocation.phase.name,
        hours: allocation.approvedHours || 0
      });

      return acc;
    }, {} as any);

    // Group by week and consultant for easier approval UI, including workload context
    const groupedAllocations = pendingAllocations.reduce((acc, allocation) => {
      const weekKey = new Date(allocation.weekStartDate).toISOString().split('T')[0];
      const consultantId = allocation.consultantId;

      if (!acc[weekKey]) {
        acc[weekKey] = {};
      }

      if (!acc[weekKey][consultantId]) {
        acc[weekKey][consultantId] = {
          consultant: allocation.consultant,
          totalProposed: 0,
          allocations: [],
          weeklyWorkload: workloadContext[consultantId]?.[weekKey] || { totalApprovedHours: 0, projects: [] }
        };
      }

      acc[weekKey][consultantId].totalProposed += allocation.proposedHours || 0;
      acc[weekKey][consultantId].allocations.push(allocation);

      return acc;
    }, {} as any);

    return NextResponse.json({ grouped: groupedAllocations, raw: pendingAllocations });
  } catch (error) {
    console.error('Error fetching pending weekly allocations:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch pending allocations' }), { status: 500 });
  }
}