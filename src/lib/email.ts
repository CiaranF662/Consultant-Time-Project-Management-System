import { Resend } from 'resend';
import { render } from '@react-email/render';

// Initialize Resend with API key from environment
const resend = new Resend(process.env.RESEND_API_KEY);

// Email sending function
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}) {
  try {
    // Validate Resend API key exists
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured in environment variables');
      return {
        success: false,
        error: new Error('Email service not configured')
      };
    }

    // Validate FROM_EMAIL exists
    const fromEmail = process.env.FROM_EMAIL;
    if (!fromEmail) {
      console.error('FROM_EMAIL is not configured in environment variables');
      return {
        success: false,
        error: new Error('From email address not configured')
      };
    }

    console.log('Sending email via Resend:', {
      from: fromEmail,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
    });

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    });

    if (error) {
      console.error('Resend API error:', error);
      return { success: false, error };
    }

    console.log('Email sent successfully via Resend!');
    console.log('Email ID:', data?.id);

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Error sending email:', error);
    console.error('Email error details:', error instanceof Error ? error.message : String(error));
    return { success: false, error };
  }
}

// Helper function to render React Email templates
export async function renderEmailTemplate(template: React.ReactElement): Promise<{ html: string; text: string }> {
  const html = await render(template);
  const text = await render(template, { plainText: true });
  return { html, text };
}