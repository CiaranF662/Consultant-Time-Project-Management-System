import { NextResponse } from 'next/server';
import { PrismaClient, UserStatus, UserRole } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { sendEmail, renderEmailTemplate } from '@/lib/email';
import { createNotification } from '@/lib/notifications';
import GrowthTeamApprovalEmail from '@/emails/GrowthTeamApprovalEmail';

const prisma = new PrismaClient();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'GROWTH_TEAM') {
    return new NextResponse(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
  }

  try {
    const { userId } = await params;
    const { status } = await request.json();

    if (!Object.values(UserStatus).includes(status)) {
      return new NextResponse(JSON.stringify({ error: 'Invalid status' }), { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status },
    });

    // If approving a Growth Team member, send welcome email
    if (status === UserStatus.APPROVED && updatedUser.role === UserRole.GROWTH_TEAM) {
      try {
        if (updatedUser.email) {
          // Send approval email to the newly approved Growth Team member
          const emailTemplate = GrowthTeamApprovalEmail({
            userName: updatedUser.name || 'Growth Team Member',
            dashboardUrl: `${process.env.NEXTAUTH_URL}/dashboard`
          });

          const { html, text } = await renderEmailTemplate(emailTemplate);

          await sendEmail({
            to: [updatedUser.email],
            subject: 'Welcome to the Growth Team - Access Approved!',
            html,
            text
          });

          // Create in-app notification for the approved user
          await createNotification({
            userId: updatedUser.id,
            type: 'USER_APPROVAL_NEEDED', // We can reuse this type for approval notifications
            title: 'Growth Team Access Approved',
            message: 'Your Growth Team access has been approved! You now have full access to Growth Team features and will receive Growth Team notifications.',
            actionUrl: '/dashboard',
            metadata: {
              approvedBy: session.user.id,
              approvedAt: new Date().toISOString(),
              role: updatedUser.role
            }
          });
        }
      } catch (notificationError) {
        console.error('Failed to send Growth Team approval notification:', notificationError);
        // Don't fail the approval if email fails
      }
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user status:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to update user status' }), { status: 500 });
  }
}