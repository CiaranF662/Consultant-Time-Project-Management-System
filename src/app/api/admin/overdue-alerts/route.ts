import { NextResponse } from 'next/server';
import { requireAuth, requireGrowthTeam, isAuthError } from '@/lib/api-auth';
import { UserRole, ChangeStatus, UserStatus } from '@prisma/client';
import { sendEmail, renderEmailTemplate } from '@/lib/email';
import OverdueAlertEmail from '@/emails/OverdueAlertEmail';

import { prisma } from "@/lib/prisma";


export async function POST(request: Request) {
  // Allow system calls (check auth but don't require Growth Team role)
  try {
    const auth = await requireAuth();
    // If auth succeeds, check if user is Growth Team
    if (!isAuthError(auth) && auth.session.user.role !== UserRole.GROWTH_TEAM) {
      return new NextResponse(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
    }
  } catch (error) {
    // Allow system calls (no session) to proceed
  }

  try {
    // Calculate cutoff dates for overdue items
    const hourRequestCutoff = new Date();
    hourRequestCutoff.setHours(hourRequestCutoff.getHours() - 48); // 48 hours ago
    
    const userApprovalCutoff = new Date();
    userApprovalCutoff.setHours(userApprovalCutoff.getHours() - 24); // 24 hours ago

    // Count overdue hour change requests
    const overdueHourRequests = await prisma.hourChangeRequest.count({
      where: {
        status: ChangeStatus.PENDING,
        createdAt: {
          lt: hourRequestCutoff
        }
      }
    });

    // Count overdue user approvals
    const overdueUserApprovals = await prisma.user.count({
      where: {
        status: UserStatus.PENDING,
        createdAt: {
          lt: userApprovalCutoff
        }
      }
    });

    const totalOverdue = overdueHourRequests + overdueUserApprovals;

    // Only send alert if there are overdue items
    if (totalOverdue > 0) {
      // Get all Growth Team members
      const growthTeamMembers = await prisma.user.findMany({
        where: {
          role: UserRole.GROWTH_TEAM,
          status: UserStatus.APPROVED
        },
        select: {
          email: true,
          name: true
        }
      });

      // Send emails to all Growth Team members
      await Promise.allSettled(
        growthTeamMembers.map(async (member) => {
          try {
            const emailTemplate = OverdueAlertEmail({
              overdueHourRequests,
              overdueUserApprovals
            });
            
            const { html, text } = await renderEmailTemplate(emailTemplate);
            
            await sendEmail({
              to: member.email!,
              subject: `⚠️ Overdue Approvals Alert - ${totalOverdue} items pending`,
              html,
              text
            });
          } catch (emailError) {
            console.error(`Failed to send overdue alert email to ${member.email}:`, emailError);
          }
        })
      );

      return NextResponse.json({ 
        success: true, 
        message: `Alert sent for ${totalOverdue} overdue items`,
        details: {
          overdueHourRequests,
          overdueUserApprovals,
          emailsSent: growthTeamMembers.length
        }
      });
    } else {
      return NextResponse.json({ 
        success: true, 
        message: 'No overdue items found',
        details: {
          overdueHourRequests: 0,
          overdueUserApprovals: 0,
          emailsSent: 0
        }
      });
    }

  } catch (error) {
    console.error('Error checking overdue approvals:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to process overdue alerts' }), { status: 500 });
  }
}

// GET endpoint to check overdue items without sending emails
export async function GET(request: Request) {
  const auth = await requireGrowthTeam();
  if (isAuthError(auth)) return auth;
  const { session, user } = auth;

  try {
    // Calculate cutoff dates for overdue items
    const hourRequestCutoff = new Date();
    hourRequestCutoff.setHours(hourRequestCutoff.getHours() - 48); // 48 hours ago
    
    const userApprovalCutoff = new Date();
    userApprovalCutoff.setHours(userApprovalCutoff.getHours() - 24); // 24 hours ago

    // Count overdue hour change requests
    const overdueHourRequests = await prisma.hourChangeRequest.count({
      where: {
        status: ChangeStatus.PENDING,
        createdAt: {
          lt: hourRequestCutoff
        }
      }
    });

    // Count overdue user approvals
    const overdueUserApprovals = await prisma.user.count({
      where: {
        status: UserStatus.PENDING,
        createdAt: {
          lt: userApprovalCutoff
        }
      }
    });

    return NextResponse.json({
      overdueHourRequests,
      overdueUserApprovals,
      totalOverdue: overdueHourRequests + overdueUserApprovals,
      cutoffDates: {
        hourRequestCutoff: hourRequestCutoff.toISOString(),
        userApprovalCutoff: userApprovalCutoff.toISOString()
      }
    });

  } catch (error) {
    console.error('Error checking overdue approvals:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to check overdue items' }), { status: 500 });
  }
}