import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole, UserStatus, ChangeStatus } from '@prisma/client';
import Link from 'next/link';
import { FaPlus, FaUsers, FaClock } from 'react-icons/fa';
import SignOutButton from '@/app/components/SignOutButton';
import ProjectCard from '@/app/components/ProjectCard';

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
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto p-4 md:p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              {isGrowthTeam ? 'Growth Team Dashboard' : 'Consultant Dashboard'}
            </h1>
            <p className="text-lg text-gray-600">
              Welcome back, {session.user.name || session.user.email}.
            </p>
          </div>
          <div className="flex items-center gap-4">
            {isGrowthTeam && (
                <Link href="/dashboard/create-project" className="inline-flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                  <FaPlus />
                  Create New Project
                </Link>
            )}
            <SignOutButton />
          </div>
        </div>

        <div className={`grid grid-cols-1 ${isGrowthTeam ? 'lg:grid-cols-3' : ''} gap-8`}>

          <div className={isGrowthTeam ? 'lg:col-span-2' : ''}>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              {isGrowthTeam ? 'All Projects' : 'Your Projects'}
            </h2>
            {projects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 px-6 bg-white rounded-lg shadow-md border">
                <h3 className="text-xl font-semibold text-gray-800">No Projects Yet</h3>
                <p className="text-gray-500 mt-2">
                  {isGrowthTeam ? 'Click "Create New Project" to get started.' : 'You have not been assigned to any projects yet.'}
                </p>
              </div>
            )}
          </div>

          {isGrowthTeam && (
            <div className="lg:col-span-1">
              <div className="border-t-2 border-gray-200 lg:border-t-0 lg:border-l-2 lg:pl-8 lg:ml-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Admin Panel</h2>
                <div className="space-y-6">
                  <Link href="/dashboard/admin/manage-users" className="block p-6 bg-white rounded-lg shadow-md border hover:border-blue-500 transition-colors">
                      <div className="flex justify-between items-center">
                          <h3 className="font-bold text-lg text-gray-800">Manage Users</h3>
                          <FaUsers className="text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500 mt-2">Promote consultants and manage user roles.</p>
                  </Link>
                  <Link href="/dashboard/admin/user-approvals" className="block p-6 bg-white rounded-lg shadow-md border hover:border-blue-500 transition-colors">
                      <div className="flex justify-between items-center">
                          <h3 className="font-bold text-lg text-gray-800">Sign-up Approvals</h3>
                          <p className="text-3xl font-bold text-blue-600">{adminData.pendingUserCount}</p>
                      </div>
                      <p className="text-sm text-gray-500">pending sign-ups</p>
                  </Link>
                  <Link href="/dashboard/admin/hour-changes" className="block p-6 bg-white rounded-lg shadow-md border hover:border-blue-500 transition-colors">
                      <div className="flex justify-between items-center">
                          <h3 className="font-bold text-lg text-gray-800">Hour Requests</h3>
                           <p className="text-3xl font-bold text-blue-600">{adminData.pendingHoursCount}</p>
                      </div>
                      <p className="text-sm text-gray-500">pending hour changes</p>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}