import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, NotificationType } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/notifications - Fetch user's notifications
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

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
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch notifications' }), { status: 500 });
  }
}

// POST /api/notifications - Create a new notification (internal use)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

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