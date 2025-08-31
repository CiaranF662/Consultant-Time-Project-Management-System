'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaPlus, FaUsers, FaClock, FaChartBar, FaExclamationCircle } from 'react-icons/fa';
import ResourceTimeline from '@/app/components/timeline/ResourceTimeline';

interface ProjectConsultant {
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
  userId: string;
  projectId: string;
  role: string;
}

interface PhaseAllocation {
  id: string;
  phaseId: string;
  consultantId: string;
  totalHours: number;
}

interface Phase {
  id: string;
  name: string;
  allocations: PhaseAllocation[];
}

interface Project {
  id: string;
  title: string;
  budgetedHours: number;
  phases: Phase[];
  consultants: ProjectConsultant[];
}

interface GrowthTeamDashboardProps {
  data: {
    pendingUserCount: number;
    pendingHoursCount: number;
    consultants: Array<{
      id: string;
      name: string | null;
      email: string | null;
    }>;
    projects: Project[];
  };
}

export default function GrowthTeamDashboard({ data }: GrowthTeamDashboardProps) {
  const [timelineWeeks, setTimelineWeeks] = useState(12);
  const [selectedConsultant, setSelectedConsultant] = useState<string | null>(null);

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Resource Timeline</h1>
          <p className="text-lg text-gray-600">Manage consultant allocations and project resources</p>
        </div>
        <Link 
          href="/dashboard/create-project" 
          className="inline-flex items-center gap-2 py-2 px-4 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <FaPlus />
          Create New Project
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Projects</p>
              <p className="text-2xl font-bold text-gray-900">{data.projects.length}</p>
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

        <Link href="/dashboard/admin/hour-changes" className="bg-white p-6 rounded-lg shadow-md border hover:border-blue-500 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Hour Requests</p>
              <p className="text-2xl font-bold text-gray-900">{data.pendingHoursCount}</p>
            </div>
            {data.pendingHoursCount > 0 && (
              <FaClock className="h-8 w-8 text-orange-500" />
            )}
          </div>
        </Link>
      </div>

      {/* Timeline Controls */}
      <div className="bg-white p-4 rounded-lg shadow-md border mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">Resource Allocation Timeline</h2>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">
              Weeks to show:
              <select 
                value={timelineWeeks} 
                onChange={(e) => setTimelineWeeks(Number(e.target.value))}
                className="ml-2 rounded-md border-gray-300 shadow-sm"
              >
                <option value={4}>4 weeks</option>
                <option value={8}>8 weeks</option>
                <option value={12}>12 weeks</option>
                <option value={16}>16 weeks</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      {/* Resource Timeline */}
      <div className="bg-white rounded-lg shadow-md border overflow-hidden">
        <ResourceTimeline 
          consultants={data.consultants}
          weeks={timelineWeeks}
          onConsultantClick={setSelectedConsultant}
        />
      </div>

      {/* Recent Projects */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Projects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.projects.slice(0, 6).map((project) => {
            const totalAllocated = project.phases.reduce((sum: number, phase: any) => {
              return sum + phase.allocations.reduce((phaseSum: number, allocation: any) => {
                return phaseSum + allocation.totalHours;
              }, 0);
            }, 0);

            const utilization = project.budgetedHours > 0 
              ? Math.round((totalAllocated / project.budgetedHours) * 100)
              : 0;

            return (
              <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                <div className="bg-white p-6 rounded-lg shadow-md border hover:border-blue-500 transition-colors">
                  <h3 className="font-semibold text-gray-800 truncate">{project.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {project.phases.length} phases • {project.consultants.length} team members
                  </p>
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Budget Utilization</span>
                      <span className="font-medium">{utilization}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          utilization > 90 ? 'bg-red-500' : 
                          utilization > 75 ? 'bg-yellow-500' : 
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(utilization, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {totalAllocated} / {project.budgetedHours} hours
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}