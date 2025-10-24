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
  FaChevronLeft,
  FaChevronRight,
  FaSignOutAlt,
  FaClipboardList,
  FaMoneyBillWave,
  FaCalendarWeek,
  FaBell,
  FaCheckCircle,
  FaChartLine
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
  key?: string; // Unique key for React mapping
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
      fetch('/api/current-user/pm-status')
        .then(res => res.json())
        .then(data => {
          setIsDynamicPM(data.isProductManager || false);
        })
        .catch(() => {
          setIsDynamicPM(false);
        });
    }
  }, [session?.user?.id, session?.user?.role]);

  // Persist sidebar collapsed state in localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-collapsed');
    if (savedState !== null) {
      setIsCollapsed(savedState === 'true');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed));
  }, [isCollapsed]);

  // Keyboard shortcut to toggle sidebar (Ctrl/Cmd + B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setIsCollapsed(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
          roles: [UserRole.GROWTH_TEAM],
          key: 'growth-dashboard'
        },
        {
          label: 'All Projects',
          href: '/dashboard/projects',
          icon: FaProjectDiagram,
          roles: [UserRole.GROWTH_TEAM],
          key: 'growth-projects'
        },
        {
          label: 'Budget Overview',
          href: '/dashboard/budget',
          icon: FaMoneyBillWave,
          roles: [UserRole.GROWTH_TEAM],
          key: 'growth-budget'
        },
        {
          label: 'Portfolio Timeline',
          href: '/dashboard/gantt',
          icon: FaChartLine,
          roles: [UserRole.GROWTH_TEAM],
          key: 'growth-gantt'
        },
        {
          label: 'Hour Approvals',
          href: '/dashboard/hour-approvals',
          icon: FaCheckCircle,
          roles: [UserRole.GROWTH_TEAM],
          key: 'growth-hour-approvals'
        },
        {
          label: 'Manage Users',
          href: '/dashboard/admin/manage-users',
          icon: FaUsers,
          roles: [UserRole.GROWTH_TEAM],
          key: 'growth-manage-users'
        },
        {
          label: 'Notifications',
          href: '/dashboard/notifications',
          icon: FaBell,
          roles: [UserRole.GROWTH_TEAM],
          key: 'growth-notifications'
        }
      );
    } else {
      // Consultant Menu
      items.push(
        {
          label: 'Dashboard',
          href: '/dashboard',
          icon: FaChartBar,
          roles: [UserRole.CONSULTANT],
          key: 'consultant-dashboard'
        },
        {
          label: 'Weekly Planner',
          href: '/dashboard/weekly-planner',
          icon: FaCalendarWeek,
          roles: [UserRole.CONSULTANT],
          key: 'consultant-weekly-planner'
        },
        {
          label: 'My Projects',
          href: '/dashboard/projects',
          icon: FaProjectDiagram,
          roles: [UserRole.CONSULTANT],
          key: 'consultant-projects'
        },
        {
          label: 'Portfolio View',
          href: '/dashboard/gantt',
          icon: FaChartLine,
          roles: [UserRole.CONSULTANT],
          key: 'consultant-gantt'
        },
        {
          label: 'Hour Requests',
          href: '/dashboard/hour-requests',
          icon: FaClock,
          roles: [UserRole.CONSULTANT],
          key: 'consultant-hour-requests'
        },
        {
          label: 'Notifications',
          href: '/dashboard/notifications',
          icon: FaBell,
          roles: [UserRole.CONSULTANT],
          key: 'consultant-notifications'
        }
      );

      // Add PM-specific items if user is a Product Manager
      if (isProductManager) {
        // Replace the regular Dashboard with PM Dashboard
        const dashboardIndex = items.findIndex(item => item.key === 'consultant-dashboard');
        if (dashboardIndex > -1) {
          items[dashboardIndex] = {
            label: 'Dashboard',
            href: '/dashboard',
            icon: FaChartBar,
            requiresPM: true,
            key: 'pm-dashboard'
          };
        }

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
    signOut({ callbackUrl: '/auth/login' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card shadow-sm border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            {/* Mobile Logo */}
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex flex-col items-center justify-center shadow-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-transparent"></div>
              <span className="text-white font-bold text-base relative z-10" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 700 }}>a</span>
              <div className="flex items-center gap-0.5 relative z-10 -mt-0.5">
                <div className="w-1 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-0.5 bg-white rounded-full"></div>
              </div>
            </div>
            <h1 className="text-xl font-bold text-foreground tracking-tight" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 300, letterSpacing: '-0.02em' }}>
              agility
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBadge />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
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
      <div className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-card shadow-lg transform transition-transform ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              {/* Mobile Drawer Logo */}
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex flex-col items-center justify-center shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-transparent"></div>
                <span className="text-white font-bold text-base relative z-10" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 700 }}>a</span>
                <div className="flex items-center gap-0.5 relative z-10 -mt-0.5">
                  <div className="w-1 h-1 bg-white rounded-full"></div>
                  <div className="w-2 h-0.5 bg-white rounded-full"></div>
                </div>
              </div>
              <h1 className="text-xl font-bold text-foreground tracking-tight" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 300, letterSpacing: '-0.02em' }}>
                agility
              </h1>
            </div>
          </div>
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.key || item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                    ${isActive(item.href)
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }
                  `}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t border-border">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <FaSignOutAlt className="mr-3 h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className={`
        hidden lg:block fixed inset-y-0 left-0 z-50 bg-sidebar shadow-lg transition-all duration-300 ease-in-out border-r border-sidebar-border
        ${isCollapsed ? 'w-16' : 'w-64'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border bg-sidebar/50 backdrop-blur-sm">
            {isCollapsed ? (
              <div className="flex flex-col items-center gap-2 w-full">
                {/* Collapsed Logo Icon */}
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex flex-col items-center justify-center shadow-lg relative overflow-hidden">
                  {/* Background subtle pattern */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-transparent"></div>
                  {/* Letter 'a' */}
                  <span className="text-white font-bold text-lg relative z-10" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 700 }}>a</span>
                  {/* Minimalist icon below */}
                  <div className="flex items-center gap-0.5 relative z-10 -mt-0.5">
                    <div className="w-1 h-1 bg-white rounded-full"></div>
                    <div className="w-2 h-0.5 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {/* Full Logo Icon */}
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex flex-col items-center justify-center shadow-lg relative overflow-hidden">
                  {/* Background subtle pattern */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-transparent"></div>
                  {/* Letter 'a' */}
                  <span className="text-white font-bold text-lg relative z-10" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 700 }}>a</span>
                  {/* Minimalist icon below */}
                  <div className="flex items-center gap-0.5 relative z-10 -mt-0.5">
                    <div className="w-1 h-1 bg-white rounded-full"></div>
                    <div className="w-2 h-0.5 bg-white rounded-full"></div>
                  </div>
                </div>
                {/* Brand Name */}
                <h1 className="text-2xl font-bold text-sidebar-foreground tracking-tight" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 300, letterSpacing: '-0.02em' }}>
                  agility
                </h1>
              </div>
            )}
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <NotificationBadge />
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="p-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200"
                  title={`Collapse sidebar (${typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+B)`}
                >
                  <FaChevronLeft size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Collapse button for collapsed state */}
          {isCollapsed && (
            <div className="px-2 py-2 border-b border-sidebar-border flex justify-center">
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200 w-full flex justify-center"
                title={`Expand sidebar (${typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+B)`}
              >
                <FaChevronRight size={16} />
              </button>
            </div>
          )}

          {/* Notification Bell for Collapsed Sidebar */}
          {isCollapsed && (
            <div className="px-2 py-2 border-b border-sidebar-border flex justify-center">
              <NotificationBadge />
            </div>
          )}

          {/* User info */}
          {!isCollapsed && (
            <div className="p-4 border-b border-sidebar-border">
              <Link href="/profile" className="flex items-center space-x-3 group transition-all duration-200 hover:bg-sidebar-accent rounded-lg p-2 -m-2">
                <div className="relative">
                  <div className="w-11 h-11 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-lg ring-2 ring-sidebar-border group-hover:ring-primary/50 transition-all">
                    <span className="text-primary-foreground font-semibold text-base">
                      {session.user.name?.charAt(0) || session.user.email?.charAt(0)}
                    </span>
                  </div>
                  {/* Online status indicator */}
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-sidebar rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-sidebar-foreground truncate group-hover:text-sidebar-accent-foreground transition-colors">
                    {session.user.name || 'User'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                      isGrowthTeam
                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        : isProductManager
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        : 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                    }`}>
                      {isGrowthTeam ? 'Growth Team' : isProductManager ? 'Product Manager' : 'Consultant'}
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Collapsed user avatar */}
          {isCollapsed && (
            <div className="p-2 border-b border-sidebar-border flex justify-center">
              <Link href="/profile" className="relative group">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
                  <span className="text-primary-foreground font-medium text-xs">
                    {session.user.name?.charAt(0) || session.user.email?.charAt(0)}
                  </span>
                </div>
                {/* User info tooltip */}
                <div className="absolute left-full ml-2 px-3 py-2 bg-popover text-popover-foreground text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 top-1/2 transform -translate-y-1/2 border border-border shadow-md">
                  <div className="font-medium">{session.user.name || 'User'}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {isGrowthTeam ? 'Growth Team' : isProductManager ? 'Product Manager' : 'Consultant'}
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-sidebar-accent scrollbar-track-transparent">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <div key={item.key || item.href} className="relative group">
                  <Link
                    href={item.href}
                    className={`
                      flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 relative
                      ${active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-md'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-sm'
                      }
                      ${isCollapsed ? 'justify-center' : ''}
                    `}
                  >
                    {/* Icon with subtle background circle */}
                    <div className={`${isCollapsed ? '' : 'mr-3'} relative`}>
                      <div className={`
                        ${active ? 'bg-primary/10' : 'bg-transparent group-hover:bg-primary/5'}
                        rounded-md p-1.5 transition-all duration-200
                      `}>
                        <Icon className={`h-4 w-4 transition-transform duration-200 ${
                          active ? 'text-primary' : ''
                        } ${isCollapsed ? 'group-hover:scale-110' : ''}`} />
                      </div>
                    </div>

                    {!isCollapsed && (
                      <span className="flex-1">{item.label}</span>
                    )}

                    {/* Active indicator - left border for expanded, right for collapsed */}
                    {active && !isCollapsed && (
                      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full"></div>
                    )}

                    {isCollapsed && active && (
                      <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-primary rounded-l-full"></div>
                    )}
                  </Link>

                  {/* Tooltip for collapsed mode */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-3 py-2 bg-popover text-popover-foreground text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 top-1/2 transform -translate-y-1/2 border border-border shadow-lg pointer-events-none">
                      {item.label}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Sign out button */}
          <div className="p-3 border-t border-sidebar-border">
            {isCollapsed ? (
              <div className="relative group">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center px-3 py-2.5 text-sm font-medium rounded-lg text-sidebar-foreground hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 group"
                >
                  <div className="bg-transparent group-hover:bg-red-500/5 rounded-md p-1.5 transition-all duration-200">
                    <FaSignOutAlt className="h-4 w-4" />
                  </div>
                </button>
                <div className="absolute left-full ml-2 px-3 py-2 bg-popover text-popover-foreground text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 top-1/2 transform -translate-y-1/2 border border-border shadow-lg pointer-events-none">
                  Sign Out
                </div>
              </div>
            ) : (
              <button
                onClick={handleSignOut}
                className="w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-sidebar-foreground hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 group"
              >
                <div className="mr-3 bg-transparent group-hover:bg-red-500/5 rounded-md p-1.5 transition-all duration-200">
                  <FaSignOutAlt className="h-4 w-4" />
                </div>
                <span className="flex-1 text-left">Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`
        transition-all duration-300 ease-in-out min-h-screen
        ${isCollapsed ? 'lg:ml-16' : 'lg:ml-64'}
      `}>
        <main className="pt-16 lg:pt-0">
          {children}
        </main>
      </div>
    </div>
  );
}