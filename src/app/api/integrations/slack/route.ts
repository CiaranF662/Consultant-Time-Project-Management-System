import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, UserRole } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

async function ensureAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== UserRole.GROWTH_TEAM) {
    throw new Error('Unauthorized');
  }
}

export async function GET() {
  try {
    await ensureAdmin();
    const rec = await prisma.integrationSetting.findUnique({ where: { key: 'slack' } });
    return NextResponse.json({ success: true, settings: rec ? rec.value : null });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.message === 'Unauthorized' ? 403 : 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureAdmin();
    const session = await getServerSession(authOptions);
    const admin = session?.user ? { id: session.user.id, name: session.user.name, email: session.user.email } : null;
    const body = await req.json();
    const payload = { ...body, lastUpdatedBy: admin };

    const existing = await prisma.integrationSetting.findUnique({ where: { key: 'slack' } });
    if (existing) {
      const updated = await prisma.integrationSetting.update({ where: { key: 'slack' }, data: { value: payload } });
      return NextResponse.json({ success: true, settings: updated.value });
    }
    const created = await prisma.integrationSetting.create({ data: { key: 'slack', value: payload } });
    return NextResponse.json({ success: true, settings: created.value });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.message === 'Unauthorized' ? 403 : 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
