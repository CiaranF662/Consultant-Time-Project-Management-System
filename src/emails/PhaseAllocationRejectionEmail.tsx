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

interface PhaseAllocationRejectionEmailProps {
  recipientName: string;
  recipientRole: 'consultant' | 'pm';
  consultantName: string;
  phaseName: string;
  projectTitle: string;
  totalHours: number;
  rejectionReason?: string;
  dashboardUrl: string;
}

export const PhaseAllocationRejectionEmail = ({
  recipientName,
  recipientRole,
  consultantName,
  phaseName,
  projectTitle,
  totalHours,
  rejectionReason,
  dashboardUrl,
}: PhaseAllocationRejectionEmailProps) => {
  const isConsultant = recipientRole === 'consultant';

  return (
    <Html>
      <Head />
      <Preview>
        Phase allocation for {phaseName} has been rejected
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>
            Phase Allocation Rejected
          </Heading>

          <Section style={section}>
            <Text style={text}>
              Hi {recipientName},
            </Text>

            {isConsultant ? (
              <Text style={text}>
                Your phase allocation for <strong>{phaseName}</strong> in project{' '}
                <strong>{projectTitle}</strong> has been rejected by the Growth Team.
              </Text>
            ) : (
              <Text style={text}>
                The phase allocation you created for <strong>{consultantName}</strong> on{' '}
                <strong>{phaseName}</strong> in project <strong>{projectTitle}</strong> has been rejected by the Growth Team.
              </Text>
            )}

            <div style={detailsBox}>
              <Text style={detailsTitle}>Allocation Details:</Text>
              <table style={detailsTable}>
                <tr>
                  <td style={detailsLabel}>Project:</td>
                  <td style={detailsValue}>{projectTitle}</td>
                </tr>
                <tr>
                  <td style={detailsLabel}>Phase:</td>
                  <td style={detailsValue}>{phaseName}</td>
                </tr>
                <tr>
                  <td style={detailsLabel}>Consultant:</td>
                  <td style={detailsValue}>{consultantName}</td>
                </tr>
                <tr>
                  <td style={detailsLabel}>Total Hours:</td>
                  <td style={detailsValue}>{totalHours}h</td>
                </tr>
              </table>
            </div>

            {rejectionReason && (
              <div style={rejectionBox}>
                <Text style={rejectionTitle}>Rejection Reason:</Text>
                <Text style={rejectionText}>{rejectionReason}</Text>
              </div>
            )}

            <div style={buttonContainer}>
              <Link href={dashboardUrl} style={button}>
                {isConsultant ? 'View My Allocations' : 'Manage Project Allocations'}
              </Link>
            </div>

            {isConsultant ? (
              <Text style={text}>
                Please contact your Product Manager or the Growth Team for more information.
              </Text>
            ) : (
              <Text style={text}>
                Please review the rejection reason and consider revising the allocation. You may need to adjust the hours or discuss with the Growth Team.
              </Text>
            )}
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

export default PhaseAllocationRejectionEmail;

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
  color: '#dc2626',
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

const detailsBox = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
};

const detailsTitle = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#1f2937',
  margin: '0 0 12px 0',
};

const detailsTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const detailsLabel = {
  fontSize: '14px',
  color: '#6b7280',
  padding: '6px 0',
  width: '40%',
};

const detailsValue = {
  fontSize: '14px',
  color: '#1f2937',
  fontWeight: '500',
  padding: '6px 0',
};

const rejectionBox = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
};

const rejectionTitle = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#991b1b',
  margin: '0 0 8px 0',
};

const rejectionText = {
  fontSize: '14px',
  color: '#7f1d1d',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
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
