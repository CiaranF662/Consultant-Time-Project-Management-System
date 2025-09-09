import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole, ProjectRole } from '@prisma/client';
import { sendEmail, renderEmailTemplate } from '@/lib/email';
import ProjectAssignmentEmail from '@/emails/ProjectAssignmentEmail';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  // Only Growth Team can create projects
  if (session.user.role !== UserRole.GROWTH_TEAM) {
    return new NextResponse(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
  }

  try {
    const body = await request.json();
    const { 
      title, 
      description, 
      startDate, 
      durationInWeeks, 
      consultantIds, 
      productManagerId,
      budgetedHours 
    } = body;

    // Validation
    if (!title || !startDate || !durationInWeeks || !consultantIds || consultantIds.length === 0) {
      return new NextResponse(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }
    
    if (!budgetedHours || budgetedHours <= 0) {
      return new NextResponse(JSON.stringify({ error: 'Valid budget hours required' }), { status: 400 });
    }

    if (isNaN(parseInt(durationInWeeks, 10)) || parseInt(durationInWeeks, 10) <= 0) {
      return new NextResponse(JSON.stringify({ error: 'Duration must be a positive number.' }), { status: 400 });
    }

    const projectStartDate = new Date(startDate);
    const projectEndDate = new Date(projectStartDate);
    projectEndDate.setDate(projectEndDate.getDate() + durationInWeeks * 7);

    // Sprint Generation Logic
    const sprintsToCreate = [];
    let currentSprintStartDate = new Date(projectStartDate);

    // Handle Sprint 0 if project doesn't start on Monday
    if (projectStartDate.getDay() !== 1) {
      const sprint0EndDate = new Date(currentSprintStartDate);
      sprint0EndDate.setDate(sprint0EndDate.getDate() + (7 - sprint0EndDate.getDay()));
      sprintsToCreate.push({
        sprintNumber: 0,
        startDate: currentSprintStartDate,
        endDate: sprint0EndDate,
      });
      currentSprintStartDate = new Date(sprint0EndDate);
      currentSprintStartDate.setDate(currentSprintStartDate.getDate() + 1);
    }

    // Generate regular 2-week sprints
    let sprintCounter = 1;
    while (currentSprintStartDate < projectEndDate) {
      const sprintEndDate = new Date(currentSprintStartDate);
      sprintEndDate.setDate(sprintEndDate.getDate() + 13);
      sprintsToCreate.push({
        sprintNumber: sprintCounter,
        startDate: new Date(currentSprintStartDate),
        endDate: sprintEndDate,
      });
      currentSprintStartDate.setDate(currentSprintStartDate.getDate() + 14);
      sprintCounter++;
    }

    // Create project with PM and consultants
    // Ensure Product Manager is included in consultants list
    const allConsultantIds = [...new Set([productManagerId, ...consultantIds])];
    const consultantsData = allConsultantIds.map((id: string) => ({
      userId: id,
      role: id === productManagerId ? ProjectRole.PRODUCT_MANAGER : ProjectRole.TEAM_MEMBER
    }));

    const newProject = await prisma.project.create({
      data: {
        title: title.trim(),
        description,
        startDate: projectStartDate,
        endDate: projectEndDate,
        budgetedHours: parseInt(budgetedHours, 10),
        productManagerId,
        consultants: {
          create: consultantsData
        },
        sprints: {
          create: sprintsToCreate,
        },
      },
      include: {
        consultants: {
          include: {
            user: true
          }
        },
        sprints: true
      }
    });

    // Send project assignment notifications to all consultants
    try {
      // Send emails in parallel to all consultants
      await Promise.allSettled(
        newProject.consultants.map(async (consultant) => {
          try {
            const productManager = newProject.consultants.find(c => c.role === ProjectRole.PRODUCT_MANAGER);
            const otherConsultants = newProject.consultants
              .filter(c => c.userId !== consultant.userId)
              .map(c => ({
                name: c.user.name || c.user.email || 'Unknown',
                email: c.user.email || ''
              }));
            
            const emailTemplate = ProjectAssignmentEmail({
              consultantName: consultant.user.name || consultant.user.email || 'Consultant',
              projectName: newProject.title,
              projectDescription: newProject.description || undefined,
              userRole: consultant.role === ProjectRole.PRODUCT_MANAGER ? 'Product Manager' : 'Team Member',
              productManagerName: productManager?.user.name || productManager?.user.email || 'Product Manager',
              productManagerEmail: productManager?.user.email || '',
              otherConsultants: otherConsultants,
              projectStartDate: newProject.startDate.toISOString(),
              projectEndDate: newProject.endDate?.toISOString()
            });
            
            const { html, text } = await renderEmailTemplate(emailTemplate);
            
            await sendEmail({
              to: consultant.user.email!,
              subject: `New Project Assignment: ${newProject.title}`,
              html,
              text
            });
          } catch (emailError) {
            console.error(`Failed to send project assignment email to ${consultant.user.email}:`, emailError);
          }
        })
      );
    } catch (emailError) {
      console.error('Error sending project assignment notifications:', emailError);
      // Don't fail project creation if emails fail
    }

    return NextResponse.json(newProject, { status: 201 });

  } catch (error) {
    console.error('Error creating project:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to create project' }), { status: 500 });
  }
}