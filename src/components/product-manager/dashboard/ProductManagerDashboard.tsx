'use client';

import { useState, useEffect } from 'react';
import {
  FaProjectDiagram,
  FaClock,
  FaChartLine,
  FaCalendarWeek,
  FaChartPie,
  FaBell
} from 'react-icons/fa';
import Link from 'next/link';
import { formatHours } from '@/lib/dates';
import BudgetOverviewView from '../dashboard-views/BudgetOverviewView';
import TeamWorkloadView from '../dashboard-views/TeamWorkloadView';
import PendingRequestsView from '../dashboard-views/PendingRequestsView';
import CrossProjectManagementView from '../dashboard-views/CrossProjectManagementView';
import { ComponentLoading } from '@/components/ui/LoadingSpinner';

interface Project {
  id: string;
  title: string;
  description?: string;
  status?: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED';
  budgetedHours: number;
  startDate: Date;
  endDate: Date;
  consultants: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  phases: Array<{
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    totalAllocatedHours: number;
    completionPercentage: number;
  }>;
  _count: {
    phases: number;
  };
}

interface PendingAllocation {
  id: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  totalHours: number;
  createdAt: Date;
  consultant: {
    name: string;
    email: string;
  };
  phase: {
    name: string;
    project: {
      title: string;
    };
  };
}

interface PendingWeeklyRequest {
  id: string;
  planningStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  proposedHours: number;
  weekStartDate: Date;
  weekEndDate: Date;
  consultant: {
    name: string;
    email: string;
  };
  phaseAllocation: {
    phase: {
      name: string;
      project: {
        title: string;
      };
    };
  };
}


