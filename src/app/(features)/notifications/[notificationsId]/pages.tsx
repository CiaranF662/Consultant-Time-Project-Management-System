'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { FaArrowLeft, FaSpinner, FaTrash, FaCheck } from 'react-icons/fa';
import DashboardLayout from '@/app/(features)/dashboard/components/DashboardLayout';

type NotificationType =
  | 'PROJECT_ASSIGNMENT'
  | 'HOUR_CHANGE_REQUEST'
  | 'HOUR_CHANGE_APPROVED'
  | 'HOUR_CHANGE_REJECTED'
  | 'PHASE_DEADLINE_WARNING'
  | 'USER_APPROVAL_NEEDED'
  | 'OVERDUE_APPROVAL_ALERT';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string | null;
  createdAt: string;
}

const notificationTypeLabels: Record<NotificationType, string> = {
  PROJECT_ASSIGNMENT: 'Project Assignment',
  HOUR_CHANGE_REQUEST: 'Hour Change Request',
  HOUR_CHANGE_APPROVED: 'Hour Change Approved',
  HOUR_CHANGE_REJECTED: 'Hour Change Rejected',
  PHASE_DEADLINE_WARNING: 'Phase Deadline Warning',
  USER_APPROVAL_NEEDED: 'User Approval Needed',
  OVERDUE_APPROVAL_ALERT: 'Overdue Approval Alert',
};

//#region Notification Detail Page Function
export default function NotificationDetailPage() {
  const { data: session, status } = useSession();
  const { notificationId } = useParams();
  const router = useRouter();

  const [notification, setNotification] = useState<Notification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchNotification();
    }
  }, [status]);

  const fetchNotification = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`/api/notifications/${notificationId}`);
      setNotification(response.data.notification);
      setError('');
    } catch (err) {
      console.error('Error fetching notification:', err);
      setError('Failed to load notification.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async () => {
    if (!notification) return;
    try {
      await axios.patch(`/api/notifications/${notification.id}`, { isRead: true });
      setNotification({ ...notification, isRead: true });
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleDelete = async () => {
    if (!notification) return;
    try {
      await axios.delete(`/api/notifications/${notification.id}`);
      router.push('/notifications'); // go back after delete
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  if (error || !notification) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center">
          <p className="text-red-600">{error || 'Notification not found.'}</p>
          <button
            onClick={() => router.push('/notifications')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Notifications
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10 max-w-3xl mx-auto bg-white shadow-sm rounded-lg">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <FaArrowLeft /> Back
        </button>

        {/* Title + meta */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{notification.title}</h1>
        <p className="text-sm text-gray-500 mb-6">
          {notificationTypeLabels[notification.type]} •{' '}
          {new Date(notification.createdAt).toLocaleString()}
        </p>

        {/* Message */}
        <p className="text-gray-700 mb-6 whitespace-pre-line">{notification.message}</p>

        {/* Action button if exists */}
        {notification.actionUrl && (
          <a
            href={notification.actionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mb-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Take Action
          </a>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {!notification.isRead && (
            <button
              onClick={handleMarkAsRead}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              <FaCheck /> Mark as Read
            </button>
          )}
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            <FaTrash /> Delete
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
// #endregion
