import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/api-auth';
import { UserRole } from '@prisma/client';

import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { session, user } = auth;

  const { projectId } = await params;
  const { id: userId, role } = session.user;
  const userRole = role as UserRole;

  // Check authorization - Growth Team can see all projects, others only assigned projects
  const whereClause =
    userRole === UserRole.GROWTH_TEAM
      ? { id: projectId }
      : { id: projectId, consultants: { some: { userId: userId } } };

  try {
    const project = await prisma.project.findFirst({
      where: whereClause,
      include: {
        phases: {
          include: {
            allocations: {
              where: {
                approvalStatus: 'APPROVED' // Only include approved phase allocations
              },
              include: {
                consultant: {
                  select: { id: true, name: true, email: true }
                },
                weeklyAllocations: true
              }
            }
          }
        }
      },
    });

    // Also get all approved weekly allocations for this project
    const approvedWeeklyAllocations = await prisma.weeklyAllocation.findMany({
      where: {
        phaseAllocation: {
          phase: {
            projectId: projectId
          }
        },
        planningStatus: { in: ['APPROVED', 'MODIFIED'] }
      },
      include: {
        phaseAllocation: {
          include: {
            consultant: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });

    if (!project) {
      return new NextResponse(JSON.stringify({ error: 'Project not found or not authorized' }), { status: 404 });
    }

    // Debug: Log the data we're working with
    console.log('=== BUDGET API DEBUG ===');
    console.log('Project phases:', project.phases.length);
    project.phases.forEach((phase, i) => {
      console.log(`Phase ${i}: ${phase.name}, allocations: ${phase.allocations.length}`);
      phase.allocations.forEach((alloc, j) => {
        console.log(`  Allocation ${j}: consultant ${alloc.consultant.name}, ${alloc.totalHours}h, status: ${alloc.approvalStatus}`);
      });
    });
    console.log('Approved weekly allocations:', approvedWeeklyAllocations.length);
    approvedWeeklyAllocations.forEach((wa, i) => {
      console.log(`  Weekly ${i}: ${wa.approvedHours}h, status: ${wa.planningStatus}`);
    });

    // Calculate budget data with three-tier system
    const today = new Date();

    const phases = project.phases.map(phase => {
      const consultants = phase.allocations.map(allocation => {
        // Get approved weekly allocations for this specific allocation
        const approvedWeeklyForThisAllocation = approvedWeeklyAllocations.filter(
          wa => wa.phaseAllocationId === allocation.id
        );

        // Planned Hours: Only approved weekly allocations (Growth Team approved)
        const totalPlannedHours = approvedWeeklyForThisAllocation.reduce((sum, wa) => sum + (wa.approvedHours || 0), 0);

        // Actual/Used Hours: Only approved weekly allocations where the week has ended
        const usedHours = approvedWeeklyForThisAllocation
          .filter(wa => new Date(wa.weekEndDate) < today)
          .reduce((sum, wa) => sum + (wa.approvedHours || 0), 0);

        return {
          id: allocation.consultant.id,
          name: allocation.consultant.name || allocation.consultant.email || 'Unknown',
          allocatedHours: allocation.totalHours,
          plannedHours: totalPlannedHours,
          usedHours: usedHours
        };
      });

      return {
        id: phase.id,
        name: phase.name,
        allocatedHours: phase.allocations.reduce((sum, a) => sum + a.totalHours, 0),
        plannedHours: consultants.reduce((sum, c) => sum + c.plannedHours, 0),
        usedHours: consultants.reduce((sum, c) => sum + c.usedHours, 0),
        consultants
      };
    });

    const totalAllocated = phases.reduce((sum, p) => sum + p.allocatedHours, 0);
    const totalPlanned = phases.reduce((sum, p) => sum + p.plannedHours, 0);
    const totalUsed = phases.reduce((sum, p) => sum + p.usedHours, 0);
    
    const summary = {
      totalBudgeted: project.budgetedHours,
      totalAllocated: totalAllocated,
      totalPlanned: totalPlanned,
      totalUsed: totalUsed,
      totalRemaining: project.budgetedHours - totalAllocated, // Fixed: remaining = budget - allocated
      // Four progress percentages for comprehensive tracking
      allocationPercentage: project.budgetedHours > 0 ? (totalAllocated / project.budgetedHours) * 100 : 0,
      planningVsAllocationPercentage: totalAllocated > 0 ? (totalPlanned / totalAllocated) * 100 : 0,
      planningVsBudgetPercentage: project.budgetedHours > 0 ? (totalPlanned / project.budgetedHours) * 100 : 0,
      utilizationPercentage: project.budgetedHours > 0 ? (totalUsed / project.budgetedHours) * 100 : 0
    };

    const budgetData = {
      projectId: project.id,
      projectTitle: project.title,
      totalBudgetHours: project.budgetedHours,
      phases,
      summary
    };

    return NextResponse.json(budgetData);
  } catch (error) {
    console.error('Failed to fetch budget data:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}