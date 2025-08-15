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
    // Accept the optional description field
    const { title, description, projectId, sprintId } = body;
    const userId = session.user.id;

    if (!title || !projectId || !sprintId) {
      return new NextResponse(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const newTask = await prisma.task.create({
      data: {
        title,
        description, // Save the description
        projectId,
        sprintId,
        assigneeId: userId,
      },
    });

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to create task' }), { status: 500 });
  }
}