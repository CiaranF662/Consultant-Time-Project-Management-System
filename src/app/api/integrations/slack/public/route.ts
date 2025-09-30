import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const rec = await prisma.integrationSetting.findUnique({ where: { key: 'slack' } });
  const val: any = rec?.value;
  const enabled = !!val?.enabled;
  const lastUpdated = rec?.updatedAt ? rec.updatedAt.toISOString() : null;
  const lastUpdatedBy = val?.lastUpdatedBy ? { id: val.lastUpdatedBy.id, name: val.lastUpdatedBy.name, email: val.lastUpdatedBy.email } : null;
  return NextResponse.json({ success: true, settings: { enabled, lastUpdated, lastUpdatedBy } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
