import { requireAuth, isAuthError } from '@/lib/api-auth';
import { NextResponse } from 'next/server';
import { ProjectRole } from '@prisma/client';

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;
    const { session, user } = auth;

    // Check if user has any PRODUCT_MANAGER role assignments
    const pmAssignments = await prisma.consultantsOnProjects.findMany({
      where: {
        userId: session.user.id,
        role: ProjectRole.PRODUCT_MANAGER
      }
    });

    const isProductManager = pmAssignments.length > 0;

    return NextResponse.json({ isProductManager });
  } catch (error) {
    console.error('Error checking PM status:', error);
    return NextResponse.json({ error: 'Failed to check PM status' }, { status: 500 });
  }
}