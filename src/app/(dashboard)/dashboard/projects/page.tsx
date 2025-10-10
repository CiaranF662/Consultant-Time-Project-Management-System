import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import ProjectsPageClient from '@/components/projects/details/ProjectsPageClient';

import { prisma } from "@/lib/prisma";

async function getProjectsForDashboard(userId: string, userRole: UserRole) {
  if (userRole === UserRole.GROWTH_TEAM) {
    // Growth Team sees all projects
    return prisma.project.findMany({
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
      orderBy: { createdAt: 'desc' },
    });
  } else {
    // Consultants see only their projects
    return prisma.project.findMany({
      where: {
        consultants: {
          some: { userId }
        }
      },
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
      orderBy: { createdAt: 'desc' },
    });
  }
}

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/auth/login');
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