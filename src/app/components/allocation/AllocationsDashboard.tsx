'use client';

import { useState } from 'react';
import { FaCalendarWeek, FaClock, FaChartPie, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import { formatHours } from '@/lib/dates';
import { getPhaseStatus, getStatusColorClasses, getProgressBarColor } from '@/lib/phase-status';
import WeeklyPlannerEnhanced from './WeeklyPlannerEnhanced';
import AllocationCalendar from './AllocationCalendar';

interface Sprint {
  id: string;
  sprintNumber: number;
  startDate: Date;
  endDate: Date;
}

interface PhaseAllocation {
  id: string;
  totalHours: number;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string | null;
  phase: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    project: {
      id: string;
      title: string;
      budgetedHours: number;
    };
    sprints: Sprint[];
  };
  weeklyAllocations: Array<{
    id: string;
    weekNumber: number;
    year: number;
    proposedHours?: number | null;
    approvedHours?: number | null;
    planningStatus: 'PENDING' | 'APPROVED' | 'MODIFIED' | 'REJECTED';
    weekStartDate: Date;
    weekEndDate: Date;
  }>;
}

interface UpcomingAllocation {
  id: string;
  weekNumber: number;
  year: number;
  proposedHours?: number | null;
  approvedHours?: number | null;
  weekStartDate: Date;
  weekEndDate: Date;
  phaseAllocation: {
    phase: {
      name: string;
      project: {
        title: string;
      };
    };
  };
}

interface AllocationStats {
  totalAllocatedHours: number;
  totalDistributedHours: number;
  remainingToDistribute: number;
  activePhases: number;
  upcomingWeeks: number;
}

interface AllocationsDashboardProps {
  data: {
    phaseAllocations: PhaseAllocation[];
    upcomingAllocations: UpcomingAllocation[];
    stats: AllocationStats;
  };
  userId: string;
  userName: string;
}

