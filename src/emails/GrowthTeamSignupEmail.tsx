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

interface GrowthTeamSignupEmailProps {
  userName: string;
  userEmail: string;
  dashboardUrl?: string;
}

export const GrowthTeamSignupEmail = ({
  userName,
  userEmail,
  dashboardUrl = 'https://your-domain.com/dashboard/admin/user-approvals'
}: GrowthTeamSignupEmailProps) => {
  const previewText = `New Growth Team member signup: ${userName}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>New Growth Team Member Signup</Heading>
          
          <Section style={section}>
            <Text style={text}>
              A new user has signed up requesting Growth Team access and is pending approval.
            </Text>
            
            <Section style={userDetailsSection}>
              <Text style={detailLabel}>Name:</Text>
              <Text style={detailValue}>{userName}</Text>
              
              <Text style={detailLabel}>Email:</Text>
              <Text style={detailValue}>{userEmail}</Text>
            </Section>
            
            <Text style={text}>
              Please review and approve this user in the admin panel to grant them Growth Team access.
            </Text>
            
            <Section style={buttonSection}>
              <Link
                href={dashboardUrl}
                style={button}
              >
                Review User Approvals
              </Link>
            </Section>
            
            <Text style={footerText}>
              This user will not receive Growth Team notifications until they are approved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
  margin: '0 auto',
  padding: '20px 0',
};

const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #e6e6e6',
  borderRadius: '8px',
  margin: '0 auto',
  maxWidth: '600px',
  padding: '40px 20px',
};

const h1 = {
  color: '#333333',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 30px 0',
  textAlign: 'center' as const,
};

const section = {
  margin: '0 0 20px 0',
};

const text = {
  color: '#333333',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px 0',
};

const userDetailsSection = {
  backgroundColor: '#f8f9fa',
  border: '1px solid #e9ecef',
  borderRadius: '6px',
  padding: '20px',
  margin: '20px 0',
};

const detailLabel = {
  color: '#666666',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0 0 4px 0',
};

const detailValue = {
  color: '#333333',
  fontSize: '16px',
  margin: '0 0 12px 0',
};

const buttonSection = {
  margin: '30px 0',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: 'bold',
  padding: '12px 24px',
  textDecoration: 'none',
};

const footerText = {
  color: '#666666',
  fontSize: '14px',
  fontStyle: 'italic',
  margin: '20px 0 0 0',
  textAlign: 'center' as const,
};

export default GrowthTeamSignupEmail;