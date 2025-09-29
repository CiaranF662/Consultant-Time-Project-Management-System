import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient, ProjectRole } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Calculate completion percentages for phases
    const enrichedProjects = projects.map(project => ({
      ...project,
      consultants: project.consultants.map(c => c.user),
      phases: project.phases.map(phase => {
        const totalAllocatedHours = phase.allocations.reduce((sum, alloc) => sum + alloc.totalHours, 0);
        const completedHours = phase.allocations.reduce((sum, alloc) =>
          sum + alloc.weeklyAllocations.reduce((weekSum, weekly) => weekSum + (weekly.approvedHours || 0), 0), 0
        );
        const completionPercentage = totalAllocatedHours > 0 ? Math.round((completedHours / totalAllocatedHours) * 100) : 0;

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