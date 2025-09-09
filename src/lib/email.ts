import nodemailer from 'nodemailer';
import { render } from '@react-email/render';

// Email service configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// For development, we'll use Ethereal Email (temporary email service)
// In production, you would configure with your actual SMTP provider
export async function createTestAccount() {
  if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST) {
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }
  return transporter;
}

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
    console.log('Email config:', {
      host: process.env.SMTP_HOST,
      user: process.env.SMTP_USER,
      from: process.env.FROM_EMAIL,
      hasPassword: !!process.env.SMTP_PASSWORD
    });
    
    const emailTransporter = await createTestAccount();
    
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@agilem.com',
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      text,
    };
    
    console.log('Sending email to:', mailOptions.to);
    console.log('Email subject:', mailOptions.subject);
    
    const info = await emailTransporter.sendMail(mailOptions);

    console.log('Email sent successfully!');
    console.log('Message ID:', info.messageId);
    
    // For development with Ethereal, log the preview URL
    if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST) {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    } else {
      console.log('Real email sent via SMTP');
    }

    return { success: true, messageId: info.messageId };
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