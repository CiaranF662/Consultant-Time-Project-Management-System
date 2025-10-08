'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FaProjectDiagram, FaChevronDown, FaChevronUp, FaEye, FaCogs, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import { formatHours } from '@/lib/dates';

interface Project {
  id: string;
  title: string;
  description?: string;
  status?: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED';
  budgetedHours: number;
  startDate: Date;
  endDate: Date | null;
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

interface BudgetOverviewViewProps {
  projects: Project[];
  stats: {
    totalBudgeted: number;
    totalAllocated: number;
    budgetUtilization: number;
    overBudgetProjects: number;
    underUtilizedProjects: number;
  };
}

export default function BudgetOverviewView({
  projects,
  stats
}: BudgetOverviewViewProps) {
  const [showAllProjects, setShowAllProjects] = useState(false);

  // Filter out completed projects (projects with endDate in the past)
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison

  const activeProjects = projects.filter(project => {
    if (!project.endDate) return true; // Keep projects with no end date
    const endDate = new Date(project.endDate);
    endDate.setHours(0, 0, 0, 0);
    return endDate >= today; // Keep current and future projects
  });

  // Calculate project status dynamically based on dates
  const getProjectStatus = (project: Project): 'PLANNING' | 'ACTIVE' | 'COMPLETED' => {
    const projectStart = new Date(project.startDate);
    const projectEnd = project.endDate ? new Date(project.endDate) : null;

    projectStart.setHours(0, 0, 0, 0);
    if (projectEnd) projectEnd.setHours(0, 0, 0, 0);

    // If project has ended
    if (projectEnd && projectEnd < today) {
      return 'COMPLETED';
    }

    // If project hasn't started yet
    if (projectStart > today) {
      return 'PLANNING';
    }

    // Project is currently active
    return 'ACTIVE';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'PLANNING':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'ON_HOLD':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      case 'COMPLETED':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-foreground';
    }
  };

  const getBudgetStatus = (project: Project) => {
    const totalAllocated = project.phases.reduce((sum, phase) => sum + phase.totalAllocatedHours, 0);
    const utilization = project.budgetedHours > 0
      ? (totalAllocated / project.budgetedHours) * 100
      : 0;
    const remaining = project.budgetedHours - totalAllocated;

    return {
      totalAllocated,
      utilization,
      remaining,
      isOverBudget: totalAllocated > project.budgetedHours,
      isNearBudget: utilization >= 90 && utilization <= 100,
      isUnderUtilized: utilization < 50
    };
  };

  const getBudgetColor = (utilization: number, isOverBudget: boolean) => {
    if (isOverBudget) return 'text-red-600 dark:text-red-400';
    if (utilization >= 90) return 'text-orange-600 dark:text-orange-400';
    if (utilization >= 70) return 'text-green-600 dark:text-green-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  const getBudgetBgColor = (utilization: number, isOverBudget: boolean) => {
    if (isOverBudget) return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700';
    if (utilization >= 90) return 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700';
    if (utilization >= 70) return 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700';
    return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700';
  };

