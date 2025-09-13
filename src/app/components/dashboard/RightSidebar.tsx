'use client';

import { UserRole } from '@prisma/client';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { DashboardData } from '@/types/dashboard';
import MyAllocationsWidget from '@/app/(pages)/dashboard/widgets-components/MyAllocationsWidget';
import PendingApprovalsWidget from '@/app/(pages)/dashboard/widgets-components/PendingApprovalsWidget';
import WorkloadBalanceWidget from '@/app/(pages)/dashboard/widgets-components/WorkloadBalanceWidget';
import ROISnapshotWidget from '@/app/(pages)/dashboard/widgets-components/ROISnapshotWidget';
import PortfolioHealthWidget from '@/app/(pages)/dashboard/widgets-components/PortfolioHealthWidget';
import QuickActionsWidget from '@/app/(pages)/dashboard/widgets-components/QuickActionsWidget';
import UpcomingDeadlinesWidget from '@/app/(pages)/dashboard/widgets-components/UpcomingDeadlinesWidget';
import TeamAvailabilityWidget from '@/app/(pages)/dashboard/widgets-components/TeamAvailabilityWidget';

interface RightSidebarProps {
  dashboardData: DashboardData;
  userRole: UserRole;
  userId: string;
  userName: string;
}

/**
 * RightSidebar - Role-specific widgets and quick actions
 * 
 * Provides contextual tools and information based on user role:
 * - Consultants: Personal allocations, deadlines, availability
 * - Growth Team: Approvals, portfolio health, team management
 * - PMs: Team balance, ROI metrics, project oversight
 */
export default function RightSidebar({
  dashboardData,
  userRole,
  userId,
  userName
}: RightSidebarProps) {
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900">
          {getRoleDisplayName(userRole)} Dashboard
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Welcome back, {userName}
        </p>
      </div>

      {/* Scrollable Widget Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {/* Role-specific widgets */}
          {userRole === UserRole.CONSULTANT && (
            <ConsultantWidgets 
              dashboardData={dashboardData}
              userId={userId}
            />
          )}

          {userRole === UserRole.GROWTH_TEAM && (
            <GrowthTeamWidgets 
              dashboardData={dashboardData}
              userId={userId}
            />
          )}

          {/* Common widgets for all roles */}
          <CommonWidgets 
            dashboardData={dashboardData}
            userRole={userRole}
            userId={userId}
          />
        </div>
      </ScrollArea>
    </div>
  );
}

/**
 * Consultant-specific widgets
 */
function ConsultantWidgets({ 
  dashboardData, 
  userId 
}: { 
  dashboardData: DashboardData;
  userId: string;
}) {
  return (
    <>
      {/* Personal Allocations */}
      <MyAllocationsWidget 
        allocations={dashboardData.myAllocations || []}
        userId={userId}
      />

      {/* Upcoming Deadlines */}
      <UpcomingDeadlinesWidget 
        deadlines={dashboardData.upcomingDeadlines || []}
        userId={userId}
      />

      {/* Quick Actions */}
      <QuickActionsWidget 
        userRole={UserRole.CONSULTANT}
        pendingActions={dashboardData.pendingActions || []}
      />
    </>
  );
}

/**
 * Growth Team / Portfolio Manager widgets
 */
function GrowthTeamWidgets({ 
  dashboardData, 
  userId 
}: { 
  dashboardData: DashboardData;
  userId: string;
}) {
  return (
    <>
      {/* Pending Approvals */}
      <PendingApprovalsWidget 
        approvals={dashboardData.pendingApprovals || []}
        userId={userId}
      />

      {/* Portfolio Health */}
      <PortfolioHealthWidget 
        portfolioStats={dashboardData.portfolioStats}
        riskAlerts={dashboardData.risks || []}
      />

      {/* Team Availability */}
      <TeamAvailabilityWidget 
        teamData={dashboardData.teamAvailability || []}
      />

      {/* Workload Balance */}
      <WorkloadBalanceWidget 
        workloadData={dashboardData.workloadBalance}
      />

      {/* ROI Snapshot */}
      <ROISnapshotWidget 
        roiData={dashboardData.roiMetrics}
      />

      {/* Quick Actions */}
      <QuickActionsWidget 
        userRole={UserRole.GROWTH_TEAM}
        pendingActions={dashboardData.pendingActions || []}
      />
    </>
  );
}

/**
 * Common widgets for all roles
 */
function CommonWidgets({ 
  dashboardData, 
  userRole, 
  userId 
}: { 
  dashboardData: DashboardData;
  userRole: UserRole;
  userId: string;
}) {
  return (
    <>
      {/* System alerts and notifications */}
      {dashboardData.systemAlerts && dashboardData.systemAlerts.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-blue-800 mb-2">System Updates</h4>
          <div className="space-y-1">
            {dashboardData.systemAlerts.slice(0, 3).map((alert, index) => (
              <div key={index} className="text-xs text-blue-600">
                {alert.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick stats summary */}
      <div className="bg-gray-50 rounded-lg p-3">
        <h4 className="text-sm font-medium text-gray-800 mb-2">Quick Stats</h4>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div>
            <div className="text-lg font-bold text-gray-900">
              {dashboardData.quickStats?.activeProjects || 0}
            </div>
            <div className="text-xs text-gray-500">Active Projects</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">
              {dashboardData.quickStats?.teamSize || 0}
            </div>
            <div className="text-xs text-gray-500">Team Members</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-600">
              {dashboardData.quickStats?.utilizationRate || 0}%
            </div>
            <div className="text-xs text-gray-500">Utilization</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-600">
              {dashboardData.quickStats?.completedTasks || 0}
            </div>
            <div className="text-xs text-gray-500">This Week</div>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Helper function to get role display name
 */
function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case UserRole.CONSULTANT:
      return 'Resource User';
    case UserRole.GROWTH_TEAM:
      return 'Portfolio Manager';
    default:
      return 'User';
  }
}