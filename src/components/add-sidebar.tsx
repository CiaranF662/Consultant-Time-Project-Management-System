'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

  // Tooltip portal state (keeps tooltip out of scroll/overflow containers)
  const [tooltipState, setTooltipState] = useState<{ visible: boolean; label: string; x: number; y: number }>({
    visible: false,
    label: '',
    x: 0,
    y: 0
  });

  const showTooltip = (el: HTMLElement | null, label: string) => {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setTooltipState({
      visible: true,
      label,
      x: rect.right + 8,
      y: rect.top + rect.height / 2
    });
  };
  const hideTooltip = () => setTooltipState({ visible: false, label: '', x: 0, y: 0 });

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
          <h1 className="text-xl font-bold text-foreground font-[family-name:var(--font-poppins)]">Agility</h1>
          <div className="flex items-center gap-2">
            <NotificationBadge />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
              onMouseEnter={(e) => showTooltip(e.currentTarget as HTMLElement, isMobileMenuOpen ? 'Close menu' : 'Open menu')}
              onMouseLeave={hideTooltip}
              onFocus={(e) => showTooltip(e.currentTarget as HTMLElement, isMobileMenuOpen ? 'Close menu' : 'Open menu')}
              onBlur={hideTooltip}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
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
      <div className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-card shadow-lg transform transition-transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-border">
            <h1 className="text-xl font-bold text-foreground font-[family-name:var(--font-poppins)]">Agility</h1>
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
          <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
            {!isCollapsed && (
              <h1 className="text-xl font-bold text-sidebar-foreground font-[family-name:var(--font-poppins)]">Agility</h1>
            )}
            <div className="flex items-center gap-2">
              {!isCollapsed && <NotificationBadge />}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`p-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors ${isCollapsed ? 'w-full flex justify-center' : ''
                  }`}
                onMouseEnter={(e) => showTooltip(e.currentTarget as HTMLElement, isCollapsed ? 'Expand sidebar' : 'Collapse sidebar')}
                onMouseLeave={hideTooltip}
                onFocus={(e) => showTooltip(e.currentTarget as HTMLElement, isCollapsed ? 'Expand sidebar' : 'Collapse sidebar')}
                onBlur={hideTooltip}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? <FaChevronRight size={16} /> : <FaChevronLeft size={16} />}
              </button>
            </div>
          </div>

          {/* User info */}
          {!isCollapsed && (
            <div className="p-4 border-b border-sidebar-border">
              <div className="flex items-center space-x-3">
                <Link href="/profile" className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-primary-foreground font-medium text-sm">
                      {session.user.name?.charAt(0) || session.user.email?.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">
                      {session.user.name || 'User'}
                    </p>
                    <p className="text-xs text-sidebar-foreground/60 truncate">
                      {isGrowthTeam ? 'Growth Team' : isProductManager ? 'Product Manager' : 'Consultant'}
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          )}

          {/* Collapsed user avatar */}
          {isCollapsed && (
            <div className="p-2 border-b border-sidebar-border flex justify-center">
              <Link
                href="/profile"
                aria-label="Open profile"
                className="w-8 h-8 inline-flex items-center justify-center rounded-full focus:outline-none focus:ring-2"
                onMouseEnter={(e) => showTooltip(e.currentTarget as HTMLElement, 'Profile')}
                onMouseLeave={hideTooltip}
                onFocus={(e) => showTooltip(e.currentTarget as HTMLElement, 'Profile')}
                onBlur={hideTooltip}
              >
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground font-medium text-xs">
                    {session.user.name?.charAt(0) || session.user.email?.charAt(0)}
                  </span>
                </div>
              </Link>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const key = item.key ?? item.href;
              const active = isActive(item.href);
              return (
                <div key={key} className="relative group">
                  {isCollapsed ? (
                    <Link
                      href={item.href}
                      aria-label={item.label}
                      title={item.label}
                      className={`
                        flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors relative
                        ${active ? 'bg-sidebar-primary text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}
                      `}
                      onMouseEnter={(e) => showTooltip(e.currentTarget as HTMLElement, item.label)}
                      onMouseLeave={hideTooltip}
                      onFocus={(e) => showTooltip(e.currentTarget as HTMLElement, item.label)}
                      onBlur={hideTooltip}
                      onClick={() => {
                        if (isMobileMenuOpen) setIsMobileMenuOpen(false);
                      }}
                    >
                      <Icon className="h-5 w-5" />
                    </Link>
                  ) : (
                    <Link
                      href={item.href}
                      className={`
                        flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors relative
                        ${active ? 'bg-sidebar-primary text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}
                      `}
                      onMouseEnter={() => {
                        /* keep tooltip behavior consistent for expanded items (optional) */
                      }}
                      onFocus={() => { }}
                    >
                      <Icon className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'}`} />
                      {!isCollapsed && item.label}
                    </Link>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Sign out button */}
          <div className="p-2 border-t border-sidebar-border">
            {isCollapsed ? (
              <div className="relative group">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                >
                  <FaSignOutAlt className="h-5 w-5" />
                </button>
                <div className="absolute left-full ml-2 px-3 py-2 bg-popover text-popover-foreground text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 top-1/2 transform -translate-y-1/2 border border-border shadow-md">
                  Sign Out
                </div>
              </div>
            ) : (
              <button
                onClick={handleSignOut}
                className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
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
        ${isCollapsed ? 'lg:ml-16' : 'lg:ml-64'}
      `}>
        <main className="pt-16 lg:pt-0">
          {children}
        </main>
      </div>

      {/* Tooltip portal (renders into document.body to avoid clipping) */}
      {typeof document !== 'undefined' &&
        createPortal(
          tooltipState.visible ? (
            <div
              role="tooltip"
              aria-hidden={!tooltipState.visible}
              style={{
                position: 'fixed',
                left: tooltipState.x,
                top: tooltipState.y,
                transform: 'translateY(-50%)',
                pointerEvents: 'none'
              }}
              className="z-[9999] pointer-events-none whitespace-nowrap rounded-md bg-popover text-popover-foreground text-sm px-2 py-1 shadow-md border border-border transition-opacity"
            >
              {tooltipState.label}
            </div>
          ) : null,
          document.body
        )}
    </div>
  );
}