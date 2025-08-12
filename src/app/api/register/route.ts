import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, password, role } = body; // Destructure the new role field

    if (!email || !name || !password || !role) {
      return new NextResponse('Missing name, email, password, or role', { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email },
    });

    if (existingUser) {
      return new NextResponse('User with this email already exists', { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role, // Assign the role from the form
        // Set status based on the selected role
        status: role === UserRole.GROWTH_TEAM ? UserStatus.PENDING : UserStatus.APPROVED,
      },
    });

    return NextResponse.json(user);

  } catch (error) {
    console.error('REGISTRATION_ERROR', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}