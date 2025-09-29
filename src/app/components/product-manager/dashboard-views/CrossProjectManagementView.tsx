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
        <div className="p-4 border border-gray-200 rounded-lg bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500 rounded-lg">
              <FaCheckCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-green-900">Active Projects</h3>
              <p className="text-sm text-green-700">{stats.projectsManaged} projects under management</p>
            </div>
          </div>
        </div>

        <div className="p-4 border border-gray-200 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500 rounded-lg">
              <FaClock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-orange-900">Pending Approvals</h3>
              <p className="text-sm text-orange-700">{stats.pendingDecisions} allocations awaiting approval</p>
            </div>
          </div>
        </div>
      </div>

      {/* Project Management Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Your Managed Projects</h3>
          <p className="text-sm text-gray-600">Quick access to project management functions</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No projects assigned as Product Manager
                  </td>
                </tr>
              ) : (
                projects.map((project) => {
                  const progress = getProjectProgress(project);

                  return (
                    <tr key={project.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{project.title}</div>
                          <div className="text-sm text-gray-500">{project._count.phases} phases</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{project.consultants.length} members</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{progress}%</div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                              <div
                                className={`h-2 rounded-full ${
                                  progress >= 75 ? 'bg-green-500' :
                                  progress >= 50 ? 'bg-yellow-500' :
                                  progress >= 25 ? 'bg-orange-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{formatHours(project.totalBudgetedHours)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/projects/${project.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
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
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Upcoming Deadlines</h3>
          <div className="space-y-4">
            {stats.upcomingDeadlines.slice(0, 3).map((deadline, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {deadline.type === 'project' ? '📋' : '📅'} {deadline.name}
                  </div>
                  {deadline.type === 'phase' && (
                    <div className="text-xs text-gray-500">in {deadline.projectName}</div>
                  )}
                </div>
                <div className={`text-sm font-medium ${
                  deadline.daysLeft <= 7 ? 'text-red-600' :
                  deadline.daysLeft <= 14 ? 'text-orange-600' : 'text-gray-600'
                }`}>
                  {deadline.daysLeft} days
                </div>
              </div>
            ))}
            {stats.upcomingDeadlines.length === 0 && (
              <div className="text-sm text-gray-500 text-center py-4">
                No upcoming deadlines
              </div>
            )}
          </div>
        </div>

        {/* Portfolio Health Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Portfolio Health</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Overall Health</span>
              <span className="text-lg font-bold text-gray-900">{stats.overallProjectHealth}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${
                  stats.overallProjectHealth >= 80 ? 'bg-green-500' :
                  stats.overallProjectHealth >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${stats.overallProjectHealth}%` }}
              />
            </div>
            <p className="text-sm text-gray-600">{stats.portfolioHealthDescription}</p>

            {stats.crossProjectRisks > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-sm font-medium text-red-800">
                  ⚠️ {stats.crossProjectRisks} projects need attention
                </div>
                <div className="text-xs text-red-600 mt-1">
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