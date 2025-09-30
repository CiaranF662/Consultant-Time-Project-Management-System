'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import axios from 'axios';
import { FaBell, FaSpinner } from 'react-icons/fa';
import NotificationDropdown from './NotificationDropdown';

interface NotificationBadgeProps {
  className?: string;
}

export default function NotificationBadge({ className = '' }: NotificationBadgeProps) {
  const { data: session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'left' | 'right'>('right');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Fetch unread count
  useEffect(() => {
    if (session?.user?.id) {
      fetchUnreadCount();
      // Set up periodic refresh to catch updates from other tabs/windows
      const interval = setInterval(fetchUnreadCount, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [session?.user?.id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Refresh count when user returns to tab or notifications are updated elsewhere
  useEffect(() => {
    if (session?.user?.id) {
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          fetchUnreadCount();
        }
      };

      const handleFocus = () => {
        fetchUnreadCount();
      };

      // Listen for localStorage changes (for cross-tab communication)
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'notifications-updated') {
          fetchUnreadCount();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleFocus);
      window.addEventListener('storage', handleStorageChange);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);
        window.removeEventListener('storage', handleStorageChange);
      };
    }
  }, [session?.user?.id]);

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get('/api/notifications?limit=1&unreadOnly=true');
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
      // Set count to 0 on error to prevent component from breaking
      setUnreadCount(0);
    }
  };

  const handleToggleDropdown = () => {
    if (!isOpen && buttonRef.current) {
      // Calculate position before opening dropdown
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 320; // 80 * 4 (w-80 in rem)
      const shouldAlignLeft = rect.right + dropdownWidth > window.innerWidth;
      setDropdownPosition(shouldAlignLeft ? 'left' : 'right');
    }
    setIsOpen(!isOpen);
  };

  const handleNotificationUpdate = () => {
    // Refresh unread count after notification actions
    fetchUnreadCount();
  };

  // Refresh count when dropdown closes (in case notifications were marked as read)
  const handleDropdownClose = () => {
    setIsOpen(false);
    // Small delay to ensure any pending mark-as-read operations complete
    setTimeout(() => {
      fetchUnreadCount();
    }, 100);
  };

  if (!session?.user?.id) {
    return null;
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        ref={buttonRef}
        onClick={handleToggleDropdown}
        className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
        aria-label="Notifications"
        title="Notifications"
      >
        <FaBell className="w-5 h-5" />
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-medium min-w-[18px] h-[18px] flex items-center justify-center rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div 
          className={`absolute top-full mt-2 z-50 ${
            dropdownPosition === 'left' ? 'right-0' : 'left-0'
          }`}
        >
          <NotificationDropdown
            onClose={handleDropdownClose}
            onNotificationUpdate={handleNotificationUpdate}
          />
        </div>
      )}
    </div>
  );
}