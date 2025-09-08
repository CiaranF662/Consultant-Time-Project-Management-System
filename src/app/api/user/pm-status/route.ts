import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { PrismaClient, ProjectRole } from '@prisma/client';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

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