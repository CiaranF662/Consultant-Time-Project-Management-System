import { NextResponse } from 'next/server';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

// This route will handle GET requests to /api/users
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');

  // If a role is specified in the query (e.g., /api/users?role=CONSULTANT), filter by it
  if (role && Object.values(UserRole).includes(role as UserRole)) {
    const users = await prisma.user.findMany({
      where: {
        role: role as UserRole,
      },
      orderBy: {
        name: 'asc',
      },
    });
    return NextResponse.json(users);
  }

  // Otherwise, return all users (you might want to secure this further later)
  const users = await prisma.user.findMany();
  return NextResponse.json(users);
}