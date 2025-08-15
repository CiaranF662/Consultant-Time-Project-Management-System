import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, TaskStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Your existing PATCH function remains the same
export async function PATCH(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  try {
    const { taskId } = params;
    const body = await request.json();
    const { title, description, status } = body;

    const dataToUpdate: {
      title?: string;
      description?: string;
      status?: TaskStatus;
    } = {};

    if (title !== undefined) dataToUpdate.title = title;
    if (description !== undefined) dataToUpdate.description = description;
    if (status && Object.values(TaskStatus).includes(status)) {
      dataToUpdate.status = status;
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to update task' }), { status: 500 });
  }
}

// --- ADD THIS NEW DELETE FUNCTION ---
export async function DELETE(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  try {
    const { taskId } = params;

    // Optional: Add a security check to ensure the user owns the task
    // or is a Growth Team member before allowing deletion.

    await prisma.task.delete({
      where: { id: taskId },
    });

    return new NextResponse(null, { status: 204 }); // 204 No Content
  } catch (error) {
    console.error('Error deleting task:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to delete task' }), { status: 500 });
  }
}