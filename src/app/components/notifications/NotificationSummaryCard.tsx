'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import axios from 'axios';
import { FaBell, FaSpinner } from 'react-icons/fa';

interface NotificationSummaryCardProps {
  className?: string;
}

export default function NotificationSummaryCard({ className = '' }: NotificationSummaryCardProps) {
  const { data: session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      fetchNotificationSummary();
    }
  }, [session?.user?.id]);

  const fetchNotificationSummary = async () => {
    try {
      const response = await axios.get('/api/notifications?limit=1&unreadOnly=true');
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error('Error fetching notification summary:', error);
      // Set safe defaults on error
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  if (!session?.user?.id) {
    return null;
  }

  return (
    <Link href="/dashboard/notifications" className="block">
      <div className={`bg-white p-6 rounded-lg shadow-md border hover:shadow-lg transition-shadow cursor-pointer ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FaBell className="text-blue-500 h-6 w-6" />
            <div>
              <p className="text-sm font-medium text-gray-600">Notifications</p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? (
                  <FaSpinner className="animate-spin h-6 w-6" />
                ) : (
                  unreadCount
                )}
              </p>
            </div>
          </div>
          
          {unreadCount > 0 && (
            <div className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {unreadCount} unread
            </div>
          )}
        </div>

        <div>
          {isLoading ? (
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          ) : unreadCount > 0 ? (
            <p className="text-sm text-gray-600">Click to view notifications</p>
          ) : (
            <p className="text-sm text-gray-500">All notifications read</p>
          )}
        </div>
      </div>
    </Link>
  );
}