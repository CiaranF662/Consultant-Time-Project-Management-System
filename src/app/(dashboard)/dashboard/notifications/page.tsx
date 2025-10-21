import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import NotificationsPageClient from '@/components/notifications/NotificationsPageClient';
import { prisma } from "@/lib/prisma";
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
      notifications: notifications.map(n => ({
        ...n,
        createdAt: n.createdAt.toISOString()
      })),
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
    redirect('/auth/login');
  }

  const initialData = await getInitialNotifications();

  return (
    <NotificationsPageClient 
      initialData={initialData}
    />
  );
}