import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { PrismaClient, ProjectRole } from '@prisma/client';
import PhasePlanningDashboard from '@/app/components/projects/product-manager/PhasePlanningDashboard';

const prisma = new PrismaClient();

async function getProductManagerData(userId: string) {
  // Get projects where user is Product Manager
  const projects = await prisma.project.findMany({
    where: {
      consultants: {
        some: {
          userId: userId,
          role: ProjectRole.PRODUCT_MANAGER
        }
      }
    },
    select: {
      id: true,
      title: true,
      budgetedHours: true,
      productManagerId: true,
      phases: {
        include: {
          sprints: {
            orderBy: { sprintNumber: 'asc' }
          },
          allocations: {
            include: {
              consultant: {
                select: { id: true, name: true, email: true }
              }
            }
          }
        },
        orderBy: { startDate: 'asc' }
      },
      sprints: {
        orderBy: { sprintNumber: 'asc' }
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

  // Get all consultants for allocation
  const allConsultants = await prisma.user.findMany({
    where: {
      role: 'CONSULTANT'
    },
    select: {
      id: true,
      name: true,
      email: true
    },
    orderBy: { name: 'asc' }
  });

  return { projects, allConsultants };
}

export default async function PhasePlanningPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login');
  }

  // Check if user is a Product Manager
  const pmProjects = await prisma.project.findMany({
    where: {
      consultants: {
        some: {
          userId: session.user.id,
          role: ProjectRole.PRODUCT_MANAGER
        }
      }
    },
    select: { id: true }
  });

  if (pmProjects.length === 0) {
    return (
      
        <div className="p-8">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  You are not assigned as a Product Manager to any projects. Contact your Growth Team to assign you as a Product Manager.
                </p>
              </div>
            </div>
          </div>
        </div>
      
    );
  }

  const data = await getProductManagerData(session.user.id);

  return (
    
      <PhasePlanningDashboard data={data} userId={session.user.id} />
    
  );
}