  if (activeProjects.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
          <FaProjectDiagram className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">No Active Projects</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-2">You have no current or future projects to manage.</p>
        <p className="text-sm text-muted-foreground">All your projects have been completed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Budget Summary */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <FaProjectDiagram className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          Portfolio Budget Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">{formatHours(stats.totalBudgeted)}</div>
            <div className="text-sm font-medium text-card-foreground">Total Budgeted</div>
            <div className="text-xs text-muted-foreground mt-1">Across all projects</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">{formatHours(stats.totalAllocated)}</div>
            <div className="text-sm font-medium text-card-foreground">Total Allocated</div>
            <div className="text-xs text-muted-foreground mt-1">To consultants</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">{stats.budgetUtilization}%</div>
            <div className="text-sm font-medium text-card-foreground">Budget Utilization</div>
            <div className="text-xs text-muted-foreground mt-1">Overall allocation rate</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-1">{stats.overBudgetProjects}</div>
            <div className="text-sm font-medium text-card-foreground">Over Budget</div>
            <div className="text-xs text-muted-foreground mt-1">Projects exceeding budget</div>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {showAllProjects ? 'Detailed Budget Breakdown' : 'Budget Summary by Project'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {showAllProjects
              ? 'Complete budget details with allocation metrics'
              : 'Compact view showing key budget indicators'
            }
          </p>
        </div>
        <button
          onClick={() => setShowAllProjects(!showAllProjects)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-200 dark:border-blue-800"
        >
          {showAllProjects ? 'Switch to Compact' : 'Show Full Details'}
          {showAllProjects ? <FaChevronUp className="w-4 h-4" /> : <FaChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Project Budget Cards - Compact or Detailed */}
      {showAllProjects ? (
        <div className="space-y-4">
          {activeProjects.map((project) => {
            const budgetStatus = getBudgetStatus(project);
            return (
              <div key={project.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-all bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-foreground truncate">{project.title}</h3>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(getProjectStatus(project))}`}>
                        {getProjectStatus(project)}
                      </span>
                      {budgetStatus.isOverBudget && (
                        <div className="flex items-center">
                          <FaExclamationTriangle className="w-3 h-3 text-red-500 dark:text-red-400 mr-1" />
                          <span className="text-xs text-red-600 dark:text-red-400 font-medium">Over Budget</span>
                        </div>
                      )}
                      {budgetStatus.isNearBudget && !budgetStatus.isOverBudget && (
                        <div className="flex items-center">
                          <FaExclamationTriangle className="w-3 h-3 text-orange-500 dark:text-orange-400 mr-1" />
                          <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">Near Budget</span>
                        </div>
                      )}
                      {!budgetStatus.isOverBudget && !budgetStatus.isNearBudget && budgetStatus.utilization >= 70 && (
                        <div className="flex items-center">
                          <FaCheckCircle className="w-3 h-3 text-green-500 dark:text-green-400 mr-1" />
                          <span className="text-xs text-green-600 dark:text-green-400">On Track</span>
                        </div>
                      )}
                    </div>

                    {/* Budget Metrics Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-foreground">{formatHours(project.budgetedHours)}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Budgeted</div>
                        <div className="text-xs text-muted-foreground mt-1">Total hours</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-foreground">{formatHours(budgetStatus.totalAllocated)}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Allocated</div>
                        <div className="text-xs text-muted-foreground mt-1">To consultants</div>
                      </div>
                      <div className={`rounded-lg p-3 text-center border ${getBudgetBgColor(budgetStatus.utilization, budgetStatus.isOverBudget)}`}>
                        <div className={`text-lg font-bold ${getBudgetColor(budgetStatus.utilization, budgetStatus.isOverBudget)}`}>
                          {budgetStatus.utilization.toFixed(0)}%
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Utilization</div>
                        <div className="text-xs text-muted-foreground mt-1">Budget used</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                        <div className={`text-lg font-bold ${budgetStatus.remaining < 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                          {formatHours(Math.abs(budgetStatus.remaining))}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {budgetStatus.remaining < 0 ? 'Over' : 'Remaining'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Hours {budgetStatus.remaining < 0 ? 'exceeded' : 'left'}</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-foreground">{project.consultants.length}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Team Size</div>
                        <div className="text-xs text-muted-foreground mt-1">Consultants</div>
                      </div>
                    </div>

                    {/* Budget Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600 dark:text-gray-400">Budget Allocation</span>
                        <span className="text-foreground font-medium">
                          {formatHours(budgetStatus.totalAllocated)} of {formatHours(project.budgetedHours)}
                        </span>
                      </div>

                      <div className="mb-3">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 relative overflow-hidden">
                          <div
                            className={`h-3 rounded-full transition-all duration-500 ${
                              budgetStatus.isOverBudget ? 'bg-gradient-to-r from-red-400 to-red-600 dark:from-red-500 dark:to-red-700' :
                              budgetStatus.isNearBudget ? 'bg-gradient-to-r from-orange-400 to-orange-600 dark:from-orange-500 dark:to-orange-700' :
                              budgetStatus.utilization >= 70 ? 'bg-gradient-to-r from-green-400 to-green-600 dark:from-green-500 dark:to-green-700' :
                              'bg-gradient-to-r from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700'
                            }`}
                            style={{ width: `${Math.min(budgetStatus.utilization, 100)}%` }}
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
                      className="p-2 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30"
                      title="View Project Details"
                    >
                      <FaEye className="w-4 h-4" />
                    </Link>
                    <Link
                      href={`/dashboard/phase-planning?project=${project.id}`}
                      className="p-2 text-muted-foreground hover:text-green-600 dark:hover:text-green-400 transition-colors rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30"
                      title="Manage Phases"
                    >
                      <FaCogs className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeProjects.slice(0, 6).map((project) => {
            const budgetStatus = getBudgetStatus(project);
            return (
              <div
                key={project.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer hover:border-blue-300 dark:hover:border-blue-600"
                onClick={() => window.location.href = `/dashboard/projects/${project.id}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground truncate mb-1">{project.title}</h4>
                    <p className="text-xs text-muted-foreground">{project.consultants.length} team members • {project._count.phases} phases</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(getProjectStatus(project))}`}>
                      {getProjectStatus(project)}
                    </span>
                    {budgetStatus.isOverBudget && (
                      <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                        <FaExclamationTriangle className="w-3 h-3" /> Over Budget
                      </span>
                    )}
                  </div>
                </div>

                {/* Budget Metrics */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="text-center bg-gray-50 dark:bg-gray-800 rounded-md p-2">
                    <div className="text-sm font-bold text-foreground">{formatHours(project.budgetedHours)}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Budgeted</div>
                  </div>
                  <div className="text-center bg-gray-50 dark:bg-gray-800 rounded-md p-2">
                    <div className="text-sm font-bold text-foreground">{formatHours(budgetStatus.totalAllocated)}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Allocated</div>
                  </div>
                </div>

                {/* Budget Utilization */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span>Budget Utilization</span>
                    <span className={getBudgetColor(budgetStatus.utilization, budgetStatus.isOverBudget)}>
                      {budgetStatus.utilization.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        budgetStatus.isOverBudget ? 'bg-red-500 dark:bg-red-600' :
                        budgetStatus.utilization >= 90 ? 'bg-orange-500 dark:bg-orange-600' :
                        budgetStatus.utilization >= 70 ? 'bg-green-500 dark:bg-green-600' :
                        'bg-blue-500 dark:bg-blue-600'
                      }`}
                      style={{ width: `${Math.min(budgetStatus.utilization, 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground text-center">
                    {formatHours(Math.abs(budgetStatus.remaining))} {budgetStatus.remaining < 0 ? 'over budget' : 'remaining'}
                  </div>
                </div>

                {/* Click hint */}
                <div className="text-xs text-muted-foreground mt-2 text-center">Click to view details</div>
              </div>
            );
          })}

          {activeProjects.length > 6 && (
            <div className="md:col-span-2 lg:col-span-3 text-center py-4 text-sm text-gray-600 dark:text-gray-400">
              + {activeProjects.length - 6} more projects • Switch to detailed view to see all
            </div>
          )}
        </div>
      )}
    </div>
  );
}
