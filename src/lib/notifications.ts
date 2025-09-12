import { PrismaClient, NotificationType } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        actionUrl: params.actionUrl || null,
        metadata: params.metadata || null,
      },
    });

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

export async function createMultipleNotifications(notifications: CreateNotificationParams[]) {
  try {
    const result = await prisma.notification.createMany({
      data: notifications.map(notif => ({
        userId: notif.userId,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        actionUrl: notif.actionUrl || null,
        metadata: notif.metadata || null,
      }))
    });

    return result;
  } catch (error) {
    console.error('Error creating multiple notifications:', error);
    throw error;
  }
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false
      }
    });
    return count;
  } catch (error) {
    console.error('Error fetching unread notification count:', error);
    return 0;
  }
}

// Notification templates for consistent messaging
export const NotificationTemplates = {
  PROJECT_ASSIGNMENT: (projectName: string, role: string) => ({
    title: 'New Project Assignment',
    message: `You've been assigned to project "${projectName}" as a ${role}.`,
  }),

  HOUR_CHANGE_REQUEST: (consultantName: string, projectName: string) => ({
    title: 'New Hour Change Request',
    message: `${consultantName} has requested a change to their hours on project "${projectName}".`,
  }),

  HOUR_CHANGE_APPROVED: (projectName: string) => ({
    title: 'Hour Change Request Approved',
    message: `Your hour change request for project "${projectName}" has been approved.`,
  }),

  HOUR_CHANGE_REJECTED: (projectName: string, reason?: string) => ({
    title: 'Hour Change Request Rejected',
    message: `Your hour change request for project "${projectName}" has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
  }),

  PHASE_DEADLINE_WARNING: (phaseName: string, projectName: string, daysLeft: number) => ({
    title: 'Phase Deadline Approaching',
    message: `Phase "${phaseName}" in project "${projectName}" ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`,
  }),

  USER_APPROVAL_NEEDED: (userName: string) => ({
    title: 'User Approval Required',
    message: `New user "${userName}" is pending approval.`,
  }),

  OVERDUE_APPROVAL_ALERT: (type: string, count: number) => ({
    title: 'Overdue Approvals Alert',
    message: `You have ${count} overdue ${type} approval${count === 1 ? '' : 's'} pending.`,
  }),
};