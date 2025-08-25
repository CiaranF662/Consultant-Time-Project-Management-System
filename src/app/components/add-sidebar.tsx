"use client";
import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  FaHome, 
  FaProjectDiagram, 
  FaTasks, 
  FaClock, 
  FaUsers, 
  FaChartBar,
  FaCog,
  FaBars,
  FaTimes,
  FaUserPlus,
  FaCalendarAlt
} from 'react-icons/fa';
import { UserRole } from '@prisma/client';
import SignOutButton from './SignOutButton';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  Bell,
  Settings,
  LogOut,
  ChevronDown,
  User,
  Shield,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/app/components/ui/sidebar";
import { Button } from "@/app/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import { useAuth } from "@/app/hooks/useAuth";

type SidebarProps = {
  children?: React.ReactNode  // now optional
}


interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: FaHome,
    roles: [UserRole.CONSULTANT, UserRole.GROWTH_TEAM]
  },
  {
    label: 'My Projects',
    href: '/dashboard/my-projects',
    icon: FaProjectDiagram,
    roles: [UserRole.CONSULTANT]
  },
  {
    label: 'All Projects',
    href: '/dashboard/projects',
    icon: FaProjectDiagram,
    roles: [UserRole.GROWTH_TEAM]
  },
  {
    label: 'Create Project',
    href: '/dashboard/create-project',
    icon: FaCalendarAlt,
    roles: [UserRole.GROWTH_TEAM]
  },
  {
    label: 'My Tasks',
    href: '/dashboard/my-tasks',
    icon: FaTasks,
    roles: [UserRole.CONSULTANT]
  },
  {
    label: 'Time Tracking',
    href: '/dashboard/time-tracking',
    icon: FaClock,
    roles: [UserRole.CONSULTANT]
  },
  {
    label: 'Reports',
    href: '/dashboard/reports',
    icon: FaChartBar,
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
    label: 'Hour Requests',
    href: '/dashboard/admin/hour-changes',
    icon: FaClock,
    roles: [UserRole.GROWTH_TEAM]
  }
];

export default function DashSidebar({ children }: SidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!session?.user) {
    return <div>{children}</div>;
  }

  const userRole = session.user.role as UserRole;
  const filteredNavItems = navItems.filter(item => item.roles.includes(userRole));

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold text-gray-800">Consultant PM</h1>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            {isMobileMenuOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-800">Consultant PM</h1>
          </div>

          {/* User info */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
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
                  {userRole === UserRole.GROWTH_TEAM ? 'Growth Team' : 'Consultant'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                    ${isActive(item.href)
                      ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <SignOutButton />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 min-h-screen">
        <main className="pt-16 lg:pt-0">
          {children}
        </main>
      </div>
    </div>
  );
}