'use client';

import Link from 'next/link';
import { FaProjectDiagram, FaChevronDown, FaChevronUp, FaEye, FaCogs, FaFlag } from 'react-icons/fa';
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

interface ProjectHealthViewProps {
  projects: Project[];
  showAllProjects: boolean;
  setShowAllProjects: (show: boolean) => void;
  stats: {
    projectsManaged: number;
    projectsAsConsultant: number;
    overallProjectHealth: number;
  };
}

export default function ProjectHealthView({
  projects,
  showAllProjects,
  setShowAllProjects,
  stats
}: ProjectHealthViewProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'PLANNING':
        return 'bg-yellow-100 text-yellow-800';
      case 'ON_HOLD':
        return 'bg-red-100 text-red-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProjectProgress = (project: Project) => {
    const totalPhases = project._count.phases;
    const completedPhases = project.phases.filter(p => p.completionPercentage >= 100).length;
    return totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;
  };

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
          <FaProjectDiagram className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects to Manage</h3>
        <p className="text-gray-600 mb-2">You haven't been assigned as a Product Manager on any projects yet.</p>
        <p className="text-sm text-gray-500">Contact the Growth Team to get assigned as a Product Manager on projects.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Summary Stats */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FaProjectDiagram className="w-5 h-5 text-gray-600" />
          Portfolio Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-1">{stats.projectsManaged}</div>
            <div className="text-sm font-medium text-gray-700">Projects Managing</div>
            <div className="text-xs text-gray-500 mt-1">You are the Product Manager</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-1">{stats.projectsAsConsultant}</div>
            <div className="text-sm font-medium text-gray-700">Projects Contributing</div>
            <div className="text-xs text-gray-500 mt-1">You are a team member</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-1">{stats.overallProjectHealth}%</div>
            <div className="text-sm font-medium text-gray-700">Overall Health Score</div>
            <div className="text-xs text-gray-500 mt-1">Avg completion across projects</div>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            {showAllProjects ? 'Detailed Project View' : 'Quick Project Overview'}
          </h3>
          <p className="text-sm text-gray-600">
            {showAllProjects
              ? 'Complete project details with metrics and action buttons'
              : 'Compact view showing key project status and progress'
            }
          </p>
        </div>
        <button
          onClick={() => setShowAllProjects(!showAllProjects)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
        >
          {showAllProjects ? 'Switch to Compact' : 'Show Full Details'}
          {showAllProjects ? <FaChevronUp className="w-4 h-4" /> : <FaChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Project Cards - Compact or Detailed */}
      {showAllProjects ? (
        <div className="space-y-4">
          {projects.map((project) => (
            <div key={project.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all bg-gradient-to-r from-white to-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{project.title}</h3>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status || 'PLANNING')}`}>
                      {(project.status || 'PLANNING').replace('_', ' ')}
                    </span>
                    {getProjectProgress(project) >= 75 && (
                      <div className="flex items-center">
                        <FaFlag className="w-3 h-3 text-green-500 mr-1" />
                        <span className="text-xs text-green-600">On Track</span>
                      </div>
                    )}
                  </div>

                  {/* Project Metrics Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-gray-800">{project.consultants.length}</div>
                      <div className="text-xs text-gray-600">Team Members</div>
                      <div className="text-xs text-gray-500 mt-1">Including PM</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-gray-800">{project._count.phases}</div>
                      <div className="text-xs text-gray-600">Total Phases</div>
                      <div className="text-xs text-gray-500 mt-1">Project stages</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-gray-800">{formatHours(project.totalBudgetedHours)}</div>
                      <div className="text-xs text-gray-600">Total Budget</div>
                      <div className="text-xs text-gray-500 mt-1">Allocated hours</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-gray-800">{getProjectProgress(project)}%</div>
                      <div className="text-xs text-gray-600">Completion</div>
                      <div className="text-xs text-gray-500 mt-1">Phases done</div>
                    </div>
                  </div>

                  {/* Progress Details */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600">Project Progress</span>
                      <span className="text-gray-800 font-medium">
                        {project.phases.filter(p => p.completionPercentage >= 100).length} of {project._count.phases} phases completed
                      </span>
                    </div>

                    {/* Enhanced Progress Bar */}
                    <div className="mb-3">
                      <div className="w-full bg-gray-200 rounded-full h-3 relative overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all duration-500 relative"
                          style={{ width: `${getProjectProgress(project)}%` }}
                        >
                          <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Link
                    href={`/dashboard/projects/${project.id}`}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
                    title="View Project Details"
                  >
                    <FaEye className="w-4 h-4" />
                  </Link>
                  <Link
                    href={`/dashboard/phase-planning?project=${project.id}`}
                    className="p-2 text-gray-400 hover:text-green-600 transition-colors rounded-lg hover:bg-green-50"
                    title="Manage Phases"
                  >
                    <FaCogs className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.slice(0, 6).map((project) => (
            <div key={project.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer hover:border-blue-300" onClick={() => window.location.href = `/dashboard/projects/${project.id}`}>
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 truncate mb-1">{project.title}</h4>
                  <p className="text-xs text-gray-500">{project.consultants.length} team members • {project._count.phases} phases</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status || 'PLANNING')}`}>
                    {(project.status || 'PLANNING').replace('_', ' ')}
                  </span>
                  {getProjectProgress(project) >= 75 && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <FaFlag className="w-3 h-3" /> On Track
                    </span>
                  )}
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="text-center bg-gray-50 rounded-md p-2">
                  <div className="text-sm font-bold text-gray-800">{formatHours(project.totalBudgetedHours)}</div>
                  <div className="text-xs text-gray-600">Budget</div>
                </div>
                <div className="text-center bg-gray-50 rounded-md p-2">
                  <div className="text-sm font-bold text-gray-800">{getProjectProgress(project)}%</div>
                  <div className="text-xs text-gray-600">Complete</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Progress</span>
                  <span>{project.phases.filter(p => p.completionPercentage >= 100).length}/{project._count.phases} phases</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      getProjectProgress(project) >= 75 ? 'bg-green-500' :
                      getProjectProgress(project) >= 50 ? 'bg-yellow-500' :
                      getProjectProgress(project) >= 25 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${getProjectProgress(project)}%` }}
                  />
                </div>
              </div>

              {/* Click hint */}
              <div className="text-xs text-gray-400 mt-2 text-center">Click to view details</div>
            </div>
          ))}

          {projects.length > 6 && (
            <div className="md:col-span-2 lg:col-span-3 text-center py-4 text-sm text-gray-600">
              + {projects.length - 6} more projects • Switch to detailed view to see all
            </div>
          )}
        </div>
      )}
    </div>
  );
}