import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { EmailHeader } from './components/EmailHeader';
import { EmailFooter } from './components/EmailFooter';

interface PhaseAllocationEmailProps {
  type: 'allocated' | 'planned';
  consultantName: string;
  projectName: string;
  phaseName: string;
  phaseDescription?: string;
  totalHours: number;
  productManagerName?: string;
  startDate: string;
  endDate: string;
}

export const PhaseAllocationEmail = ({
  type,
  consultantName,
  projectName,
  phaseName,
  phaseDescription,
  totalHours,
  productManagerName,
  startDate,
  endDate,
}: PhaseAllocationEmailProps) => {
  const previewText = type === 'allocated' 
    ? `New phase allocation: ${phaseName}` 
    : `Weekly planning completed for ${phaseName}`;

  const getHeading = () => {
    return type === 'allocated' 
      ? 'New Phase Allocation' 
      : 'Weekly Planning Completed';
  };

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader title={getHeading()} />

          <Section style={section}>
            <Text style={text}>
              Hi {consultantName},
            </Text>
            
            {type === 'allocated' ? (
              <Text style={text}>
                You've been allocated <strong>{totalHours} hours</strong> for the phase <strong>{phaseName}</strong> in project <strong>{projectName}</strong>.
              </Text>
            ) : (
              <Text style={text}>
                Your weekly planning for <strong>{phaseName}</strong> has been completed.
              </Text>
            )}
            
            <Text style={text}>
              <strong>Project:</strong> {projectName}
            </Text>
            <Text style={text}>
              <strong>Phase:</strong> {phaseName}
            </Text>
            
            {phaseDescription && (
              <Text style={text}>
                <strong>Description:</strong> {phaseDescription}
              </Text>
            )}
            
            <Text style={text}>
              <strong>Phase Duration:</strong> {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
            </Text>
            
            <Text style={text}>
              <strong>Total Hours:</strong> {totalHours}
            </Text>
            
            {productManagerName && (
              <Text style={text}>
                <strong>Product Manager:</strong> {productManagerName}
              </Text>
            )}
          </Section>

          <Section style={section}>
            {type === 'allocated' ? (
              <Text style={text}>
                Please plan your weekly hours for this phase in the{' '}
                <Link href={`${process.env.NEXTAUTH_URL}/dashboard/allocations`} style={link}>
                  Weekly Planner
                </Link>
              </Text>
            ) : (
              <Text style={text}>
                You can view and modify your weekly allocations in the{' '}
                <Link href={`${process.env.NEXTAUTH_URL}/dashboard/allocations`} style={link}>
                  Weekly Planner
                </Link>
              </Text>
            )}
          </Section>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
};

export default PhaseAllocationEmail;

// Styles (reuse from previous templates)
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