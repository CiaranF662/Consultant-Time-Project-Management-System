import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import NotificationsPageClient from '@/components/notifications/NotificationsPageClient';

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

async function getInitialNotifications(): Promise<NotificationsResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      notifications: [],
      pagination: { total: 0, offset: 0, limit: 20, hasMore: false },
      unreadCount: 0
    };
  }

  try {
    // Import the notifications API logic directly instead of making HTTP call
    const { PrismaClient } = require('@prisma/client');
    import { prisma } from "@/lib/prisma";
    
    console.log('Fetching notifications for user:', session.user.id);
    
    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      skip: 0
    });
    
    const total = await prisma.notification.count({
      where: { userId: session.user.id }
    });
    
    const unreadCount = await prisma.notification.count({
      where: { 
        userId: session.user.id,
        isRead: false 
      }
    });
    
    console.log('Found notifications:', { count: notifications.length, total, unreadCount });
    
    await prisma.$disconnect();
    
    return {
      notifications,
      pagination: {
        total,
        offset: 0,
        limit: 20,
        hasMore: notifications.length === 20 && total > 20
      },
      unreadCount
    };
  } catch (error) {
    console.error('Error fetching initial notifications:', error);
    return {
      notifications: [],
      pagination: { total: 0, offset: 0, limit: 20, hasMore: false },
      unreadCount: 0
    };
  }
}

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/login');
  }

  const initialData = await getInitialNotifications();

  return (
    <NotificationsPageClient 
      initialData={initialData}
    />
  );
}