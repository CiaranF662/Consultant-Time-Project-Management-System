import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';
import ProjectCard from '@/app/components/ProjectCard';
import DashboardLayout from '@/app/components/DashboardLayout';

const prisma = new PrismaClient();

async function getConsultantProjects(userId: string) {
  return prisma.project.findMany({
    where: { 
      consultants: { 
        some: { userId } 
      } 
    },
    include: {
      sprints: true,
      tasks: true,
      consultants: { 
        include: { 
          user: { 
            select: { 
              id: true,
              name: true 
            } 
          } 
        } 
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export default async function MyProjectsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/login');
  }

  // Only consultants should access this page
  if (session.user.role !== UserRole.CONSULTANT) {
    redirect('/dashboard');
  }

  const projects = await getConsultantProjects(session.user.id);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">My Projects</h1>
          <p className="text-lg text-gray-600">
            Projects you're currently assigned to work on.
          </p>
        </div>

        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 px-6 bg-white rounded-lg shadow-md border">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Projects Assigned</h3>
            <p className="text-gray-500">
              You haven't been assigned to any projects yet. Check back later or contact your team lead.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}