import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@prisma/client';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = !!(session && session.user && session.user.role === UserRole.GROWTH_TEAM);
    return NextResponse.json({ success: true, isAdmin });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
