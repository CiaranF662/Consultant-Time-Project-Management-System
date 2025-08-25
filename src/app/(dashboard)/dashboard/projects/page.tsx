import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole, UserStatus, ChangeStatus } from '@prisma/client';
import Link from 'next/link';
import { FaPlus } from 'react-icons/fa';
import ProjectCard from '@/app/components/ProjectCard';
import DashboardLayout from '@/app/components/DashboardLayout';

const prisma = new PrismaClient();

async function getProjectsForDashboard(userId: string, userRole: UserRole) {
  const whereClause =
    userRole === UserRole.GROWTH_TEAM ? {} : { consultants: { some: { userId } } };

  return prisma.project.findMany({
    where: whereClause,
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

async function getAdminDashboardData() {
    const pendingUserCount = await prisma.user.count({
        where: { status: UserStatus.PENDING }
    });
    const pendingHoursCount = await prisma.hourChangeRequest.count({
        where: { status: ChangeStatus.PENDING }
    });
    return { pendingUserCount, pendingHoursCount };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login');
  }

  const projects = await getProjectsForDashboard(session.user.id, session.user.role as UserRole);

  let adminData = { pendingUserCount: 0, pendingHoursCount: 0 };
  if (session.user.role === UserRole.GROWTH_TEAM) {
      adminData = await getAdminDashboardData();
  }

  const isGrowthTeam = session.user.role === UserRole.GROWTH_TEAM;

  return (
    <DashboardLayout>
        <div className="p-4 md:p-8">
        <div className={`grid grid-cols-1 ${isGrowthTeam ? 'lg:grid-cols-3' : ''} gap-8`}>

          <div className={isGrowthTeam ? 'lg:col-span-2' : ''}>
            <h1 className="text-3xl font-semibold text-gray-800 mb-4">
              {isGrowthTeam ? 'All Projects' : 'Your Projects'}
            </h1>
            {projects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 px-6 bg-white rounded-lg shadow-md border">
                <h3 className="text-xl font-semibold text-gray-800">No Projects Yet</h3>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}