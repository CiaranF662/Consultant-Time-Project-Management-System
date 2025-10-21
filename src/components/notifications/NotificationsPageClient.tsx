'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { FaBell, FaCheck, FaTrash, FaFilter, FaSpinner, FaSearch, FaTimes, FaCheckCircle, FaTimesCircle, FaClock, FaChevronDown } from 'react-icons/fa';
import NotificationCard from '@/components/notifications/NotificationCard';
import { NotificationType } from '@prisma/client';

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
  OVERDUE_APPROVAL_ALERT: 'Overdue Approval Alert',
  PHASE_ALLOCATION_PENDING: 'Phase Allocation Pending',
  PHASE_ALLOCATION_APPROVED: 'Phase Allocation Approved',
  PHASE_ALLOCATION_REJECTED: 'Phase Allocation Rejected',
  PHASE_ALLOCATION_MODIFIED: 'Phase Allocation Modified',
  PHASE_ALLOCATION_EXPIRED: 'Phase Allocation Expired',
  WEEKLY_ALLOCATION_PENDING: 'Weekly Allocation Pending',
  WEEKLY_ALLOCATION_APPROVED: 'Weekly Allocation Approved',
  WEEKLY_ALLOCATION_MODIFIED: 'Weekly Allocation Modified',
  WEEKLY_ALLOCATION_REJECTED: 'Weekly Allocation Rejected'
};

interface NotificationsPageClientProps {
  initialData: NotificationsResponse;
}

export default function NotificationsPageClient({
  initialData
}: NotificationsPageClientProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>(initialData.notifications);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState(initialData.pagination);
  const [unreadCount, setUnreadCount] = useState(initialData.unreadCount);

  // Filters
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unread' | NotificationType>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated' && (selectedFilter !== 'all' || debouncedSearchQuery)) {
      fetchNotifications(true);
    }
  }, [status, router, selectedFilter, debouncedSearchQuery]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async (reset = false) => {
    if (!reset && isLoadingMore) return;

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

      if (debouncedSearchQuery.trim()) {
        params.append('search', debouncedSearchQuery.trim());
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

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-xl shadow-lg">
              <FaBell className="text-white text-xl" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
              <p className="text-gray-600 dark:text-gray-400">Stay updated with your project activities</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-4">
            {unreadCount > 0 && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 px-4 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 dark:bg-red-400 rounded-full animate-pulse"></div>
                  <span className="text-red-800 dark:text-red-300 font-medium text-sm">
                    {unreadCount} unread
                  </span>
                </div>
              </div>
            )}
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-lg">
              <span className="text-gray-600 dark:text-gray-400 text-sm">
                Total: {pagination.total}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="p-6">
          {/* Search Bar */}
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="h-4 w-4 text-muted-foreground" />
            </div>
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-foreground focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <FaTimes className="h-4 w-4 text-muted-foreground hover:text-gray-600 dark:hover:text-gray-400" />
              </button>
            )}
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Filter Tabs */}
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setSelectedFilter('all')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedFilter === 'all'
                      ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-foreground'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setSelectedFilter('unread')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors relative ${
                    selectedFilter === 'unread'
                      ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-foreground'
                  }`}
                >
                  Unread
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 dark:bg-red-600 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Type Filter Dropdown */}
              <div className="relative" ref={filterDropdownRef}>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-foreground bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 focus:ring-2 focus:ring-blue-500"
                >
                  <FaFilter className="h-3 w-3 text-muted-foreground" />
                  <span>{selectedFilter !== 'all' && selectedFilter !== 'unread' ? notificationTypeLabels[selectedFilter as NotificationType] : 'Filter by Type'}</span>
                  <FaChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>

                {showFilters && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setSelectedFilter('all');
                          setShowFilters(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md ${
                          selectedFilter === 'all' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-foreground'
                        }`}
                      >
                        All Types
                      </button>
                      {Object.entries(notificationTypeLabels).map(([value, label]) => (
                        <button
                          key={value}
                          onClick={() => {
                            setSelectedFilter(value as NotificationType);
                            setShowFilters(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md ${
                            selectedFilter === value ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-foreground'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bulk Actions */}
            <div className="flex items-center gap-3">
              {notifications.length > 0 && (
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={selectedNotifications.length === notifications.length && notifications.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  Select All
                </label>
              )}

              {selectedNotifications.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleBulkAction('markSelectedAsRead')}
                    disabled={isBulkActionLoading}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg text-sm hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 transition-colors"
                  >
                    <FaCheck className="h-3 w-3" />
                    Mark Read
                  </button>
                  <button
                    onClick={() => handleBulkAction('deleteSelected')}
                    disabled={isBulkActionLoading}
                    className="flex items-center gap-2 px-3 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg text-sm hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 transition-colors"
                  >
                    <FaTrash className="h-3 w-3" />
                    Delete
                  </button>
                </div>
              )}

              {unreadCount > 0 && (
                <button
                  onClick={() => handleBulkAction('markAllAsRead')}
                  disabled={isBulkActionLoading}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg text-sm hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 transition-colors"
                >
                  <FaCheckCircle className="h-3 w-3" />
                  Mark All Read
                </button>
              )}

              <button
                onClick={() => handleBulkAction('deleteAllRead')}
                disabled={isBulkActionLoading}
                className="flex items-center gap-2 px-3 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                <FaTimesCircle className="h-3 w-3" />
                Clear Read
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded-lg">
              <FaTimesCircle className="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="font-medium text-red-800 dark:text-red-300">Error loading notifications</h3>
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-center py-16">
            <div className="bg-gray-100 dark:bg-gray-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaBell className="text-2xl text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {selectedFilter === 'unread' ? 'All caught up!' : 'No notifications yet'}
            </h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              {selectedFilter === 'unread'
                ? "You don't have any unread notifications. Great job staying on top of things!"
                : searchQuery
                ? `No notifications found matching "${searchQuery}"`
                : "You don't have any notifications yet. When there's activity on your projects, you'll see it here."}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
              >
                Clear Search
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active Filters Display */}
          {(selectedFilter !== 'all' || searchQuery) && (
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <FaFilter className="text-blue-600 dark:text-blue-400" />
                  <span className="text-blue-800 dark:text-blue-300 font-medium">Active filters:</span>
                  {selectedFilter !== 'all' && (
                    <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-full text-xs">
                      {selectedFilter === 'unread' ? 'Unread only' : notificationTypeLabels[selectedFilter as NotificationType]}
                    </span>
                  )}
                  {searchQuery && (
                    <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-full text-xs">
                      Search: "{searchQuery}"
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedFilter('all');
                    setSearchQuery('');
                    setShowFilters(false);
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}

          {notifications.map((notification) => (
            <div key={notification.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4 p-4">
                <input
                  type="checkbox"
                  checked={selectedNotifications.includes(notification.id)}
                  onChange={() => handleSelectNotification(notification.id)}
                  className="mt-1 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <NotificationCard
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                    onDelete={handleDelete}
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Load More Button */}
          {pagination.hasMore && (
            <div className="text-center pt-8">
              <button
                onClick={() => fetchNotifications(false)}
                disabled={isLoadingMore}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 mx-auto transition-colors"
              >
                {isLoadingMore ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Loading more...
                  </>
                ) : (
                  <>
                    <FaClock />
                    Load More Notifications
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}