export default function ProductManagerDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [pendingAllocations, setPendingAllocations] = useState<PendingAllocation[]>([]);
  const [pendingWeeklyRequests, setPendingWeeklyRequests] = useState<PendingWeeklyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'management' | 'budget' | 'workload' | 'requests'>('management');
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [stats, setStats] = useState({
    // Cross-project PM metrics
    totalProjectsInvolved: 0,
    projectsManaged: 0,
    projectsAsConsultant: 0,
    overallProjectHealth: 0,
    portfolioHealthDescription: '',
    upcomingDeadlines: [] as Array<{type: 'project' | 'phase', name: string, projectName: string, endDate: Date, daysLeft: number}>,
    pendingDecisions: 0,
    blockedAllocations: 0,
    crossProjectRisks: 0,
    // Budget & Capacity metrics
    totalBudgeted: 0,
    totalAllocated: 0,
    budgetUtilization: 0,
    overBudgetProjects: 0,
    underUtilizedProjects: 0,
    teamWorkloadData: [] as Array<{
      consultantId: string;
      consultantName: string;
      upcomingHours: number;
      avgHoursPerWeek: number;
      projectCount: number;
      status: 'overloaded' | 'moderate' | 'available';
    }>
  });

  useEffect(() => {
    let abortController = new AbortController();

    fetchDashboardData();
    fetchNotifications(abortController.signal);

    return () => {
      abortController.abort(); // Cancel requests on unmount
    };
  }, []);

  const fetchNotifications = async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/notifications?limit=1&unreadOnly=true', { signal });
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

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch projects managed by this PM
      const managedProjectsResponse = await fetch('/api/projects/managed');
      const managedProjects = managedProjectsResponse.ok ? await managedProjectsResponse.json() : [];
      console.log('Managed projects response:', { ok: managedProjectsResponse.ok, status: managedProjectsResponse.status, projects: managedProjects });

      // Fetch ALL projects the PM is involved in (both managed and as consultant)
      const allProjectsResponse = await fetch('/api/projects');
      const allProjects = allProjectsResponse.ok ? await allProjectsResponse.json() : [];
      console.log('All projects response:', { ok: allProjectsResponse.ok, status: allProjectsResponse.status, projects: allProjects });

      setProjects(managedProjects); // Keep managed projects for the main display

      // Fetch pending allocations that PM created (waiting for Growth Team approval)
      const allocationsResponse = await fetch('/api/projects/managed/pending-allocations');
      if (allocationsResponse.ok) {
        const allocationsData = await allocationsResponse.json();
        setPendingAllocations(allocationsData);
      }

      // Fetch pending weekly planning requests from team members in PM's projects
      const weeklyResponse = await fetch('/api/projects/managed/pending-weekly-plans');
      if (weeklyResponse.ok) {
        const weeklyData = await weeklyResponse.json();
        setPendingWeeklyRequests(weeklyData);
      }


      // Calculate stats
      if (managedProjectsResponse.ok && allProjectsResponse.ok && allocationsResponse.ok) {
        const managedProjectsData = managedProjects;
        const allProjectsData = allProjects;
        const allocationsData = pendingAllocations;

        // Projects where PM is consultant (not manager)
        const consultantProjects = allProjectsData.filter((p: any) =>
          !managedProjectsData.some((mp: Project) => mp.id === p.id)
        );

        // Upcoming deadlines (project ends and phase ends within 30 days)
        const today = new Date();
        const upcomingDeadlines: Array<{type: 'project' | 'phase', name: string, projectName: string, endDate: Date, daysLeft: number}> = [];

        allProjectsData.forEach((project: any) => {
          // Project end dates
          if (project.endDate) {
            const endDate = new Date(project.endDate);
            const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            if (daysLeft <= 30 && daysLeft > 0) {
              upcomingDeadlines.push({
                type: 'project',
                name: project.title,
                projectName: project.title,
                endDate,
                daysLeft
              });
            }
          }

          // Phase end dates
          project.phases?.forEach((phase: any) => {
            if (phase.endDate) {
              const endDate = new Date(phase.endDate);
              const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              if (daysLeft <= 30 && daysLeft > 0) {
                upcomingDeadlines.push({
                  type: 'phase',
                  name: phase.name,
                  projectName: project.title,
                  endDate,
                  daysLeft
                });
              }
            }
          });
        });

        // Sort by days left
        upcomingDeadlines.sort((a, b) => a.daysLeft - b.daysLeft);

        // Overall project health with description
        const projectHealthScores = allProjectsData.map((p: any) => {
          const progress = p.phases?.length > 0
            ? p.phases.reduce((phaseSum: number, phase: any) => phaseSum + (phase.completionPercentage || 0), 0) / p.phases.length
            : 0;
          return progress;
        });

        const overallProjectHealth = allProjectsData.length > 0
          ? Math.round(projectHealthScores.reduce((sum: number, score: number) => sum + score, 0) / projectHealthScores.length)
          : 0;

        const healthyProjects = projectHealthScores.filter((score: number) => score >= 80).length;
        const strugglingProjects = projectHealthScores.filter((score: number) => score < 50).length;

        let portfolioHealthDescription = '';
        if (overallProjectHealth >= 80) {
          portfolioHealthDescription = `Strong performance across ${healthyProjects}/${allProjectsData.length} projects`;
        } else if (overallProjectHealth >= 60) {
          portfolioHealthDescription = `${healthyProjects} performing well, ${strugglingProjects} need attention`;
        } else {
          portfolioHealthDescription = `${strugglingProjects} projects struggling, intervention needed`;
        }


        // Cross-project risks (projects with low progress and near deadlines)
        const crossProjectRisks = allProjectsData.filter((p: any) => {
          const endDate = new Date(p.endDate);
          const today = new Date();
          const daysUntilEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const avgProgress = p.phases?.length > 0
            ? p.phases.reduce((sum: number, phase: any) => sum + (phase.completionPercentage || 0), 0) / p.phases.length
            : 0;
          return daysUntilEnd <= 30 && daysUntilEnd > 0 && avgProgress < 50;
        }).length;

        // Calculate budget & capacity metrics
        const totalBudgeted = managedProjectsData.reduce((sum: number, p: any) => sum + (p.budgetedHours || 0), 0);
        const totalAllocated = managedProjectsData.reduce((sum: number, p: any) => {
          const projectAllocated = p.phases?.reduce((phaseSum: number, phase: any) =>
            phaseSum + (phase.totalAllocatedHours || 0), 0) || 0;
          return sum + projectAllocated;
        }, 0);
        const budgetUtilization = totalBudgeted > 0 ? Math.round((totalAllocated / totalBudgeted) * 100) : 0;

        const overBudgetProjects = managedProjectsData.filter((p: any) => {
          const projectAllocated = p.phases?.reduce((sum: number, phase: any) =>
            sum + (phase.totalAllocatedHours || 0), 0) || 0;
          return projectAllocated > (p.budgetedHours || 0);
        }).length;

        const underUtilizedProjects = managedProjectsData.filter((p: any) => {
          const projectAllocated = p.phases?.reduce((sum: number, phase: any) =>
            sum + (phase.totalAllocatedHours || 0), 0) || 0;
          const utilization = (p.budgetedHours || 0) > 0
            ? (projectAllocated / p.budgetedHours) * 100
            : 0;
          return utilization < 50;
        }).length;

        // Build team workload data - focus on next 4 weeks
        const fourWeeksFromNow = new Date(today);
        fourWeeksFromNow.setDate(today.getDate() + 28);

        const consultantWorkloadMap = new Map<string, {
          consultantId: string;
          consultantName: string;
          upcomingHours: number;
          projectCount: number;
        }>();

        managedProjectsData.forEach((project: any) => {
          project.consultants?.forEach((consultant: any) => {
            // Calculate hours in next 4 weeks from weekly allocations
            let upcomingHours = 0;

            project.phases?.forEach((phase: any) => {
              const phaseAllocation = phase.allocations?.find((a: any) => a.consultantId === consultant.id);
              if (phaseAllocation?.weeklyAllocations) {
                upcomingHours += phaseAllocation.weeklyAllocations
                  .filter((wa: any) => {
                    const weekStart = new Date(wa.weekStartDate);
                    return weekStart >= today && weekStart <= fourWeeksFromNow;
                  })
                  .reduce((sum: number, wa: any) => sum + (wa.proposedHours || wa.approvedHours || 0), 0);
              }
            });

            if (consultantWorkloadMap.has(consultant.id)) {
              const existing = consultantWorkloadMap.get(consultant.id)!;
              existing.upcomingHours += upcomingHours;
              existing.projectCount += 1;
            } else {
              consultantWorkloadMap.set(consultant.id, {
                consultantId: consultant.id,
                consultantName: consultant.name,
                upcomingHours,
                projectCount: 1
              });
            }
          });
        });

        // Convert to array and determine status based on avg hours per week
        const teamWorkloadData = Array.from(consultantWorkloadMap.values()).map(consultant => {
          const avgHoursPerWeek = consultant.upcomingHours / 4; // 4 weeks
          let status: 'overloaded' | 'moderate' | 'available' = 'available';

          if (avgHoursPerWeek > 40) {
            status = 'overloaded';
          } else if (avgHoursPerWeek >= 25) {
            status = 'moderate';
          }

          return {
            ...consultant,
            avgHoursPerWeek: Math.round(avgHoursPerWeek * 10) / 10,
            status
          };
        }).sort((a, b) => {
          // Sort by status priority (overloaded first), then by hours
          const statusPriority = { overloaded: 0, moderate: 1, available: 2 };
          if (statusPriority[a.status] !== statusPriority[b.status]) {
            return statusPriority[a.status] - statusPriority[b.status];
          }
          return b.avgHoursPerWeek - a.avgHoursPerWeek;
        });

        setStats({
          totalProjectsInvolved: allProjectsData.length,
          projectsManaged: managedProjectsData.length,
          projectsAsConsultant: consultantProjects.length,
          overallProjectHealth,
          portfolioHealthDescription,
          upcomingDeadlines,
          pendingDecisions: allocationsData.length,
          blockedAllocations: allocationsData.filter((a: any) => a.approvalStatus === 'PENDING').length,
          crossProjectRisks,
          // Budget & Capacity metrics
          totalBudgeted,
          totalAllocated,
          budgetUtilization,
          overBudgetProjects,
          underUtilizedProjects,
          teamWorkloadData
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
    setLoading(false);
  };


  if (loading) {
    return <ComponentLoading message="Loading product manager dashboard..." />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Product Manager Dashboard</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {activeView === 'management'
              ? 'Comprehensive project management workspace'
              : activeView === 'budget'
              ? 'Track project budgets and allocations'
              : activeView === 'workload'
              ? 'Monitor team capacity and availability'
              : 'Review pending requests from your teams'
            }
          </p>
        </div>
      </div>

      {/* PM-Focused Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Portfolio Overview Card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 rounded-xl shadow-sm border border-blue-200 dark:border-blue-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500 dark:bg-blue-600 rounded-lg">
              <FaProjectDiagram className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.totalProjectsInvolved}</p>
              <p className="text-sm text-blue-600 dark:text-blue-400">Total Portfolio</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-700 dark:text-blue-300">Managing: {stats.projectsManaged}</span>
            <span className="text-blue-600 dark:text-blue-400">Contributing: {stats.projectsAsConsultant}</span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-800/50 rounded-full h-1.5 mt-2">
            <div
              className="bg-blue-500 dark:bg-blue-400 h-1.5 rounded-full transition-all"
              style={{ width: `${(stats.projectsManaged / Math.max(stats.totalProjectsInvolved, 1)) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Upcoming Deadlines Card */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/20 rounded-xl shadow-sm border border-orange-200 dark:border-orange-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-500 dark:bg-orange-600 rounded-lg">
              <FaCalendarWeek className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.upcomingDeadlines.length}</p>
              <p className="text-sm text-orange-600 dark:text-orange-400">Upcoming Deadlines</p>
            </div>
          </div>
          <div className="space-y-1">
            {stats.upcomingDeadlines.length > 0 ? (
              stats.upcomingDeadlines.slice(0, 2).map((deadline, index) => (
                <div key={index} className="text-xs">
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${deadline.daysLeft <= 7 ? 'text-red-700 dark:text-red-300' : deadline.daysLeft <= 14 ? 'text-orange-700 dark:text-orange-300' : 'text-card-foreground'}`}>
                      {deadline.type === 'project' ? '📋' : '📅'} {deadline.name}
                    </span>
                    <span className={`${deadline.daysLeft <= 7 ? 'text-red-600 dark:text-red-400' : deadline.daysLeft <= 14 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'}`}>
                      {deadline.daysLeft}d
                    </span>
                  </div>
                  {deadline.type === 'phase' && (
                    <div className="text-muted-foreground truncate">in {deadline.projectName}</div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-600 dark:text-gray-400">No upcoming deadlines</div>
            )}
            {stats.upcomingDeadlines.length > 2 && (
              <div className="text-xs text-muted-foreground">+ {stats.upcomingDeadlines.length - 2} more</div>
            )}
          </div>
        </div>

        {/* Pending Decisions Card */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 rounded-xl shadow-sm border border-purple-200 dark:border-purple-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500 dark:bg-purple-600 rounded-lg">
              <FaClock className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.pendingDecisions}</p>
              <p className="text-sm text-purple-600 dark:text-purple-400">Pending Decisions</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-purple-700 dark:text-purple-300">Blocked Allocations: {stats.blockedAllocations}</span>
              <span className="text-purple-600 dark:text-purple-400">At Risk Projects: {stats.crossProjectRisks}</span>
            </div>
            <div className="w-full bg-purple-200 dark:bg-purple-800/50 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  stats.pendingDecisions === 0 ? 'bg-green-500 dark:bg-green-400' :
                  stats.pendingDecisions <= 3 ? 'bg-yellow-500 dark:bg-yellow-400' : 'bg-red-500 dark:bg-red-400'
                }`}
                style={{ width: `${stats.pendingDecisions === 0 ? 100 : Math.min((stats.pendingDecisions / 10) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-purple-700 dark:text-purple-300">
              {stats.pendingDecisions === 0 ? '✅ All decisions up to date' :
               stats.pendingDecisions <= 3 ? 'Low priority queue' :
               'High priority - needs attention'}
            </p>
          </div>
        </div>

        {/* Notifications Card */}
        <Link href="/dashboard/notifications" className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/20 rounded-xl shadow-sm border border-indigo-200 dark:border-indigo-800 p-6 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-500 dark:bg-indigo-600 rounded-lg">
              <FaBell className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
                {loadingNotifications ? '...' : unreadNotifications}
              </p>
              <p className="text-sm text-indigo-600 dark:text-indigo-400">Notifications</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-indigo-700 dark:text-indigo-300">Status:</span>
              <span className="text-indigo-800 dark:text-indigo-200 font-medium">
                {loadingNotifications ? 'Loading' : unreadNotifications > 0 ? `${unreadNotifications} unread` : 'All read'}
              </span>
            </div>
            {!loadingNotifications && unreadNotifications > 0 && (
              <div className="w-full bg-indigo-200 dark:bg-indigo-800/50 rounded-full h-1.5">
                <div className="bg-indigo-500 dark:bg-indigo-400 h-1.5 rounded-full w-full animate-pulse"></div>
              </div>
            )}
            <p className="text-xs text-indigo-700 dark:text-indigo-300">
              {loadingNotifications ? 'Loading...' : unreadNotifications > 0 ? 'Click to view notifications' : 'All notifications read'}
            </p>
          </div>
        </Link>
      </div>


      {/* View Switcher */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'management', label: 'Project Management', icon: FaProjectDiagram },
              { key: 'budget', label: 'Budget Overview', icon: FaChartPie },
              { key: 'workload', label: 'Team Workload', icon: FaChartLine },
              { key: 'requests', label: 'Pending Requests', icon: FaClock }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveView(key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeView === key
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-muted-foreground hover:text-card-foreground hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Icon />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content Area - Full Width */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="bg-blue-600 dark:bg-blue-700 rounded-lg p-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {activeView === 'management' ? 'Cross-Project Management Center' :
               activeView === 'budget' ? 'Budget Overview' :
               activeView === 'workload' ? 'Team Workload & Availability' :
               'Pending Requests & Approvals'}
            </h2>
            <p className="text-sm text-blue-100">
              {activeView === 'management'
                ? 'Unified workspace for managing all your projects'
                : activeView === 'budget'
                ? 'Track project budgets and allocation across your portfolio'
                : activeView === 'workload'
                ? 'Monitor team capacity and identify availability for the next 4 weeks'
                : 'Review allocation requests and weekly planning submissions'
              }
            </p>
          </div>
        </div>

        {activeView === 'management' ? (
          <CrossProjectManagementView projects={projects} stats={stats} />
        ) : activeView === 'budget' ? (
          <BudgetOverviewView projects={projects} stats={stats} />
        ) : activeView === 'workload' ? (
          <TeamWorkloadView stats={stats} />
        ) : (
          <PendingRequestsView
            pendingAllocations={pendingAllocations}
            pendingWeeklyRequests={pendingWeeklyRequests}
          />
        )}
      </div>
    </div>
  );
}