import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { UserRole, UserStatus } from '@prisma/client';
import { sendEmail, renderEmailTemplate } from '@/lib/email';
import { createMultipleNotifications, NotificationTemplates } from '@/lib/notifications';
import GrowthTeamSignupEmail from '@/emails/GrowthTeamSignupEmail';

import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, password, role } = body; // Destructure the new role field

    if (!email || !name || !password || !role) {
      return new NextResponse('Missing name, email, password, or role', { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email },
    });

    if (existingUser) {
      return new NextResponse('User with this email already exists', { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role, // Assign the role from the form
        // Set status based on the selected role
        status: role === UserRole.GROWTH_TEAM ? UserStatus.PENDING : UserStatus.APPROVED,
      },
    });

    // If this is a Growth Team member signup, notify existing approved Growth Team members
    if (role === UserRole.GROWTH_TEAM) {
      try {
        // Get approved Growth Team users to notify
        const approvedGrowthTeamUsers = await prisma.user.findMany({
          where: { 
            role: UserRole.GROWTH_TEAM,
            status: UserStatus.APPROVED 
          },
          select: { id: true, email: true }
        });

        if (approvedGrowthTeamUsers.length > 0) {
          // Send email notifications
          const emailTemplate = GrowthTeamSignupEmail({
            userName: name,
            userEmail: email,
            dashboardUrl: `${process.env.NEXTAUTH_URL}/dashboard/admin/user-approvals`
          });

          const { html, text } = await renderEmailTemplate(emailTemplate);

          const growthTeamEmails = approvedGrowthTeamUsers
            .map(user => user.email)
            .filter((email): email is string => !!email);

          if (growthTeamEmails.length > 0) {
            await sendEmail({
              to: growthTeamEmails,
              subject: `New Growth Team Member Signup: ${name}`,
              html,
              text
            });
          }

          // Create in-app notifications
          const notificationsToCreate = approvedGrowthTeamUsers.map(gtUser => ({
            userId: gtUser.id,
            type: 'USER_APPROVAL_NEEDED' as const,
            title: NotificationTemplates.USER_APPROVAL_NEEDED(name).title,
            message: NotificationTemplates.USER_APPROVAL_NEEDED(name).message,
            actionUrl: '/dashboard/admin/user-approvals',
            metadata: {
              newUserId: user.id,
              newUserName: name,
              newUserEmail: email,
              role: role
            }
          }));

          if (notificationsToCreate.length > 0) {
            await createMultipleNotifications(notificationsToCreate);
          }
        }
      } catch (notificationError) {
        console.error('Failed to send Growth Team signup notifications:', notificationError);
        // Don't fail the registration if notifications fail
      }
    }

    return NextResponse.json(user);

  } catch (error) {
    console.error('REGISTRATION_ERROR', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}