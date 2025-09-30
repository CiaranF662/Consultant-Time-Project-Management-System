import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/api-auth';
import { NotificationType } from '@prisma/client';

import { prisma } from "@/lib/prisma";

// GET /api/notifications - Fetch user's notifications
export async function GET(request: Request) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { session, user } = auth;

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get('unreadOnly') === 'true';
  const type = searchParams.get('type') as NotificationType | null;
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    const whereClause: any = {
      userId: session.user.id
    };

    if (unreadOnly) {
      whereClause.isRead = false;
    }

    if (type) {
      whereClause.type = type;
    }

    const [notifications, totalCount, unreadCount] = await Promise.all([
      // Get notifications with pagination
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      
      // Get total count for pagination
      prisma.notification.count({
        where: { userId: session.user.id }
      }),
      
      // Get unread count for badge
      prisma.notification.count({
        where: { 
          userId: session.user.id,
          isRead: false 
        }
      })
    ]);

    return NextResponse.json({
      notifications,
      pagination: {
        total: totalCount,
        offset,
        limit,
        hasMore: offset + limit < totalCount
      },
      unreadCount
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: session.user.id
    });
    return new NextResponse(JSON.stringify({
      error: 'Failed to fetch notifications',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500 });
  }
}

// POST /api/notifications - Create a new notification (internal use)
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { session, user } = auth;

  try {
    const body = await request.json();
    const { userId, type, title, message, actionUrl, metadata } = body;

    // Basic validation
    if (!userId || !type || !title || !message) {
      return new NextResponse(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        actionUrl,
        metadata: metadata || null,
      },
    });

    return NextResponse.json(notification, { status: 201 });

  } catch (error) {
    console.error('Error creating notification:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to create notification' }), { status: 500 });
  }
}