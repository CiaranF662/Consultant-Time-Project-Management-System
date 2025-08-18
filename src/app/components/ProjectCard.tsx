import Link from 'next/link';
import type { Project, Task, Sprint, ConsultantsOnProjects, User } from '@prisma/client';
import { FaUsers, FaTasks, FaCalendarAlt, FaClock } from 'react-icons/fa';

type ProjectWithDetails = Project & {
  sprints: Sprint[];
  tasks: Task[];
  consultants: (ConsultantsOnProjects & { user: { name: string | null } })[];
};

interface ProjectCardProps {
  project: ProjectWithDetails;
}

// Helper to format dates
function formatDate(date: Date | null) {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date));
}

// Helper to calculate project duration in weeks
function getProjectDurationInWeeks(start: Date, end: Date | null): string {
    if (!end) return 'Ongoing';
    const durationInMs = new Date(end).getTime() - new Date(start).getTime();
    const durationInWeeks = Math.ceil(durationInMs / (1000 * 60 * 60 * 24 * 7));
    return `${durationInWeeks} weeks`;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const today = new Date();
  
  // 1. Sprint Progress Calculation (Time-based)
  const totalSprints = project.sprints.length;
  const completedSprints = project.sprints.filter(sprint => new Date(sprint.endDate) < today).length;
  const sprintProgress = totalSprints > 0 ? (completedSprints / totalSprints) * 100 : 0;

  // 2. Task Count
  const totalTasks = project.tasks.length;
  const completedTasks = project.tasks.filter(task => task.status === 'DONE').length;
  
  // 3. Consultant Names
  const consultantNames = project.consultants.map(c => c.user.name).join(', ');

  return (
    <Link href={`/dashboard/projects/${project.id}`}>
      <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 flex flex-col h-full cursor-pointer">
        <h3 className="text-xl font-bold text-gray-800 truncate mb-2">{project.title}</h3>
        
        {/* Sprint Progress Bar */}
        <div className="mb-4">
            <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Sprint Progress</span>
                <span className="text-sm font-medium text-gray-700">{Math.round(sprintProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${sprintProgress}%` }}></div>
            </div>
        </div>
        
        {/* Project Details */}
        <div className="mt-auto space-y-3 pt-4 border-t border-gray-200 text-sm text-gray-600">
            <div className="flex items-center">
                <FaTasks className="mr-2 text-gray-400 flex-shrink-0" />
                <span>{completedTasks} of {totalTasks} tasks complete</span>
            </div>
            <div className="flex items-center">
                <FaUsers className="mr-2 text-gray-400 flex-shrink-0" />
                <span className="truncate"><strong>Consultants:</strong> {consultantNames || 'N/A'}</span>
            </div>
            <div className="flex items-center">
                <FaCalendarAlt className="mr-2 text-gray-400 flex-shrink-0" />
                <span>{formatDate(project.startDate)} - {formatDate(project.endDate)}</span>
            </div>
             <div className="flex items-center">
                <FaClock className="mr-2 text-gray-400 flex-shrink-0" />
                <span><strong>Duration:</strong> {getProjectDurationInWeeks(project.startDate, project.endDate)}</span>
            </div>
        </div>
      </div>
    </Link>
  );
}