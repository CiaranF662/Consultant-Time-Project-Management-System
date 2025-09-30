import { NextResponse } from 'next/server';
import { requireGrowthTeam, isAuthError } from '@/lib/api-auth';
import { UserRole } from '@prisma/client';

import { prisma } from "@/lib/prisma";

// GET all projects budget overview - only for Growth Team
export async function GET(request: Request) {
  const auth = await requireGrowthTeam();
  if (isAuthError(auth)) return auth;
  const { session, user } = auth;

  try {
    // Get all projects with phases and allocations
    const projects = await prisma.project.findMany({
      include: {
        phases: {
          include: {
            allocations: {
              include: {
                consultant: {
                  select: { id: true, name: true, email: true }
                },
                weeklyAllocations: true
              }
            }
          }
        },
        consultants: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate budget data for each project
    const budgetData = projects.map(project => {
      const totalAllocated = project.phases.reduce((sum, phase) => {
        return sum + phase.allocations.reduce((phaseSum, allocation) => {
          return phaseSum + allocation.totalHours;
        }, 0);
      }, 0);

      const totalPlanned = project.phases.reduce((sum, phase) => {
        return sum + phase.allocations.reduce((phaseSum, allocation) => {
          return phaseSum + allocation.weeklyAllocations.reduce((weekSum, week) => {
            return weekSum + (week.proposedHours || 0);
          }, 0);
        }, 0);
      }, 0);

      return {
        id: project.id,
        title: project.title,
        budgetedHours: project.budgetedHours,
        totalAllocated,
        totalPlanned,
        remaining: project.budgetedHours - totalAllocated,
        utilizationRate: project.budgetedHours > 0
          ? ((totalAllocated / project.budgetedHours) * 100).toFixed(1)
          : 0,
        teamSize: project.consultants.length,
        phaseCount: project.phases.length
      };
    });

    return NextResponse.json({ projects: budgetData });
  } catch (error) {
    console.error('Error fetching budget overview:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch budget overview' }), { status: 500 });
  }
}