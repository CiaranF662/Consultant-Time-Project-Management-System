'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaCalendarWeek, FaProjectDiagram, FaClock, FaCheckCircle } from 'react-icons/fa';
import { formatHours, formatDate } from '@/lib/dates';
import { SectionLoader } from '@/components/ui/LoadingSpinner';

interface WeeklyAllocation {
  id: string;
  proposedHours: number;
  approvedHours?: number;
  weekStartDate: Date;
  weekEndDate: Date;
  planningStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  phaseAllocation: {
    phase: {
      name: string;
      project: {
        title: string;
        id: string;
      };
    };
  };
}

interface PhaseAllocation {
  id: string;
  totalHours: number;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  phase: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    project: {
      id: string;
      title: string;
    };
  };
  weeklyAllocations: WeeklyAllocation[];
}

export default function WeeklyPlanningView() {
  const [phaseAllocations, setPhaseAllocations] = useState<PhaseAllocation[]>([]);
  const [currentWeekAllocations, setCurrentWeekAllocations] = useState<WeeklyAllocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeeklyPlanningData();
  }, []);

  const fetchWeeklyPlanningData = async () => {
    try {
      // Fetch phase allocations for this PM as a consultant
      const allocationsResponse = await fetch('/api/allocations/user');
      if (allocationsResponse.ok) {
        const allocationsData = await allocationsResponse.json();
        setPhaseAllocations(allocationsData);
      }

      // Fetch current week allocations
      const now = new Date();
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const weeklyResponse = await fetch(`/api/allocations/weekly?startDate=${startOfWeek.toISOString()}&endDate=${endOfWeek.toISOString()}`);
      if (weeklyResponse.ok) {
        const weeklyData = await weeklyResponse.json();
        setCurrentWeekAllocations(weeklyData);
      }
    } catch (error) {
      console.error('Error fetching weekly planning data:', error);
    }
    setLoading(false);
  };

  if (loading) {
    return <SectionLoader message="Loading weekly planning data..." />;
  }

  const currentWeekTotal = currentWeekAllocations.reduce((sum, alloc) => sum + (alloc.proposedHours || 0), 0);
  const approvedThisWeek = currentWeekAllocations.filter(alloc => alloc.planningStatus === 'APPROVED').length;

  return (
    <div className="space-y-6">
      {/* Current Week Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <FaClock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900">This Week</h3>
              <p className="text-sm text-blue-700">{formatHours(currentWeekTotal)} planned</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500 rounded-lg">
              <FaCheckCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-green-900">Approved</h3>
              <p className="text-sm text-green-700">{approvedThisWeek} of {currentWeekAllocations.length} plans</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500 rounded-lg">
              <FaProjectDiagram className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-purple-900">Active Phases</h3>
              <p className="text-sm text-purple-700">{phaseAllocations.filter(p => p.approvalStatus === 'APPROVED').length} phases</p>
            </div>
          </div>
        </div>
      </div>

      {/* Current Week Details */}
      {currentWeekAllocations.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-foreground">This Week's Schedule</h3>
            <p className="text-sm text-gray-600">
              {formatDate(new Date())} - Week of {formatDate(currentWeekAllocations[0]?.weekStartDate || new Date())}
            </p>
          </div>
          <div className="divide-y divide-gray-200">
            {currentWeekAllocations.map((allocation) => (
              <div key={allocation.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FaProjectDiagram className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">
                        {allocation.phaseAllocation.phase.project.title}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Phase: {allocation.phaseAllocation.phase.name}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-foreground">
                        {formatHours(allocation.proposedHours)}
                      </div>
                      <div className="text-xs text-muted-foreground">planned</div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      allocation.planningStatus === 'APPROVED'
                        ? 'bg-green-100 text-green-800'
                        : allocation.planningStatus === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {allocation.planningStatus === 'APPROVED' ? 'Approved' :
                       allocation.planningStatus === 'PENDING' ? 'Pending' : 'Rejected'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phase Allocations */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-foreground">My Phase Allocations</h3>
          <p className="text-sm text-gray-600">All phases where you're allocated as a consultant</p>
        </div>
        <div className="divide-y divide-gray-200">
          {phaseAllocations.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <FaCalendarWeek className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-gray-600">No phase allocations assigned</p>
              <p className="text-xs text-muted-foreground mt-1">You haven't been allocated to any project phases as a consultant</p>
            </div>
          ) : (
            phaseAllocations.map((allocation) => {
              const totalPlanned = allocation.weeklyAllocations.reduce((sum, weekly) => sum + (weekly.proposedHours || 0), 0);
              const remainingHours = allocation.totalHours - totalPlanned;

              return (
                <div key={allocation.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <FaProjectDiagram className="w-4 h-4 text-muted-foreground" />
                        <Link
                          href={`/dashboard/projects/${allocation.phase.project.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          {allocation.phase.project.title}
                        </Link>
                      </div>
                      <div className="text-sm text-gray-600 mb-1">
                        Phase: {allocation.phase.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        Duration: {formatDate(allocation.phase.startDate)} - {formatDate(allocation.phase.endDate)}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-semibold text-foreground">
                          {formatHours(allocation.totalHours)} allocated
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatHours(totalPlanned)} planned • {formatHours(remainingHours)} remaining
                        </div>
                        <div className="w-20 bg-gray-200 rounded-full h-1.5 mt-1">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min((totalPlanned / allocation.totalHours) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        allocation.approvalStatus === 'APPROVED'
                          ? 'bg-green-100 text-green-800'
                          : allocation.approvalStatus === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {allocation.approvalStatus}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <FaCalendarWeek className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="font-semibold text-blue-900">Need to plan your weekly hours?</h3>
            <p className="text-sm text-blue-700">
              Visit the <Link href="/dashboard/weekly-planner" className="font-medium underline">Weekly Planner</Link> to allocate your hours across project phases.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}