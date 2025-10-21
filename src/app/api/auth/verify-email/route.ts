import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Find the verification token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: 'Invalid or expired verification link' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (new Date() > verificationToken.expires) {
      // Delete expired token
      await prisma.verificationToken.delete({
        where: { id: verificationToken.id }
      });

      return NextResponse.json(
        { error: 'Verification link has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check if token is for email verification
    if (verificationToken.type !== 'EMAIL_VERIFICATION') {
      return NextResponse.json(
        { error: 'Invalid verification link' },
        { status: 400 }
      );
    }

    // Find the user by email (identifier)
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.identifier }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if email is already verified
    if (user.emailVerified) {
      // Delete the token since email is already verified
      await prisma.verificationToken.delete({
        where: { id: verificationToken.id }
      });

      return NextResponse.json({
        message: 'Email is already verified. You can now log in.'
      });
    }

    // Update user's emailVerified field and delete the token in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() }
      }),
      prisma.verificationToken.delete({
        where: { id: verificationToken.id }
      }),
      // Delete any other email verification tokens for this user
      prisma.verificationToken.deleteMany({
        where: {
          identifier: user.email!,
          type: 'EMAIL_VERIFICATION'
        }
      })
    ]);

    console.log('Email verified successfully for user:', user.email);

    return NextResponse.json({
      message: 'Email verified successfully! You can now log in to your account.'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
