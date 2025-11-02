'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { FaBell, FaSpinner, FaExternalLinkAlt, FaCheck } from 'react-icons/fa';

type NotificationType =
  | 'PROJECT_ASSIGNMENT'
  | 'HOUR_CHANGE_REQUEST'
  | 'HOUR_CHANGE_APPROVED'
  | 'HOUR_CHANGE_REJECTED'
  | 'PHASE_DEADLINE_WARNING'
  | 'USER_APPROVAL_NEEDED'
  | 'OVERDUE_APPROVAL_ALERT'
  | 'PHASE_ALLOCATION_PENDING'
  | 'PHASE_ALLOCATION_APPROVED'
  | 'PHASE_ALLOCATION_REJECTED'
  | 'PHASE_ALLOCATION_MODIFIED'
  | 'WEEKLY_ALLOCATION_PENDING'
  | 'WEEKLY_ALLOCATION_APPROVED'
  | 'WEEKLY_ALLOCATION_MODIFIED'
  | 'WEEKLY_ALLOCATION_REJECTED';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string | null;
  createdAt: string;
}

interface NotificationDropdownProps {
  onClose: () => void;
  onNotificationUpdate: () => void;
}

const notificationTypeConfig: Record<NotificationType, { icon: string; color: string }> = {
  PROJECT_ASSIGNMENT: { icon: '👥', color: 'text-blue-600' },
  HOUR_CHANGE_REQUEST: { icon: '⏰', color: 'text-yellow-600' },
  HOUR_CHANGE_APPROVED: { icon: '✅', color: 'text-green-600' },
  HOUR_CHANGE_REJECTED: { icon: '❌', color: 'text-red-600' },
  PHASE_DEADLINE_WARNING: { icon: '⚠️', color: 'text-orange-600' },
  USER_APPROVAL_NEEDED: { icon: '👤', color: 'text-purple-600' },
  OVERDUE_APPROVAL_ALERT: { icon: '🚨', color: 'text-red-600' },
  PHASE_ALLOCATION_PENDING: { icon: '📝', color: 'text-amber-600' },
  PHASE_ALLOCATION_APPROVED: { icon: '✅', color: 'text-green-600' },
  PHASE_ALLOCATION_REJECTED: { icon: '❌', color: 'text-red-600' },
  PHASE_ALLOCATION_MODIFIED: { icon: '✏️', color: 'text-blue-600' },
  WEEKLY_ALLOCATION_PENDING: { icon: '📅', color: 'text-amber-600' },
  WEEKLY_ALLOCATION_APPROVED: { icon: '✅', color: 'text-green-600' },
  WEEKLY_ALLOCATION_MODIFIED: { icon: '✏️', color: 'text-blue-600' },
  WEEKLY_ALLOCATION_REJECTED: { icon: '❌', color: 'text-red-600' }
};

