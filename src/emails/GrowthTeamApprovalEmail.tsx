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

interface GrowthTeamApprovalEmailProps {
  userName: string;
  dashboardUrl?: string;
}

export const GrowthTeamApprovalEmail = ({
  userName,
  dashboardUrl = 'https://your-domain.com/dashboard'
}: GrowthTeamApprovalEmailProps) => {
  const previewText = `Welcome to the Growth Team, ${userName}!`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Welcome to the Growth Team!</Heading>
          
          <Section style={section}>
            <Text style={text}>
              Hi {userName},
            </Text>
            
            <Text style={text}>
              Great news! Your Growth Team access has been approved. You now have full access to the Growth Team features and will receive all Growth Team notifications.
            </Text>
            
            <Section style={featuresSection}>
              <Text style={sectionTitle}>What you can now access:</Text>
              <Text style={featureItem}>• Resource Timeline View</Text>
              <Text style={featureItem}>• Hour Change Request Approvals</Text>
              <Text style={featureItem}>• Project Management & Oversight</Text>
              <Text style={featureItem}>• User Management & Approvals</Text>
              <Text style={featureItem}>• Budget Tracking & Reports</Text>
            </Section>
            
            <Section style={buttonSection}>
              <Link
                href={dashboardUrl}
                style={button}
              >
                Access Dashboard
              </Link>
            </Section>
            
            <Text style={text}>
              If you have any questions about your new Growth Team permissions, please don't hesitate to reach out.
            </Text>
            
            <Text style={text}>
              Welcome aboard!
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

const featuresSection = {
  backgroundColor: '#f0f9ff',
  border: '1px solid #bae6fd',
  borderRadius: '6px',
  padding: '20px',
  margin: '20px 0',
};

const sectionTitle = {
  color: '#0369a1',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
};

const featureItem = {
  color: '#0f172a',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 8px 0',
};

const buttonSection = {
  margin: '30px 0',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#16a34a',
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: 'bold',
  padding: '12px 24px',
  textDecoration: 'none',
};

export default GrowthTeamApprovalEmail;