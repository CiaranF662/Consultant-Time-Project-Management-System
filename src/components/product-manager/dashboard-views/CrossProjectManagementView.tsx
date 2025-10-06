'use client';

import Link from 'next/link';
import { FaCheckCircle, FaClock } from 'react-icons/fa';
import { formatHours } from '@/lib/dates';

interface Project {
  id: string;
  title: string;
  description?: string;
  status?: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED';
  totalBudgetedHours: number;
  startDate: Date;
  endDate: Date;
  consultants: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  phases: Array<{
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    totalAllocatedHours: number;
    completionPercentage: number;
  }>;
  _count: {
    phases: number;
  };
}

interface CrossProjectManagementViewProps {
  projects: Project[];
  stats: {
    projectsManaged: number;
    pendingDecisions: number;
    overallProjectHealth: number;
    portfolioHealthDescription: string;
    upcomingDeadlines: Array<{type: 'project' | 'phase', name: string, projectName: string, endDate: Date, daysLeft: number}>;
    crossProjectRisks: number;
  };
}

export default function CrossProjectManagementView({ projects, stats }: CrossProjectManagementViewProps) {
  const getProjectProgress = (project: Project) => {
    const totalPhases = project._count.phases;
    const completedPhases = project.phases.filter(p => p.completionPercentage >= 100).length;
    return totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        <div className="p-4 border border-gray-200 dark:border-green-800 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500 dark:bg-green-600 rounded-lg">
              <FaCheckCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-green-900 dark:text-green-100">Active Projects</h3>
              <p className="text-sm text-green-700 dark:text-green-300">{stats.projectsManaged} projects under management</p>
            </div>
          </div>
        </div>

        <div className="p-4 border border-gray-200 dark:border-orange-800 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500 dark:bg-orange-600 rounded-lg">
              <FaClock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-orange-900 dark:text-orange-100">Pending Approvals</h3>
              <p className="text-sm text-orange-700 dark:text-orange-300">{stats.pendingDecisions} allocations awaiting approval</p>
            </div>
          </div>
        </div>
      </div>

      {/* Project Management Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-foreground">Your Managed Projects</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Quick access to project management functions</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Team</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Progress</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Budget</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No projects assigned as Product Manager
                  </td>
                </tr>
              ) : (
                projects.map((project) => {
                  const progress = getProjectProgress(project);

                  return (
                    <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-foreground">{project.title}</div>
                          <div className="text-sm text-muted-foreground">{project._count.phases} phases</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-foreground">{project.consultants.length} members</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-foreground">{progress}%</div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                              <div
                                className={`h-2 rounded-full ${
                                  progress >= 75 ? 'bg-green-500 dark:bg-green-600' :
                                  progress >= 50 ? 'bg-yellow-500 dark:bg-yellow-600' :
                                  progress >= 25 ? 'bg-orange-500 dark:bg-orange-600' : 'bg-red-500 dark:bg-red-600'
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-foreground">{formatHours(project.totalBudgetedHours)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/projects/${project.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                          >
                            Manage
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cross-Project Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resource Allocation Overview */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Upcoming Deadlines</h3>
          <div className="space-y-4">
            {stats.upcomingDeadlines.slice(0, 3).map((deadline, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {deadline.type === 'project' ? '📋' : '📅'} {deadline.name}
                  </div>
                  {deadline.type === 'phase' && (
                    <div className="text-xs text-muted-foreground">in {deadline.projectName}</div>
                  )}
                </div>
                <div className={`text-sm font-medium ${
                  deadline.daysLeft <= 7 ? 'text-red-600 dark:text-red-400' :
                  deadline.daysLeft <= 14 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {deadline.daysLeft} days
                </div>
              </div>
            ))}
            {stats.upcomingDeadlines.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4">
                No upcoming deadlines
              </div>
            )}
          </div>
        </div>

        {/* Portfolio Health Summary */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Portfolio Health</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Overall Health</span>
              <span className="text-lg font-bold text-foreground">{stats.overallProjectHealth}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${
                  stats.overallProjectHealth >= 80 ? 'bg-green-500 dark:bg-green-600' :
                  stats.overallProjectHealth >= 60 ? 'bg-yellow-500 dark:bg-yellow-600' : 'bg-red-500 dark:bg-red-600'
                }`}
                style={{ width: `${stats.overallProjectHealth}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{stats.portfolioHealthDescription}</p>

            {stats.crossProjectRisks > 0 && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="text-sm font-medium text-red-800 dark:text-red-100">
                  ⚠️ {stats.crossProjectRisks} projects need attention
                </div>
                <div className="text-xs text-red-600 dark:text-red-300 mt-1">
                  Projects with low progress and near deadlines
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}