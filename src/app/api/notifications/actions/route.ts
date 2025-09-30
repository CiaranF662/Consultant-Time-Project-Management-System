import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/api-auth';
import { PrismaClient } from '@prisma/client';

import { prisma } from "@/lib/prisma";

// POST /api/notifications/actions - Bulk actions on notifications
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { session, user } = auth;

  try {
    const body = await request.json();
    const { action, notificationIds } = body;

    if (!action) {
      return new NextResponse(JSON.stringify({ error: 'Action is required' }), { status: 400 });
    }

    let result;

    switch (action) {
      case 'markAllAsRead':
        // Mark all notifications as read for the user
        result = await prisma.notification.updateMany({
          where: { 
            userId: session.user.id,
            isRead: false
          },
          data: { isRead: true }
        });
        break;

      case 'markSelectedAsRead':
        if (!notificationIds || !Array.isArray(notificationIds)) {
          return new NextResponse(JSON.stringify({ error: 'notificationIds array is required for this action' }), { status: 400 });
        }
        
        result = await prisma.notification.updateMany({
          where: {
            id: { in: notificationIds },
            userId: session.user.id
          },
          data: { isRead: true }
        });
        break;

      case 'deleteSelected':
        if (!notificationIds || !Array.isArray(notificationIds)) {
          return new NextResponse(JSON.stringify({ error: 'notificationIds array is required for this action' }), { status: 400 });
        }
        
        result = await prisma.notification.deleteMany({
          where: {
            id: { in: notificationIds },
            userId: session.user.id
          }
        });
        break;

      case 'deleteAllRead':
        // Delete all read notifications for the user
        result = await prisma.notification.deleteMany({
          where: {
            userId: session.user.id,
            isRead: true
          }
        });
        break;

      default:
        return new NextResponse(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Action '${action}' completed successfully`,
      affectedCount: result.count 
    });

  } catch (error) {
    console.error('Error performing bulk action:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to perform action' }), { status: 500 });
  }
}