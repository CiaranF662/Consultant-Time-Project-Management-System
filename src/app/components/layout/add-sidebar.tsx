'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTheme } from '@/app/contexts/ThemeContext';
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
  FaBell,
  FaCog
} from 'react-icons/fa';
import NotificationBadge from '@/app/components/notifications/NotificationBadge';
import { UserRole } from '@prisma/client';
import { signOut } from 'next-auth/react';
import Tooltip from '@/app/components/ui/tooltip';

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

//#region Default Sidebar Function
export default function Sidebar({ children }: SidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { theme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeHref, setActiveHref] = useState('');

  // Clear active state when pathname changes
  useEffect(() => {
    setActiveHref('');
  }, [pathname]);

// #region Load collapse state from localStorage
useEffect(() => {
  const collapsed = localStorage.getItem('sidebar-collapsed');
  if (collapsed) setIsCollapsed(collapsed === 'true');
}, []);
//endregion

// Toggle function
const toggleCollapse = () => {
  setIsCollapsed(prev => {
    localStorage.setItem('sidebar-collapsed', (!prev).toString());
    return !prev;
  });
};
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
          icon: FaHome,
          roles: [UserRole.GROWTH_TEAM]
        },
        {
          label: 'All Projects',
          href: '/projects',
          icon: FaProjectDiagram,
          roles: [UserRole.GROWTH_TEAM]
        },
        {
          label: 'Budget Overview',
          href: '/budget',
          icon: FaMoneyBillWave,
          roles: [UserRole.GROWTH_TEAM]
        },
        {
          label: 'Resource Timeline',
          href: '/resource-timeline',
          icon: FaChartBar,
          roles: [UserRole.GROWTH_TEAM]
        },
        {
          label: 'Gantt Chart',
          href: '/gantt',
          icon: FaClipboardList,
          roles: [UserRole.GROWTH_TEAM]
        },
        {
          label: 'Manage Users',
          href: '/manage-users',
          icon: FaUsers,
          roles: [UserRole.GROWTH_TEAM]
        },
        {
          label: 'Reports',
          href: '/reports',
          icon: FaChartBar,
          roles: [UserRole.GROWTH_TEAM]
        },
        {
          label: 'Notifications',
          href: '/notifications',
          icon: FaBell,
          roles: [UserRole.GROWTH_TEAM]
        }
      );
    } else {
      // Consultant Menu
      items.push(
        {
          label: 'Dashboard',
          href: '/dashboard',
          icon: FaHome,
          roles: [UserRole.CONSULTANT]
        },
        {
          label: 'My Allocations',
          href: '/allocations',
          icon: FaClipboardList,
          roles: [UserRole.CONSULTANT]
        },
        {
          label: 'My Projects',
          href: '/projects',
          icon: FaProjectDiagram,
          roles: [UserRole.CONSULTANT]
        },
        {
          label: 'Hour Requests',
          href: '/hour-requests',
          icon: FaClock,
          roles: [UserRole.CONSULTANT]
        },
        {
          label: 'Notifications',
          href: '/notifications',
          icon: FaBell,
          roles: [UserRole.CONSULTANT]
        }
      );

      //PM-specific items if user is a Product Manager
      if (isProductManager) {
        items.push(
          {
            label: 'Phase Planning',
            href: '/phase-planning',
            icon: FaClipboardList,
            requiresPM: true
          },
          {
            label: 'Team Allocations',
            href: '/team-allocations',
            icon: FaUsers,
            requiresPM: true
          },
          {
            label: 'Hour Change Approvals',
            href: '/hour-changes',
            icon: FaClock,
            requiresPM: true
          },
          {
            label: 'Budget Overview',
            href: '/budget',
            icon: FaMoneyBillWave,
            requiresPM: true
          },
          {
            label: 'Gantt Chart',
            href: '/gantt',
            icon: FaClipboardList,
            requiresPM: true
          }
        );
      }
    }

    return items;
  };

  const navItems = getNavItems();

  const isActive = (href: string) => {
    // Check if this item was just clicked (immediate feedback)
    if (activeHref === href) {
      return true;
    }
    // Fall back to pathname matching
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  const handleNavClick = (href: string) => {
    setActiveHref(href);
    setIsMobileMenuOpen(false);
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Mobile menu button */}
      <div className={`lg:hidden fixed top-0 left-0 right-0 z-50 shadow-sm border-b ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between p-4">
          <h1 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>AgileRS</h1>
          <div className="flex items-center gap-2">
            <NotificationBadge />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`p-2 rounded-md transition-colors ${theme === 'dark' ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
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
      <div className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 shadow-lg transform transition-transform ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex flex-col h-full">
          <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <h1 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>AgileRS</h1>
          </div>
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className={`
                    flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                    ${isActive(item.href)
                      ? 'bg-blue-100 text-blue-700'
                      : theme === 'dark' 
                        ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.label}
                </Link>
              );
            })}
            
            {/* Settings Link for Mobile */}
            <Link
              href="/settings"
              onClick={() => handleNavClick('/settings')}
              className={`
                flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                ${isActive('/settings')
                  ? 'bg-blue-100 text-blue-700'
                  : theme === 'dark'
                    ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }
              `}
            >
              <FaCog className="h-5 w-5 mr-3" />
              Settings
            </Link>
          </nav>
          <div className={`p-4 border-t space-y-1 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <Link
              href="/settings"
              onClick={() => handleNavClick('/settings')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive('/settings')
                  ? 'bg-blue-100 text-blue-700'
                  : theme === 'dark'
                    ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <FaCog className="mr-3 h-5 w-5" />
              Settings
            </Link>
            <button
              onClick={handleSignOut}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${theme === 'dark' ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
            >
              <FaSignOutAlt className="mr-3 h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className={`
        hidden lg:block fixed inset-y-0 left-0 z-50 shadow-lg transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-16' : 'w-64'} ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`flex items-center justify-between h-16 px-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            {!isCollapsed && (
              <h1 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>AgileRS</h1>
            )}
            {/* Collapse/Expand Notifications */}
            <div className="flex items-center gap-2">
              {!isCollapsed && <NotificationBadge />}
              <div className="relative group">
                <button
                  onClick={toggleCollapse}
                  className={`p-2 rounded-md transition-colors ${
                    isCollapsed ? 'w-full flex justify-center' : ''
                  } ${theme === 'dark' ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
                >
                  {isCollapsed ? <FaChevronRight size={16} /> : <FaChevronLeft size={16} />}
                </button>

                {/* Tooltip */}
                {isCollapsed && (
                  <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 px-3 py-2 
                  bg-gray-900 text-white text-sm rounded-md opacity-0 invisible group-hover:opacity-100 
                    group-hover:visible translate-x-[-10px] group-hover:translate-x-0 
                    transition-all duration-300 ease-out whitespace-nowrap pointer-events-none z-[999999]">
                    Open Sidebar
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 
                      border-4 border-transparent border-r-gray-900"></div>
                    </div>
                )}

                {!isCollapsed && (
                  <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 px-3 py-2 
                    bg-gray-900 text-white text-sm rounded-md opacity-0 invisible group-hover:opacity-100 
                    group-hover:visible translate-x-[-10px] group-hover:translate-x-0 
                    transition-all duration-300 ease-out whitespace-nowrap pointer-events-none z-[999999]">
                    Close Sidebar
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 
                      border-4 border-transparent border-r-gray-900"></div>
                  </div>
                )}
                </div>
              </div>
            </div>

          {/* User info */}
          {!isCollapsed && (
            <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center space-x-3">
                <Link href="/profile" className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center overflow-hidden">
                    {session.user.image ? (
                      <img
                        src={session.user.image}
                        alt="Profile"
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-medium text-sm">
                        {session.user.name?.charAt(0) || session.user.email?.charAt(0)}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {session.user.name || 'User'}
                    </p>
                    <p className={`text-xs truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {isGrowthTeam ? 'Growth Team' : isProductManager ? 'Product Manager' : 'Consultant'}
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          )}

          {/* Collapsed user avatar */}
          {isCollapsed && (
            <div className={`p-2 border-b flex justify-center ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <Link href="/profile" className="relative group">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center overflow-hidden">
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white font-medium text-xs">
                    {session.user.name?.charAt(0) || session.user.email?.charAt(0)}
                  </span>
                )}
              </div>

              {/* Tooltip */}
              <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 px-3 py-2 
             bg-gray-900 text-white text-sm rounded-md opacity-0 invisible group-hover:opacity-100 
              group-hover:visible translate-x-[-10px] group-hover:translate-x-0 
              transition-all duration-300 ease-out whitespace-nowrap pointer-events-none z-[999999]">
              Profile Page
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 
                border-4 border-transparent border-r-gray-900"></div>
              </div>
            </Link>
          </div>
          )}


          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 relative overflow-visible">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.href} className="relative group">
                  <Link
                    href={item.href}
                    onClick={() => handleNavClick(item.href)}
                    className={`
                      flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors relative
                      ${isActive(item.href)
                        ? 'bg-blue-100 text-blue-700'
                        : theme === 'dark'
                          ? 'text-gray-300 hover:text-white hover:bg-gray-700'
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
                    <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 px-3 py-2 bg-gray-900 text-white text-sm 
                    rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible
                    translate-x-[-10px] group-hover:translate-x-0
                    transition-all duration-300 ease-out whitespace-nowrap
                    pointer-events-none z-999999999999"
                    >
                      {item.label}
                      {/* Tooltip arrow */}
                      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 border-4 border-transparent border-r-gray-900"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Settings and Sign out buttons */}
          <div className={`p-2 border-t space-y-1 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            {/* Settings Button */}
            {isCollapsed ? (
              <div className="relative group">
                <Link
                  href="/settings"
                  onClick={() => handleNavClick('/settings')}
                  className={`w-full flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive('/settings')
                      ? 'bg-blue-100 text-blue-700'
                      : theme === 'dark'
                        ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <FaCog className="h-5 w-5" />
                </Link>
                <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 top-1/2 transform -translate-y-1/2">
                  Settings
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 border-4 border-transparent border-r-gray-900"></div>
                </div>
              </div>
            ) : (
              <Link
                href="/settings"
                onClick={() => handleNavClick('/settings')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive('/settings')
                    ? 'bg-blue-100 text-blue-700'
                    : theme === 'dark'
                      ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <FaCog className="mr-3 h-5 w-5" />
                Settings
              </Link>
            )}

            {/* Sign Out Button */}
            {isCollapsed ? (
              <div className="relative group">
                <button
                  onClick={handleSignOut}
                  className={`w-full flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${theme === 'dark' ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
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
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${theme === 'dark' ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
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
// #endregion