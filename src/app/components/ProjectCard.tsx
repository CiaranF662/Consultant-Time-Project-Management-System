import Link from 'next/link';
import { FaTasks, FaClipboardList, FaCalendarAlt } from 'react-icons/fa';
import type { Project, Task } from '@prisma/client';

// Define a type for the project data this card expects
type ProjectWithTasks = Project & {
  tasks: Task[];
};

interface ProjectCardProps {
  project: ProjectWithTasks;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const totalTasks = project.tasks.length;
  const completedTasks = project.tasks.filter(
    (task) => task.status === 'DONE'
  ).length;

  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const isOverdue = project.endDate ? new Date(project.endDate) < new Date() : false;

  return (
    <Link href={`/dashboard/projects/${project.id}`}>
      <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 flex flex-col h-full cursor-pointer">
        {/* Card Header */}
        <h3 className="text-xl font-bold text-gray-800 truncate mb-2">{project.title}</h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2 h-10">
          {project.description || 'No description provided.'}
        </p>

        {/* Progress Bar */}
        <div className="space-y-4 mb-6">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Task Progress</span>
              <span className="text-sm font-medium text-gray-700">{Math.round(progressPercentage)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="mt-auto space-y-3 pt-4 border-t border-gray-200">
          <div className="flex items-center text-sm text-gray-600">
            <FaTasks className="mr-2 text-gray-400" />
            <span>Tasks: {completedTasks} / {totalTasks} completed</span>
          </div>
          <div className={`flex items-center text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
            <FaCalendarAlt className="mr-2 text-gray-400" />
            <span>
              {project.endDate
                ? `Due: ${new Date(project.endDate).toLocaleDateString()}`
                : 'No due date set'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}