'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';

type ProjectWithAllocations = {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date | null;
  phases: Array<{
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    allocations: Array<{
      id: string;
      totalHours: number;
      consultant: {
        id: string;
        name: string | null;
        email: string | null;
      };
      weeklyAllocations: Array<{
        proposedHours?: number | null;
        approvedHours?: number | null;
      }>;
    }>;
  }>;
  consultants: Array<{
    user: {
      id: string;
      name: string | null;
      email: string | null;
    };
  }>;
};

interface TeamAllocationsClientProps {
  projects: ProjectWithAllocations[];
}

function getProjectStatus(project: ProjectWithAllocations) {
  const now = new Date();
  const start = new Date(project.startDate);
  const end = project.endDate ? new Date(project.endDate) : null;

  if (end && now > end) return 'past';
  if (now >= start && (!end || now <= end)) return 'current';
  if (now < start) return 'upcoming';
  return 'current'; // fallback
}

function getStatusColor(status: string) {
  switch (status) {
    case 'current': return 'bg-green-100 text-green-800 border-green-200';
    case 'upcoming': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'past': return 'bg-gray-100 text-gray-600 border-gray-200';
    default: return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'current': return 'Active';
    case 'upcoming': return 'Upcoming';
    case 'past': return 'Completed';
    default: return 'Unknown';
  }
}

export default function TeamAllocationsClient({ projects }: TeamAllocationsClientProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  // Organize projects by status
  const organizedProjects = {
    current: projects.filter(p => getProjectStatus(p) === 'current'),
    upcoming: projects.filter(p => getProjectStatus(p) === 'upcoming'),
    past: projects.filter(p => getProjectStatus(p) === 'past'),
  };

  if (projects.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Team Allocations</h1>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <p className="text-yellow-800">
              You don't have any projects assigned as a Product Manager yet.
            </p>
            <p className="text-yellow-600 text-sm mt-2">
              Contact your Growth Team to be assigned as a Product Manager for projects.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const renderProjectSection = (title: string, projectList: ProjectWithAllocations[], emptyMessage: string) => {
    if (projectList.length === 0) return null;

    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          {title}
          <span className="ml-2 bg-gray-100 text-gray-600 text-sm px-2 py-1 rounded-full">
            {projectList.length}
          </span>
        </h2>
        <div className="space-y-3">
          {projectList.map((project) => {
            const isExpanded = expandedProjects.has(project.id);
            const status = getProjectStatus(project);

            return (
              <div key={project.id} className="bg-white shadow-sm rounded-lg border border-gray-200">
                <button
                  onClick={() => toggleProject(project.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronRightIcon className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-medium text-gray-900">{project.title}</h3>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(status)}`}>
                          {getStatusLabel(status)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {project.phases.length} phases • {project.consultants.length} team members
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">
                    {new Date(project.startDate).toLocaleDateString()} - {' '}
                    {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Ongoing'}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-6 pb-6 border-t border-gray-100">
                    {project.phases.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No phases created yet.</p>
                        <a
                          href={`/dashboard/projects/${project.id}`}
                          className="text-blue-600 hover:text-blue-500 text-sm"
                        >
                          Go to project to create phases →
                        </a>
                      </div>
                    ) : (
                      <div className="space-y-6 mt-6">
                        {project.phases.map((phase) => (
                          <div key={phase.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h4 className="font-medium text-gray-900">{phase.name}</h4>
                                <p className="text-sm text-gray-500">
                                  {new Date(phase.startDate).toLocaleDateString()} - {new Date(phase.endDate).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-sm text-gray-500">
                                {phase.allocations.length} allocations
                              </div>
                            </div>

                            {phase.allocations.length === 0 ? (
                              <div className="bg-white rounded p-4 text-center">
                                <p className="text-gray-500 text-sm">No team members allocated to this phase yet.</p>
                              </div>
                            ) : (
                              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                {phase.allocations.map((allocation) => {
                                  const distributedHours = allocation.weeklyAllocations.reduce(
                                    (sum, weekly) => sum + (weekly.approvedHours || weekly.proposedHours || 0), 
                                    0
                                  );
                                  const remainingHours = allocation.totalHours - distributedHours;

                                  return (
                                    <div key={allocation.id} className="bg-white border border-gray-200 rounded p-4">
                                      <div className="flex items-center mb-3">
                                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                                          {allocation.consultant.name?.charAt(0) || allocation.consultant.email?.charAt(0) || 'U'}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="font-medium text-gray-900 text-sm truncate">
                                            {allocation.consultant.name || allocation.consultant.email}
                                          </p>
                                        </div>
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <div className="flex justify-between text-xs">
                                          <span className="text-gray-600">Total Hours:</span>
                                          <span className="font-medium">{allocation.totalHours}h</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                          <span className="text-gray-600">Distributed:</span>
                                          <span className="font-medium">{distributedHours}h</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                          <span className="text-gray-600">Remaining:</span>
                                          <span className={`font-medium ${remainingHours > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                            {remainingHours}h
                                          </span>
                                        </div>

                                        {remainingHours > 0 && (
                                          <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                                            ⚠️ Needs weekly planning
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <a
                                href={`/dashboard/phase-planning?projectId=${project.id}&phaseId=${phase.id}`}
                                className="text-blue-600 hover:text-blue-500 text-sm font-medium inline-flex items-center"
                              >
                                Manage Phase Allocations →
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Team Allocations</h1>
        <p className="text-gray-600 mt-2">
          Manage resource allocations for your projects and teams. Click on projects to expand details.
        </p>
      </div>

      {/* Current Projects */}
      {renderProjectSection('Current Projects', organizedProjects.current, 'No active projects')}

      {/* Upcoming Projects */}
      {renderProjectSection('Upcoming Projects', organizedProjects.upcoming, 'No upcoming projects')}

      {/* Past Projects */}
      {renderProjectSection('Completed Projects', organizedProjects.past, 'No completed projects')}

      {/* Empty state if no projects in any category */}
      {projects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No projects found.</p>
        </div>
      )}
    </div>
  );
}