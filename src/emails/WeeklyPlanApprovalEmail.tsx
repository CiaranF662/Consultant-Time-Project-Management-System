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
  Row,
  Column,
} from '@react-email/components';
import * as React from 'react';

interface WeeklyAllocation {
  weekStartDate: string;
  weekEndDate: string;
  proposedHours: number;
  approvalStatus: string;
}

interface WeeklyPlanApprovalEmailProps {
  consultantName: string;
  phaseName: string;
  projectTitle: string;
  approvalStatus: 'APPROVED' | 'REJECTED';
  weeklyAllocations: WeeklyAllocation[];
  dashboardUrl: string;
  rejectionReason?: string;
}

export const WeeklyPlanApprovalEmail = ({
  consultantName,
  phaseName,
  projectTitle,
  approvalStatus,
  weeklyAllocations,
  dashboardUrl,
  rejectionReason,
}: WeeklyPlanApprovalEmailProps) => {
  const isApproved = approvalStatus === 'APPROVED';

  return (
    <Html>
      <Head />
      <Preview>
        Your weekly plan for {phaseName} has been {isApproved ? 'approved' : 'rejected'}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>
            Weekly Plan {isApproved ? 'Approved' : 'Rejected'}
          </Heading>

          <Section style={section}>
            <Text style={text}>
              Hi {consultantName},
            </Text>
            <Text style={text}>
              Your weekly allocation plan for <strong>{phaseName}</strong> in project{' '}
              <strong>{projectTitle}</strong> has been {isApproved ? 'approved' : 'rejected'}.
            </Text>

            {!isApproved && rejectionReason && (
              <div style={rejectionBox}>
                <Text style={rejectionTitle}>Rejection Reason:</Text>
                <Text style={rejectionText}>{rejectionReason}</Text>
              </div>
            )}

            <div style={tableContainer}>
              <Text style={tableTitle}>Weekly Breakdown:</Text>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={tableHeader}>Week</th>
                    <th style={tableHeader}>Hours</th>
                    <th style={tableHeader}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyAllocations.map((allocation, index) => {
                    const weekStart = new Date(allocation.weekStartDate);
                    const weekEnd = new Date(allocation.weekEndDate);
                    const statusStyle = allocation.approvalStatus === 'APPROVED'
                      ? approvedBadge
                      : allocation.approvalStatus === 'REJECTED'
                      ? rejectedBadge
                      : pendingBadge;

                    return (
                      <tr key={index} style={tableRow}>
                        <td style={tableCell}>
                          {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
                          {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td style={tableCell}>{allocation.proposedHours}h</td>
                        <td style={tableCell}>
                          <span style={statusStyle}>
                            {allocation.approvalStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td style={tableTotalLabel}>Total Hours:</td>
                    <td style={tableTotalValue}>
                      {weeklyAllocations.reduce((sum, w) => sum + w.proposedHours, 0)}h
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div style={buttonContainer}>
              <Link href={dashboardUrl} style={button}>
                View in Dashboard
              </Link>
            </div>

            {!isApproved && (
              <Text style={text}>
                Please review the rejection reason and update your weekly plan accordingly.
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

export default WeeklyPlanApprovalEmail;

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

const rejectionBox = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
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

const tableContainer = {
  margin: '24px 0',
};

const tableTitle = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#1f2937',
  margin: '0 0 12px 0',
};

const table = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
};

const tableHeader = {
  backgroundColor: '#f9fafb',
  padding: '12px',
  textAlign: 'left' as const,
  fontSize: '12px',
  fontWeight: '600',
  color: '#6b7280',
  borderBottom: '1px solid #e5e7eb',
};

const tableRow = {
  borderBottom: '1px solid #f3f4f6',
};

const tableCell = {
  padding: '12px',
  fontSize: '14px',
  color: '#374151',
};

const tableTotalLabel = {
  padding: '12px',
  fontSize: '14px',
  fontWeight: '600',
  color: '#1f2937',
  borderTop: '2px solid #e5e7eb',
};

const tableTotalValue = {
  padding: '12px',
  fontSize: '14px',
  fontWeight: '600',
  color: '#2563eb',
  borderTop: '2px solid #e5e7eb',
};

const approvedBadge = {
  display: 'inline-block',
  padding: '4px 8px',
  backgroundColor: '#d1fae5',
  color: '#065f46',
  fontSize: '12px',
  fontWeight: '500',
  borderRadius: '4px',
};

const rejectedBadge = {
  display: 'inline-block',
  padding: '4px 8px',
  backgroundColor: '#fee2e2',
  color: '#991b1b',
  fontSize: '12px',
  fontWeight: '500',
  borderRadius: '4px',
};

const pendingBadge = {
  display: 'inline-block',
  padding: '4px 8px',
  backgroundColor: '#fef3c7',
  color: '#92400e',
  fontSize: '12px',
  fontWeight: '500',
  borderRadius: '4px',
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
