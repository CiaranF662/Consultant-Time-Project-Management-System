import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';
import Link from 'next/link';
import { FaPlus } from 'react-icons/fa';
import ProjectCard from '@/app/components/ProjectCard';
import DashboardLayout from '@/app/components/DashboardLayout';

const prisma = new PrismaClient();

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
    redirect('/login');
  }

  const projects = await getProjectsForDashboard(session.user.id, session.user.role as UserRole);
  const isGrowthTeam = session.user.role === UserRole.GROWTH_TEAM;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-semibold text-gray-800">
            {isGrowthTeam ? 'All Projects' : 'Your Projects'}
          </h1>
          {isGrowthTeam && (
            <Link 
              href="/dashboard/create-project" 
              className="inline-flex items-center gap-2 py-2 px-4 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <FaPlus />
              Create New Project
            </Link>
          )}
        </div>

        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project as any} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 px-6 bg-white rounded-lg shadow-md border">
            <h3 className="text-xl font-semibold text-gray-800">No Projects Yet</h3>
            <p className="text-gray-500 mt-2">
              {isGrowthTeam 
                ? 'Click "Create New Project" to get started.' 
                : 'You have not been assigned to any projects yet.'}
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}