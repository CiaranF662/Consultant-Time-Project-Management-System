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

interface HourChangeRequestEmailProps {
  type: 'submitted' | 'approved' | 'rejected';
  consultantName: string;
  consultantEmail: string;
  projectName: string;
  phaseName: string;
  changeType: 'ADJUSTMENT' | 'SHIFT';
  originalHours: number;
  requestedHours: number;
  reason: string;
  approverName?: string;
  toConsultantName?: string; // For shift requests
}

export const HourChangeRequestEmail = ({
  type,
  consultantName,
  consultantEmail,
  projectName,
  phaseName,
  changeType,
  originalHours,
  requestedHours,
  reason,
  approverName,
  toConsultantName,
}: HourChangeRequestEmailProps) => {
  const previewText = `Hour change request ${type} for ${projectName}`;
  
  const getHeading = () => {
    switch (type) {
      case 'submitted':
        return 'New Hour Change Request';
      case 'approved':
        return 'Hour Change Request Approved';
      case 'rejected':
        return 'Hour Change Request Rejected';
    }
  };

  const getChangeDescription = () => {
    if (changeType === 'SHIFT' && toConsultantName) {
      return `Transfer ${requestedHours} hours to ${toConsultantName}`;
    } else {
      const diff = requestedHours - originalHours;
      return diff > 0 
        ? `Increase hours by ${diff} (${originalHours} → ${requestedHours})`
        : `Decrease hours by ${Math.abs(diff)} (${originalHours} → ${requestedHours})`;
    }
  };

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>{getHeading()}</Heading>
          
          <Section style={section}>
            <Text style={text}>
              <strong>Project:</strong> {projectName}
            </Text>
            <Text style={text}>
              <strong>Phase:</strong> {phaseName}
            </Text>
            <Text style={text}>
              <strong>Consultant:</strong> {consultantName} ({consultantEmail})
            </Text>
            <Text style={text}>
              <strong>Change:</strong> {getChangeDescription()}
            </Text>
            <Text style={text}>
              <strong>Reason:</strong> {reason}
            </Text>
            
            {type === 'approved' && approverName && (
              <Text style={text}>
                <strong>Approved by:</strong> {approverName}
              </Text>
            )}
            
            {type === 'rejected' && approverName && (
              <Text style={text}>
                <strong>Rejected by:</strong> {approverName}
              </Text>
            )}
          </Section>

          {type === 'submitted' && (
            <Section style={section}>
              <Text style={text}>
                Please review this request in the{' '}
                <Link href={`${process.env.NEXTAUTH_URL}/dashboard/admin/hour-changes`} style={link}>
                  Hour Requests Dashboard
                </Link>
              </Text>
            </Section>
          )}

          <Section style={footer}>
            <Text style={footerText}>
              AgilePM - Project Management System
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default HourChangeRequestEmail;

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