export default function NotificationDropdown({ onClose, onNotificationUpdate }: NotificationDropdownProps) {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Get role-appropriate action URL for notifications
  const getRoleAwareActionUrl = (notification: Notification): string | null => {
    const userRole = session?.user?.role;

    // For Growth Team members, provide admin-focused routes
    if (userRole === 'GROWTH_TEAM') {
      switch (notification.type) {
        case 'HOUR_CHANGE_REQUEST':
          return '/dashboard/admin/hour-changes';
        case 'USER_APPROVAL_NEEDED':
          return '/dashboard/admin/user-approvals';
        case 'OVERDUE_APPROVAL_ALERT':
          return '/dashboard/admin/hour-changes';
        case 'PROJECT_ASSIGNMENT':
          // Growth team can view all projects
          return '/dashboard/projects';
        case 'PHASE_DEADLINE_WARNING':
          return '/dashboard/projects';
        case 'PHASE_ALLOCATION_PENDING':
        case 'WEEKLY_ALLOCATION_PENDING':
          // Growth team handles approvals
          return '/dashboard/hour-approvals';
        case 'PHASE_ALLOCATION_APPROVED':
        case 'PHASE_ALLOCATION_REJECTED':
        case 'PHASE_ALLOCATION_MODIFIED':
        case 'WEEKLY_ALLOCATION_APPROVED':
        case 'WEEKLY_ALLOCATION_MODIFIED':
        case 'WEEKLY_ALLOCATION_REJECTED':
        case 'HOUR_CHANGE_APPROVED':
        case 'HOUR_CHANGE_REJECTED':
          // These are informational for Growth Team - no action needed
          return null;
        default:
          return notification.actionUrl || null;
      }
    }

    // For consultants, use the original actionUrl
    return notification.actionUrl || null;
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get('/api/notifications?limit=8');
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      // Set safe defaults on error
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    try {
      // Optimistically update the UI first
      const targetNotification = notifications.find(n => n.id === notificationId);
      if (targetNotification && !targetNotification.isRead) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      // Then make the API call
      await axios.patch(`/api/notifications/${notificationId}`, { isRead: true });
      
      // Update the parent component
      onNotificationUpdate();
      
      // Trigger localStorage event for cross-tab communication
      localStorage.setItem('notifications-updated', Date.now().toString());
    } catch (error) {
      // Revert optimistic update on error
      const targetNotification = notifications.find(n => n.id === notificationId);
      if (targetNotification) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, isRead: false } : n)
        );
        setUnreadCount(prev => prev + 1);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    // Store previous state for rollback
    const previousNotifications = [...notifications];
    const previousUnreadCount = unreadCount;
    
    try {
      // Optimistically update UI
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      
      // Make API call
      await axios.post('/api/notifications/actions', { action: 'markAllAsRead' });
      
      // Update parent component
      onNotificationUpdate();
      
      // Trigger localStorage event for cross-tab communication
      localStorage.setItem('notifications-updated', Date.now().toString());
    } catch (error) {
      // Revert optimistic update on error
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read when clicked
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id, { preventDefault: () => {}, stopPropagation: () => {} } as React.MouseEvent);
    }
    
    // Close dropdown
    onClose();
  };

  return (
    <div className="w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden max-w-[calc(100vw-2rem)]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaBell className="text-gray-600 dark:text-gray-300" />
            <h3 className="font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-1 bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 text-xs font-medium rounded-full">
                {unreadCount}
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <FaSpinner className="animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8">
            <FaBell className="mx-auto text-2xl text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {notifications.map((notification) => {
              const config = notificationTypeConfig[notification.type] || { icon: '📋', color: 'text-gray-600 dark:text-gray-300' };
              const actionUrl = getRoleAwareActionUrl(notification);

              const content = (
                <div
                  className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
                    !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 text-sm">
                      {config.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${!notification.isRead ? 'text-foreground' : 'text-card-foreground'}`}>
                        {notification.title}
                      </p>
                      <p className={`text-xs mt-1 line-clamp-2 ${!notification.isRead ? 'text-card-foreground' : 'text-muted-foreground'}`}>
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(notification.createdAt)}
                        </span>

                        {actionUrl && (
                          <FaExternalLinkAlt className="text-xs text-blue-500 dark:text-blue-400" />
                        )}
                      </div>
                    </div>

                    {/* Read indicator */}
                    <div className="flex-shrink-0 flex items-center">
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                      )}

                      <button
                        onClick={(e) => handleMarkAsRead(notification.id, e)}
                        className="ml-2 p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-muted-foreground hover:text-card-foreground"
                        title="Mark as read"
                      >
                        <FaCheck className="text-xs" />
                      </button>
                    </div>
                  </div>
                </div>
              );

              // Wrap in Link if there's an actionUrl, otherwise return content directly
              return actionUrl ? (
                <Link key={notification.id} href={actionUrl} className="block group">
                  {content}
                </Link>
              ) : (
                <div key={notification.id} className="group">
                  {content}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <Link
            href="/dashboard/notifications"
            className="block text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
            onClick={onClose}
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}