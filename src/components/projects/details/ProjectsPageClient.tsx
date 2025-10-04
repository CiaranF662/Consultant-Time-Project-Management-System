'use client';

import { useState } from 'react';
import { FaPlus, FaChartBar } from 'react-icons/fa';
import ProjectCard from './ProjectCard';
import CreateProjectModal from '../growth-team/CreateProjectModal';
import ProjectSearchFilter, { ProjectFilters } from '../ProjectSearchFilter';
import { categorizeProjects, filterAndSortProjects } from '@/lib/project-filters';
import type { Project, Phase, Sprint, ConsultantsOnProjects, PhaseAllocation } from '@prisma/client';

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

interface ProjectsPageClientProps {
  projects: ProjectWithDetails[];
  isGrowthTeam: boolean;
  hideHeader?: boolean;
  hideStats?: boolean;
  hideCreateButton?: boolean;
}

export default function ProjectsPageClient({
  projects,
  isGrowthTeam,
  hideHeader = false,
  hideStats = false,
  hideCreateButton = false
}: ProjectsPageClientProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState<ProjectFilters>({
    search: '',
    status: 'all',
    sortBy: 'startDate',
    sortOrder: 'desc'
  });

  // Apply filters and sorting
  const filteredProjects = filterAndSortProjects(projects, filters);

  // Categorize filtered projects
  const { current, upcoming, past } = categorizeProjects(filteredProjects);

  return (
    <div className={hideHeader ? '' : 'p-4 md:p-8'}>
      {!hideHeader && (
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-semibold text-foreground">
            {isGrowthTeam ? 'All Projects' : 'Your Projects'}
          </h1>
          {isGrowthTeam && !hideCreateButton && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 py-3 px-6 text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <FaPlus />
              Create New Project
            </button>
          )}
        </div>
      )}

      {/* Search and Filter */}
      <ProjectSearchFilter
        filters={filters}
        onFiltersChange={setFilters}
        showStatusFilter={true}
      />

      {/* Summary Statistics */}
      {!hideStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 rounded-xl shadow-sm border border-green-200 dark:border-green-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-500 dark:bg-green-600 rounded-lg">
              <FaChartBar className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">{current.length}</p>
              <p className="text-sm text-green-600 dark:text-green-400">Current Projects</p>
            </div>
          </div>
          <div className="w-full bg-green-200 dark:bg-green-800/50 rounded-full h-1.5">
            <div className="bg-green-500 dark:bg-green-400 h-1.5 rounded-full" style={{ width: `${filteredProjects.length > 0 ? (current.length / filteredProjects.length) * 100 : 0}%` }}></div>
          </div>
          <p className="text-xs text-green-700 dark:text-green-300 mt-2">
            {filteredProjects.length > 0 ? Math.round((current.length / filteredProjects.length) * 100) : 0}% of filtered projects
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 rounded-xl shadow-sm border border-blue-200 dark:border-blue-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500 dark:bg-blue-600 rounded-lg">
              <FaChartBar className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{upcoming.length}</p>
              <p className="text-sm text-blue-600 dark:text-blue-400">Upcoming Projects</p>
            </div>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-800/50 rounded-full h-1.5">
            <div className="bg-blue-500 dark:bg-blue-400 h-1.5 rounded-full" style={{ width: `${filteredProjects.length > 0 ? (upcoming.length / filteredProjects.length) * 100 : 0}%` }}></div>
          </div>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
            {filteredProjects.length > 0 ? Math.round((upcoming.length / filteredProjects.length) * 100) : 0}% of filtered projects
          </p>
        </div>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gray-500 dark:bg-gray-600 rounded-lg">
              <FaChartBar className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{past.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Past Projects</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div className="bg-gray-500 dark:bg-gray-400 h-1.5 rounded-full" style={{ width: `${filteredProjects.length > 0 ? (past.length / filteredProjects.length) * 100 : 0}%` }}></div>
          </div>
          <p className="text-xs text-gray-700 dark:text-gray-300 mt-2">
            {filteredProjects.length > 0 ? Math.round((past.length / filteredProjects.length) * 100) : 0}% of filtered projects
          </p>
        </div>
        </div>
      )}

      {/* Projects by Status */}
      {filteredProjects.length > 0 ? (
        <div className="space-y-8">
          {/* Current Projects */}
          {current.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-semibold text-foreground">Current Projects</h2>
                <span className="bg-green-100 text-green-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                  {current.length} active
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {current.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Projects */}
          {upcoming.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-semibold text-foreground">Upcoming Projects</h2>
                <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                  {upcoming.length} scheduled
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcoming.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </div>
          )}

          {/* Past Projects */}
          {past.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-semibold text-foreground">Past Projects</h2>
                <span className="bg-gray-100 text-foreground text-sm font-medium px-2.5 py-0.5 rounded-full">
                  {past.length} completed
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {past.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <FaChartBar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {filters.search || filters.status !== 'all' ? 'No Projects Match Your Filters' : 'No Projects Yet'}
          </h3>
          <p className="text-muted-foreground mb-6">
            {filters.search || filters.status !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : isGrowthTeam
              ? 'Get started by creating your first project.'
              : 'You have not been assigned to any projects yet.'}
          </p>
          {isGrowthTeam && (
            <button 
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 py-2 px-4 text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <FaPlus />
              Create New Project
            </button>
          )}
        </div>
      )}

      {/* Create Project Modal */}
      {isGrowthTeam && (
        <CreateProjectModal 
          isOpen={showCreateModal} 
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            // Modal handles navigation to project page automatically
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}