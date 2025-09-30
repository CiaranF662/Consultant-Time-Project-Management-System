import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/api-auth';
import { UserRole, ProjectRole, NotificationType } from '@prisma/client';
import { sendEmail, renderEmailTemplate } from '@/lib/email';
import { createNotification, createNotificationsForUsers, NotificationTemplates } from '@/lib/notifications';
import ProjectAssignmentEmail from '@/emails/ProjectAssignmentEmail';

import { prisma } from "@/lib/prisma";

// GET all projects the user is involved in (either as consultant or PM)
export async function GET(request: Request) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { session, user } = auth;

  try {
    // Growth Team can see all projects, others see only projects where they're involved
    const whereCondition = session.user.role === UserRole.GROWTH_TEAM
      ? {} // No filter for Growth Team - see all projects
      : {
          consultants: {
            some: {
              userId: session.user.id
            }
          }
        };

    // Get projects based on user role
    const projects = await prisma.project.findMany({
      where: whereCondition,
      include: {
        consultants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        phases: {
          include: {
            allocations: {
              include: {
                weeklyAllocations: {
                  where: {
                    planningStatus: 'APPROVED'
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            phases: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Enrich projects with completion percentages
    const enrichedProjects = projects.map(project => ({
      ...project,
      consultants: project.consultants.map(c => c.user),
      phases: project.phases.map(phase => {
        const totalAllocatedHours = phase.allocations.reduce((sum, alloc) => sum + alloc.totalHours, 0);
        const completedHours = phase.allocations.reduce((sum, alloc) =>
          sum + alloc.weeklyAllocations.reduce((weekSum, weekly) => weekSum + (weekly.approvedHours || 0), 0), 0
        );
        const completionPercentage = totalAllocatedHours > 0 ? Math.round((completedHours / totalAllocatedHours) * 100) : 0;

        return {
          ...phase,
          totalAllocatedHours,
          completionPercentage
        };
      })
    }));

    return NextResponse.json(enrichedProjects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch projects' }), { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { session, user } = auth;

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
      budgetedHours,
      consultantAllocations
    } = body;

    // Validation
    if (!title || !startDate || !durationInWeeks || !consultantIds || consultantIds.length === 0) {
      return new NextResponse(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    if (!budgetedHours || budgetedHours <= 0) {
      return new NextResponse(JSON.stringify({ error: 'Valid budget hours required' }), { status: 400 });
    }

    // Validate consultant allocations if provided
    if (consultantAllocations) {
      const totalAllocatedHours = Object.values(consultantAllocations).reduce((sum: number, hours: any) => sum + (hours || 0), 0);
      if (totalAllocatedHours === 0) {
        return new NextResponse(JSON.stringify({ error: 'At least one consultant must have allocated hours' }), { status: 400 });
      }

      // Check that all selected consultants have allocations > 0
      const consultantsWithoutAllocations = consultantIds.filter((id: string) => !consultantAllocations[id] || consultantAllocations[id] <= 0);
      if (consultantsWithoutAllocations.length > 0) {
        return new NextResponse(JSON.stringify({ error: 'All selected consultants must have allocated hours greater than 0' }), { status: 400 });
      }
    }

    if (isNaN(parseInt(durationInWeeks, 10)) || parseInt(durationInWeeks, 10) <= 0) {
      return new NextResponse(JSON.stringify({ error: 'Duration must be a positive number.' }), { status: 400 });
    }

    // Ensure project starts on a Monday
    const requestedStartDate = new Date(startDate);
    const projectStartDate = new Date(requestedStartDate);

    // Adjust to next Monday if not already Monday (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = projectStartDate.getDay();
    if (dayOfWeek !== 1) {
      const daysUntilMonday = (1 + 7 - dayOfWeek) % 7;
      projectStartDate.setDate(projectStartDate.getDate() + daysUntilMonday);
    }

    const projectEndDate = new Date(projectStartDate);
    projectEndDate.setDate(projectEndDate.getDate() + durationInWeeks * 7);

    // Sprint Generation Logic - Always create Sprint 0 (Project Kickoff)
    const sprintsToCreate = [];
    let currentSprintStartDate = new Date(projectStartDate);

    // Always create Sprint 0 for Project Kickoff (1 week duration)
    const sprint0EndDate = new Date(currentSprintStartDate);
    sprint0EndDate.setDate(sprint0EndDate.getDate() + 6); // 7 days = 1 week
    sprintsToCreate.push({
      sprintNumber: 0,
      startDate: new Date(currentSprintStartDate),
      endDate: sprint0EndDate,
    });

    // Set start date for regular sprints (day after Sprint 0 ends)
    currentSprintStartDate = new Date(sprint0EndDate);
    currentSprintStartDate.setDate(currentSprintStartDate.getDate() + 1);

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
      role: id === productManagerId ? ProjectRole.PRODUCT_MANAGER : ProjectRole.TEAM_MEMBER,
      allocatedHours: consultantAllocations ? (consultantAllocations[id] || 0) : 0
    }));

    // Create project with sprints first
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

    // Create Project Kickoff phase and link Sprint 0 to it
    const kickoffPhase = await prisma.phase.create({
      data: {
        name: 'Project Kickoff',
        description: 'Initial project setup, planning, and stakeholder alignment',
        startDate: projectStartDate,
        endDate: sprintsToCreate[0].endDate,
        projectId: newProject.id,
      }
    });

    // Update Sprint 0 to link it to the Project Kickoff phase
    await prisma.sprint.update({
      where: {
        projectId_sprintNumber: {
          projectId: newProject.id,
          sprintNumber: 0
        }
      },
      data: {
        phaseId: kickoffPhase.id
      }
    });

    // Consultant allocations are now stored in the ConsultantsOnProjects table
    // These hours represent the total allocated to each consultant for the entire project
    // The Product Manager will later create phases and distribute these hours across phases

    // Send project assignment notifications to all consultants
    try {
      // Send emails in parallel to all consultants
      await Promise.allSettled(
        newProject.consultants.map(async (consultant: any) => {
          try {
            const productManager = newProject.consultants.find((c: any) => c.role === ProjectRole.PRODUCT_MANAGER);
            const otherConsultants = newProject.consultants
              .filter((c: any) => c.userId !== consultant.userId)
              .map((c: any) => ({
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

            // Create in-app notification
            const roleText = consultant.role === ProjectRole.PRODUCT_MANAGER ? 'Product Manager' : 'Team Member';
            const notificationTemplate = NotificationTemplates.PROJECT_ASSIGNMENT(newProject.title, roleText);
            
            await createNotification({
              userId: consultant.userId,
              type: 'PROJECT_ASSIGNMENT',
              title: notificationTemplate.title,
              message: notificationTemplate.message,
              actionUrl: `/dashboard/projects/${newProject.id}`,
              metadata: {
                projectId: newProject.id,
                projectTitle: newProject.title,
                userRole: roleText
              }
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