export default function AllocationsDashboard({ data, userId, userName }: AllocationsDashboardProps) {
  const [activeView, setActiveView] = useState<'overview' | 'planner' | 'calendar'>('overview');

  const getEnhancedPhaseStatus = (allocation: PhaseAllocation) => {
    // Transform allocation to match phase structure expected by getPhaseStatus
    const phaseData = {
      id: allocation.phase.id,
      name: allocation.phase.name,
      startDate: new Date(allocation.phase.startDate),
      endDate: new Date(allocation.phase.endDate),
      sprints: allocation.phase.sprints?.map(sprint => ({
        id: sprint.id,
        sprintNumber: sprint.sprintNumber,
        startDate: new Date(sprint.startDate),
        endDate: new Date(sprint.endDate)
      })) || [],
      allocations: [{
        id: allocation.id,
        totalHours: allocation.totalHours,
        weeklyAllocations: allocation.weeklyAllocations.map(week => ({
          id: week.id,
          plannedHours: week.approvedHours || week.proposedHours || 0, // For backward compatibility with getPhaseStatus
          weekStartDate: new Date(week.weekStartDate),
          weekEndDate: new Date(week.weekEndDate),
          weekNumber: week.weekNumber,
          year: week.year
        }))
      }]
    };
    
    return getPhaseStatus(phaseData);
  };

  // Get approval status for phase allocation
  const getPhaseApprovalStatus = (allocation: PhaseAllocation) => {
    switch (allocation.approvalStatus) {
      case 'APPROVED':
        return { status: 'approved', label: 'Phase Approved', color: 'green', icon: 'check' };
      case 'REJECTED':
        return { status: 'rejected', label: 'Phase Rejected', color: 'red', icon: 'warning' };
      default:
        return { status: 'pending', label: 'Pending Approval', color: 'yellow', icon: 'clock' };
    }
  };

  // Get planning status considering approval system
  const getPlanningStatus = (allocation: PhaseAllocation) => {
    if (allocation.approvalStatus !== 'APPROVED') {
      return getPhaseApprovalStatus(allocation);
    }

    const approvedHours = allocation.weeklyAllocations.reduce((sum, week) =>
      sum + (week.approvedHours || 0), 0);
    const proposedHours = allocation.weeklyAllocations.reduce((sum, week) =>
      sum + (week.proposedHours || 0), 0);
    const pendingHours = allocation.weeklyAllocations
      .filter(week => week.planningStatus === 'PENDING')
      .reduce((sum, week) => sum + (week.proposedHours || 0), 0);

    const remaining = allocation.totalHours - approvedHours;

    if (pendingHours > 0) {
      return { status: 'pending_weekly', label: `${formatHours(pendingHours)} pending approval`, color: 'blue', icon: 'clock' };
    } else if (remaining === 0) {
      return { status: 'complete', label: 'Fully Approved', color: 'green', icon: 'check' };
    } else if (remaining < 0) {
      return { status: 'over', label: 'Over-allocated', color: 'red', icon: 'warning' };
    } else {
      return { status: 'planning', label: `${formatHours(remaining)} to plan`, color: 'yellow', icon: 'clock' };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <FaCheckCircle className="h-5 w-5 text-green-500" />;
      case 'overdue':
      case 'over':
        return <FaExclamationTriangle className="h-5 w-5 text-red-500" />;
      case 'in_progress':
        return <FaClock className="h-5 w-5 text-blue-500" />;
      case 'ready':
        return <FaCheckCircle className="h-5 w-5 text-purple-500" />;
      case 'planning':
        return <FaChartPie className="h-5 w-5 text-yellow-500" />;
      default:
        return <FaClock className="h-5 w-5 text-gray-500" />;
    }
  };

  const nextWeekAllocations = data.upcomingAllocations.slice(0, 7); // Next 7 weeks

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">My Allocations</h1>
        <p className="text-lg text-gray-600">Manage your time allocation across projects and phases</p>
      </div>

      {/* View Switcher */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'overview', label: 'Overview', icon: FaChartPie },
              { key: 'planner', label: 'Weekly Planner', icon: FaCalendarWeek },
              { key: 'calendar', label: 'Calendar View', icon: FaClock }
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

      {/* Overview Tab */}
      {activeView === 'overview' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Allocated</p>
                  <p className="text-2xl font-bold text-gray-900">{formatHours(data.stats.totalAllocatedHours)}</p>
                </div>
                <FaClock className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Distributed</p>
                  <p className="text-2xl font-bold text-gray-900">{formatHours(data.stats.totalDistributedHours)}</p>
                </div>
                <FaCheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Remaining</p>
                  <p className={`text-2xl font-bold ${
                    data.stats.remainingToDistribute > 0 ? 'text-yellow-600' : 'text-gray-900'
                  }`}>
                    {formatHours(data.stats.remainingToDistribute)}
                  </p>
                </div>
                <FaExclamationTriangle className={`h-8 w-8 ${
                  data.stats.remainingToDistribute > 0 ? 'text-yellow-500' : 'text-gray-400'
                }`} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Phases</p>
                  <p className="text-2xl font-bold text-gray-900">{data.stats.activePhases}</p>
                </div>
                <FaChartPie className="h-8 w-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Phase Allocations */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md border flex flex-col">
              <div className="p-4 border-b">
                <h2 className="text-xl font-semibold text-gray-800">Phase Allocations</h2>
              </div>
              <div className="p-4 space-y-4 flex-1 overflow-y-auto" style={{ minHeight: '400px', maxHeight: 'calc(100vh - 400px)' }}>
                {data.phaseAllocations.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No phase allocations assigned yet.</p>
                ) : (
                  data.phaseAllocations.map((allocation) => {
                    const enhancedPhaseStatus = getEnhancedPhaseStatus(allocation);
                    const planningStatus = getPlanningStatus(allocation);

                    return (
                      <div key={allocation.id} className={`border rounded-lg p-4 ${
                        allocation.approvalStatus === 'APPROVED' ? 'border-green-200 bg-green-50' :
                        allocation.approvalStatus === 'REJECTED' ? 'border-red-200 bg-red-50' :
                        'border-yellow-200 bg-yellow-50'
                      }`}>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-800">{allocation.phase.name}</h3>
                            <p className="text-sm text-gray-600">{allocation.phase.project.title}</p>
                            {allocation.approvalStatus === 'REJECTED' && allocation.rejectionReason && (
                              <p className="text-xs text-red-600 mt-1">Rejected: {allocation.rejectionReason}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {/* Approval Status */}
                            <div className="flex items-center gap-2">
                              {getStatusIcon(planningStatus.status)}
                              <span className="text-sm font-medium">{planningStatus.label}</span>
                            </div>
                            {/* Work Progress Status */}
                            <div className="flex items-center gap-2">
                              {getStatusIcon(enhancedPhaseStatus.status)}
                              <span className="text-xs text-gray-600">{enhancedPhaseStatus.label}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Allocated:</span>
                            <span className="ml-2 font-medium">{formatHours(allocation.totalHours)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Sprints:</span>
                            <span className="ml-2 font-medium">
                              {allocation.phase.sprints.length > 0 
                                ? `${allocation.phase.sprints[0].sprintNumber}-${allocation.phase.sprints[allocation.phase.sprints.length-1].sprintNumber}`
                                : 'None'
                              }
                            </span>
                          </div>
                        </div>

                        {/* Combined Status Display */}
                        <div className="mt-3 space-y-3">
                          {/* Approval Progress (for approved phases) */}
                          {allocation.approvalStatus === 'APPROVED' && (
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span>Weekly Approval Progress</span>
                                <span>
                                  {allocation.weeklyAllocations.reduce((sum, week) => sum + (week.approvedHours || 0), 0)} / {allocation.totalHours}h approved
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    planningStatus.status === 'complete' ? 'bg-green-500' :
                                    planningStatus.status === 'over' ? 'bg-red-500' :
                                    planningStatus.status === 'pending_weekly' ? 'bg-blue-500' : 'bg-yellow-500'
                                  }`}
                                  style={{
                                    width: `${Math.min((allocation.weeklyAllocations.reduce((sum, week) => sum + (week.approvedHours || 0), 0) / allocation.totalHours) * 100, 100)}%`
                                  }}
                                />
                              </div>
                              {allocation.weeklyAllocations.some(week => week.planningStatus === 'PENDING') && (
                                <div className="text-xs text-blue-600 mt-1">
                                  {allocation.weeklyAllocations.filter(week => week.planningStatus === 'PENDING').length} week(s) pending Growth Team approval
                                </div>
                              )}
                            </div>
                          )}

                          {/* Work Progress (always show for approved phases) */}
                          {allocation.approvalStatus === 'APPROVED' && (
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span>Work Progress</span>
                                <span>{enhancedPhaseStatus.details.work.workCompletionPercentage}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${getProgressBarColor(enhancedPhaseStatus.status, enhancedPhaseStatus.details.overall.isOnTrack)}`}
                                  style={{
                                    width: `${Math.min(enhancedPhaseStatus.details.work.workCompletionPercentage, 100)}%`
                                  }}
                                />
                              </div>
                              {enhancedPhaseStatus.details.work.currentWeekProgress && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {enhancedPhaseStatus.details.work.currentWeekProgress.sprintNumber && enhancedPhaseStatus.details.work.currentWeekProgress.sprintWeek ? (
                                    <>Current: {Math.round(enhancedPhaseStatus.details.work.currentWeekProgress.weekProgress * 100)}% through Sprint {enhancedPhaseStatus.details.work.currentWeekProgress.sprintNumber}, Week {enhancedPhaseStatus.details.work.currentWeekProgress.sprintWeek}</>
                                  ) : (
                                    <>Current week: {Math.round(enhancedPhaseStatus.details.work.currentWeekProgress.weekProgress * 100)}% through week {enhancedPhaseStatus.details.work.currentWeekProgress.weekNumber}</>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Phase Timeline Info */}
                          <div className="text-xs text-gray-500 flex justify-between">
                            <span>
                              {new Date(allocation.phase.startDate).toLocaleDateString()} - {new Date(allocation.phase.endDate).toLocaleDateString()}
                            </span>
                            <span className={`font-medium ${
                              allocation.approvalStatus === 'APPROVED' && enhancedPhaseStatus.details.overall.riskLevel === 'high' ? 'text-red-600' :
                              allocation.approvalStatus === 'APPROVED' && enhancedPhaseStatus.details.overall.riskLevel === 'medium' ? 'text-yellow-600' :
                              allocation.approvalStatus === 'APPROVED' ? 'text-green-600' : 'text-gray-600'
                            }`}>
                              {allocation.approvalStatus === 'APPROVED'
                                ? `Risk: ${enhancedPhaseStatus.details.overall.riskLevel}`
                                : `Status: ${allocation.approvalStatus.toLowerCase()}`
                              }
                            </span>
                          </div>
                        </div>

                        {/* Show message for non-approved phases */}
                        {allocation.approvalStatus !== 'APPROVED' && (
                          <div className="mt-3 p-3 rounded-lg bg-gray-100">
                            <div className="text-sm text-gray-600">
                              {allocation.approvalStatus === 'PENDING'
                                ? 'This phase allocation is pending Growth Team approval. Weekly planning will be available once approved.'
                                : 'This phase allocation was rejected and cannot be used for weekly planning.'
                              }
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Upcoming Week Allocations */}
            <div className="bg-white rounded-lg shadow-md border flex flex-col">
              <div className="p-4 border-b">
                <h2 className="text-xl font-semibold text-gray-800">Upcoming Weeks</h2>
              </div>
              <div className="p-4 space-y-3 flex-1 overflow-y-auto" style={{ minHeight: '400px', maxHeight: 'calc(100vh - 400px)' }}>
                {nextWeekAllocations.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No upcoming allocations scheduled.</p>
                ) : (
                  nextWeekAllocations.map((allocation) => (
                    <div key={allocation.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-medium text-gray-800">
                          Week {allocation.weekNumber}, {allocation.year}
                        </div>
                        <div className="text-lg font-bold text-blue-600">
                          {formatHours(allocation.approvedHours || allocation.proposedHours || 0)}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {allocation.phaseAllocation.phase.project.title} - {allocation.phaseAllocation.phase.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(allocation.weekStartDate).toLocaleDateString()} - {new Date(allocation.weekEndDate).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Weekly Planner Tab */}
      {activeView === 'planner' && (
        <div className="bg-white rounded-lg shadow-md border">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold text-gray-800">Weekly Hour Planner</h2>
            <p className="text-sm text-gray-600">Distribute your allocated hours across weeks</p>
          </div>
          <WeeklyPlannerEnhanced 
            consultantId={userId}
            phaseAllocations={data.phaseAllocations}
          />
        </div>
      )}

      {/* Calendar Tab */}
      {activeView === 'calendar' && (
        <div className="bg-white rounded-lg shadow-md border">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold text-gray-800">Allocation Calendar</h2>
            <p className="text-sm text-gray-600">View your allocations in calendar format</p>
          </div>
          <AllocationCalendar 
            phaseAllocations={data.phaseAllocations}
            upcomingAllocations={data.upcomingAllocations}
          />
        </div>
      )}
    </div>
  );
}