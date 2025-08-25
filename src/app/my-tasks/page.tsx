import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole, TaskStatus } from '@prisma/client';
import TaskItem from '@/app/components/TaskItem';
import DashboardLayout from '@/app/components/DashboardLayout';

const prisma = new PrismaClient();

async function getConsultantTasks(userId: string) {
  return prisma.task.findMany({
    where: { 
      assigneeId: userId 
    },
    include: {
      assignee: true,
      project: {
        select: {
          id: true,
          title: true
        }
      },
      sprint: {
        select: {
          id: true,
          sprintNumber: true,
          startDate: true,
          endDate: true
        }
      }
    },
    orderBy: [
      { status: 'asc' }, // TODO first, then IN_PROGRESS, then DONE
      { createdAt: 'desc' }
    ],
  });
}

export default async function MyTasksPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/login');
  }

  // Only consultants should access this page
  if (session.user.role !== UserRole.CONSULTANT) {
    redirect('/dashboard');
  }

  const tasks = await getConsultantTasks(session.user.id);

  const todoTasks = tasks.filter(task => task.status === TaskStatus.TODO);
  const inProgressTasks = tasks.filter(task => task.status === TaskStatus.IN_PROGRESS);
  const doneTasks = tasks.filter(task => task.status === TaskStatus.DONE);

  const TaskSection = ({ 
    title, 
    tasks: sectionTasks, 
    emptyMessage,
    bgColor = 'bg-white'
  }: { 
    title: string; 
    tasks: typeof tasks; 
    emptyMessage: string;
    bgColor?: string;
  }) => (
    <div className={`${bgColor} rounded-lg shadow-md border border-gray-200 p-6`}>
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        {title} ({sectionTasks.length})
      </h2>
      {sectionTasks.length > 0 ? (
        <div className="space-y-3">
          {sectionTasks.map((task) => (
            <TaskItem 
              key={task.id}
              task={task} 
              currentUserRole={session.user.role as UserRole}
              currentUserId={session.user.id}
              showProject={true} // This is the key change - shows project info
            />
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">{emptyMessage}</p>
      )}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">My Tasks</h1>
          <p className="text-lg text-gray-600">
            Manage all your assigned tasks across projects.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <TaskSection
            title="To Do"
            tasks={todoTasks}
            emptyMessage="No pending tasks"
            bgColor="bg-yellow-50"
          />
          
          <TaskSection
            title="In Progress"
            tasks={inProgressTasks}
            emptyMessage="No tasks in progress"
            bgColor="bg-blue-50"
          />
          
          <TaskSection
            title="Completed"
            tasks={doneTasks}
            emptyMessage="No completed tasks"
            bgColor="bg-green-50"
          />
        </div>

        {tasks.length === 0 && (
          <div className="text-center py-12 px-6 bg-white rounded-lg shadow-md border">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Tasks Assigned</h3>
            <p className="text-gray-500">
              You don't have any tasks assigned yet. Check your projects or create new tasks.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}