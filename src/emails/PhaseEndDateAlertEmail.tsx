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

interface PhaseEndDateAlertEmailProps {
  recipientName: string;
  upcomingPhases: Array<{
    phaseName: string;
    projectName: string;
    endDate: string;
    daysUntilEnd: number;
  }>;
  endingPhases: Array<{
    phaseName: string;
    projectName: string;
    endDate: string;
  }>;
  isProductManager?: boolean;
}

export const PhaseEndDateAlertEmail = ({
  recipientName,
  upcomingPhases,
  endingPhases,
  isProductManager = false
}: PhaseEndDateAlertEmailProps) => {
  const totalAlerts = upcomingPhases.length + endingPhases.length;
  
  return (
    <Html>
      <Head />
      <Preview>{totalAlerts} phase deadline alerts for your projects</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>
            Phase Deadline Alert
          </Heading>
          
          <Section style={section}>
            <Text style={text}>
              Hi {recipientName},
            </Text>
            
            <Text style={text}>
              This is a reminder about upcoming and recently ended project phases:
            </Text>
          </Section>

          {endingPhases.length > 0 && (
            <Section style={urgentSection}>
              <Heading style={urgentHeading}>
                🚨 Phases Ending Today
              </Heading>
              
              {endingPhases.map((phase, index) => (
                <Text key={index} style={text}>
                  • <strong>{phase.phaseName}</strong> in {phase.projectName} ends on {new Date(phase.endDate).toLocaleDateString()}
                </Text>
              ))}
              
              <Text style={urgentText}>
                {isProductManager ? 'Please review phase completion and plan next steps.' : 'Please complete any remaining work for these phases.'}
              </Text>
            </Section>
          )}

          {upcomingPhases.length > 0 && (
            <Section style={warningSection}>
              <Heading style={warningHeading}>
                ⚠️ Phases Ending Soon
              </Heading>
              
              {upcomingPhases.map((phase, index) => (
                <Text key={index} style={text}>
                  • <strong>{phase.phaseName}</strong> in {phase.projectName} ends in <strong>{phase.daysUntilEnd} day{phase.daysUntilEnd !== 1 ? 's' : ''}</strong> ({new Date(phase.endDate).toLocaleDateString()})
                </Text>
              ))}
              
              <Text style={warningText}>
                {isProductManager ? 'Consider reviewing progress and resource allocation.' : 'Please prioritize work for these phases.'}
              </Text>
            </Section>
          )}

          <Section style={section}>
            <Text style={text}>
              <Link href={`${process.env.NEXTAUTH_URL}/dashboard`} style={link}>
                View Dashboard
              </Link> to see detailed project timelines and allocations.
            </Text>
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

export default PhaseEndDateAlertEmail;

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

const urgentSection = {
  padding: '24px',
  border: 'solid 2px #ef4444',
  borderRadius: '5px',
  textAlign: 'left' as const,
  marginBottom: '16px',
  backgroundColor: '#fef2f2',
};

const warningSection = {
  padding: '24px',
  border: 'solid 2px #f59e0b',
  borderRadius: '5px',
  textAlign: 'left' as const,
  marginBottom: '16px',
  backgroundColor: '#fffbeb',
};

const urgentHeading = {
  fontSize: '18px',
  color: '#dc2626',
  margin: '0 0 15px 0',
};

const warningHeading = {
  fontSize: '18px',
  color: '#d97706',
  margin: '0 0 15px 0',
};

const text = {
  margin: '0 0 10px 0',
  textAlign: 'left' as const,
};

const urgentText = {
  margin: '10px 0 0 0',
  fontSize: '14px',
  color: '#dc2626',
};

const warningText = {
  margin: '10px 0 0 0',
  fontSize: '14px',
  color: '#d97706',
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