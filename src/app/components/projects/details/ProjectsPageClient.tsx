'use client';

import { useState } from 'react';
import { FaPlus, FaChartBar } from 'react-icons/fa';
import ProjectCard from './ProjectCard';
import CreateProjectModal from '../growth-team/CreateProjectModal';
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
}

export default function ProjectsPageClient({ projects, isGrowthTeam }: ProjectsPageClientProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Helper function to categorize projects based on dates
  const categorizeProjects = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const current: ProjectWithDetails[] = [];
    const upcoming: ProjectWithDetails[] = [];
    const past: ProjectWithDetails[] = [];

    projects.forEach(project => {
      const startDate = new Date(project.startDate);
      const endDate = project.endDate ? new Date(project.endDate) : null;

      startDate.setHours(0, 0, 0, 0);
      if (endDate) {
        endDate.setHours(23, 59, 59, 999);
      }

      if (startDate > today) {
        // Project hasn't started yet
        upcoming.push(project);
      } else if (endDate && endDate < today) {
        // Project has ended
        past.push(project);
      } else {
        // Project is currently active
        current.push(project);
      }
    });

    return { current, upcoming, past };
  };

  const { current, upcoming, past } = categorizeProjects();

  return (
    <div className="p-4 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-semibold text-gray-800">
          {isGrowthTeam ? 'All Projects' : 'Your Projects'}
        </h1>
        {isGrowthTeam && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 py-3 px-6 text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <FaPlus />
            Create New Project
          </button>
        )}
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Current Projects</p>
              <p className="text-2xl font-bold text-green-600">{current.length}</p>
            </div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Upcoming Projects</p>
              <p className="text-2xl font-bold text-blue-600">{upcoming.length}</p>
            </div>
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Past Projects</p>
              <p className="text-2xl font-bold text-gray-600">{past.length}</p>
            </div>
            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Projects by Status */}
      {projects.length > 0 ? (
        <div className="space-y-8">
          {/* Current Projects */}
          {current.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">Current Projects</h2>
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
                <h2 className="text-2xl font-semibold text-gray-800">Upcoming Projects</h2>
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
                <h2 className="text-2xl font-semibold text-gray-800">Past Projects</h2>
                <span className="bg-gray-100 text-gray-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
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
          <FaChartBar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Projects Yet</h3>
          <p className="text-gray-500 mb-6">
            {isGrowthTeam 
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