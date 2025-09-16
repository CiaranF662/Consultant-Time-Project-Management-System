'use client';

import { useState, useEffect } from 'react';
import { UserRole } from '@prisma/client';
import { Bell, Settings, LayoutGrid } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import NotificationCenter from '@/app/(features)/dashboard/components/NotificationCenter';

// Dashboard Components
import TopBanner from '@/app/(features)/dashboard/components/TopBanner';
import MainPanel from '@/app/(features)/dashboard/components/MainPanel';
import RightSidebar from '@/app/(features)/dashboard/components/RightSidebar';
import { DashboardData } from '@/types/dashboard';

interface DashboardShellProps {
  userRole: UserRole;
  userId: string;
  userName: string;
  dashboardData: DashboardData;
}

export default function DashboardShell({
  userRole,
  userId,
  userName,
  dashboardData
}: DashboardShellProps) {

  const [notificationCount, setNotificationCount] = useState(0);

  // Compute total unread notifications and pending items
  useEffect(() => {
    const count = (dashboardData.pendingApprovals?.length || 0) +
                  (dashboardData.alerts?.length || 0) +
                  (dashboardData.conflicts?.length || 0);
    setNotificationCount(count);
  }, [dashboardData]);

  const roleLabels = {
    [UserRole.CONSULTANT]: 'Resource User',
    [UserRole.GROWTH_TEAM]: 'Portfolio Manager'
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 lg:px-6">
          {/* Left: Logo and Role Indicator */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <LayoutGrid className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">AgilePM</span>
            </div>
            
            {/* Role Badge */}
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {roleLabels[userRole]}
            </Badge>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center space-x-3">
            {/* Notification Bell */}
            <NotificationCenter
              notifications={dashboardData.notifications || []}
              pendingApprovals={dashboardData.pendingApprovals || []}
              alerts={dashboardData.alerts || []}
              userRole={userRole}
            />

            {/* Settings */}
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Top Banner */}
        <div className="w-full lg:hidden">
          <TopBanner dashboardData={dashboardData} userRole={userRole} />
        </div>

        <main className="flex-1 flex flex-col lg:flex-row">
          <div className="hidden lg:block w-full">
            <TopBanner dashboardData={dashboardData} userRole={userRole} />
          </div>
        </main>
      </div>

      {/* Two-column layout */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Main Panel */}
        <div className="flex-1 p-4 lg:p-6 space-y-6">
          <MainPanel dashboardData={dashboardData} userRole={userRole} userId={userId} />
        </div>

        {/* Right Sidebar */}
        <aside className="w-full lg:w-80 xl:w-96 border-l border-gray-200 bg-white">
          <RightSidebar
            dashboardData={dashboardData}
            userRole={userRole}
            userId={userId}
            userName={userName}
          />
        </aside>
      </div>
    </div>
  );
}
