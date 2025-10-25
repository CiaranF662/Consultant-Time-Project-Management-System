'use client';

import { FaCalendarWeek, FaClock, FaExclamationTriangle, FaCheckCircle, FaChartLine, FaCalendar, FaHourglassHalf } from 'react-icons/fa';
import { formatHours, formatWeekDate } from '@/lib/dates';

interface Sprint {
  id: string;
  sprintNumber: number;
  startDate: Date;
  endDate: Date;
}

interface PhaseAllocation {
  id: string;
  totalHours: number;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DELETION_PENDING' | 'EXPIRED' | 'FORFEITED';
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

interface EnhancedStats extends AllocationStats {
  upcomingWork: number;
  projectsInvolved: number;
  pendingPhaseApprovals: number;
  pendingWeeklyApprovals: number;
  thisWeekHours: number;
  rejectedAllocations: number;
  overAllocatedPhases: number;
  utilizationRate: number;
}

interface WeeklyPlanningDashboardProps {
  data: {
    phaseAllocations: PhaseAllocation[];
    upcomingAllocations: UpcomingAllocation[];
    stats: AllocationStats;
  };
  enhancedStats: EnhancedStats;
  getWeekNumber: (date: Date) => number;
  userId: string;
  userName: string;
}

export default function WeeklyPlanningDashboard({
  data,
  enhancedStats,
  getWeekNumber
}: WeeklyPlanningDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Enhanced Professional Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-xl shadow-lg overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 dark:bg-white/10 rounded-lg">
              <FaCalendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">My Weekly Planning</h2>
              <p className="text-blue-100 dark:text-blue-200 text-sm">Personal workload management and capacity planning</p>
            </div>
          </div>
        </div>
      </div>


      {/* Multi-Week Timeline View */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800 dark:to-gray-800 p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500 dark:bg-indigo-600 rounded-lg">
              <FaChartLine className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">6-Week Workload Timeline</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Capacity planning and workload distribution</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          {(() => {
            // Generate 6 weeks of data starting from current week
            const today = new Date();
            const currentWeek = getWeekNumber(today);
            const currentYear = today.getFullYear();
            const weeks = [];

            // Helper function to get the start date of a week
            const getWeekStartDate = (weekNum: number, year: number) => {
              const jan1 = new Date(year, 0, 1);
              const daysToAdd = (weekNum - 1) * 7;
              const weekStart = new Date(jan1.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

              // Adjust to Monday if needed (assuming weeks start on Monday)
              const dayOfWeek = weekStart.getDay();
              const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
              weekStart.setDate(weekStart.getDate() - daysFromMonday);

              return weekStart;
            };

            for (let i = 0; i < 6; i++) {
              let weekNum = currentWeek + i;
              let year = currentYear;

              // Handle year rollover
              if (weekNum > 52) {
                weekNum = weekNum - 52;
                year = year + 1;
              }

              const weekStartDate = getWeekStartDate(weekNum, year);

              // Calculate total hours for this week across all allocations using date-based matching
              const weekHours = data.phaseAllocations.reduce((total, allocation) => {
                return total + allocation.weeklyAllocations
                  .filter(week => {
                    const allocWeekStart = new Date(week.weekStartDate);
                    const daysDifference = Math.abs((weekStartDate.getTime() - allocWeekStart.getTime()) / (1000 * 60 * 60 * 24));
                    return daysDifference < 7; // Same week if within 7 days
                  })
                  .reduce((sum, week) => sum + (week.approvedHours || week.proposedHours || 0), 0);
              }, 0);

              // Get projects for this week using date-based matching
              const weekProjects = data.phaseAllocations
                .map(allocation => {
                  const weekAllocations = allocation.weeklyAllocations.filter(week => {
                    const allocWeekStart = new Date(week.weekStartDate);
                    const daysDifference = Math.abs((weekStartDate.getTime() - allocWeekStart.getTime()) / (1000 * 60 * 60 * 24));
                    return daysDifference < 7; // Same week if within 7 days
                  });

                  if (weekAllocations.length > 0) {
                    const totalHours = weekAllocations.reduce((sum, week) => sum + (week.approvedHours || week.proposedHours || 0), 0);
                    if (totalHours > 0) {
                      return {
                        title: allocation.phase.project.title,
                        phase: allocation.phase.name,
                        hours: totalHours,
                        status: weekAllocations[0].planningStatus, // Use first allocation's status
                        color: `hsl(${Math.abs(allocation.phase.project.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % 360}, 70%, 60%)`
                      };
                    }
                  }
                  return null;
                })
                .filter(Boolean);

              weeks.push({
                weekNumber: weekNum,
                year: year,
                weekStartDate: weekStartDate,
                hours: weekHours,
                projects: weekProjects,
                isCurrent: i === 0
              });
            }

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-6 gap-4">
                  {weeks.map((week) => (
                    <div key={`${week.year}-${week.weekNumber}`}
                         className={`p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                           week.isCurrent ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 shadow-md' :
                           week.hours > 40 ? 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20' :
                           week.hours < 20 ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800' :
                           'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                         }`}>
                      <div className="text-center mb-3">
                        <div className={`text-sm font-bold ${
                          week.isCurrent ? 'text-indigo-600 dark:text-indigo-400' :
                          week.hours > 40 ? 'text-red-600 dark:text-red-400' :
                          week.hours < 20 ? 'text-muted-foreground' : 'text-green-600 dark:text-green-400'
                        }`}>
                          {formatWeekDate(week.weekStartDate)}
                        </div>
                        {week.isCurrent && <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-1">Current</div>}
                      </div>

                      <div className="mb-3">
                        <div className={`text-2xl font-bold text-center ${
                          week.isCurrent ? 'text-indigo-900 dark:text-indigo-100' :
                          week.hours > 40 ? 'text-red-700 dark:text-red-300' :
                          week.hours < 20 ? 'text-gray-600 dark:text-gray-400' : 'text-green-700 dark:text-green-300'
                        }`}>
                          {formatHours(week.hours)}
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              week.hours > 40 ? 'bg-red-500 dark:bg-red-600' :
                              week.hours >= 35 ? 'bg-orange-500 dark:bg-orange-600' :
                              week.hours >= 20 ? 'bg-green-500 dark:bg-green-600' : 'bg-gray-400 dark:bg-gray-500'
                            }`}
                            style={{ width: `${Math.min((week.hours / 40) * 100, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        {week.projects.slice(0, 2).map((project, pIndex) =>
                          project ? (
                            <div key={pIndex} className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: project.color }}
                              />
                              <div className="text-xs text-card-foreground truncate flex-1">
                                {project.title}
                              </div>
                              <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                {formatHours(project.hours)}
                              </div>
                            </div>
                          ) : null
                        )}
                        {week.projects.length > 2 && (
                          <div className="text-xs text-muted-foreground text-center">
                            +{week.projects.length - 2} more
                          </div>
                        )}
                        {week.projects.length === 0 && (
                          <div className="text-xs text-muted-foreground text-center">
                            No work planned
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Actionable Insights Panel */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 dark:bg-amber-600 rounded-lg">
              <FaExclamationTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">What Needs Attention</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Items requiring your action or review</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {/* Capacity Issues */}
            {enhancedStats.thisWeekHours > 40 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <FaExclamationTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <div>
                    <h4 className="font-semibold text-red-800 dark:text-red-300">Overallocation Alert</h4>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      You're allocated {formatHours(enhancedStats.thisWeekHours)} this week ({formatHours(enhancedStats.thisWeekHours - 40)} over capacity).
                      Consider redistributing hours or discussing with your PM.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {enhancedStats.thisWeekHours < 20 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <FaHourglassHalf className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  <div>
                    <h4 className="font-semibold text-yellow-800 dark:text-yellow-300">Low Utilization</h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      You have {formatHours(40 - enhancedStats.thisWeekHours)} of available capacity this week.
                      Consider taking on additional work or planning ahead.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Pending Approvals */}
            {enhancedStats.pendingPhaseApprovals > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <FaClock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h4 className="font-semibold text-blue-800 dark:text-blue-300">Pending Phase Approvals</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {enhancedStats.pendingPhaseApprovals} phase allocation{enhancedStats.pendingPhaseApprovals !== 1 ? 's' : ''} awaiting Growth Team approval.
                      You cannot plan hours until these are approved.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {enhancedStats.pendingWeeklyApprovals > 0 && (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <FaCalendarWeek className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <h4 className="font-semibold text-indigo-800 dark:text-indigo-300">Weekly Plans Pending</h4>
                    <p className="text-sm text-indigo-700 dark:text-indigo-300">
                      {enhancedStats.pendingWeeklyApprovals} weekly plan{enhancedStats.pendingWeeklyApprovals !== 1 ? 's' : ''} submitted for Growth Team review.
                      You can still make changes until approved.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* All good state */}
            {enhancedStats.thisWeekHours >= 20 &&
             enhancedStats.thisWeekHours <= 40 &&
             enhancedStats.pendingPhaseApprovals === 0 &&
             enhancedStats.pendingWeeklyApprovals === 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <FaCheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <div>
                    <h4 className="font-semibold text-green-800 dark:text-green-300">All Systems Go!</h4>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Your workload is well-balanced and all approvals are up to date.
                      Focus on executing your planned work this week.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}