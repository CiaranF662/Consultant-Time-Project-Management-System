'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FaBell, FaCheck, FaTrash, FaExternalLinkAlt } from 'react-icons/fa';

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

interface NotificationCardProps {
  notification: {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    isRead: boolean;
    actionUrl?: string | null;
    createdAt: string;
  };
  onMarkAsRead: (id: string, isRead: boolean) => void;
  onDelete: (id: string) => void;
  showActions?: boolean;
}

const notificationTypeConfig = {
  PROJECT_ASSIGNMENT: {
    icon: '👥',
    color: 'blue',
    bgColor: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700',
    iconColor: 'text-blue-600 dark:text-blue-400'
  },
  HOUR_CHANGE_REQUEST: {
    icon: '⏰',
    color: 'yellow',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700',
    iconColor: 'text-yellow-600 dark:text-yellow-400'
  },
  HOUR_CHANGE_APPROVED: {
    icon: '✅',
    color: 'green',
    bgColor: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700',
    iconColor: 'text-green-600 dark:text-green-400'
  },
  HOUR_CHANGE_REJECTED: {
    icon: '❌',
    color: 'red',
    bgColor: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700',
    iconColor: 'text-red-600 dark:text-red-400'
  },
  PHASE_DEADLINE_WARNING: {
    icon: '⚠️',
    color: 'orange',
    bgColor: 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700',
    iconColor: 'text-orange-600 dark:text-orange-400'
  },
  USER_APPROVAL_NEEDED: {
    icon: '👤',
    color: 'purple',
    bgColor: 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700',
    iconColor: 'text-purple-600 dark:text-purple-400'
  },
  OVERDUE_APPROVAL_ALERT: {
    icon: '🚨',
    color: 'red',
    bgColor: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700',
    iconColor: 'text-red-600 dark:text-red-400'
  },
  PHASE_ALLOCATION_PENDING: {
    icon: '📝',
    color: 'amber',
    bgColor: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700',
    iconColor: 'text-amber-600 dark:text-amber-400'
  },
  PHASE_ALLOCATION_APPROVED: {
    icon: '✅',
    color: 'green',
    bgColor: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700',
    iconColor: 'text-green-600 dark:text-green-400'
  },
  PHASE_ALLOCATION_REJECTED: {
    icon: '❌',
    color: 'red',
    bgColor: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700',
    iconColor: 'text-red-600 dark:text-red-400'
  },
  PHASE_ALLOCATION_MODIFIED: {
    icon: '✏️',
    color: 'blue',
    bgColor: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700',
    iconColor: 'text-blue-600 dark:text-blue-400'
  },
  WEEKLY_ALLOCATION_PENDING: {
    icon: '📅',
    color: 'amber',
    bgColor: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700',
    iconColor: 'text-amber-600 dark:text-amber-400'
  },
  WEEKLY_ALLOCATION_APPROVED: {
    icon: '✅',
    color: 'green',
    bgColor: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700',
    iconColor: 'text-green-600 dark:text-green-400'
  },
  WEEKLY_ALLOCATION_MODIFIED: {
    icon: '✏️',
    color: 'blue',
    bgColor: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700',
    iconColor: 'text-blue-600 dark:text-blue-400'
  },
  WEEKLY_ALLOCATION_REJECTED: {
    icon: '❌',
    color: 'red',
    bgColor: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700',
    iconColor: 'text-red-600 dark:text-red-400'
  }
};

export default function NotificationCard({ 
  notification, 
  onMarkAsRead, 
  onDelete, 
  showActions = true 
}: NotificationCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const config = notificationTypeConfig[notification.type] || {
    icon: '📋',
    color: 'gray',
    bgColor: 'bg-gray-50 border-gray-200',
    iconColor: 'text-gray-600 dark:text-gray-300'
  };
  const timeAgo = new Date(notification.createdAt).toLocaleString();

  const handleMarkAsRead = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await onMarkAsRead(notification.id, !notification.isRead);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (isLoading) return;
    if (confirm('Are you sure you want to delete this notification?')) {
      setIsLoading(true);
      try {
        await onDelete(notification.id);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCardClick = async (e: React.MouseEvent) => {
    // Don't mark as read if user clicked on action buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }

    // Mark as read if it's currently unread
    if (!notification.isRead) {
      setIsLoading(true);
      try {
        await onMarkAsRead(notification.id, true);
        // Trigger localStorage event for cross-tab communication
        localStorage.setItem('notifications-updated', Date.now().toString());
      } finally {
        setIsLoading(false);
      }
    }
  };

  const cardContent = (
    <div
      onClick={handleCardClick}
      className={`
        relative p-4 border rounded-lg transition-all duration-200 hover:shadow-md cursor-pointer
        ${notification.isRead ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700' : `${config.bgColor} border-l-4`}
        ${isLoading ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg ${config.bgColor}`}>
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`font-semibold text-sm ${notification.isRead ? 'text-foreground' : 'text-foreground'}`}>
              {notification.title}
            </h3>

            {!notification.isRead && (
              <div className="flex-shrink-0 w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
            )}
          </div>

          <p className={`mt-1 text-sm ${notification.isRead ? 'text-gray-600 dark:text-gray-400' : 'text-foreground'}`}>
            {notification.message}
          </p>

          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{timeAgo}</span>

            {notification.actionUrl && (
              <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                <FaExternalLinkAlt className="w-3 h-3" />
                <span>View</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex-shrink-0 flex items-center gap-1">
            <button
              onClick={handleMarkAsRead}
              className={`p-1.5 rounded transition-colors ${
                notification.isRead
                  ? 'text-muted-foreground hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  : 'text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50'
              }`}
              title={notification.isRead ? 'Mark as unread' : 'Mark as read'}
              disabled={isLoading}
            >
              <FaCheck className="w-3 h-3" />
            </button>

            <button
              onClick={handleDelete}
              className="p-1.5 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded transition-colors"
              title="Delete notification"
              disabled={isLoading}
            >
              <FaTrash className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // If there's an action URL, wrap in Link, otherwise return the card directly
  if (notification.actionUrl) {
    return (
      <Link 
        href={notification.actionUrl} 
        className="block"
        onClick={() => {
          // Mark as read when clicking on notification with action URL
          if (!notification.isRead) {
            onMarkAsRead(notification.id, true);
            // Trigger localStorage event for cross-tab communication
            localStorage.setItem('notifications-updated', Date.now().toString());
          }
        }}
      >
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}