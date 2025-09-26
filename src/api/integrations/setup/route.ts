import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { DatabaseIntegrator } from '@/lib/integrations';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { projectId } = await request.json();
    
    const dbIntegrator = new DatabaseIntegrator(prisma);
    const result = await dbIntegrator.syncProjectCreation(projectId);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Integration setup error:', error);
    return NextResponse.json({ error: 'Integration setup failed' }, { status: 500 });
  }
}