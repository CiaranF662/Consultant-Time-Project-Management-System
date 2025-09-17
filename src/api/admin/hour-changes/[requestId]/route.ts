import { NextResponse } from 'next/server';
import { PrismaClient, ChangeStatus, ChangeType } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { sendEmail, renderEmailTemplate } from '@/lib/email';
import { createNotification, NotificationTemplates } from '@/lib/notifications';
import HourChangeRequestEmail from '@/emails/HourChangeRequestEmail';

const prisma = new PrismaClient();

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
    }
  
    try {
      let requests;

      if (session.user.role === 'GROWTH_TEAM') {
        // Growth Team sees all pending requests
        requests = await prisma.hourChangeRequest.findMany({
          where: { status: ChangeStatus.PENDING },
          include: {
            requester: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        });
      } else {
        // Product Managers see requests for their projects only
        const managedProjects = await prisma.project.findMany({
          where: { productManagerId: session.user.id },
          select: { id: true }
        });
        
        const projectIds = managedProjects.map(p => p.id);
        
        // Get all phase allocations for managed projects
        const phaseAllocations = await prisma.phaseAllocation.findMany({
          where: {
            phase: {
              projectId: { in: projectIds }
            }
          },
          select: { id: true }
        });
        
        const phaseAllocationIds = phaseAllocations.map(pa => pa.id);
        
        requests = await prisma.hourChangeRequest.findMany({
          where: {
            status: ChangeStatus.PENDING,
            phaseAllocationId: { in: phaseAllocationIds }
          },
          include: {
            requester: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        });
      }

      return NextResponse.json(requests);
    } catch (error) {
      console.error('Error fetching hour change requests:', error);
      return new NextResponse(JSON.stringify({ error: 'Failed to fetch requests' }), { status: 500 });
    }
  }
  
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  try {
    const { requestId } = await params;
    const { status } = await request.json();

    if (!Object.values(ChangeStatus).includes(status)) {
      return new NextResponse(JSON.stringify({ error: 'Invalid status' }), { status: 400 });
    }

    // First, get the request to check authorization
    const existingRequest = await prisma.hourChangeRequest.findUnique({
      where: { id: requestId },
      include: {
        requester: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!existingRequest) {
      return new NextResponse(JSON.stringify({ error: 'Request not found' }), { status: 404 });
    }

    // Get project info for authorization check
    let projectData = null;
    if (existingRequest.phaseAllocationId) {
      projectData = await prisma.phaseAllocation.findUnique({
        where: { id: existingRequest.phaseAllocationId },
        include: {
          phase: {
            include: {
              project: true
            }
          }
        }
      });
    }

    // Check if user can approve this request (Growth Team or PM of the project)
    const isGrowthTeam = session.user.role === 'GROWTH_TEAM';
    const isProjectManager = projectData?.phase?.project?.productManagerId === session.user.id;
    
    if (!isGrowthTeam && !isProjectManager) {
      return new NextResponse(JSON.stringify({ error: 'Not authorized to approve this request' }), { status: 403 });
    }

    // Use a transaction to ensure data consistency
    const updatedRequest = await prisma.$transaction(async (tx) => {
      const request = await tx.hourChangeRequest.update({
        where: { id: requestId },
        data: { status, approverId: session.user.id },
        include: {
          requester: {
            select: { id: true, name: true, email: true }
          },
          approver: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      // If approved, update the weekly allocations
      if (status === ChangeStatus.APPROVED) {
        // Handle different change types according to the new schema
        if (request.changeType === ChangeType.ADJUSTMENT && request.phaseAllocationId) {
          // For hour adjustments, update the phase allocation
          await tx.phaseAllocation.update({
            where: { id: request.phaseAllocationId },
            data: { totalHours: request.requestedHours },
          });
        }
        // Note: SHIFT type changes would require more complex logic to transfer hours between consultants
      }

      return request;
    });

    // Send email notification to consultant and Growth Team
    try {
      if (projectData?.phase) {
        const { project } = projectData.phase;
        const { phase } = projectData;
        
        // Get approved Growth Team users for CC
        const growthTeamUsers = await prisma.user.findMany({
          where: { 
            role: 'GROWTH_TEAM',
            status: 'APPROVED' 
          },
          select: { email: true }
        });

        // Get consultant name for shift requests
        let toConsultantName = undefined;
        if (updatedRequest.changeType === ChangeType.SHIFT && updatedRequest.toConsultantId) {
          const toConsultant = await prisma.user.findUnique({
            where: { id: updatedRequest.toConsultantId },
            select: { name: true }
          });
          toConsultantName = toConsultant?.name || undefined;
        }

        const emailTemplate = HourChangeRequestEmail({
          type: status === ChangeStatus.APPROVED ? 'approved' : 'rejected',
          consultantName: updatedRequest.requester.name || 'Unknown',
          consultantEmail: updatedRequest.requester.email || '',
          projectName: project.title,
          phaseName: phase.name,
          changeType: updatedRequest.changeType as 'ADJUSTMENT' | 'SHIFT',
          originalHours: updatedRequest.originalHours,
          requestedHours: updatedRequest.requestedHours,
          reason: updatedRequest.reason,
          approverName: updatedRequest.approver?.name || undefined,
          toConsultantName
        });

        const { html, text } = await renderEmailTemplate(emailTemplate);

        // Send to consultant (primary) and CC Growth Team
        const consultantEmail = updatedRequest.requester.email;
        if (consultantEmail) {
          const ccRecipients = growthTeamUsers
            .map(user => user.email)
            .filter((email): email is string => !!email && email !== consultantEmail);

          await sendEmail({
            to: [consultantEmail, ...ccRecipients],
            subject: `Hour Change Request ${status === ChangeStatus.APPROVED ? 'Approved' : 'Rejected'}: ${project.title} - ${phase.name}`,
            html,
            text
          });

          // Create in-app notifications
          const isApproved = status === ChangeStatus.APPROVED;
          const consultantNotificationTemplate = isApproved 
            ? NotificationTemplates.HOUR_CHANGE_APPROVED(project.title)
            : NotificationTemplates.HOUR_CHANGE_REJECTED(project.title);
          
          // Notification for the consultant who made the request
          await createNotification({
            userId: updatedRequest.consultantId,
            type: isApproved ? 'HOUR_CHANGE_APPROVED' : 'HOUR_CHANGE_REJECTED',
            title: consultantNotificationTemplate.title,
            message: consultantNotificationTemplate.message,
            actionUrl: `/dashboard/projects/${project.id}`,
            metadata: {
              requestId: updatedRequest.id,
              projectId: project.id,
              projectTitle: project.title,
              status: status,
              approverName: updatedRequest.approver?.name || 'Administrator'
            }
          });

          // Notification for Product Manager (if they didn't approve it themselves)
          if (project.productManagerId && project.productManagerId !== session.user.id) {
            const consultantName = updatedRequest.requester.name || 'A consultant';
            const pmNotificationTitle = `Hour Change Request ${isApproved ? 'Approved' : 'Rejected'}`;
            const pmNotificationMessage = `${consultantName}'s hour change request for "${project.title}" has been ${isApproved ? 'approved' : 'rejected'}.`;
            
            await createNotification({
              userId: project.productManagerId,
              type: isApproved ? 'HOUR_CHANGE_APPROVED' : 'HOUR_CHANGE_REJECTED',
              title: pmNotificationTitle,
              message: pmNotificationMessage,
              actionUrl: `/dashboard/projects/${project.id}`,
              metadata: {
                requestId: updatedRequest.id,
                projectId: project.id,
                projectTitle: project.title,
                status: status,
                consultantName,
                approverName: updatedRequest.approver?.name || 'Administrator'
              }
            });
          }
        }
      }
    } catch (emailError) {
      console.error('Failed to send hour change approval notification:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Error updating hour change request:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to update request' }), { status: 500 });
  }
}