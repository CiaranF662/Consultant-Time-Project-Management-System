'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  FaProjectDiagram,
  FaClock,
  FaUsers,
  FaChartBar,
  FaBars,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaSignOutAlt,
  FaMoneyBillWave,
  FaCalendarWeek,
  FaBell,
  FaCheckCircle,
  FaChartLine
} from 'react-icons/fa';
import NotificationBadge from '@/components/notifications/NotificationBadge';
import { UserRole } from '@prisma/client';

interface SidebarProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  roles?: UserRole[];
  requiresPM?: boolean; // For items that require PM role
  key?: string; // Unique key for React mapping
}

const LOGO_BLUE = '#0070f3';
const DARK_UNSELECTED = 'rgba(255,255,255,0.65)'; // light gray for dark mode unselected items
const WHITE = '#ffffff';

export default function Sidebar({ defaultOpen = true, children }: SidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDynamicPM, setIsDynamicPM] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // detect dark mode (checks .dark class and prefers-color-scheme)
  useEffect(() => {
    function detect() {
      if (typeof window === 'undefined') return false;
      const docClass = document.documentElement.classList.contains('dark');
      const prefers = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      return docClass || prefers;
    }
    setIsDarkMode(detect());

    const mql = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setIsDarkMode(detect());
    mql?.addEventListener?.('change', onChange);
    const observer = new MutationObserver(onChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      mql?.removeEventListener?.('change', onChange);
      observer.disconnect();
    };
  }, []);

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

  // Allow other parts of the app to request the sidebar be expanded
  useEffect(() => {
    function onExpand() {
      if (isCollapsed) setIsCollapsed(false);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('expand-sidebar', onExpand as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('expand-sidebar', onExpand as EventListener);
      }
    };
  }, [isCollapsed]);

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
      items.push(
        { label: 'Dashboard', href: '/dashboard', icon: FaChartBar, roles: [UserRole.GROWTH_TEAM], key: 'growth-dashboard' },
        { label: 'All Projects', href: '/dashboard/projects', icon: FaProjectDiagram, roles: [UserRole.GROWTH_TEAM], key: 'growth-projects' },
        { label: 'Budget Overview', href: '/dashboard/budget', icon: FaMoneyBillWave, roles: [UserRole.GROWTH_TEAM], key: 'growth-budget' },
        { label: 'Portfolio Timeline', href: '/dashboard/gantt', icon: FaChartLine, roles: [UserRole.GROWTH_TEAM], key: 'growth-gantt' },
        { label: 'Hour Approvals', href: '/dashboard/hour-approvals', icon: FaCheckCircle, roles: [UserRole.GROWTH_TEAM], key: 'growth-hour-approvals' },
        { label: 'Manage Users', href: '/dashboard/admin/manage-users', icon: FaUsers, roles: [UserRole.GROWTH_TEAM], key: 'growth-manage-users' },
        { label: 'Notifications', href: '/dashboard/notifications', icon: FaBell, roles: [UserRole.GROWTH_TEAM], key: 'growth-notifications' }
      );
    } else {
      items.push(
        { label: 'Dashboard', href: '/dashboard', icon: FaChartBar, roles: [UserRole.CONSULTANT], key: 'consultant-dashboard' },
        { label: 'Weekly Planner', href: '/dashboard/weekly-planner', icon: FaCalendarWeek, roles: [UserRole.CONSULTANT], key: 'consultant-weekly-planner' },
        { label: 'My Projects', href: '/dashboard/projects', icon: FaProjectDiagram, roles: [UserRole.CONSULTANT], key: 'consultant-projects' },
        { label: 'Portfolio View', href: '/dashboard/gantt', icon: FaChartLine, roles: [UserRole.CONSULTANT], key: 'consultant-gantt' },
        { label: 'Hour Requests', href: '/dashboard/hour-requests', icon: FaClock, roles: [UserRole.CONSULTANT], key: 'consultant-hour-requests' },
        { label: 'Notifications', href: '/dashboard/notifications', icon: FaBell, roles: [UserRole.CONSULTANT], key: 'consultant-notifications' }
      );

      if (isProductManager) {
        const dashboardIndex = items.findIndex(item => item.key === 'consultant-dashboard');
        if (dashboardIndex > -1) {
          items[dashboardIndex] = { label: 'Dashboard', href: '/dashboard', icon: FaChartBar, requiresPM: true, key: 'pm-dashboard' };
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

  // small NavLink wrapper that applies inline hover and active styles (no external CSS)
  function NavLink({
    href,
    active,
    children,
    onClick,
    className
  }: {
    href: string;
    active?: boolean;
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) {
    const [hover, setHover] = useState(false);

    const baseStyle: React.CSSProperties = {
      transition: 'background 120ms ease, color 120ms ease, transform 80ms ease',
      borderRadius: 8,
      display: 'flex',
      alignItems: 'center',
      color: isDarkMode && !active ? DARK_UNSELECTED : undefined // apply light gray in dark mode for unselected
    };

    const activeStyle: React.CSSProperties = active
      ? { background: LOGO_BLUE, color: WHITE, boxShadow: '0 2px 8px rgba(0, 112, 243, 0.18)' }
      : {};

    const hoverStyle: React.CSSProperties = hover && !active
      ? { background: LOGO_BLUE, color: WHITE, transform: 'translateY(-1px)' }
      : {};

    return (
      <Link
        href={href}
        onClick={onClick}
        className={className}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{ ...baseStyle, ...activeStyle, ...hoverStyle } as React.CSSProperties}
      >
        {children}
      </Link>
    );
  }

  return (
    <aside className={`sidebar ${isMobileMenuOpen ? 'open' : 'closed'}`} aria-hidden={!isMobileMenuOpen} aria-label="Main sidebar">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card shadow-sm border-b border-border">
        <div className="flex items-center justify-between p-4">
          <h1
            className="text-xl font-bold font-[family-name:var(--font-poppins)]"
            style={{ color: isDarkMode ? WHITE : undefined }}
          >
            Agility
          </h1>
          <div className="flex items-center gap-2">
            {/* keep notification white in dark mode; hide in collapsed state */}
            {!isCollapsed && (
              <span style={{ color: isDarkMode ? WHITE : undefined, display: 'inline-flex', alignItems: 'center' }}>
                <NotificationBadge />
              </span>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
              style={{ color: isDarkMode ? WHITE : undefined }}
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
      <div className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-card shadow-lg transform transition-transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-border">
            <h1 className="text-xl font-bold text-foreground font-[family-name:var(--font-poppins)]">Agility</h1>
          </div>
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <NavLink
                  key={item.key || item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  active={active}
                  className="px-3 py-2 text-sm font-medium rounded-md"
                >
                  <Icon className="h-5 w-5 mr-3" />
                  <span style={{ marginLeft: 8 }}>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
          <div className="p-4 border-t border-border">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              style={{ color: isDarkMode ? WHITE : undefined }}
            >
              <FaSignOutAlt className="mr-3 h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div
        className={`hidden lg:block fixed inset-y-0 left-0 z-50 bg-sidebar shadow-lg transition-all duration-300 ease-in-out border-r border-sidebar-border ${isCollapsed ? 'w-16 cursor-pointer' : 'w-64'}`}
        // When collapsed allow clicking the empty sidebar area to expand.
        onClick={(e) => {
          if (!isCollapsed) return;
          // don't expand when the user clicked an interactive element (links, buttons, inputs, svgs)
          const target = e.target as HTMLElement | null;
          if (target && target.closest && target.closest('a,button,input,textarea,select,svg,path')) return;
          setIsCollapsed(false);
        }}
        role="navigation"
        aria-expanded={!isCollapsed}
        title={isCollapsed ? 'Expand sidebar' : undefined}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
            {!isCollapsed && (
              <h1 className="text-xl font-bold text-sidebar-foreground font-[family-name:var(--font-poppins)]" style={{ color: isDarkMode ? WHITE : undefined }}>
                Agility
              </h1>
            )}
            <div className="flex items-center gap-2">
              {!isCollapsed && (
                <span style={{ color: isDarkMode ? WHITE : undefined, display: 'inline-flex', alignItems: 'center' }}>
                  <NotificationBadge />
                </span>
              )}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`p-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors ${isCollapsed ? 'w-full flex justify-center' : ''}`}
                style={{ color: isDarkMode ? WHITE : undefined }}
              >
                {isCollapsed ? <FaChevronRight size={16} /> : <FaChevronLeft size={16} />}
              </button>
            </div>
          </div>

          {/* User info */}
          {!isCollapsed && (
            <div className="p-4 border-b border-sidebar-border">
              <Link href="/profile" className="block w-full" aria-label="Open profile">
                <a
                  className="flex items-center space-x-3 w-full focus:outline-none focus:ring-2 focus:ring-offset-0 rounded"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      // let Link handle navigation; preventDefault to avoid scrolling on Space
                      e.preventDefault();
                    }
                  }}
                >
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-primary-foreground font-medium text-sm">
                      {session.user.name?.charAt(0) || session.user.email?.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: isDarkMode ? WHITE : undefined }}>
                      {session.user.name || 'User'}
                    </p>
                    <p className="text-xs truncate" style={{ color: isDarkMode ? DARK_UNSELECTED : undefined }}>
                      {isGrowthTeam ? 'Growth Team' : isProductManager ? 'Product Manager' : 'Consultant'}
                    </p>
                  </div>
                </a>
              </Link>
            </div>
          )}

          {/* Collapsed user avatar */}
          {isCollapsed && (
            <div className="p-2 border-b border-sidebar-border flex justify-center">
              <Link href="/profile" aria-label="Open profile">
                <a
                  className="w-8 h-8 inline-flex items-center justify-center rounded-full focus:outline-none focus:ring-2"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
                  }}
                >
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-primary-foreground font-medium text-xs">
                      {session.user.name?.charAt(0) || session.user.email?.charAt(0)}
                    </span>
                  </div>
                </a>
              </Link>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <div key={item.key || item.href} className="relative group">
                  <NavLink
                    href={item.href}
                    active={active}
                    className={`px-3 py-2 text-sm font-medium rounded-md relative ${isCollapsed ? 'justify-center flex' : 'flex items-center'}`}
                  >
                    <Icon className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'}`} style={{ color: isDarkMode && !active ? DARK_UNSELECTED : undefined }} />
                    {!isCollapsed && <span style={{ color: isDarkMode && !active ? DARK_UNSELECTED : undefined }}>{item.label}</span>}

                    {/* Active indicator for collapsed mode */}
                    {isCollapsed && active && (
                      <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', width: 4, height: 36, background: LOGO_BLUE, borderRadius: '0 4px 4px 0' }} />
                    )}
                  </NavLink>

                  {/* Tooltip for collapsed mode */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-3 py-2 bg-popover text-popover-foreground text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 top-1/2 transform -translate-y-1/2 border border-border shadow-md">
                      {item.label}
                    </div>
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
                  style={{ color: isDarkMode ? WHITE : undefined }}
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
                style={{ color: isDarkMode ? WHITE : undefined }}
              >
                <FaSignOutAlt className="mr-3 h-5 w-5" />
                Sign Out
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`transition-all duration-300 ease-in-out min-h-screen ${isCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
        <main className="pt-16 lg:pt-0">
          {children}
        </main>
      </div>
    </aside>
  );
}