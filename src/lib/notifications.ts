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
        metadata: params.metadata || undefined,
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
        metadata: notif.metadata ? notif.metadata as any : undefined,
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

// Helper function to get all Growth Team member IDs
export async function getGrowthTeamMemberIds(): Promise<string[]> {
  try {
    const growthTeamMembers = await prisma.user.findMany({
      where: {
        role: 'GROWTH_TEAM',
        status: 'APPROVED'
      },
      select: { id: true }
    });
    return growthTeamMembers.map(member => member.id);
  } catch (error) {
    console.error('Error fetching Growth Team members:', error);
    return [];
  }
}

// Helper function to create notifications for multiple users
export async function createNotificationsForUsers(
  userIds: string[],
  type: NotificationType,
  title: string,
  message: string,
  actionUrl?: string,
  metadata?: Record<string, any>
) {
  if (userIds.length === 0) return [];

  try {
    const notifications = userIds.map(userId => ({
      userId,
      type,
      title,
      message,
      actionUrl: actionUrl || null,
      metadata: metadata || {},
    }));

    const result = await prisma.notification.createMany({
      data: notifications
    });

    return result;
  } catch (error) {
    console.error('Error creating notifications for multiple users:', error);
    throw error;
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

  // Phase Allocation Templates
  PHASE_ALLOCATION_PENDING_FOR_GROWTH: (consultantName: string, phaseName: string, projectName: string, hours: number, pmName: string) => ({
    title: 'New Phase Allocation Pending Approval',
    message: `${pmName} has requested to allocate ${consultantName} to "${phaseName}" in project "${projectName}" for ${hours} hours.`,
  }),

  PHASE_ALLOCATION_PENDING_FOR_PM: (consultantName: string, phaseName: string, hours: number) => ({
    title: 'Phase Allocation Submitted',
    message: `Your allocation request for ${consultantName} on "${phaseName}" (${hours}h) has been submitted for Growth Team approval.`,
  }),

  PHASE_ALLOCATION_APPROVED_FOR_CONSULTANT: (phaseName: string, projectName: string, hours: number) => ({
    title: 'Phase Allocation Approved',
    message: `You've been allocated to "${phaseName}" in project "${projectName}" for ${hours} hours.`,
  }),

  PHASE_ALLOCATION_APPROVED_FOR_PM: (consultantName: string, phaseName: string, hours: number) => ({
    title: 'Phase Allocation Approved',
    message: `Your allocation request for ${consultantName} on "${phaseName}" (${hours}h) has been approved by the Growth Team.`,
  }),

  PHASE_ALLOCATION_REJECTED_FOR_CONSULTANT: (phaseName: string, projectName: string, reason?: string) => ({
    title: 'Phase Allocation Rejected',
    message: `Your allocation to "${phaseName}" in project "${projectName}" has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
  }),

  PHASE_ALLOCATION_REJECTED_FOR_PM: (consultantName: string, phaseName: string, reason?: string) => ({
    title: 'Phase Allocation Rejected',
    message: `Your allocation request for ${consultantName} on "${phaseName}" has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
  }),

  PHASE_ALLOCATION_MODIFIED_FOR_CONSULTANT: (phaseName: string, projectName: string, newHours: number, originalHours: number) => ({
    title: 'Phase Allocation Modified',
    message: `Your allocation to "${phaseName}" in project "${projectName}" has been approved with modified hours (${newHours}h instead of ${originalHours}h).`,
  }),

  PHASE_ALLOCATION_MODIFIED_FOR_PM: (consultantName: string, phaseName: string, newHours: number, originalHours: number) => ({
    title: 'Phase Allocation Modified',
    message: `Your allocation request for ${consultantName} on "${phaseName}" has been approved with modified hours (${newHours}h instead of ${originalHours}h).`,
  }),

  // Weekly Allocation Templates
  WEEKLY_ALLOCATION_PENDING: (consultantName: string, phaseName: string, projectName: string, hours: number, weekDate: string) => ({
    title: 'New Weekly Allocation Pending Approval',
    message: `${consultantName} has submitted weekly planning for "${phaseName}" in project "${projectName}" (${hours}h for week of ${weekDate}).`,
  }),

  WEEKLY_ALLOCATION_APPROVED: (phaseName: string, hours: number, weekDate: string) => ({
    title: 'Weekly Allocation Approved',
    message: `Your weekly allocation for "${phaseName}" (${hours}h for week of ${weekDate}) has been approved.`,
  }),

  WEEKLY_ALLOCATION_REJECTED: (phaseName: string, weekDate: string, reason?: string) => ({
    title: 'Weekly Allocation Rejected',
    message: `Your weekly allocation for "${phaseName}" (week of ${weekDate}) has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
  }),

  WEEKLY_ALLOCATION_MODIFIED: (phaseName: string, newHours: number, originalHours: number, weekDate: string) => ({
    title: 'Weekly Allocation Modified',
    message: `Your weekly allocation for "${phaseName}" (week of ${weekDate}) has been modified from ${originalHours}h to ${newHours}h.`,
  }),
};