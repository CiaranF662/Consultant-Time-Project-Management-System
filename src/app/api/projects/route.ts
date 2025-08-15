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
    // CHANGED: We now receive an array of 'consultantIds' instead of using the session user's ID.
    const { title, description, startDate, durationInWeeks, consultantIds } = body;

    // --- UPDATED Validation ---
    if (!title || !startDate || !durationInWeeks || !consultantIds || consultantIds.length === 0) {
      return new NextResponse(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }
    if (isNaN(parseInt(durationInWeeks, 10)) || parseInt(durationInWeeks, 10) <= 0) {
      return new NextResponse(JSON.stringify({ error: 'Duration must be a positive number.' }), { status: 400 });
    }

    const projectStartDate = new Date(startDate);
    const projectEndDate = new Date(projectStartDate);
    projectEndDate.setDate(projectEndDate.getDate() + durationInWeeks * 7);

    // --- Sprint Generation Logic (This part is unchanged) ---
    const sprintsToCreate = [];
    let currentSprintStartDate = new Date(projectStartDate);

    if (projectStartDate.getDay() !== 1) { // 0 = Sunday, 1 = Monday, etc.
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

    // --- UPDATED Database Transaction ---
    const newProject = await prisma.project.create({
      data: {
        title: title.trim(),
        description,
        startDate: projectStartDate,
        endDate: projectEndDate,
        // CHANGED: We now create records in the 'ConsultantsOnProjects' join table.
        // The old 'consultantId' field is gone.
        consultants: {
          create: consultantIds.map((id: string) => ({
            userId: id,
          })),
        },
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