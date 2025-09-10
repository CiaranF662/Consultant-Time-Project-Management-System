import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PATCH /api/notifications/[notificationId] - Mark notification as read/unread
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  const session = await getServerSession(authOptions);
  const { notificationId } = await params;
  
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  try {
    const body = await request.json();
    const { isRead } = body;

    // Verify the notification belongs to the user
    const existingNotification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: session.user.id
      }
    });

    if (!existingNotification) {
      return new NextResponse(JSON.stringify({ error: 'Notification not found' }), { status: 404 });
    }

    // Update the notification
    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: isRead ?? true }
    });

    return NextResponse.json(updatedNotification);

  } catch (error) {
    console.error('Error updating notification:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to update notification' }), { status: 500 });
  }
}

// DELETE /api/notifications/[notificationId] - Delete notification
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  const session = await getServerSession(authOptions);
  const { notificationId } = await params;
  
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  try {
    // Verify the notification belongs to the user
    const existingNotification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: session.user.id
      }
    });

    if (!existingNotification) {
      return new NextResponse(JSON.stringify({ error: 'Notification not found' }), { status: 404 });
    }

    // Delete the notification
    await prisma.notification.delete({
      where: { id: notificationId }
    });

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('Error deleting notification:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to delete notification' }), { status: 500 });
  }
}