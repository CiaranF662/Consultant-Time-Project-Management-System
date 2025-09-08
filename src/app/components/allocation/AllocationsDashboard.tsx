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
    plannedHours: number;
    weekStartDate: Date;
    weekEndDate: Date;
  }>;
}

interface UpcomingAllocation {
  id: string;
  weekNumber: number;
  year: number;
  plannedHours: number;
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
          plannedHours: week.plannedHours,
          weekStartDate: new Date(week.weekStartDate),
          weekEndDate: new Date(week.weekEndDate),
          weekNumber: week.weekNumber,
          year: week.year
        }))
      }]
    };
    
    return getPhaseStatus(phaseData);
  };

  // Keep the old function for backward compatibility where needed
  const getLegacyPlanningStatus = (allocation: PhaseAllocation) => {
    const distributed = allocation.weeklyAllocations.reduce((sum, week) => sum + week.plannedHours, 0);
    const remaining = allocation.totalHours - distributed;
    
    if (remaining === 0) {
      return { status: 'complete', label: 'Fully Distributed', color: 'green' };
    } else if (remaining < 0) {
      return { status: 'over', label: 'Over-allocated', color: 'red' };
    } else {
      return { status: 'pending', label: `${formatHours(remaining)} remaining`, color: 'yellow' };
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
                    const legacyPlanningStatus = getLegacyPlanningStatus(allocation);
                    
                    return (
                      <div key={allocation.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-800">{allocation.phase.name}</h3>
                            <p className="text-sm text-gray-600">{allocation.phase.project.title}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(enhancedPhaseStatus.status)}
                            <span className="text-sm font-medium">{enhancedPhaseStatus.label}</span>
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

                        {/* Enhanced Status Display */}
                        <div className="mt-3 space-y-3">
                          {/* Planning Progress */}
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span>Planning Progress</span>
                              <span>{enhancedPhaseStatus.details.planning.completionPercentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  legacyPlanningStatus.status === 'complete' ? 'bg-green-500' :
                                  legacyPlanningStatus.status === 'over' ? 'bg-red-500' : 'bg-yellow-500'
                                }`}
                                style={{ 
                                  width: `${Math.min(enhancedPhaseStatus.details.planning.completionPercentage, 100)}%` 
                                }}
                              />
                            </div>
                          </div>
                          
                          {/* Work Completion Progress */}
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
                          
                          {/* Phase Timeline Info */}
                          <div className="text-xs text-gray-500 flex justify-between">
                            <span>
                              {new Date(allocation.phase.startDate).toLocaleDateString()} - {new Date(allocation.phase.endDate).toLocaleDateString()}
                            </span>
                            <span className={`font-medium ${
                              enhancedPhaseStatus.details.overall.riskLevel === 'high' ? 'text-red-600' :
                              enhancedPhaseStatus.details.overall.riskLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              Risk: {enhancedPhaseStatus.details.overall.riskLevel}
                            </span>
                          </div>
                        </div>
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
                          {formatHours(allocation.plannedHours)}
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