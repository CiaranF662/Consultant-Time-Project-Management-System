// This file defines a Next.js API route handler for fetching all pending consultant 
// hour change requests, accessible only by users with the 'GROWTH_TEAM' role.

import { NextResponse } from 'next/server';
import { PrismaClient, ChangeStatus } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'GROWTH_TEAM') {
    return new NextResponse(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
  }

  try {
    const requests = await prisma.hourChangeRequest.findMany({
      where: { status: ChangeStatus.PENDING },
      include: {
        requester: true,
        sprint: {
          include: {
            project: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    return NextResponse.json(requests);
  } catch (error) {
    console.error('Error fetching hour change requests:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch requests' }), { status: 500 });
  }
}