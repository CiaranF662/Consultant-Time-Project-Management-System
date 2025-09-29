import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';

import ProjectsPageClient from '@/app/components/projects/ProjectsPageClient';

const prisma = new PrismaClient();

async function getProjectsForDashboard(userId: string, userRole: UserRole) {
  const baseQuery = {
    include: {
      sprints: true,
      phases: {
        include: {
          allocations: true
        }
      },
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
    },
    orderBy: { createdAt: 'desc' as const },
  };

  if (userRole === UserRole.GROWTH_TEAM) {
    return prisma.project.findMany(baseQuery);
  } else {
    return prisma.project.findMany({
      ...baseQuery,
      where: {
        consultants: {
          some: { userId }
        }
      }
    });
  }
}

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login');
  }

  const projects = await getProjectsForDashboard(session.user.id, session.user.role as UserRole);
  const isGrowthTeam = session.user.role === UserRole.GROWTH_TEAM;

  return (
    <ProjectsPageClient 
      projects={projects} 
      isGrowthTeam={isGrowthTeam} 
    />
  );
}