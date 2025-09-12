'use client';

import { UserRole } from '@prisma/client';
import { DashboardData } from '@/types/dashboard';
import ResourceUtilizationCard from './cards/ResourceUtilizationCard';
import BudgetTrackingCard from './cards/BudgetTrackingCard';
import RiskAlertsCard from './cards/RiskAlertsCard';
import PortfolioOverviewCard from './cards/PortfolioOverviewCard';
import MyAllocationsCard from './cards/MyAllocationsCard';
import TeamPerformanceCard from './cards/TeamPerformanceCard';

interface MainPanelProps {
  dashboardData: DashboardData;
  userRole: UserRole;
  userId: string;
}

/**
 * MainPanel - Central analytics and visualization area
 * 
 * Features:
 * - Role-based widget selection
 * - Responsive grid layout
 * - Progressive disclosure of information
 * - Real-time data visualization with Recharts
 */
export default function MainPanel({ dashboardData, userRole, userId }: MainPanelProps) {
  return (
    <div className="space-y-6">
      {/* Role-specific primary widgets */}
      {userRole === UserRole.GROWTH_TEAM && (
        <GrowthTeamWidgets dashboardData={dashboardData} />
      )}
      
      {userRole === UserRole.CONSULTANT && (
        <ConsultantWidgets dashboardData={dashboardData} userId={userId} />
      )}

      {/* Common widgets for all roles */}
      <CommonWidgets dashboardData={dashboardData} userRole={userRole} />
    </div>
  );
}

/**
 * Growth Team / Portfolio Manager Widgets
 */
function GrowthTeamWidgets({ dashboardData }: { dashboardData: DashboardData }) {
  return (
    <>
      {/* Top row - Key metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <PortfolioOverviewCard data={dashboardData.portfolioStats} />
        <ResourceUtilizationCard 
          data={dashboardData.resourceUtilization}
          showTeamBreakdown={true}
        />
        <BudgetTrackingCard 
          data={dashboardData.budgetTracking}
          showProjectBreakdown={true}
        />
      </div>

      {/* Second row - Performance and risks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TeamPerformanceCard data={dashboardData.teamPerformance} />
        <RiskAlertsCard 
          risks={dashboardData.risks || []}
          conflicts={dashboardData.conflicts || []}
          showAllProjects={true}
        />
      </div>
    </>
  );
}

/**
 * Consultant / Resource User Widgets
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
      {/* Top row - Personal focus */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MyAllocationsCard 
          allocations={dashboardData.myAllocations || []}
          userId={userId}
        />
        <ResourceUtilizationCard 
          data={dashboardData.resourceUtilization}
          showPersonalView={true}
          userId={userId}
        />
      </div>

      {/* Second row - Project context */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BudgetTrackingCard 
          data={dashboardData.budgetTracking}
          showPersonalImpact={true}
        />
        <RiskAlertsCard 
          risks={dashboardData.risks || []}
          conflicts={dashboardData.conflicts || []}
          filterByUser={userId}
        />
      </div>
    </>
  );
}

/**
 * Common widgets shown to all roles
 */
function CommonWidgets({ 
  dashboardData, 
  userRole 
}: { 
  dashboardData: DashboardData;
  userRole: UserRole;
}) {
  // Show additional context based on role
  const showAdvancedMetrics = userRole === UserRole.GROWTH_TEAM;

  return (
    <div className="space-y-6">
      {/* Conditional advanced widgets for Growth Team */}
      {showAdvancedMetrics && dashboardData.advancedMetrics && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Future: Capacity forecasting, trend analysis, etc. */}
        </div>
      )}
    </div>
  );
}