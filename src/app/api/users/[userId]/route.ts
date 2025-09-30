import { NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { requireGrowthTeam, isAuthError } from '@/lib/api-auth';

import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireGrowthTeam();
  if (isAuthError(auth)) return auth;
  const { session, user } = auth;

  try {
    const { userId } = await params;
    const { role } = await request.json();

    if (!Object.values(UserRole).includes(role)) {
      return new NextResponse(JSON.stringify({ error: 'Invalid role' }), { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user role:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to update user role' }), { status: 500 });
  }
}