'use client';

import Link from 'next/link';
import { FaCheckCircle, FaClock } from 'react-icons/fa';
import { formatHours } from '@/lib/dates';

interface Project {
  id: string;
  title: string;
  description?: string;
  status?: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED';
  budgetedHours: number;
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

  const getBudgetUtilization = (project: Project) => {
    const totalAllocated = project.phases.reduce((sum, phase) => sum + phase.totalAllocatedHours, 0);
    const utilization = project.budgetedHours > 0
      ? Math.round((totalAllocated / project.budgetedHours) * 100)
      : 0;
    return { totalAllocated, utilization, isOverBudget: totalAllocated > project.budgetedHours };
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
              <p className="text-sm text-green-700 dark:text-green-300">{stats.projectsManaged} projects under your management</p>
            </div>
          </div>
        </div>

        <div className="p-4 border border-gray-200 dark:border-red-800 rounded-lg bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500 dark:bg-red-600 rounded-lg">
              <FaClock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-100">At-Risk Projects</h3>
              <p className="text-sm text-red-700 dark:text-red-300">{stats.crossProjectRisks} projects need attention</p>
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
                projects
                  .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                  .map((project) => {
                  const progress = getProjectProgress(project);
                  const budgetInfo = getBudgetUtilization(project);

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
                        <div className={`text-sm font-medium ${
                          budgetInfo.isOverBudget ? 'text-red-600 dark:text-red-400' :
                          budgetInfo.utilization >= 90 ? 'text-orange-600 dark:text-orange-400' :
                          'text-foreground'
                        }`}>
                          {formatHours(budgetInfo.totalAllocated)} / {formatHours(project.budgetedHours)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {budgetInfo.utilization}% utilized
                        </div>
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

      {/* Bottom Insights - Single Row */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Upcoming Deadlines</h3>

        {stats.upcomingDeadlines.length > 0 ? (
          <div className="space-y-2">
            {stats.upcomingDeadlines.slice(0, 5).map((deadline, index) => (
              <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${
                deadline.daysLeft <= 7 ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' :
                deadline.daysLeft <= 14 ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800' :
                'bg-gray-50 dark:bg-gray-800'
              }`}>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">
                    {deadline.type === 'project' ? '📋' : '📅'} {deadline.name}
                  </div>
                  {deadline.type === 'phase' && (
                    <div className="text-xs text-muted-foreground">in {deadline.projectName}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {deadline.daysLeft <= 7 && (
                    <span className="text-xs font-medium text-red-600 dark:text-red-400 px-2 py-1 bg-red-100 dark:bg-red-900/40 rounded">
                      URGENT
                    </span>
                  )}
                  <div className={`text-sm font-semibold ${
                    deadline.daysLeft <= 7 ? 'text-red-600 dark:text-red-400' :
                    deadline.daysLeft <= 14 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {deadline.daysLeft}d
                  </div>
                </div>
              </div>
            ))}
            {stats.upcomingDeadlines.length > 5 && (
              <div className="text-xs text-muted-foreground text-center pt-2">
                + {stats.upcomingDeadlines.length - 5} more deadlines in the next 30 days
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📅</div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">No upcoming deadlines</div>
            <div className="text-xs text-muted-foreground mt-1">No project or phase deadlines in the next 30 days</div>
          </div>
        )}
      </div>
    </div>
  );
}