import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';
import Link from 'next/link';
import { FaPlus } from 'react-icons/fa';
import SignOutButton from '@/app/components/SignOutButton';
import ProjectCard from '@/app/components/ProjectCard';

const prisma = new PrismaClient();

// CORRECTED: This function now fetches projects correctly for both roles
async function getProjectsForDashboard(userId: string, userRole: UserRole) {
  // The 'where' clause now correctly uses the many-to-many relationship
  const whereClause =
    userRole === UserRole.GROWTH_TEAM
      ? {} // An empty 'where' fetches all projects
      : { consultants: { some: { userId: userId } } }; // Filters for projects a consultant is assigned to

  const projects = await prisma.project.findMany({
    where: whereClause,
    include: {
      tasks: true, // CORRECTED: This now includes the tasks needed by ProjectCard
    },
    orderBy: { createdAt: 'desc' },
  });
  return projects;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  const projects = await getProjectsForDashboard(session.user.id, session.user.role as UserRole);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto p-4 md:p-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-lg text-gray-600">
              Welcome back, {session.user.name || session.user.email}.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/create-project"
              className="inline-flex items-center justify-center gap-2 py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <FaPlus />
              Create New Project
            </Link>
            <SignOutButton />
          </div>
        </div>

        {/* Projects Grid */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            {session.user.role === UserRole.GROWTH_TEAM ? 'All Projects' : 'Your Projects'}
          </h2>
          {projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-6 bg-white rounded-lg shadow-md border">
              <h3 className="text-xl font-semibold text-gray-800">No Projects Yet</h3>
              <p className="text-gray-500 mt-2">
                Click the "Create New Project" button to get started.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}