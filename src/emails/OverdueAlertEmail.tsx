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

interface OverdueAlertEmailProps {
  overdueHourRequests: number;
  overdueUserApprovals: number;
}

export const OverdueAlertEmail = ({
  overdueHourRequests,
  overdueUserApprovals,
}: OverdueAlertEmailProps) => {
  const totalOverdue = overdueHourRequests + overdueUserApprovals;
  
  return (
    <Html>
      <Head />
      <Preview>{`You have ${totalOverdue} overdue approvals pending`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>
            Overdue Approvals Alert
          </Heading>
          
          <Section style={section}>
            <Text style={text}>
              Hi Growth Team,
            </Text>
            
            <Text style={text}>
              You have <strong>{totalOverdue}</strong> overdue approvals that need your attention:
            </Text>
            
            {overdueHourRequests > 0 && (
              <Text style={text}>
                • <strong>{overdueHourRequests}</strong> hour change requests pending for more than 48 hours
              </Text>
            )}
            
            {overdueUserApprovals > 0 && (
              <Text style={text}>
                • <strong>{overdueUserApprovals}</strong> user registrations pending for more than 24 hours
              </Text>
            )}
          </Section>

          <Section style={section}>
            <Text style={text}>
              Please review these pending approvals:
            </Text>
            
            {overdueHourRequests > 0 && (
              <Text style={text}>
                <Link href={`${process.env.NEXTAUTH_URL}/dashboard/admin/hour-changes`} style={link}>
                  Review Hour Change Requests
                </Link>
              </Text>
            )}
            
            {overdueUserApprovals > 0 && (
              <Text style={text}>
                <Link href={`${process.env.NEXTAUTH_URL}/dashboard/admin/user-approvals`} style={link}>
                  Review User Registrations
                </Link>
              </Text>
            )}
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              Agility - Consultant Resource & Progress Insight System
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default OverdueAlertEmail;

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
};

const heading = {
  fontSize: '24px',
  letterSpacing: '-0.5px',
  lineHeight: '1.3',
  fontWeight: '400',
  color: '#484848',
  padding: '17px 4px 0',
};

const section = {
  padding: '24px',
  border: 'solid 1px #dedede',
  borderRadius: '5px',
  textAlign: 'left' as const,
  marginBottom: '16px',
};

const text = {
  margin: '0 0 10px 0',
  textAlign: 'left' as const,
};

const link = {
  color: '#2563eb',
  textDecoration: 'underline',
};

const footer = {
  textAlign: 'center' as const,
  marginTop: '32px',
};

const footerText = {
  fontSize: '12px',
  color: '#6b7280',
};