import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { sendEmail, renderEmailTemplate } from '@/lib/email';
import EmailVerificationEmail from '@/emails/EmailVerificationEmail';
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
      select: { id: true, name: true, email: true, emailVerified: true }
    });

    if (!user) {
      // For security, return success even if user doesn't exist
      return NextResponse.json({
        message: 'If an account exists with this email, a verification link has been sent.'
      });
    }

    // Check if email is already verified
    if (user.emailVerified) {
      return NextResponse.json({
        message: 'Email is already verified.'
      });
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');

    // Set expiration to 24 hours from now
    const expires = new Date();
    expires.setHours(expires.getHours() + 24);

    // Delete any existing email verification tokens for this user
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: user.email!,
        type: 'EMAIL_VERIFICATION'
      }
    });

    // Create new verification token
    await prisma.verificationToken.create({
      data: {
        identifier: user.email!,
        token,
        type: 'EMAIL_VERIFICATION',
        expires
      }
    });

    // Generate verification link
    const verificationLink = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${token}`;

    // Send email verification email
    const emailTemplate = EmailVerificationEmail({
      userName: user.name || 'User',
      verificationLink
    });

    const { html, text } = await renderEmailTemplate(emailTemplate);

    const emailResult = await sendEmail({
      to: user.email!,
      subject: 'Verify Your Agility Email Address',
      html,
      text
    });

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again later.' },
        { status: 500 }
      );
    }

    console.log('Verification email sent successfully to:', user.email);

    return NextResponse.json({
      message: 'Verification email sent successfully. Please check your inbox.'
    });

  } catch (error) {
    console.error('Send verification email error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
