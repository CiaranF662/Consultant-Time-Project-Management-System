import { NextResponse } from 'next/server';
import { PrismaClient, UserStatus } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'GROWTH_TEAM') {
    return new NextResponse(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
  }

  try {
    const { userId } = params;
    const { status } = await request.json();

    if (!Object.values(UserStatus).includes(status)) {
      return new NextResponse(JSON.stringify({ error: 'Invalid status' }), { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user status:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to update user status' }), { status: 500 });
  }
}