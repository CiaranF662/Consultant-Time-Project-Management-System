import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { sendEmail, renderEmailTemplate } from '@/lib/email';
import PasswordResetEmail from '@/emails/PasswordResetEmail';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, name: true, email: true }
    });

    // Always return success even if user doesn't exist (security best practice)
    // This prevents email enumeration attacks
    if (!user) {
      console.log('Password reset requested for non-existent email:', email);
      return NextResponse.json({
        message: 'If an account exists with this email, you will receive a password reset link.'
      });
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');

    // Set expiration to 1 hour from now
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    // Delete any existing password reset tokens for this user
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: user.email!,
        type: 'PASSWORD_RESET'
      }
    });

    // Create new verification token
    await prisma.verificationToken.create({
      data: {
        identifier: user.email!,
        token,
        type: 'PASSWORD_RESET',
        expires
      }
    });

    // Generate reset link
    const resetLink = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`;

    // Send password reset email
    const emailTemplate = PasswordResetEmail({
      userName: user.name || 'User',
      resetLink
    });

    const { html, text } = await renderEmailTemplate(emailTemplate);

    const emailResult = await sendEmail({
      to: user.email!,
      subject: 'Reset Your Agility Password',
      html,
      text
    });

    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error);
      return NextResponse.json(
        { error: 'Failed to send reset email. Please try again later.' },
        { status: 500 }
      );
    }

    console.log('Password reset email sent successfully to:', user.email);

    return NextResponse.json({
      message: 'If an account exists with this email, you will receive a password reset link.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
