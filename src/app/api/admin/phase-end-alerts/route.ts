import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole, UserStatus, ProjectRole } from '@prisma/client';
import { sendEmail, renderEmailTemplate } from '@/lib/email';
import PhaseEndDateAlertEmail from '@/emails/PhaseEndDateAlertEmail';

const prisma = new PrismaClient();


export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  // Allow system calls (no session) or Growth Team members
  if (session && session.user.role !== UserRole.GROWTH_TEAM) {
    return new NextResponse(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
  }

  try {
    // Calculate date ranges
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // Get phases ending today
    const endingToday = await prisma.phase.findMany({
      where: {
        endDate: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        project: {
          include: {
            consultants: {
              include: { user: true }
            }
          }
        },
        allocations: {
          include: { consultant: true }
        }
      }
    });

    // Get phases ending in the next 7 days (but not today)
    const endingSoon = await prisma.phase.findMany({
      where: {
        endDate: {
          gte: tomorrow,
          lte: sevenDaysFromNow
        }
      },
      include: {
        project: {
          include: {
            consultants: {
              include: { user: true }
            }
          }
        },
        allocations: {
          include: { consultant: true }
        }
      }
    });

    let emailsSent = 0;

    // Collect all users who need to be notified
    const usersToNotify = new Map<string, {
      user: { id: string; name: string | null; email: string | null };
      isProductManager: boolean;
      endingPhases: Array<{ phaseName: string; projectName: string; endDate: string }>;
      upcomingPhases: Array<{ phaseName: string; projectName: string; endDate: string; daysUntilEnd: number }>;
    }>();

    // Process phases ending today
    for (const phase of endingToday) {
      // Notify Product Manager
      const pm = phase.project.consultants.find(c => c.role === ProjectRole.PRODUCT_MANAGER);
      if (pm && pm.user.email) {
        if (!usersToNotify.has(pm.userId)) {
          usersToNotify.set(pm.userId, {
            user: pm.user,
            isProductManager: true,
            endingPhases: [],
            upcomingPhases: []
          });
        }
        usersToNotify.get(pm.userId)!.endingPhases.push({
          phaseName: phase.name,
          projectName: phase.project.title,
          endDate: phase.endDate.toISOString()
        });
      }

      // Notify allocated consultants
      for (const allocation of phase.allocations) {
        if (allocation.consultant.email) {
          if (!usersToNotify.has(allocation.consultantId)) {
            usersToNotify.set(allocation.consultantId, {
              user: allocation.consultant,
              isProductManager: false,
              endingPhases: [],
              upcomingPhases: []
            });
          }
          usersToNotify.get(allocation.consultantId)!.endingPhases.push({
            phaseName: phase.name,
            projectName: phase.project.title,
            endDate: phase.endDate.toISOString()
          });
        }
      }
    }

    // Process phases ending soon
    for (const phase of endingSoon) {
      const daysUntilEnd = Math.ceil((phase.endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // Notify Product Manager
      const pm = phase.project.consultants.find(c => c.role === ProjectRole.PRODUCT_MANAGER);
      if (pm && pm.user.email) {
        if (!usersToNotify.has(pm.userId)) {
          usersToNotify.set(pm.userId, {
            user: pm.user,
            isProductManager: true,
            endingPhases: [],
            upcomingPhases: []
          });
        }
        usersToNotify.get(pm.userId)!.upcomingPhases.push({
          phaseName: phase.name,
          projectName: phase.project.title,
          endDate: phase.endDate.toISOString(),
          daysUntilEnd
        });
      }

      // Notify allocated consultants
      for (const allocation of phase.allocations) {
        if (allocation.consultant.email) {
          if (!usersToNotify.has(allocation.consultantId)) {
            usersToNotify.set(allocation.consultantId, {
              user: allocation.consultant,
              isProductManager: false,
              endingPhases: [],
              upcomingPhases: []
            });
          }
          usersToNotify.get(allocation.consultantId)!.upcomingPhases.push({
            phaseName: phase.name,
            projectName: phase.project.title,
            endDate: phase.endDate.toISOString(),
            daysUntilEnd
          });
        }
      }
    }

    // Send emails to all users who need to be notified
    await Promise.allSettled(
      Array.from(usersToNotify.entries()).map(async ([userId, data]) => {
        try {
          const emailTemplate = PhaseEndDateAlertEmail({
            recipientName: data.user.name || data.user.email || 'User',
            upcomingPhases: data.upcomingPhases,
            endingPhases: data.endingPhases,
            isProductManager: data.isProductManager
          });
          
          const { html, text } = await renderEmailTemplate(emailTemplate);
          
          const totalAlerts = data.upcomingPhases.length + data.endingPhases.length;
          const subject = data.endingPhases.length > 0 
            ? `🚨 Phase Deadline Alert - ${data.endingPhases.length} phase${data.endingPhases.length > 1 ? 's' : ''} ending today`
            : `⚠️ Phase Deadline Alert - ${data.upcomingPhases.length} phase${data.upcomingPhases.length > 1 ? 's' : ''} ending soon`;
          
          await sendEmail({
            to: data.user.email!,
            subject,
            html,
            text
          });
          
          emailsSent++;
        } catch (emailError) {
          console.error(`Failed to send phase end alert email to ${data.user.email}:`, emailError);
        }
      })
    );

    return NextResponse.json({ 
      success: true, 
      message: `Phase end alerts processed`,
      details: {
        phasesEndingToday: endingToday.length,
        phasesEndingSoon: endingSoon.length,
        usersNotified: usersToNotify.size,
        emailsSent
      }
    });

  } catch (error) {
    console.error('Error processing phase end alerts:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to process phase end alerts' }), { status: 500 });
  }
}

// GET endpoint to check upcoming phase end dates without sending emails
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== UserRole.GROWTH_TEAM) {
    return new NextResponse(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
  }

  try {
    // Calculate date ranges
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // Get phases ending today
    const endingToday = await prisma.phase.count({
      where: {
        endDate: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    // Get phases ending in the next 7 days
    const endingSoon = await prisma.phase.count({
      where: {
        endDate: {
          gte: tomorrow,
          lte: sevenDaysFromNow
        }
      }
    });

    return NextResponse.json({
      phasesEndingToday: endingToday,
      phasesEndingSoon: endingSoon,
      totalPhaseAlerts: endingToday + endingSoon,
      dateRanges: {
        today: today.toISOString(),
        sevenDaysFromNow: sevenDaysFromNow.toISOString()
      }
    });

  } catch (error) {
    console.error('Error checking phase end dates:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to check phase end dates' }), { status: 500 });
  }
}