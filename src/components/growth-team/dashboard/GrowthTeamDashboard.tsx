'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaPlus, FaUsers, FaChartBar, FaExclamationCircle, FaClock, FaProjectDiagram, FaTh, FaCheckCircle, FaBell } from 'react-icons/fa';
import ResourceTimeline from '../timeline/ResourceTimeline';
import CreateProjectModal from '@/components/projects/growth-team/CreateProjectModal';
import ProjectCard from '@/components/projects/details/ProjectCard';
import GrowthTeamGanttChart from '../gantt/GrowthTeamGanttChart';

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
  userRole: string;
}

export default function GrowthTeamDashboard({ data, userRole }: GrowthTeamDashboardProps) {
  const [timelineWeeks, setTimelineWeeks] = useState(12);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeView, setActiveView] = useState<'timeline' | 'gantt' | 'projects'>('timeline');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // State for approvals and notifications
  const [approvalsSummary, setApprovalsSummary] = useState({
    pendingPhaseAllocations: 0,
    pendingWeeklyPlans: 0,
    pendingHourChanges: 0,
    totalPending: 0
  });
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loadingApprovals, setLoadingApprovals] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  // Fetch approvals and notifications data
  useEffect(() => {
    const fetchApprovals = async () => {
      try {
        const response = await fetch('/api/approvals/summary');
        if (response.ok) {
          const data = await response.json();
          setApprovalsSummary(data);
          setLastUpdated(new Date()); // Update timestamp when data refreshes
        }
      } catch (error) {
        console.error('Error fetching approvals summary:', error);
      }
      setLoadingApprovals(false);
    };

    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/notifications?limit=1&unreadOnly=true');
        if (response.ok) {
          const data = await response.json();
          setUnreadNotifications(data.unreadCount || 0);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
      setLoadingNotifications(false);
    };

    fetchApprovals();
    fetchNotifications();
  }, []);

  // Update timestamp every minute to show data freshness
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

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
          <h1 className="text-3xl font-bold text-gray-800">Growth Team Dashboard</h1>
          <p className="text-lg text-gray-600">
            {activeView === 'timeline'
              ? 'Manage consultant allocations and project resources'
              : activeView === 'gantt'
              ? 'Strategic overview of all projects and their timelines'
              : 'View and manage all projects by status'
            }
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 py-3 px-6 text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <FaPlus />
          Create New Project
        </button>
      </div>

      {/* Enhanced Professional Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
        {/* Current Projects Card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm border border-blue-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500 rounded-lg">
              <FaChartBar className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-900">{current.length}</p>
              <p className="text-sm text-blue-600">Current Projects</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700">Upcoming: {upcoming.length}</span>
              <span className="text-blue-600">Past: {past.length}</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min((current.length / Math.max(data.projects.length, 1)) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-blue-700">
              {Math.round((current.length / Math.max(data.projects.length, 1)) * 100)}% currently active
            </p>
          </div>
        </div>

        {/* Total Consultants Card */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm border border-green-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-500 rounded-lg">
              <FaUsers className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-900">{data.consultants.length}</p>
              <p className="text-sm text-green-600">Total Consultants</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-700">Active Resources</span>
              <span className="text-green-800 font-medium">{data.consultants.length}</span>
            </div>
            <div className="w-full bg-green-200 rounded-full h-1.5">
              <div className="bg-green-500 h-1.5 rounded-full w-full transition-all"></div>
            </div>
            <p className="text-xs text-green-700">
              All consultants available
            </p>
          </div>
        </div>

        {/* Enhanced Approvals Summary Card */}
        <Link href="/dashboard/hour-approvals" className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm border border-purple-200 p-6 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500 rounded-lg">
              {approvalsSummary.totalPending > 0 ? (
                <FaExclamationCircle className="w-6 h-6 text-white" />
              ) : (
                <FaCheckCircle className="w-6 h-6 text-white" />
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-purple-900">
                {loadingApprovals ? '...' : approvalsSummary.totalPending}
              </p>
              <p className="text-sm text-purple-600">Pending Approvals</p>
            </div>
          </div>
          <div className="space-y-2">
            {!loadingApprovals && approvalsSummary.totalPending > 0 ? (
              <div className="space-y-1">
                {approvalsSummary.pendingPhaseAllocations > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-purple-700">Phase Allocations:</span>
                    <span className="text-purple-800 font-medium">{approvalsSummary.pendingPhaseAllocations}</span>
                  </div>
                )}
                {approvalsSummary.pendingWeeklyPlans > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-purple-700">Weekly Plans:</span>
                    <span className="text-purple-800 font-medium">{approvalsSummary.pendingWeeklyPlans}</span>
                  </div>
                )}
                {approvalsSummary.pendingHourChanges > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-purple-700">Hour Changes:</span>
                    <span className="text-purple-800 font-medium">{approvalsSummary.pendingHourChanges}</span>
                  </div>
                )}
                <div className="w-full bg-purple-200 rounded-full h-1.5 mt-2">
                  <div className="bg-purple-500 h-1.5 rounded-full w-full animate-pulse"></div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-purple-700">
                {loadingApprovals ? 'Loading...' : 'All approvals processed'}
              </p>
            )}
          </div>
        </Link>

        {/* User Approvals Card */}
        <Link href="/dashboard/admin/user-approvals" className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-sm border border-orange-200 p-6 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-500 rounded-lg">
              <FaExclamationCircle className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-orange-900">{data.pendingUserCount}</p>
              <p className="text-sm text-orange-600">User Approvals</p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-orange-700">
              {data.pendingUserCount > 0 ? 'Pending user registrations' : 'All users approved'}
            </p>
            {data.pendingUserCount > 0 && (
              <div className="w-full bg-orange-200 rounded-full h-1.5">
                <div className="bg-orange-500 h-1.5 rounded-full w-full animate-pulse"></div>
              </div>
            )}
          </div>
        </Link>

        {/* Enhanced Notification Summary Card */}
        <Link href="/dashboard/notifications" className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl shadow-sm border border-indigo-200 p-6 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-500 rounded-lg">
              <FaBell className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-indigo-900">
                {loadingNotifications ? '...' : unreadNotifications}
              </p>
              <p className="text-sm text-indigo-600">Notifications</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-indigo-700">Status:</span>
              <span className="text-indigo-800 font-medium">
                {loadingNotifications ? 'Loading' : unreadNotifications > 0 ? `${unreadNotifications} unread` : 'All read'}
              </span>
            </div>
            {!loadingNotifications && unreadNotifications > 0 && (
              <div className="w-full bg-indigo-200 rounded-full h-1.5">
                <div className="bg-indigo-500 h-1.5 rounded-full w-full animate-pulse"></div>
              </div>
            )}
            <p className="text-xs text-indigo-700">
              {loadingNotifications ? 'Loading...' : unreadNotifications > 0 ? 'Click to view notifications' : 'All notifications read'}
            </p>
          </div>
        </Link>
      </div>

      {/* View Switcher */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'timeline', label: 'Consultant Allocation Table', icon: FaClock },
              { key: 'gantt', label: 'Portfolio Timeline', icon: FaProjectDiagram },
              { key: 'projects', label: 'Projects', icon: FaTh }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveView(key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeView === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Timeline View */}
      {activeView === 'timeline' && (
        <>
          {/* Enhanced Timeline Controls */}
          <div className="bg-gradient-to-r from-white to-gray-50 rounded-t-xl shadow-lg border border-gray-100 border-b-0 mb-0 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-lg">
                    <FaClock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Consultant Allocation Table</h2>
                    <p className="text-blue-100 text-sm">Click on any allocation cell to view detailed breakdown</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-blue-100">Time Period:</span>
                  <div className="flex bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-1">
                    {[
                      { weeks: 8, label: '8 weeks' },
                      { weeks: 12, label: '12 weeks' },
                      { weeks: 24, label: '24 weeks' },
                      { weeks: 32, label: '32 weeks' }
                    ].map(({ weeks, label }) => (
                      <button
                        key={weeks}
                        onClick={() => setTimelineWeeks(weeks)}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                          timelineWeeks === weeks
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-white/90 hover:bg-white/20 hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline Info Bar */}
            <div className="bg-white p-4 border-t border-gray-100 border-b-4 border-b-gray-300">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-100 border border-green-300 rounded-full"></div>
                    <span className="text-gray-600">Low utilization (0-20h)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded-full"></div>
                    <span className="text-gray-600">Medium utilization (20-35h)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded-full"></div>
                    <span className="text-gray-600">High utilization (35-40h)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-100 border border-red-300 rounded-full"></div>
                    <span className="text-gray-600">Over utilization (40h+)</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-gray-500">
                  <span>Viewing {timelineWeeks} weeks • {data.consultants.length} consultants</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Live data connection"></div>
                    <span className="text-sm">Last updated: {lastUpdated.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Connected Resource Timeline Container */}
          <div className="bg-white rounded-b-xl shadow-lg border border-gray-100 border-t-0 overflow-hidden">
            <ResourceTimeline
              consultants={data.consultants}
              weeks={timelineWeeks}
              onConsultantClick={() => {}} // No action needed for now
            />
          </div>
        </>
      )}

      {/* Portfolio Timeline View */}
      {activeView === 'gantt' && (
        <div className="bg-white rounded-lg shadow-md border">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold text-gray-800">Project Portfolio Timeline</h2>
            <p className="text-sm text-gray-600">Strategic timeline view of all projects and their phases</p>
          </div>
          <div className="p-4">
            <GrowthTeamGanttChart projects={data.projects} />
          </div>
        </div>
      )}

      {/* Projects View */}
      {activeView === 'projects' && (
        <div className="space-y-8">
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
      )}


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