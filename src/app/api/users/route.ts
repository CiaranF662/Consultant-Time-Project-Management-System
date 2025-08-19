import { NextResponse } from 'next/server';
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');
  const status = searchParams.get('status');

  // --- THIS IS THE FIX: Build a dynamic 'where' clause ---
  const whereClause: { role?: UserRole; status?: UserStatus } = {};

  if (role && Object.values(UserRole).includes(role as UserRole)) {
    whereClause.role = role as UserRole;
  }

  // This ensures that if the 'status' param is present, it's applied correctly
  if (status && Object.values(UserStatus).includes(status as UserStatus)) {
    whereClause.status = status as UserStatus;
  }

  const users = await prisma.user.findMany({
    where: whereClause,
    orderBy: {
      name: 'asc',
    },
  });

  return NextResponse.json(users);
}