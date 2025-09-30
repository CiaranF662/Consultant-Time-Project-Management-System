import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import TeamAllocationsClient from '@/app/components/product-manager/TeamAllocationsClient';

const prisma = new PrismaClient();

async function getProductManagerProjects(userId: string) {
  // Get projects where the user is the product manager
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { productManagerId: userId },
        {
          consultants: {
            some: {
              userId: userId,
              role: 'PRODUCT_MANAGER'
            }
          }
        }
      ]
    },
    include: {
      phases: {
        include: {
          allocations: {
            include: {
              consultant: {
                select: { id: true, name: true, email: true }
              },
              weeklyAllocations: {
                orderBy: { weekStartDate: 'asc' }
              }
            }
          },
          sprints: {
            orderBy: { sprintNumber: 'asc' }
          }
        },
        orderBy: { startDate: 'asc' }
      },
      consultants: {
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      }
    }
  });

  return projects;
}

export default async function TeamAllocationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login');
  }

  const projects = await getProductManagerProjects(session.user.id);

  if (projects.length === 0) {
    return (
      
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Team Allocations</h1>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <p className="text-yellow-800">
                You don't have any projects assigned as a Product Manager yet.
              </p>
              <p className="text-yellow-600 text-sm mt-2">
                Contact your Growth Team to be assigned as a Product Manager for projects.
              </p>
            </div>
          </div>
        </div>
      
    );
  }

  return (
    
      <TeamAllocationsClient projects={projects} />
    
  );
}