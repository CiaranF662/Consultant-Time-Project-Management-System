'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FaPlus, FaUsers, FaChartBar, FaExclamationCircle } from 'react-icons/fa';
import ResourceTimeline from '@/app/components/timeline/ResourceTimeline';
import CreateProjectModal from '@/app/components/CreateProjectModal';
import NotificationSummaryCard from '@/app/components/notifications/NotificationSummaryCard';
import ProjectCard from '@/app/components/ProjectCard';

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

interface GrowthTeamDashboardProps {
  data: {
    pendingUserCount: number;
    consultants: Array<{
      id: string;
      name: string | null;
      email: string | null;
    }>;
    projects: ProjectWithDetails[];
  };
}

export default function GrowthTeamDashboard({ data }: GrowthTeamDashboardProps) {
  const [timelineWeeks, setTimelineWeeks] = useState(12);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Helper function to categorize projects based on dates
  const categorizeProjects = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const current: ProjectWithDetails[] = [];
    const upcoming: ProjectWithDetails[] = [];
    const past: ProjectWithDetails[] = [];

    data.projects.forEach(project => {
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
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Resource Timeline</h1>
          <p className="text-lg text-gray-600">Manage consultant allocations and project resources</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 py-3 px-6 text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <FaPlus />
          Create New Project
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Current Projects</p>
              <p className="text-2xl font-bold text-gray-900">{current.length}</p>
            </div>
            <FaChartBar className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Consultants</p>
              <p className="text-2xl font-bold text-gray-900">{data.consultants.length}</p>
            </div>
            <FaUsers className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <Link href="/dashboard/admin/user-approvals" className="bg-white p-6 rounded-lg shadow-md border hover:border-blue-500 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
              <p className="text-2xl font-bold text-gray-900">{data.pendingUserCount}</p>
            </div>
            {data.pendingUserCount > 0 && (
              <FaExclamationCircle className="h-8 w-8 text-yellow-500" />
            )}
          </div>
        </Link>

        <NotificationSummaryCard />
      </div>

      {/* Timeline Controls */}
      <div className="bg-white p-4 rounded-lg shadow-md border mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">Resource Allocation Timeline</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Time Period:</span>
            <div className="flex bg-gray-50 border border-gray-200 rounded-lg p-1 shadow-sm">
              <button
                onClick={() => setTimelineWeeks(8)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  timelineWeeks === 8 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm'
                }`}
              >
                8 weeks
              </button>
              <button
                onClick={() => setTimelineWeeks(12)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  timelineWeeks === 12 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm'
                }`}
              >
                12 weeks
              </button>
              <button
                onClick={() => setTimelineWeeks(24)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  timelineWeeks === 24 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm'
                }`}
              >
                24 weeks
              </button>
              <button
                onClick={() => setTimelineWeeks(32)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  timelineWeeks === 32 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm'
                }`}
              >
                32 weeks
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Resource Timeline */}
      <div className="bg-white rounded-lg shadow-md border overflow-hidden">
        <ResourceTimeline 
          consultants={data.consultants}
          weeks={timelineWeeks}
          onConsultantClick={() => {}} // No action needed for now
        />
      </div>

      {/* Projects by Status */}
      <div className="mt-8 space-y-8">
        {/* Current Projects */}
        {current.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Current Projects</h2>
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
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Upcoming Projects</h2>
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
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Past Projects</h2>
              <span className="bg-gray-100 text-gray-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                {past.length} completed
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {past.slice(0, 6).map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
            {past.length > 6 && (
              <div className="text-center mt-4">
                <Link 
                  href="/dashboard/projects"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  View all {past.length} past projects
                </Link>
              </div>
            )}
          </div>
        )}

        {/* No Projects Message */}
        {current.length === 0 && upcoming.length === 0 && past.length === 0 && (
          <div className="text-center py-12">
            <FaChartBar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
            <p className="text-gray-500 mb-6">Get started by creating your first project.</p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 py-2 px-4 text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <FaPlus />
              Create New Project
            </button>
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          // Modal handles navigation to project page automatically
          setShowCreateModal(false);
        }}
      />
    </div>
  );
}