'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { FaBell, FaCheck, FaTrash, FaFilter, FaSpinner } from 'react-icons/fa';

type NotificationType = 
  | 'PROJECT_ASSIGNMENT'
  | 'HOUR_CHANGE_REQUEST'
  | 'HOUR_CHANGE_APPROVED'
  | 'HOUR_CHANGE_REJECTED'
  | 'PHASE_DEADLINE_WARNING'
  | 'USER_APPROVAL_NEEDED'
  | 'OVERDUE_APPROVAL_ALERT';
import DashboardLayout from '@/app/components/DashboardLayout';
import NotificationCard from '@/app/components/notifications/NotificationCard';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  pagination: {
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  };
  unreadCount: number;
}

const notificationTypeLabels = {
  PROJECT_ASSIGNMENT: 'Project Assignment',
  HOUR_CHANGE_REQUEST: 'Hour Change Request',
  HOUR_CHANGE_APPROVED: 'Hour Change Approved',
  HOUR_CHANGE_REJECTED: 'Hour Change Rejected',
  PHASE_DEADLINE_WARNING: 'Phase Deadline Warning',
  USER_APPROVAL_NEEDED: 'User Approval Needed',
  OVERDUE_APPROVAL_ALERT: 'Overdue Approval Alert'
};

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ total: 0, hasMore: false });
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Filters
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unread' | NotificationType>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchNotifications(true);
    }
  }, [status, router, selectedFilter]);

  const fetchNotifications = async (reset = false) => {
    if (!reset && isLoadingMore) return;
    
    setIsLoading(reset);
    if (!reset) setIsLoadingMore(true);
    
    try {
      const params = new URLSearchParams({
        limit: '20',
        offset: reset ? '0' : notifications.length.toString()
      });

      if (selectedFilter === 'unread') {
        params.append('unreadOnly', 'true');
      } else if (selectedFilter !== 'all') {
        params.append('type', selectedFilter);
      }

      const response = await axios.get(`/api/notifications?${params}`);
      const data: NotificationsResponse = response.data;

      setNotifications(prev => reset ? data.notifications : [...prev, ...data.notifications]);
      setPagination(data.pagination);
      setUnreadCount(data.unreadCount);
      setError('');
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string, isRead: boolean) => {
    try {
      await axios.patch(`/api/notifications/${notificationId}`, { isRead });
      
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, isRead }
            : n
        )
      );
      
      setUnreadCount(prev => isRead ? prev - 1 : prev + 1);
    } catch (err) {
      console.error('Error updating notification:', err);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await axios.delete(`/api/notifications/${notificationId}`);
      
      const notification = notifications.find(n => n.id === notificationId);
      if (notification && !notification.isRead) {
        setUnreadCount(prev => prev - 1);
      }
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setSelectedNotifications(prev => prev.filter(id => id !== notificationId));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleBulkAction = async (action: string) => {
    setIsBulkActionLoading(true);
    try {
      const payload: any = { action };
      
      if (action === 'markSelectedAsRead' || action === 'deleteSelected') {
        if (selectedNotifications.length === 0) {
          alert('Please select notifications first');
          return;
        }
        payload.notificationIds = selectedNotifications;
      }

      await axios.post('/api/notifications/actions', payload);
      
      // Refresh notifications after bulk action
      setSelectedNotifications([]);
      await fetchNotifications(true);
    } catch (err) {
      console.error('Error performing bulk action:', err);
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleSelectNotification = (notificationId: string) => {
    setSelectedNotifications(prev =>
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const handleSelectAll = () => {
    const visibleIds = notifications.map(n => n.id);
    setSelectedNotifications(prev =>
      prev.length === visibleIds.length ? [] : visibleIds
    );
  };

  if (status === 'loading' || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-12">
          <FaSpinner className="animate-spin text-2xl text-gray-400" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Notifications</h1>
            <p className="text-lg text-gray-600">
              Stay updated with your project activities
              {unreadCount > 0 && (
                <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Filter buttons */}
            <div className="flex items-center gap-2">
              <FaFilter className="text-gray-500" />
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Notifications</option>
                <option value="unread">Unread Only</option>
                <optgroup label="By Type">
                  {Object.entries(notificationTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Bulk actions */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedNotifications.length === notifications.length && notifications.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Select All
              </label>

              {selectedNotifications.length > 0 && (
                <>
                  <button
                    onClick={() => handleBulkAction('markSelectedAsRead')}
                    disabled={isBulkActionLoading}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    Mark as Read
                  </button>
                  <button
                    onClick={() => handleBulkAction('deleteSelected')}
                    disabled={isBulkActionLoading}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </>
              )}

              {unreadCount > 0 && (
                <button
                  onClick={() => handleBulkAction('markAllAsRead')}
                  disabled={isBulkActionLoading}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  Mark All as Read
                </button>
              )}

              <button
                onClick={() => handleBulkAction('deleteAllRead')}
                disabled={isBulkActionLoading}
                className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 disabled:opacity-50"
              >
                Delete All Read
              </button>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {notifications.length === 0 && !isLoading ? (
          <div className="text-center py-12">
            <FaBell className="mx-auto text-4xl text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No notifications</h3>
            <p className="text-gray-500">
              {selectedFilter === 'unread' 
                ? "You don't have any unread notifications." 
                : "You don't have any notifications yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div key={notification.id} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedNotifications.includes(notification.id)}
                  onChange={() => handleSelectNotification(notification.id)}
                  className="mt-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <NotificationCard
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                    onDelete={handleDelete}
                  />
                </div>
              </div>
            ))}

            {/* Load More Button */}
            {pagination.hasMore && (
              <div className="text-center pt-6">
                <button
                  onClick={() => fetchNotifications(false)}
                  disabled={isLoadingMore}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <>
                      <FaSpinner className="animate-spin inline mr-2" />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}