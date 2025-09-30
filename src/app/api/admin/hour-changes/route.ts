import { NextResponse } from 'next/server';
import { ChangeStatus } from '@prisma/client';
import { requireGrowthTeam, isAuthError } from '@/lib/api-auth';

import { prisma } from "@/lib/prisma";

// --- THIS GET FUNCTION WAS MISSING ---
export async function GET(request: Request) {
  const auth = await requireGrowthTeam();
  if (isAuthError(auth)) return auth;
  const { session, user } = auth;

  try {
    const requests = await prisma.hourChangeRequest.findMany({
      where: { status: ChangeStatus.PENDING },
      include: {
        requester: true,
        approver: true
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