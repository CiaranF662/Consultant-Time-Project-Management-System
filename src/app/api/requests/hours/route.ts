import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, ChangeType } from '@prisma/client';
import { sendEmail, renderEmailTemplate } from '@/lib/email';
import { createMultipleNotifications, NotificationTemplates } from '@/lib/notifications';
import HourChangeRequestEmail from '@/emails/HourChangeRequestEmail';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  try {
    const whereClause: any = {};
    
    // Filter by status if provided
    if (status) {
      whereClause.status = status;
    }

    // If not Growth Team, only show own requests
    if (session.user.role !== 'GROWTH_TEAM') {
      whereClause.consultantId = session.user.id;
    }

    const requests = await prisma.hourChangeRequest.findMany({
      where: whereClause,
      include: {
        requester: {
          select: { id: true, name: true, email: true }
        },
        approver: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error('Error fetching hour change requests:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch requests' }), { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  try {
    const body = await request.json();
    console.log('Request body received:', body);
    
    const { 
      changeType, 
      phaseAllocationId, 
      originalHours, 
      requestedHours, 
      fromConsultantId,
      toConsultantId,
      shiftHours,
      phaseId,
      weekNumber,
      year,
      reason 
    } = body;

    if (!reason?.trim()) {
      return new NextResponse(JSON.stringify({ error: 'Reason is required' }), { status: 400 });
    }

    if (!changeType) {
      return new NextResponse(JSON.stringify({ error: 'Change type is required' }), { status: 400 });
    }

    console.log('Hour change request data:', { 
      changeType, 
      phaseAllocationId, 
      originalHours, 
      requestedHours, 
      reason 
    });

    const changeRequest = await prisma.hourChangeRequest.create({
      data: {
        changeType: changeType as ChangeType,
        phaseAllocationId,
        originalHours: originalHours || 0,
        requestedHours: requestedHours || 0,
        fromConsultantId,
        toConsultantId,
        shiftHours,
        phaseId,
        weekNumber,
        year,
        reason,
        consultantId: session.user.id
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Send email notification to Product Manager and Growth Team
    try {
      // Get project and product manager details - only if phaseAllocationId exists
      let projectData = null;
      if (phaseAllocationId) {
        projectData = await prisma.phaseAllocation.findUnique({
          where: { id: phaseAllocationId },
          include: {
            phase: {
              include: {
                project: {
                  include: {
                    productManager: {
                      select: { id: true, name: true, email: true }
                    }
                  }
                }
              }
            }
          }
        });
      }

      if (projectData?.phase?.project) {
        const { project } = projectData.phase;
        const { productManager } = project;
        
        // Get Growth Team users for CC
        const growthTeamUsers = await prisma.user.findMany({
          where: { role: 'GROWTH_TEAM' },
          select: { id: true, email: true }
        });

        // Get consultant name for shift requests
        let toConsultantName: string | undefined = undefined;
        if (changeType === 'SHIFT' && toConsultantId) {
          const toConsultant = await prisma.user.findUnique({
            where: { id: toConsultantId },
            select: { name: true }
          });
          toConsultantName = toConsultant?.name || undefined;
        }

        if (productManager?.email) {
          const emailTemplate = HourChangeRequestEmail({
            type: 'submitted',
            consultantName: changeRequest.requester.name || 'Unknown',
            consultantEmail: changeRequest.requester.email || '',
            projectName: project.title,
            phaseName: projectData.phase.name,
            changeType: changeType as 'ADJUSTMENT' | 'SHIFT',
            originalHours: originalHours || 0,
            requestedHours: requestedHours || 0,
            reason,
            toConsultantName
          });

          const { html, text } = await renderEmailTemplate(emailTemplate);

          // Send to Product Manager (primary recipient) and CC Growth Team
          const recipients = [productManager.email];
          const ccRecipients = growthTeamUsers
            .map(user => user.email)
            .filter((email): email is string => !!email && email !== productManager.email);

          await sendEmail({
            to: [...recipients, ...ccRecipients],
            subject: `Hour Change Request: ${project.title} - ${projectData.phase.name}`,
            html,
            text
          });

          // Send confirmation email to the consultant who made the request
          if (changeRequest.requester.email && 
              changeRequest.requester.email !== productManager.email && 
              !ccRecipients.includes(changeRequest.requester.email)) {
            
            const consultantEmailTemplate = HourChangeRequestEmail({
              type: 'submitted',
              consultantName: changeRequest.requester.name || 'Unknown',
              consultantEmail: changeRequest.requester.email || '',
              projectName: project.title,
              phaseName: projectData.phase.name,
              changeType: changeType as 'ADJUSTMENT' | 'SHIFT',
              originalHours: originalHours || 0,
              requestedHours: requestedHours || 0,
              reason,
              toConsultantName
            });

            const consultantEmailRendered = await renderEmailTemplate(consultantEmailTemplate);

            await sendEmail({
              to: [changeRequest.requester.email],
              subject: `Confirmation: Hour Change Request Submitted - ${project.title}`,
              html: consultantEmailRendered.html,
              text: consultantEmailRendered.text
            });
          }

          // Create in-app notifications
          const consultantName = changeRequest.requester.name || 'A consultant';
          const notificationsToCreate: any[] = [];

          // Notification for Growth Team
          const growthTeamNotificationTemplate = NotificationTemplates.HOUR_CHANGE_REQUEST(consultantName, project.title);
          
          growthTeamUsers.forEach(user => {
            notificationsToCreate.push({
              userId: user.id,
              type: 'HOUR_CHANGE_REQUEST' as const,
              title: growthTeamNotificationTemplate.title,
              message: growthTeamNotificationTemplate.message,
              actionUrl: '/dashboard/hour-requests',
              metadata: {
                requestId: changeRequest.id,
                projectId: project.id,
                projectTitle: project.title,
                consultantId: changeRequest.consultantId,
                consultantName
              }
            });
          });

          // Notification for Product Manager (if different from Growth Team)
          if (productManager?.id && !growthTeamUsers.some(user => user.id === productManager.id)) {
            notificationsToCreate.push({
              userId: productManager.id,
              type: 'HOUR_CHANGE_REQUEST' as const,
              title: growthTeamNotificationTemplate.title,
              message: growthTeamNotificationTemplate.message,
              actionUrl: '/dashboard/hour-requests',
              metadata: {
                requestId: changeRequest.id,
                projectId: project.id,
                projectTitle: project.title,
                consultantId: changeRequest.consultantId,
                consultantName
              }
            });
          }

          // Confirmation notification for the requesting consultant
          notificationsToCreate.push({
            userId: changeRequest.consultantId,
            type: 'HOUR_CHANGE_REQUEST' as const,
            title: 'Hour Change Request Submitted',
            message: `Your hour change request for project "${project.title}" has been submitted and is awaiting approval.`,
            actionUrl: '/dashboard/hour-requests',
            metadata: {
              requestId: changeRequest.id,
              projectId: project.id,
              projectTitle: project.title,
              isRequestor: true
            }
          });

          await createMultipleNotifications(notificationsToCreate);
        }
      }
    } catch (emailError) {
      console.error('Failed to send hour change request notification:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json(changeRequest, { status: 201 });
  } catch (error) {
    console.error('Error creating hour change request:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to create request' }), { status: 500 });
  }
}
