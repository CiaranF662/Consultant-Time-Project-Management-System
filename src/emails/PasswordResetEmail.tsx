import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface PasswordResetEmailProps {
  userName: string;
  resetLink: string;
}

export const PasswordResetEmail = ({
  userName,
  resetLink,
}: PasswordResetEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Reset your Agility password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Reset Your Password</Heading>

          <Section style={section}>
            <Text style={text}>
              Hi {userName},
            </Text>
            <Text style={text}>
              We received a request to reset your password for your Agility account.
              Click the button below to create a new password.
            </Text>

            <div style={buttonContainer}>
              <Link href={resetLink} style={button}>
                Reset Password
              </Link>
            </div>

            <Text style={text}>
              This link will expire in <strong>1 hour</strong> for security reasons.
            </Text>

            <Text style={text}>
              If you didn't request a password reset, you can safely ignore this email.
              Your password will remain unchanged.
            </Text>

            <Text style={smallText}>
              Or copy and paste this URL into your browser:
            </Text>
            <Text style={linkText}>
              {resetLink}
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              Agility - Consultant Resource & Progress Insight System
            </Text>
            <Text style={footerText}>
              This is an automated email. Please do not reply to this message.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default PasswordResetEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const heading = {
  fontSize: '28px',
  letterSpacing: '-0.5px',
  lineHeight: '1.3',
  fontWeight: '600',
  color: '#2563eb',
  padding: '17px 24px 0',
  textAlign: 'center' as const,
};

const section = {
  padding: '24px',
  border: 'solid 1px #dedede',
  borderRadius: '5px',
  margin: '0 24px',
};

const text = {
  margin: '0 0 16px 0',
  textAlign: 'left' as const,
  fontSize: '16px',
  lineHeight: '24px',
  color: '#484848',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
};

const smallText = {
  fontSize: '12px',
  color: '#6b7280',
  margin: '24px 0 8px 0',
};

const linkText = {
  fontSize: '12px',
  color: '#2563eb',
  wordBreak: 'break-all' as const,
  margin: '0 0 16px 0',
};

const footer = {
  textAlign: 'center' as const,
  marginTop: '32px',
  padding: '0 24px',
};

const footerText = {
  fontSize: '12px',
  color: '#6b7280',
  margin: '4px 0',
};
