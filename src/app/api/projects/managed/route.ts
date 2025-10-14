import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/api-auth';
import { ProjectRole, ApprovalStatus } from '@prisma/client';

import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;
    const { session, user } = auth;

    // Get projects where this user is the Product Manager
    const projects = await prisma.project.findMany({
      where: {
        consultants: {
          some: {
            userId: session.user.id,
            role: ProjectRole.PRODUCT_MANAGER
          }
        }
      },
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
        },
        phases: {
          include: {
            allocations: {
              include: {
                weeklyAllocations: {
                  where: {
                    planningStatus: 'APPROVED'
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            phases: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate completion percentages for phases based on time-based work progress
    const enrichedProjects = projects.map(project => ({
      ...project,
      consultants: project.consultants.map(c => c.user),
      phases: project.phases.map(phase => {
        // Calculate total allocated hours excluding EXPIRED and FORFEITED allocations
        const activeAllocations = phase.allocations.filter(
          alloc => alloc.approvalStatus !== ApprovalStatus.EXPIRED && alloc.approvalStatus !== ApprovalStatus.FORFEITED
        );
        const totalAllocatedHours = activeAllocations.reduce((sum, alloc) => sum + alloc.totalHours, 0);

        // Calculate work completion based on time progression through phase
        const now = new Date();
        const phaseStart = new Date(phase.startDate);
        const phaseEnd = new Date(phase.endDate);

        let completionPercentage = 0;
        if (now >= phaseEnd) {
          completionPercentage = 100; // Phase has ended
        } else if (now <= phaseStart) {
          completionPercentage = 0; // Phase hasn't started
        } else {
          // Phase is in progress - calculate based on time elapsed
          const totalDuration = phaseEnd.getTime() - phaseStart.getTime();
          const elapsed = now.getTime() - phaseStart.getTime();
          completionPercentage = Math.round((elapsed / totalDuration) * 100);
        }

        return {
          ...phase,
          totalAllocatedHours,
          completionPercentage
        };
      })
    }));

    return NextResponse.json(enrichedProjects);
  } catch (error) {
    console.error('Error fetching managed projects:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}