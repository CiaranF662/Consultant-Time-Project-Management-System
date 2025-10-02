import { NextResponse } from 'next/server';
import { ChangeStatus } from '@prisma/client';
import { requireAuth, isAuthError } from '@/lib/api-auth';

import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { session } = auth;

  try {
    let requests;

    if (session.user.role === 'GROWTH_TEAM') {
      // Growth Team sees all pending requests
      requests = await prisma.hourChangeRequest.findMany({
        where: { status: ChangeStatus.PENDING },
        include: {
          requester: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
    } else {
      // Product Managers see requests for their projects only
      const managedProjects = await prisma.project.findMany({
        where: { productManagerId: session.user.id },
        select: { id: true }
      });

      const projectIds = managedProjects.map(p => p.id);

      // Get all phase allocations for managed projects
      const phaseAllocations = await prisma.phaseAllocation.findMany({
        where: {
          phase: {
            projectId: { in: projectIds }
          }
        },
        select: { id: true }
      });

      const phaseAllocationIds = phaseAllocations.map(pa => pa.id);

      requests = await prisma.hourChangeRequest.findMany({
        where: {
          status: ChangeStatus.PENDING,
          phaseAllocationId: { in: phaseAllocationIds }
        },
        include: {
          requester: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
    }

    return NextResponse.json(requests);
  } catch (error) {
    console.error('Error fetching hour change requests:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch requests' }), { status: 500 });
  }
}
