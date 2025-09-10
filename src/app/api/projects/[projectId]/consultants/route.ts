import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole, ProjectRole } from '@prisma/client';
import { sendEmail, renderEmailTemplate } from '@/lib/email';
import { createNotification, NotificationTemplates } from '@/lib/notifications';
import ProjectAssignmentEmail from '@/emails/ProjectAssignmentEmail';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  const { projectId } = await params;
  const { id: userId, role } = session.user;
  const userRole = role as UserRole;

  try {
    // Check if user has access to this project
    const project = await prisma.project.findFirst({
      where: userRole === UserRole.GROWTH_TEAM 
        ? { id: projectId }
        : { 
            id: projectId,
            OR: [
              { productManagerId: userId },
              { consultants: { some: { userId: userId } } }
            ]
          }
    });

    if (!project) {
      return new NextResponse(JSON.stringify({ error: 'Project not found or not authorized' }), { status: 404 });
    }

    // Get consultants assigned to this project
    const consultants = await prisma.user.findMany({
      where: {
        projectAssignments: {
          some: { projectId: projectId }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(consultants);
  } catch (error) {
    console.error('Failed to fetch project consultants:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}

// PATCH update project consultants
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  // Only Growth Team can update project consultants
  if (session.user.role !== UserRole.GROWTH_TEAM) {
    return new NextResponse(JSON.stringify({ error: 'Only Growth Team can update project consultants' }), { status: 403 });
  }

  const { projectId } = await params;

  try {
    const body = await request.json();
    const { consultants } = body;

    if (!Array.isArray(consultants)) {
      return new NextResponse(JSON.stringify({ error: 'Consultants must be an array' }), { status: 400 });
    }

    // Validate consultant data
    for (const consultant of consultants) {
      if (!consultant.userId || !consultant.role) {
        return new NextResponse(JSON.stringify({ error: 'Each consultant must have userId and role' }), { status: 400 });
      }
      if (!['PRODUCT_MANAGER', 'TEAM_MEMBER'].includes(consultant.role)) {
        return new NextResponse(JSON.stringify({ error: 'Invalid consultant role' }), { status: 400 });
      }
    }

    // Ensure exactly one Product Manager
    const productManagers = consultants.filter(c => c.role === 'PRODUCT_MANAGER');
    if (productManagers.length !== 1) {
      return new NextResponse(JSON.stringify({ error: 'Project must have exactly one Product Manager' }), { status: 400 });
    }

    // Get current project consultants to identify new assignments
    const currentProject = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        consultants: {
          include: {
            user: true
          }
        }
      }
    });

    if (!currentProject) {
      return new NextResponse(JSON.stringify({ error: 'Project not found' }), { status: 404 });
    }

    const currentConsultantIds = new Set(currentProject.consultants.map(c => c.userId));
    const newConsultantIds = new Set(consultants.map(c => c.userId));

    // Find newly added consultants
    const newlyAddedIds = consultants
      .map(c => c.userId)
      .filter(id => !currentConsultantIds.has(id));

    // Update consultants using a transaction
    const updatedProject = await prisma.$transaction(async (tx) => {
      // Update productManagerId
      const productManagerId = productManagers[0].userId;
      await tx.project.update({
        where: { id: projectId },
        data: { productManagerId }
      });

      // Delete existing consultant assignments
      await tx.consultantsOnProjects.deleteMany({
        where: { projectId }
      });

      // Create new consultant assignments
      await tx.consultantsOnProjects.createMany({
        data: consultants.map(c => ({
          userId: c.userId,
          projectId,
          role: c.role === 'PRODUCT_MANAGER' ? ProjectRole.PRODUCT_MANAGER : ProjectRole.TEAM_MEMBER
        }))
      });

      // Fetch updated project with consultants
      return await tx.project.findUnique({
        where: { id: projectId },
        include: {
          consultants: {
            include: {
              user: true
            }
          }
        }
      });
    });

    // Send email notifications to newly added consultants
    if (newlyAddedIds.length > 0 && updatedProject) {
      const productManager = updatedProject.consultants.find(c => c.role === ProjectRole.PRODUCT_MANAGER);
      
      await Promise.allSettled(
        updatedProject.consultants
          .filter(c => newlyAddedIds.includes(c.userId))
          .map(async (consultant) => {
            try {
              const otherConsultants = updatedProject.consultants
                .filter(c => c.userId !== consultant.userId)
                .map(c => ({
                  name: c.user.name || c.user.email || 'Unknown',
                  email: c.user.email || ''
                }));

              const emailTemplate = ProjectAssignmentEmail({
                consultantName: consultant.user.name || consultant.user.email || 'Consultant',
                projectName: updatedProject.title,
                projectDescription: updatedProject.description || undefined,
                userRole: consultant.role === ProjectRole.PRODUCT_MANAGER ? 'Product Manager' : 'Team Member',
                productManagerName: productManager?.user.name || productManager?.user.email || 'Product Manager',
                productManagerEmail: productManager?.user.email || '',
                otherConsultants: otherConsultants,
                projectStartDate: updatedProject.startDate.toISOString(),
                projectEndDate: updatedProject.endDate?.toISOString()
              });

              const { html, text } = await renderEmailTemplate(emailTemplate);

              await sendEmail({
                to: consultant.user.email!,
                subject: `New Project Assignment: ${updatedProject.title}`,
                html,
                text
              });

              // Create in-app notification
              const roleText = consultant.role === ProjectRole.PRODUCT_MANAGER ? 'Product Manager' : 'Team Member';
              const notificationTemplate = NotificationTemplates.PROJECT_ASSIGNMENT(updatedProject.title, roleText);
              
              await createNotification({
                userId: consultant.userId,
                type: 'PROJECT_ASSIGNMENT',
                title: notificationTemplate.title,
                message: notificationTemplate.message,
                actionUrl: `/dashboard/projects/${updatedProject.id}`,
                metadata: {
                  projectId: updatedProject.id,
                  projectTitle: updatedProject.title,
                  userRole: roleText
                }
              });

            } catch (emailError) {
              console.error(`Failed to send project assignment email to ${consultant.user.email}:`, emailError);
            }
          })
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Project consultants updated successfully',
      newlyAdded: newlyAddedIds.length
    });

  } catch (error) {
    console.error('Error updating project consultants:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to update project consultants' }), { status: 500 });
  }
}