import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { UserRole, ChangeStatus } from '@prisma/client';
import HourChangeApprovalsManager from '@/components/growth-team/approvals/HourChangeApprovalsManager';

import { prisma } from "@/lib/prisma";

async function getPendingHourRequests(userId: string, isGrowthTeam: boolean) {
  let whereClause: any = { status: ChangeStatus.PENDING };

  if (!isGrowthTeam) {
    // Product Managers only see requests for their projects
    const managedProjects = await prisma.project.findMany({
      where: { productManagerId: userId },
      select: { id: true }
    });
    
    const projectIds = managedProjects.map(p => p.id);
    
    // Get all phase allocations for managed projects
    const phaseAllocations = await prisma.phaseAllocation.findMany({
      where: {
        phase: {
          projectId: { in: projectIds }
        }
      },
      select: { id: true }
    });
    
    const phaseAllocationIds = phaseAllocations.map(pa => pa.id);
    
    whereClause = {
      ...whereClause,
      phaseAllocationId: { in: phaseAllocationIds }
    };
  }

  const requests = await prisma.hourChangeRequest.findMany({
    where: whereClause,
    include: {
      requester: {
        select: { id: true, name: true, email: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return requests;
}

export default async function HourChangeApprovalsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login');
  }

  // Check if user can access this page (Growth Team or Product Manager)
  const isGrowthTeam = session.user.role === UserRole.GROWTH_TEAM;
  let isProductManager = false;
  
  if (!isGrowthTeam) {
    // Check if user is a Product Manager
    const managedProjects = await prisma.project.findMany({
      where: { productManagerId: session.user.id },
      select: { id: true }
    });
    isProductManager = managedProjects.length > 0;
  }
  
  if (!isGrowthTeam && !isProductManager) {
    return (
      
        <div className="p-8">
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  Access denied. Only Growth Team members and Product Managers can approve hour change requests.
                </p>
              </div>
            </div>
          </div>
        </div>
      
    );
  }

  const requests = await getPendingHourRequests(session.user.id, isGrowthTeam);

  return (
    
      <HourChangeApprovalsManager 
        requests={requests} 
        userId={session.user.id}
      />
    
  );
}