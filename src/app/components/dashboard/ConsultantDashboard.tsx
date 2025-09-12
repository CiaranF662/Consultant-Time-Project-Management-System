'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FaCalendarWeek, FaProjectDiagram, FaClock, FaExclamationCircle, FaClipboardList } from 'react-icons/fa';
import WeeklyPlannerEnhanced from '@/app/components/allocation/WeeklyPlannerEnhanced';
import NotificationSummaryCard from '@/app/components/notifications/NotificationSummaryCard';
import { formatHours } from '@/lib/dates';

interface Sprint {
  id: string;
  sprintNumber: number;
  startDate: Date;
  endDate: Date;
}

interface Project {
  id: string;
  title: string;
}

interface Phase {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  project: Project;
  sprints: Sprint[];
}

interface WeeklyAllocation {
  id: string;
  phaseAllocationId: string;
  weekNumber: number;
  year: number;
  plannedHours: number;
  weekStartDate: Date;
}

interface PhaseAllocation {
  id: string;
  phaseId: string;
  consultantId: string;
  totalHours: number;
  phase: Phase;
  weeklyAllocations: WeeklyAllocation[];
}

interface ConsultantAllocation {
  plannedHours: number;
  phaseAllocation: {
    phase: {
      name: string;
      project: {
        title: string;
      };
    };
  };
}

interface ConsultantProject {
  id: string;
  title: string;
  phases: Array<{ id: string; name: string }>;
  consultants: Array<{
    userId: string;
    user: {
      id: string;
      name: string | null;
      email: string | null;
    };
  }>;
}

interface ConsultantDashboardProps {
  data: {
    isPM: boolean;
    pmProjects: Array<{ id: string; title: string }>;
    pendingHourChangesCount?: number;
    weeklyAllocations: ConsultantAllocation[];
    currentWeekAllocations?: ConsultantAllocation[];
    phaseAllocations: PhaseAllocation[];
    pendingRequests: Array<any>;
    projects: ConsultantProject[];
  };
  userId: string;
  userName: string;
}

export default function ConsultantDashboard({ data, userId, userName }: ConsultantDashboardProps) {
  const [selectedWeek, setSelectedWeek] = useState(new Date());

  // Calculate current week's total hours
  const currentWeekHours = (data.currentWeekAllocations || []).reduce((sum: number, allocation: any) => {
    return sum + allocation.plannedHours;
  }, 0);

  // Calculate total allocated hours across all phases
  const totalAllocatedHours = data.phaseAllocations.reduce((sum, allocation) => {
    return sum + allocation.totalHours;
  }, 0);

  // Calculate distributed hours
  const totalDistributedHours = data.phaseAllocations.reduce((sum, allocation) => {
    return sum + allocation.weeklyAllocations.reduce((weekSum: number, week: any) => {
      return weekSum + week.plannedHours;
    }, 0);
  }, 0);

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Welcome back, {userName}!</h1>
        <p className="text-lg text-gray-600">
          {data.isPM ? 'Product Manager & Consultant' : 'Consultant'} Dashboard
        </p>
      </div>

      {/* PM Alert if applicable */}
      {data.isPM && (
        <div className="mb-6 bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <FaClipboardList className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                You are the Product Manager for {data.pmProjects.length} project{data.pmProjects.length !== 1 ? 's' : ''}.
                {' '}
                <Link href="/dashboard/phase-planning" className="font-medium underline">
                  Manage phase allocations
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Week's Hours</p>
              <p className="text-2xl font-bold text-gray-900">{formatHours(currentWeekHours)}</p>
            </div>
            <FaCalendarWeek className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Projects</p>
              <p className="text-2xl font-bold text-gray-900">{data.projects.length}</p>
            </div>
            <FaProjectDiagram className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Allocated</p>
              <p className="text-2xl font-bold text-gray-900">{formatHours(totalAllocatedHours)}</p>
              <p className="text-xs text-gray-500">{formatHours(totalDistributedHours)} distributed</p>
            </div>
            <FaClock className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        {data.isPM ? (
          <Link href="/dashboard/admin/hour-changes" className="bg-white p-6 rounded-lg shadow-md border hover:border-blue-500 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Hour Change Approvals</p>
                <p className="text-2xl font-bold text-gray-900">{data.pendingHourChangesCount || 0}</p>
              </div>
              {(data.pendingHourChangesCount || 0) > 0 && (
                <FaExclamationCircle className="h-8 w-8 text-orange-500" />
              )}
            </div>
          </Link>
        ) : (
          <Link href="/dashboard/hour-requests" className="bg-white p-6 rounded-lg shadow-md border hover:border-blue-500 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                <p className="text-2xl font-bold text-gray-900">{data.pendingRequests.length}</p>
              </div>
              {data.pendingRequests.length > 0 && (
                <FaExclamationCircle className="h-8 w-8 text-yellow-500" />
              )}
            </div>
          </Link>
        )}

        <NotificationSummaryCard />
      </div>

      {/* Weekly Planner */}
      <div className="mb-8">
        <div className="bg-white rounded-lg shadow-md border">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold text-gray-800">Weekly Hour Planner</h2>
            <p className="text-sm text-gray-500">Distribute your allocated hours across weeks</p>
          </div>
          <WeeklyPlannerEnhanced 
            consultantId={userId}
            phaseAllocations={data.phaseAllocations as any}
          />
        </div>
      </div>

      {/* Phase Allocations */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Phase Allocations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.phaseAllocations.map((allocation) => {
            const distributed = allocation.weeklyAllocations.reduce((sum: number, week: any) => {
              return sum + week.plannedHours;
            }, 0);
            const remaining = allocation.totalHours - distributed;
            const progress = allocation.totalHours > 0 ? (distributed / allocation.totalHours) * 100 : 0;

            return (
              <div key={allocation.id} className="bg-white p-6 rounded-lg shadow-md border">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-800">{allocation.phase.name}</h3>
                    <p className="text-sm text-gray-500">{allocation.phase.project.title}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    remaining === 0 ? 'bg-green-100 text-green-800' : 
                    remaining < 0 ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {remaining === 0 ? 'Fully Distributed' : 
                     remaining < 0 ? 'Over-allocated' :
                     `${formatHours(remaining)} remaining`}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Allocated</span>
                    <span className="font-medium">{formatHours(allocation.totalHours)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Distributed</span>
                    <span className="font-medium">{formatHours(distributed)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className={`h-2 rounded-full ${
                        progress > 100 ? 'bg-red-500' : 
                        progress === 100 ? 'bg-green-500' : 
                        'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-gray-500">
                    Sprint {allocation.phase.sprints[0]?.sprintNumber || 'N/A'} - 
                    Sprint {allocation.phase.sprints[allocation.phase.sprints.length - 1]?.sprintNumber || 'N/A'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Your Projects */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Projects</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.projects.map((project) => (
            <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
              <div className="bg-white p-6 rounded-lg shadow-md border hover:border-blue-500 transition-colors">
                <h3 className="font-semibold text-gray-800 truncate">{project.title}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {project.phases.length} phases
                </p>
                <div className="mt-4 flex -space-x-2">
                  {project.consultants.slice(0, 3).map((consultant: any, index: number) => (
                    <div
                      key={consultant.userId}
                      className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center"
                      title={consultant.user.name || consultant.user.email}
                    >
                      <span className="text-white text-xs font-medium">
                        {(consultant.user.name || consultant.user.email || '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  ))}
                  {project.consultants.length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center">
                      <span className="text-gray-600 text-xs font-medium">
                        +{project.consultants.length - 3}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}