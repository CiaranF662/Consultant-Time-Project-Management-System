'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  FaHome, 
  FaProjectDiagram, 
  FaClock, 
  FaUsers, 
  FaChartBar,
  FaBars,
  FaTimes,
  FaUserPlus,
  FaChevronLeft,
  FaChevronRight,
  FaSignOutAlt,
  FaClipboardList,
  FaMoneyBillWave,
  FaCalendarWeek,
  FaBell
} from 'react-icons/fa';
import NotificationBadge from './notifications/NotificationBadge';
import { UserRole } from '@prisma/client';
import { signOut } from 'next-auth/react';

interface SidebarProps {
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
  requiresPM?: boolean; // For items that require PM role
}

export default function Sidebar({ children }: SidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDynamicPM, setIsDynamicPM] = useState(false);

  // Dynamically check if user is a Product Manager
  useEffect(() => {
    if (session?.user?.id && session.user.role !== UserRole.GROWTH_TEAM) {
      fetch('/api/user/pm-status')
        .then(res => res.json())
        .then(data => {
          setIsDynamicPM(data.isProductManager || false);
        })
        .catch(() => {
          setIsDynamicPM(false);
        });
    }
  }, [session?.user?.id, session?.user?.role]);

  if (!session?.user) {
    return <div>{children}</div>;
  }

  const userRole = session.user.role as UserRole;
  const isProductManager = session.user.isProductManager || isDynamicPM;
  const isGrowthTeam = userRole === UserRole.GROWTH_TEAM;

  // Define navigation items based on role
  const getNavItems = (): NavItem[] => {
    const items: NavItem[] = [];

    if (isGrowthTeam) {
      // Growth Team Menu
      items.push(
        {
          label: 'Dashboard',
          href: '/dashboard',
          icon: FaChartBar,
          roles: [UserRole.GROWTH_TEAM]
        },
        {
          label: 'All Projects',
          href: '/dashboard/projects',
          icon: FaProjectDiagram,
          roles: [UserRole.GROWTH_TEAM]
        },
        {
          label: 'Budget Overview',
          href: '/dashboard/budget',
          icon: FaMoneyBillWave,
          roles: [UserRole.GROWTH_TEAM]
        },
        {
          label: 'Manage Users',
          href: '/dashboard/admin/manage-users',
          icon: FaUsers,
          roles: [UserRole.GROWTH_TEAM]
        },
        {
          label: 'User Approvals',
          href: '/dashboard/admin/user-approvals',
          icon: FaUserPlus,
          roles: [UserRole.GROWTH_TEAM]
        },
        {
          label: 'Notifications',
          href: '/dashboard/notifications',
          icon: FaBell,
          roles: [UserRole.GROWTH_TEAM]
        }
      );
    } else {
      // Consultant Menu
      items.push(
        {
          label: 'Weekly Planner',
          href: '/dashboard',
          icon: FaCalendarWeek,
          roles: [UserRole.CONSULTANT]
        },
        {
          label: 'My Allocations',
          href: '/dashboard/allocations',
          icon: FaClipboardList,
          roles: [UserRole.CONSULTANT]
        },
        {
          label: 'My Projects',
          href: '/dashboard/projects',
          icon: FaProjectDiagram,
          roles: [UserRole.CONSULTANT]
        },
        {
          label: 'Hour Requests',
          href: '/dashboard/hour-requests',
          icon: FaClock,
          roles: [UserRole.CONSULTANT]
        },
        {
          label: 'Notifications',
          href: '/dashboard/notifications',
          icon: FaBell,
          roles: [UserRole.CONSULTANT]
        }
      );

      // Add PM-specific items if user is a Product Manager
      if (isProductManager) {
        items.push(
          {
            label: 'Phase Planning',
            href: '/dashboard/phase-planning',
            icon: FaClipboardList,
            requiresPM: true
          },
          {
            label: 'Team Allocations',
            href: '/dashboard/team-allocations',
            icon: FaUsers,
            requiresPM: true
          },
          {
            label: 'Hour Change Approvals',
            href: '/dashboard/admin/hour-changes',
            icon: FaClock,
            requiresPM: true
          },
          {
            label: 'Budget Overview',
            href: '/dashboard/pm-budget',
            icon: FaMoneyBillWave,
            requiresPM: true
          }
        );
      }
    }

    return items;
  };

  const navItems = getNavItems();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold text-gray-800">Resource System</h1>
          <div className="flex items-center gap-2">
            <NotificationBadge />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              {isMobileMenuOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Mobile menu drawer */}
      <div className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-800">Resource System</h1>
          </div>
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                    ${isActive(item.href)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <FaSignOutAlt className="mr-3 h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className={`
        hidden lg:block fixed inset-y-0 left-0 z-50 bg-white shadow-lg transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-16' : 'w-64'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            {!isCollapsed && (
              <h1 className="text-xl font-bold text-gray-800">Resource System</h1>
            )}
            <div className="flex items-center gap-2">
              <NotificationBadge />
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors ${
                  isCollapsed ? 'w-full flex justify-center' : ''
                }`}
              >
                {isCollapsed ? <FaChevronRight size={16} /> : <FaChevronLeft size={16} />}
              </button>
            </div>
          </div>

          {/* User info */}
          {!isCollapsed && (
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <Link href="/profile" className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {session.user.name?.charAt(0) || session.user.email?.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {session.user.name || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {isGrowthTeam ? 'Growth Team' : isProductManager ? 'Product Manager' : 'Consultant'}
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          )}

          {/* Collapsed user avatar */}
          {isCollapsed && (
            <div className="p-2 border-b border-gray-200 flex justify-center">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-xs">
                  {session.user.name?.charAt(0) || session.user.email?.charAt(0)}
                </span>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.href} className="relative group">
                  <Link
                    href={item.href}
                    className={`
                      flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors relative
                      ${isActive(item.href)
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }
                      ${isCollapsed ? 'justify-center' : ''}
                    `}
                  >
                    <Icon className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'}`} />
                    {!isCollapsed && item.label}
                    
                    {/* Active indicator for collapsed mode */}
                    {isCollapsed && isActive(item.href) && (
                      <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-blue-700 rounded-l-full"></div>
                    )}
                  </Link>
                  
                  {/* Tooltip for collapsed mode */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 top-1/2 transform -translate-y-1/2">
                      {item.label}
                      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 border-4 border-transparent border-r-gray-900"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Sign out button */}
          <div className="p-2 border-t border-gray-200">
            {isCollapsed ? (
              <div className="relative group">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  <FaSignOutAlt className="h-5 w-5" />
                </button>
                <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 top-1/2 transform -translate-y-1/2">
                  Sign Out
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 border-4 border-transparent border-r-gray-900"></div>
                </div>
              </div>
            ) : (
              <button
                onClick={handleSignOut}
                className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <FaSignOutAlt className="mr-3 h-5 w-5" />
                Sign Out
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`
        transition-all duration-300 ease-in-out min-h-screen
        lg:ml-16 ${!isCollapsed ? 'lg:ml-64' : ''}
      `}>
        <main className="pt-16 lg:pt-0">
          {children}
        </main>
      </div>
    </div>
  );
}