'use client';

import { UserRole } from '@prisma/client';
import { Calendar, Clock, Target, TrendingUp } from 'lucide-react';
import { Card } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import { DashboardData } from '@/types/dashboard';

interface TopBannerProps {
  dashboardData: DashboardData;
  userRole: UserRole;
}

/**
 * TopBanner - Project context and milestone countdown
 * 
 * Shows current project phase, sprint info, and upcoming milestones
 * Adapts content based on user role and active projects
 */
export default function TopBanner({ dashboardData, userRole }: TopBannerProps) {
  const { activeProject, currentSprint, upcomingMilestone } = dashboardData;

  // If no active project, show portfolio summary for Growth Team
  if (!activeProject) {
    return userRole === UserRole.GROWTH_TEAM ? (
      <PortfolioSummaryBanner dashboardData={dashboardData} />
    ) : (
      <NoActiveProjectBanner />
    );
  }

  // Calculate days until next milestone
  const daysUntilMilestone = upcomingMilestone 
    ? Math.ceil((new Date(upcomingMilestone.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  // Calculate sprint progress
  const sprintProgress = currentSprint ? calculateSprintProgress(currentSprint) : 0;

  return (
    <Card className="mx-4 lg:mx-6 mt-4 lg:mt-6 p-4 lg:p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-l-blue-500">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        {/* Project Information */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">
              {activeProject.title}
            </h1>
            <Badge variant={getProjectStatusVariant(activeProject.status)}>
              {activeProject.status}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            {/* Current Phase */}
            <div className="flex items-center space-x-1">
              <Target className="w-4 h-4" />
              <span>Phase: {activeProject.currentPhase}</span>
            </div>

            {/* Sprint Information */}
            {currentSprint && (
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>Sprint {currentSprint.number}</span>
              </div>
            )}

            {/* Team Size */}
            <div className="flex items-center space-x-1">
              <span>{activeProject.teamSize} consultants</span>
            </div>
          </div>
        </div>

        {/* Milestone Countdown and Progress */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-3 lg:space-y-0 lg:space-x-6">
          {/* Sprint Progress */}
          {currentSprint && (
            <div className="flex items-center space-x-3 min-w-48">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">Sprint Progress</span>
                  <span className="text-sm text-gray-500">{sprintProgress}%</span>
                </div>
                <Progress value={sprintProgress} className="h-2" />
              </div>
            </div>
          )}

          {/* Milestone Countdown */}
          {upcomingMilestone && daysUntilMilestone !== null && (
            <div className="bg-white rounded-lg p-3 shadow-sm min-w-40">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <div>
                  <div className="text-sm font-medium text-gray-700">Next Milestone</div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-lg font-bold ${
                      daysUntilMilestone <= 3 ? 'text-red-600' :
                      daysUntilMilestone <= 7 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {daysUntilMilestone}
                    </span>
                    <span className="text-sm text-gray-500">days</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Budget Health (Growth Team view) */}
          {userRole === UserRole.GROWTH_TEAM && activeProject.budgetHealth && (
            <div className="bg-white rounded-lg p-3 shadow-sm min-w-32">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <div>
                  <div className="text-sm font-medium text-gray-700">Budget</div>
                  <div className="text-lg font-bold text-gray-900">
                    {activeProject.budgetHealth.utilizationRate}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

/**
 * Portfolio Summary Banner - For Growth Team when no active project
 */
function PortfolioSummaryBanner({ dashboardData }: { dashboardData: DashboardData }) {
  const { portfolioStats } = dashboardData;

  if (!portfolioStats) return null;

  return (
    <Card className="mx-4 lg:mx-6 mt-4 lg:mt-6 p-4 lg:p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-l-4 border-l-purple-500">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Portfolio Overview</h1>
          <p className="text-gray-600">Managing {portfolioStats.totalProjects} active projects</p>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-sm text-gray-500">Total Utilization</div>
            <div className="text-xl font-bold text-gray-900">{portfolioStats.utilizationRate}%</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-sm text-gray-500">Active Consultants</div>
            <div className="text-xl font-bold text-gray-900">{portfolioStats.activeConsultants}</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-sm text-gray-500">Budget Health</div>
            <div className="text-xl font-bold text-green-600">{portfolioStats.budgetHealth}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * No Active Project Banner - For consultants not assigned to current projects
 */
function NoActiveProjectBanner() {
  return (
    <Card className="mx-4 lg:mx-6 mt-4 lg:mt-6 p-4 lg:p-6 bg-gradient-to-r from-gray-50 to-slate-50 border-l-4 border-l-gray-400">
      <div className="text-center py-4">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Welcome to AgilePM</h1>
        <p className="text-gray-600">You're not currently assigned to any active projects.</p>
        <p className="text-sm text-gray-500 mt-1">Check with your project manager for upcoming assignments.</p>
      </div>
    </Card>
  );
}

/**
 * Helper Functions
 */
function calculateSprintProgress(sprint: any): number {
  if (!sprint.startDate || !sprint.endDate) return 0;
  
  const start = new Date(sprint.startDate).getTime();
  const end = new Date(sprint.endDate).getTime();
  const now = Date.now();
  
  if (now < start) return 0;
  if (now > end) return 100;
  
  return Math.round(((now - start) / (end - start)) * 100);
}

function getProjectStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status?.toLowerCase()) {
    case 'active':
    case 'in_progress':
      return 'default';
    case 'planning':
    case 'on_hold':
      return 'secondary';
    case 'at_risk':
    case 'overdue':
      return 'destructive';
    default:
      return 'outline';
  }
}