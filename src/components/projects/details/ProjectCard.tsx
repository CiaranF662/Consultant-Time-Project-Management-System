import Link from 'next/link';
import type { Project, Phase, Sprint, ConsultantsOnProjects, PhaseAllocation } from '@prisma/client';
import { FaUsers, FaCalendarAlt, FaClock, FaChartBar, FaStar } from 'react-icons/fa';
import { generateColorFromString } from '@/lib/colors';

type ProjectWithDetails = Project & {
  sprints: Sprint[];
  phases: (Phase & {
    allocations: PhaseAllocation[];
  })[];
  consultants: (ConsultantsOnProjects & { 
    user: { 
      id: string; 
      name: string | null;
      email: string | null;
    } 
  })[];
};

interface ProjectCardProps {
  project: ProjectWithDetails;
  currentUserId: string;
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

export default function ProjectCard({ project, currentUserId }: ProjectCardProps) {
  // Check if current user is the Product Manager
  const isProductManager = project.productManagerId === currentUserId;
  // Calculate total allocated hours (only approved allocations)
  const totalAllocated = project.phases.reduce((sum, phase) => {
    return sum + phase.allocations.reduce((phaseSum, allocation) => {
      // Only count approved allocations towards budget utilization
      if (allocation.approvalStatus === 'APPROVED') {
        return phaseSum + allocation.totalHours;
      }
      return phaseSum;
    }, 0);
  }, 0);

  // Calculate budget utilization
  const utilization = project.budgetedHours > 0 
    ? Math.round((totalAllocated / project.budgetedHours) * 100)
    : 0;

  // Get utilization color
  const getUtilizationColor = (percent: number) => {
    if (percent >= 100) return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
    if (percent >= 80) return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30';
    if (percent >= 60) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
    return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
  };

  return (
    <Link href={`/dashboard/projects/${project.id}`}>
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 flex flex-col h-full cursor-pointer">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="text-xl font-bold text-foreground truncate flex-1">{project.title}</h3>
          {isProductManager && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-semibold rounded-full border border-purple-200 dark:border-purple-700 whitespace-nowrap" title="You are the Product Manager">
              <FaStar className="w-3 h-3" />
              PM
            </span>
          )}
        </div>

        {/* Budget Progress Bar */}
        <div className="mb-4">
            <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-card-foreground">Budget Allocation</span>
                <span className={`text-sm font-bold px-2 py-0.5 rounded ${getUtilizationColor(utilization)}`}>
                  {utilization}%
                </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${
                    utilization >= 100 ? 'bg-red-500' :
                    utilization >= 80 ? 'bg-orange-500' :
                    utilization >= 60 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(utilization, 100)}%` }}
                />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-muted-foreground">
                {totalAllocated}h approved
              </span>
              <span className="text-xs text-muted-foreground">
                {project.budgetedHours}h budget
              </span>
            </div>
        </div>

        {/* Project Details */}
        <div className="mt-auto space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center">
                <FaChartBar className="mr-2 text-muted-foreground flex-shrink-0" />
                <span>{project.phases.length} phases • {project.sprints.length} sprints</span>
            </div>
            <div className="flex items-center">
                <FaUsers className="mr-2 text-muted-foreground flex-shrink-0" />
                <div className="flex flex-wrap gap-1 items-center">
                    <span className="mr-1">Team:</span>
                    {project.consultants.length > 0 ? (
                        project.consultants.slice(0, 3).map(c => (
                            <span 
                              key={c.userId} 
                              className={`rounded-md px-2 py-0.5 text-xs font-semibold ${generateColorFromString(c.userId)}`}
                              title={c.user.name || c.user.email || 'Unknown'}
                            >
                                {(c.user.name || c.user.email || '?').split(' ')[0]}
                            </span>
                        ))
                    ) : (
                        <span className="text-muted-foreground">No team assigned</span>
                    )}
                    {project.consultants.length > 3 && (
                      <span className="text-xs text-muted-foreground">
                        +{project.consultants.length - 3} more
                      </span>
                    )}
                </div>
            </div>
            <div className="flex items-center">
                <FaCalendarAlt className="mr-2 text-muted-foreground flex-shrink-0" />
                <span>{formatDate(project.startDate)} - {formatDate(project.endDate)}</span>
            </div>
            <div className="flex items-center">
                <FaClock className="mr-2 text-muted-foreground flex-shrink-0" />
                <span><strong>Duration:</strong> {getProjectDurationInWeeks(project.startDate, project.endDate)}</span>
            </div>
        </div>
      </div>
    </Link>
  );
}