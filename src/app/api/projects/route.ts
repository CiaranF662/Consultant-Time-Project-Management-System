import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, startDate, durationInWeeks } = body;
    const userId = session.user.id;

    // --- Validation ---
    if (!title || !startDate || !durationInWeeks) {
      return new NextResponse(JSON.stringify({ error: 'Missing required fields: title, startDate, durationInWeeks' }), { status: 400 });
    }
    if (isNaN(parseInt(durationInWeeks, 10)) || parseInt(durationInWeeks, 10) <= 0) {
      return new NextResponse(JSON.stringify({ error: 'Duration must be a positive number.' }), { status: 400 });
    }

    const projectStartDate = new Date(startDate);
    const projectEndDate = new Date(projectStartDate);
    projectEndDate.setDate(projectEndDate.getDate() + durationInWeeks * 7);

    // --- Sprint Generation Logic ---
    const sprintsToCreate = [];
    let currentSprintStartDate = new Date(projectStartDate);

    // Handle "Sprint 0" if the project doesn't start on a Monday
    if (projectStartDate.getDay() !== 1) { // 0 = Sunday, 1 = Monday, etc.
      const sprint0EndDate = new Date(currentSprintStartDate);
      // Find the next Sunday
      sprint0EndDate.setDate(sprint0EndDate.getDate() + (7 - sprint0EndDate.getDay()));
      
      sprintsToCreate.push({
        sprintNumber: 0,
        startDate: currentSprintStartDate,
        endDate: sprint0EndDate,
      });
      
      // The first "real" sprint starts on the Monday after Sprint 0 ends
      currentSprintStartDate = new Date(sprint0EndDate);
      currentSprintStartDate.setDate(currentSprintStartDate.getDate() + 1);
    }

    // Generate the rest of the sprints
    let sprintCounter = 1;
    while (currentSprintStartDate < projectEndDate) {
      const sprintEndDate = new Date(currentSprintStartDate);
      sprintEndDate.setDate(sprintEndDate.getDate() + 13); // 14 days total (inclusive)

      sprintsToCreate.push({
        sprintNumber: sprintCounter,
        startDate: new Date(currentSprintStartDate),
        endDate: sprintEndDate,
      });

      // Move to the next sprint start date (the next Monday)
      currentSprintStartDate.setDate(currentSprintStartDate.getDate() + 14);
      sprintCounter++;
    }

    // --- Database Transaction ---
    const newProject = await prisma.project.create({
      data: {
        title: title.trim(),
        description,
        startDate: projectStartDate,
        endDate: projectEndDate,
        consultantId: userId,
        sprints: {
          create: sprintsToCreate,
        },
      },
    });

    return NextResponse.json(newProject, { status: 201 });

  } catch (error) {
    console.error('Error creating project:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to create project' }), { status: 500 });
  }
}