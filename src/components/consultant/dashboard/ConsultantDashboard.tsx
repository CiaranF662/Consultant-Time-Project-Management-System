'use client';

import { useState, useEffect } from 'react';
import { FaCalendarWeek, FaClock, FaChartPie, FaExclamationTriangle, FaCheckCircle, FaProjectDiagram, FaUser, FaChartLine, FaCalendar, FaHourglassHalf, FaBell } from 'react-icons/fa';
import Link from 'next/link';
import { formatHours, formatDate } from '@/lib/dates';
import { getPhaseStatus, getStatusColorClasses, getProgressBarColor } from '@/lib/phase-status';
import WeeklyPlannerEnhanced from './WeeklyPlannerEnhanced';
import WeeklyCalendarView from './WeeklyCalendarView';
import WeeklyPlanningDashboard from './WeeklyPlanningDashboard';

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

interface ConsultantDashboardProps {
  data: {
    phaseAllocations: PhaseAllocation[];
    upcomingAllocations: UpcomingAllocation[];
    stats: AllocationStats;
  };
  userId: string;
  userName: string;
}

export default function ConsultantDashboard({ data, userId, userName }: ConsultantDashboardProps) {
  const [activeView, setActiveView] = useState<'overview' | 'planner' | 'calendar' | 'planning'>('overview');
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/notifications?limit=1&unreadOnly=true', {
          signal: abortController.signal
        });
        if (response.ok) {
          const data = await response.json();
          setUnreadNotifications(data.unreadCount || 0);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return; // Request was cancelled, ignore
        }
        console.error('Error fetching notifications:', error);
      }
      setLoadingNotifications(false);
    };

    fetchNotifications();

    return () => {
      abortController.abort(); // Cancel requests on unmount
    };
  }, []);

  // Calculate enhanced stats
  const calculateEnhancedStats = () => {
    const today = new Date();
    const currentWeek = getWeekNumber(today);
    const currentYear = today.getFullYear();

    // Upcoming work in next 4 weeks
    const fourWeeksFromNow = new Date(today);
    fourWeeksFromNow.setDate(today.getDate() + 28);

    const upcomingWork = data.phaseAllocations.reduce((total, allocation) => {
      return total + allocation.weeklyAllocations
        .filter(week => {
          const weekStart = new Date(week.weekStartDate);
          return weekStart >= today && weekStart <= fourWeeksFromNow;
        })
        .reduce((sum, week) => sum + (week.approvedHours || week.proposedHours || 0), 0);
    }, 0);

    // Projects involved in
    const uniqueProjects = new Set(data.phaseAllocations.map(alloc => alloc.phase.project.id));

    // Pending approvals
    const pendingPhaseApprovals = data.phaseAllocations.filter(alloc => alloc.approvalStatus === 'PENDING').length;
    const pendingWeeklyApprovals = data.phaseAllocations.reduce((count, allocation) => {
      return count + allocation.weeklyAllocations.filter(week => week.planningStatus === 'PENDING').length;
    }, 0);

    // Utilization rate (this week)
    const thisWeekHours = data.phaseAllocations.reduce((total, allocation) => {
      return total + allocation.weeklyAllocations
        .filter(week => week.weekNumber === currentWeek && week.year === currentYear)
        .reduce((sum, week) => sum + (week.approvedHours || week.proposedHours || 0), 0);
    }, 0);

    // Risk assessment
    const rejectedAllocations = data.phaseAllocations.filter(alloc => alloc.approvalStatus === 'REJECTED').length;
    const overAllocatedPhases = data.phaseAllocations.filter(allocation => {
      const approvedHours = allocation.weeklyAllocations.reduce((sum, week) => sum + (week.approvedHours || 0), 0);
      return approvedHours > allocation.totalHours;
    }).length;

    return {
      ...data.stats,
      upcomingWork,
      projectsInvolved: uniqueProjects.size,
      pendingPhaseApprovals,
      pendingWeeklyApprovals,
      thisWeekHours,
      rejectedAllocations,
      overAllocatedPhases,
      utilizationRate: thisWeekHours <= 40 ? Math.round((thisWeekHours / 40) * 100) : 100
    };
  };

  const getWeekNumber = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
  };

  const enhancedStats = calculateEnhancedStats();

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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-lg text-gray-600">
            {activeView === 'overview'
              ? 'Manage your time allocation across projects and phases'
              : activeView === 'planner'
              ? 'Plan and distribute your weekly hours'
              : activeView === 'calendar'
              ? 'View your allocations in calendar format'
              : 'My weekly planning and schedule overview'
            }
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Welcome back</p>
          <p className="text-xl font-semibold text-gray-800">{userName}</p>
        </div>
      </div>

      {/* Enhanced Professional Stats Cards - Always Visible */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {/* Total Allocated Card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm border border-blue-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500 rounded-lg">
              <FaClock className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-900">{formatHours(data.stats.totalAllocatedHours)}</p>
              <p className="text-sm text-blue-600">Total Allocated</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700">Projects: {enhancedStats.projectsInvolved}</span>
              <span className="text-blue-600">Phases: {data.stats.activePhases}</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min((data.stats.totalDistributedHours / Math.max(data.stats.totalAllocatedHours, 1)) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-blue-700">
              {Math.round((data.stats.totalDistributedHours / Math.max(data.stats.totalAllocatedHours, 1)) * 100)}% distributed
            </p>
          </div>
        </div>

        {/* Active Projects Card */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm border border-green-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-500 rounded-lg">
              <FaProjectDiagram className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-900">{enhancedStats.projectsInvolved}</p>
              <p className="text-sm text-green-600">Active Projects</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-700">Distributed: {formatHours(data.stats.totalDistributedHours)}</span>
              <span className="text-green-600">This Week: {formatHours(enhancedStats.thisWeekHours)}</span>
            </div>
            <div className="w-full bg-green-200 rounded-full h-1.5">
              <div
                className="bg-green-500 h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min((data.stats.totalDistributedHours / Math.max(data.stats.totalAllocatedHours, 1)) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-green-700">
              {Math.round((data.stats.totalDistributedHours / Math.max(data.stats.totalAllocatedHours, 1)) * 100)}% of hours distributed
            </p>
          </div>
        </div>

        {/* Remaining Hours Card */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-sm border border-orange-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-500 rounded-lg">
              <FaExclamationTriangle className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${
                data.stats.remainingToDistribute > 0 ? 'text-orange-900' : 'text-green-900'
              }`}>
                {formatHours(data.stats.remainingToDistribute)}
              </p>
              <p className="text-sm text-orange-600">Remaining</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-orange-700">Pending: {enhancedStats.pendingPhaseApprovals + enhancedStats.pendingWeeklyApprovals}</span>
              <span className="text-orange-600">Status: {data.stats.remainingToDistribute === 0 ? 'Complete' : 'Planning'}</span>
            </div>
            <div className="w-full bg-orange-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  data.stats.remainingToDistribute === 0 ? 'bg-green-500' : 'bg-orange-500'
                }`}
                style={{ width: `${data.stats.remainingToDistribute === 0 ? 100 : 75}%` }}
              ></div>
            </div>
            <p className="text-xs text-orange-700">
              {data.stats.remainingToDistribute === 0 ? '✅ All hours allocated' : 'Needs distribution'}
            </p>
          </div>
        </div>

        {/* Active Phases Card */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm border border-purple-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500 rounded-lg">
              <FaChartPie className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-purple-900">{data.stats.activePhases}</p>
              <p className="text-sm text-purple-600">Active Phases</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-purple-700">Approved: {data.phaseAllocations.filter(a => a.approvalStatus === 'APPROVED').length}</span>
              <span className="text-purple-600">Pending: {enhancedStats.pendingPhaseApprovals}</span>
            </div>
            <div className="w-full bg-purple-200 rounded-full h-1.5">
              <div
                className="bg-purple-500 h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min((data.phaseAllocations.filter(a => a.approvalStatus === 'APPROVED').length / Math.max(data.stats.activePhases, 1)) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-purple-700">
              {enhancedStats.rejectedAllocations > 0 ? `⚠️ ${enhancedStats.rejectedAllocations} rejected` : 'All phases on track'}
            </p>
          </div>
        </div>

        {/* Notifications Card */}
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
              { key: 'overview', label: 'Overview', icon: FaChartPie },
              { key: 'planner', label: 'Weekly Planner', icon: FaCalendarWeek },
              { key: 'calendar', label: 'Calendar View', icon: FaClock },
              { key: 'planning', label: 'My Weekly Planning', icon: FaCalendarWeek }
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

          {/* Phase Allocations */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 flex flex-col overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <FaChartPie className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Phase Allocations</h2>
                    <p className="text-blue-100 text-sm">Your assigned project phases</p>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-4 flex-1 overflow-y-auto" style={{ minHeight: '400px', maxHeight: 'calc(100vh - 400px)' }}>
                {data.phaseAllocations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                      <FaChartPie className="w-8 h-8 text-blue-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-800 mb-2">No Phase Allocations</h3>
                    <p className="text-gray-500 text-sm">You haven't been assigned to any project phases yet.</p>
                  </div>
                ) : (
                  data.phaseAllocations.map((allocation) => {
                    const enhancedPhaseStatus = getEnhancedPhaseStatus(allocation);
                    const planningStatus = getPlanningStatus(allocation);

                    return (
                      <div key={allocation.id} className={`rounded-xl shadow-sm border-l-4 transition-all hover:shadow-md ${
                        allocation.approvalStatus === 'APPROVED' ? 'border-l-green-500 bg-gradient-to-r from-green-50 to-white' :
                        allocation.approvalStatus === 'REJECTED' ? 'border-l-red-500 bg-gradient-to-r from-red-50 to-white' :
                        'border-l-yellow-500 bg-gradient-to-r from-yellow-50 to-white'
                      } p-5`}>
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
                              {formatDate(new Date(allocation.phase.startDate))} - {formatDate(new Date(allocation.phase.endDate))}
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
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 flex flex-col overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <FaCalendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Upcoming Weeks</h2>
                    <p className="text-purple-100 text-sm">Your scheduled workload</p>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-3 flex-1 overflow-y-auto" style={{ minHeight: '400px', maxHeight: 'calc(100vh - 400px)' }}>
                {nextWeekAllocations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                      <FaCalendar className="w-8 h-8 text-purple-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-800 mb-2">No Upcoming Work</h3>
                    <p className="text-gray-500 text-sm">You have no scheduled allocations for the next 7 weeks.</p>
                  </div>
                ) : (
                  nextWeekAllocations.map((allocation, index) => (
                    <div key={allocation.id} className="bg-gradient-to-r from-gray-50 to-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                            index === 0 ? 'bg-blue-500' :
                            index === 1 ? 'bg-green-500' :
                            index === 2 ? 'bg-purple-500' : 'bg-gray-500'
                          }`}>
                            W{allocation.weekNumber}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800">
                              Week {allocation.weekNumber}, {allocation.year}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDate(new Date(allocation.weekStartDate))} - {formatDate(new Date(allocation.weekEndDate))}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">
                            {formatHours(allocation.approvedHours || allocation.proposedHours || 0)}
                          </div>
                          <div className="text-xs text-gray-500">hours</div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <div className="flex items-center gap-2 mb-1">
                          <FaProjectDiagram className="w-4 h-4 text-blue-500" />
                          <span className="font-medium text-gray-800 text-sm">
                            {allocation.phaseAllocation.phase.project.title}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 ml-6">
                          Phase: {allocation.phaseAllocation.phase.name}
                        </div>
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
        <WeeklyPlannerEnhanced
          consultantId={userId}
          phaseAllocations={data.phaseAllocations}
        />
      )}

      {/* Calendar Tab */}
      {activeView === 'calendar' && (
        <WeeklyCalendarView
          phaseAllocations={data.phaseAllocations}
          upcomingAllocations={data.upcomingAllocations}
        />
      )}

      {/* My Weekly Planning Tab */}
      {activeView === 'planning' && (
        <WeeklyPlanningDashboard
          data={data}
          enhancedStats={enhancedStats}
          getWeekNumber={getWeekNumber}
          userId={userId}
          userName={userName}
        />
      )}
    </div>
  );
}