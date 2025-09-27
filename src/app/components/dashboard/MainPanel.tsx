'use client';

import { useState, useMemo } from 'react';
import { UserRole } from '@prisma/client';
import dynamic from 'next/dynamic';
import { DashboardData } from '@/types/dashboard';

// Widgets
import ResourceUtilizationCard from './ResourceUtilizationCard';
import BudgetTrackingCard from './cards/BudgetTrackingCard';
import RiskAlertsCard from './cards/RiskAlertsCard';
import PortfolioOverviewCard from './cards/PortfolioOverviewCard';
import MyAllocationsCard from './cards/MyAllocationsCard';
import TeamPerformanceCard from './cards/TeamPerformanceCard';

//#region React Grid Layout Setup
const ResponsiveGridLayout = dynamic(
  async () => {
    const RGL = await import('react-grid-layout');
    const WidthProvider = RGL.WidthProvider;
    return WidthProvider(RGL.Responsive);
  },
  { ssr: false }
);

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
//#endregion

interface MainPanelProps {
  dashboardData: DashboardData;
  userRole: UserRole;
  userId: string;
}

interface WidgetDefinition {
  id: string;
  title: string;
  component: JSX.Element;
  gridProps: GridItemProps;
}

interface GridItemProps {
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  maxW?: number;
  minH?: number;
  maxH?: number;
}

/**
 * MainPanel - Central dashboard area with customizable drag-and-drop widgets
 */
export default function MainPanel({ dashboardData, userRole, userId }: MainPanelProps) {
  //#region State: Layouts for different breakpoints
  const [layouts, setLayouts] = useState<{ [key: string]: GridItemProps[] }>({
    lg: [],
    md: [],
    sm: [],
  });
  //#endregion

  //#region Memoized Widgets
  const widgets: WidgetDefinition[] = useMemo(
    () => getWidgetsByRole(userRole, dashboardData, userId),
    [userRole, dashboardData, userId]
  );
  //#endregion

  //#region Render Grid Layout
  return (
    <div className="w-full">
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 10, sm: 6 }}
        rowHeight={150}
        draggableHandle=".widget-drag-handle"
        compactType="vertical"
        preventCollision={false}
        measureBeforeMount
        onLayoutChange={(_layout, allLayouts) => setLayouts(allLayouts)}
      >
        {widgets.map((widget) => (
          <div
            key={widget.id}
            data-grid={widget.gridProps}
            className="bg-white shadow rounded-lg p-4"
          >
            {/* Drag Handle */}
            <div className="widget-drag-handle cursor-move text-gray-400 mb-2 font-bold">
              {widget.title}
            </div>
            {/* Widget Content */}
            {widget.component}
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
  //#endregion
}

//#region Widget Factory
function getWidgetsByRole(userRole: UserRole, dashboardData: DashboardData, userId: string): WidgetDefinition[] {
  const widgets: WidgetDefinition[] = [];

  if (userRole === UserRole.GROWTH_TEAM) {
    widgets.push(
      {
        id: 'portfolio',
        title: 'Portfolio Overview',
        component: <PortfolioOverviewCard data={dashboardData.portfolioStats} />,
        gridProps: { x: 0, y: 0, w: 4, h: 2, minW: 3, minH: 2 },
      },
      {
        id: 'resources',
        title: 'Resource Utilization',
        component: <ResourceUtilizationCard data={dashboardData.resourceUtilization} showTeamBreakdown />,
        gridProps: { x: 4, y: 0, w: 4, h: 2, minW: 3, minH: 2 },
      },
      {
        id: 'budget',
        title: 'Budget Tracking',
        component: <BudgetTrackingCard data={dashboardData.budgetTracking} showProjectBreakdown />,
        gridProps: { x: 8, y: 0, w: 4, h: 2, minW: 3, minH: 2 },
      },
      {
        id: 'teamPerformance',
        title: 'Team Performance',
        component: <TeamPerformanceCard data={dashboardData.teamPerformance} />,
        gridProps: { x: 0, y: 2, w: 6, h: 2, minW: 3, minH: 2 },
      },
      {
        id: 'risks',
        title: 'Risk Alerts',
        component: <RiskAlertsCard risks={dashboardData.risks || []} conflicts={dashboardData.conflicts || []} showAllProjects />,
        gridProps: { x: 6, y: 2, w: 6, h: 2, minW: 3, minH: 2 },
      }
    );
  } else if (userRole === UserRole.CONSULTANT) {
    widgets.push(
      {
        id: 'myAllocations',
        title: 'My Allocations',
        component: <MyAllocationsCard allocations={dashboardData.myAllocations || []} userId={userId} />,
        gridProps: { x: 0, y: 0, w: 6, h: 2, minW: 3, minH: 2 },
      },
      {
        id: 'resources',
        title: 'Resource Utilization',
        component: <ResourceUtilizationCard data={dashboardData.resourceUtilization} showPersonalView userId={userId} />,
        gridProps: { x: 6, y: 0, w: 6, h: 2, minW: 3, minH: 2 },
      },
      {
        id: 'budget',
        title: 'Budget Tracking',
        component: <BudgetTrackingCard data={dashboardData.budgetTracking} showPersonalImpact />,
        gridProps: { x: 0, y: 2, w: 6, h: 2, minW: 3, minH: 2 },
      },
      {
        id: 'risks',
        title: 'Risk Alerts',
        component: <RiskAlertsCard risks={dashboardData.risks || []} conflicts={dashboardData.conflicts || []} filterByUser={userId} />,
        gridProps: { x: 6, y: 2, w: 6, h: 2, minW: 3, minH: 2 },
      }
    );
  }

  return widgets;
}
//#endregion
