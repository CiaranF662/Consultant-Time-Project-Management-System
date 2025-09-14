'use client';

import { useState, useEffect } from 'react';
import { UserRole } from '@prisma/client';
import { Bell, Settings, LayoutGrid, Eye } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/app/components/ui/dropdown-menu';

// Dashboard Components
import TopBanner from '@/app/(features)/dashboard/components/TopBanner';
import MainPanel from '@/app/(features)/dashboard/components/MainPanel';
import RightSidebar from '@/app/(features)/dashboard/components/RightSidebar';
import NotificationCenter from '@/app/(features)/dashboard/components/NotificationCenter';
import { DashboardData } from '@/types/dashboard';

interface DashboardShellProps {
  userRole: UserRole;
  userId: string;
  userName: string;
  dashboardData: DashboardData;
}

/**
 * DashboardShell - Main layout container with responsive design
 * 
 * Features:
 * - Adaptive layout based on screen size
 * - Role-based view switching
 * - Notification center integration
 * - Customizable widget arrangement (future enhancement)
 */
export default function DashboardShell({
  userRole,
  userId,
  userName,
  dashboardData
}: DashboardShellProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(userRole);
  const [notificationCount, setNotificationCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Calculate notification count from dashboard data
  useEffect(() => {
    const count = (dashboardData.pendingApprovals?.length || 0) + 
                  (dashboardData.alerts?.length || 0) +
                  (dashboardData.conflicts?.length || 0);
    setNotificationCount(count);
  }, [dashboardData]);

  // Role display mapping
  const roleLabels = {
    [UserRole.CONSULTANT]: 'Resource User',
    [UserRole.GROWTH_TEAM]: 'Portfolio Manager'
  };

  // Available role views (for cross-role awareness)
  const availableRoleViews = userRole === UserRole.GROWTH_TEAM 
    ? [UserRole.GROWTH_TEAM, UserRole.CONSULTANT]
    : [userRole];

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
              {roleLabels[selectedRole]}
            </Badge>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center space-x-3">
            {/* Role Switcher (Admin only) */}
            {userRole === UserRole.GROWTH_TEAM && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="hidden md:flex">
                    <Eye className="w-4 h-4 mr-2" />
                    View as...
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {availableRoleViews.map((role) => (
                    <DropdownMenuItem
                      key={role}
                      onClick={() => setSelectedRole(role)}
                      className={selectedRole === role ? 'bg-blue-50' : ''}
                    >
                      {roleLabels[role]}
                      {selectedRole === role && (
                        <Badge variant="secondary" className="ml-2">Current</Badge>
                      )}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-gray-500 text-sm">
                    Cross-role awareness helps understand different perspectives
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Notification Bell */}
            <NotificationCenter
              notifications={dashboardData.notifications || []}
              pendingApprovals={dashboardData.pendingApprovals || []}
              alerts={dashboardData.alerts || []}
              userRole={selectedRole}
            />

            {/* Settings */}
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Top Banner - Project Context */}
        <div className="w-full lg:hidden">
          <TopBanner 
            dashboardData={dashboardData}
            userRole={selectedRole}
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 flex flex-col lg:flex-row">
          {/* Top Banner - Desktop */}
          <div className="hidden lg:block w-full">
            <TopBanner 
              dashboardData={dashboardData}
              userRole={selectedRole}
            />
          </div>
        </main>
      </div>

      {/* Two-column layout for main content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Main Panel - Charts and Analytics */}
        <div className="flex-1 p-4 lg:p-6 space-y-6">
          <MainPanel 
            dashboardData={dashboardData}
            userRole={selectedRole}
            userId={userId}
          />
        </div>

        {/* Right Sidebar - Role-specific widgets */}
        <aside className="w-full lg:w-80 xl:w-96 border-l border-gray-200 bg-white">
          <RightSidebar 
            dashboardData={dashboardData}
            userRole={selectedRole}
            userId={userId}
            userName={userName}
          />
        </aside>
      </div>
    </div>
  );
}