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

interface ExpiredAllocation {
  consultantName: string;
  projectName: string;
  phaseName: string;
  unplannedHours: number;
  plannedHours: number;
  totalHours: number;
  projectId: string;
  productManagerName?: string;
}

interface ExpiredAllocationsSummaryEmailProps {
  recipientName: string;
  recipientRole: 'PRODUCT_MANAGER' | 'GROWTH_TEAM' | 'CONSULTANT';
  expiredAllocations: ExpiredAllocation[];
}

export const ExpiredAllocationsSummaryEmail = ({
  recipientName,
  recipientRole,
  expiredAllocations
}: ExpiredAllocationsSummaryEmailProps) => {
  const totalCount = expiredAllocations.length;
  const totalUnplannedHours = expiredAllocations.reduce((sum, alloc) => sum + alloc.unplannedHours, 0);

  // Group by project for better organization
  const groupedByProject = expiredAllocations.reduce((acc, alloc) => {
    if (!acc[alloc.projectName]) {
      acc[alloc.projectName] = {
        projectId: alloc.projectId,
        productManagerName: alloc.productManagerName,
        allocations: []
      };
    }
    acc[alloc.projectName].allocations.push(alloc);
    return acc;
  }, {} as Record<string, { projectId: string; productManagerName?: string; allocations: ExpiredAllocation[] }>);

  const getSubjectLine = () => {
    if (recipientRole === 'CONSULTANT') {
      return `${totalCount} of Your Phase${totalCount > 1 ? 's' : ''} Ended with Unplanned Hours`;
    } else if (recipientRole === 'PRODUCT_MANAGER') {
      return `Action Required: ${totalCount} Phase${totalCount > 1 ? 's' : ''} ${totalCount > 1 ? 'Have' : 'Has'} Unplanned Hours`;
    } else {
      return `Expired Allocations Detected: ${totalCount} Phase${totalCount > 1 ? 's' : ''} Across ${Object.keys(groupedByProject).length} Project${Object.keys(groupedByProject).length > 1 ? 's' : ''}`;
    }
  };

  const getIntroText = () => {
    if (recipientRole === 'CONSULTANT') {
      return `${totalCount} of your phase allocation${totalCount > 1 ? 's have' : ' has'} ended with unplanned hours:`;
    } else if (recipientRole === 'PRODUCT_MANAGER') {
      return `The following allocation${totalCount > 1 ? 's' : ''} in your project${totalCount > 1 ? 's have' : ' has'} ended with unplanned hours that need to be handled:`;
    } else {
      return `${totalCount} phase allocation${totalCount > 1 ? 's have' : ' has'} ended with unplanned hours across ${Object.keys(groupedByProject).length} project${Object.keys(groupedByProject).length > 1 ? 's' : ''}:`;
    }
  };

  const getActionText = () => {
    if (recipientRole === 'CONSULTANT') {
      return 'Contact your Product Manager if these hours need to be reallocated to another phase.';
    } else if (recipientRole === 'PRODUCT_MANAGER') {
      return 'Please review each allocation and either forfeit the unplanned hours or reallocate them to another phase in the project dashboard.';
    } else {
      return 'Product Managers have been notified to handle these allocations.';
    }
  };

  return (
    <Html>
      <Head />
      <Preview>{getSubjectLine()}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>
            {recipientRole === 'PRODUCT_MANAGER' ? '⚠️ Action Required' : '📊'} Expired Phase Allocations
          </Heading>

          <Section style={section}>
            <Text style={text}>
              Hi {recipientName},
            </Text>

            <Text style={text}>
              {getIntroText()}
            </Text>
          </Section>

          <Section style={urgentSection}>
            <Heading style={urgentHeading}>
              📋 Summary: {totalCount} Allocation{totalCount > 1 ? 's' : ''} ({totalUnplannedHours.toFixed(1)}h total unplanned)
            </Heading>

            {Object.entries(groupedByProject).map(([projectName, projectData]) => (
              <div key={projectName} style={{ marginBottom: '20px' }}>
                <Text style={projectHeading}>
                  <strong>Project: {projectName}</strong>
                  {recipientRole === 'GROWTH_TEAM' && projectData.productManagerName && (
                    <span style={{ color: '#6b7280', fontSize: '14px' }}> (PM: {projectData.productManagerName})</span>
                  )}
                </Text>

                {projectData.allocations.map((alloc, index) => (
                  <Text key={index} style={allocationText}>
                    • <strong>{recipientRole !== 'CONSULTANT' ? `${alloc.consultantName}: ` : ''}{alloc.unplannedHours.toFixed(1)}h unplanned</strong> in "{alloc.phaseName}"
                    <br />
                    <span style={{ fontSize: '14px', color: '#6b7280', marginLeft: '12px' }}>
                      ({alloc.plannedHours.toFixed(1)}h successfully planned out of {alloc.totalHours.toFixed(1)}h total)
                    </span>
                  </Text>
                ))}

                {recipientRole !== 'CONSULTANT' && (
                  <Text style={text}>
                    <Link
                      href={`${process.env.NEXTAUTH_URL}/dashboard/projects/${projectData.projectId}`}
                      style={link}
                    >
                      View {projectName} →
                    </Link>
                  </Text>
                )}
              </div>
            ))}

            <Text style={urgentText}>
              {getActionText()}
            </Text>
          </Section>

          <Section style={infoSection}>
            <Heading style={infoHeading}>What are unplanned hours?</Heading>
            <Text style={text}>
              Unplanned hours occur when a phase ends but the consultant hasn't distributed all their allocated hours across the weekly calendar. These hours need to be either:
            </Text>
            <Text style={text}>
              • <strong>Forfeited:</strong> Marked as unused (e.g., work completed faster than expected)
              <br />
              • <strong>Reallocated:</strong> Moved to another phase where the consultant can use them
            </Text>
          </Section>

          <Section style={section}>
            <Text style={text}>
              <Link href={`${process.env.NEXTAUTH_URL}/dashboard`} style={link}>
                View Dashboard
              </Link> to manage your allocations.
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

export default ExpiredAllocationsSummaryEmail;

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
  border: 'solid 2px #dc2626',
  borderRadius: '5px',
  textAlign: 'left' as const,
  marginBottom: '16px',
  backgroundColor: '#fef2f2',
};

const infoSection = {
  padding: '24px',
  border: 'solid 1px #3b82f6',
  borderRadius: '5px',
  textAlign: 'left' as const,
  marginBottom: '16px',
  backgroundColor: '#eff6ff',
};

const urgentHeading = {
  fontSize: '18px',
  color: '#dc2626',
  margin: '0 0 15px 0',
};

const infoHeading = {
  fontSize: '16px',
  color: '#1e40af',
  margin: '0 0 10px 0',
};

const projectHeading = {
  fontSize: '16px',
  margin: '0 0 10px 0',
  color: '#374151',
};

const text = {
  margin: '0 0 10px 0',
  textAlign: 'left' as const,
  color: '#374151',
};

const allocationText = {
  margin: '0 0 12px 0',
  textAlign: 'left' as const,
  color: '#374151',
  lineHeight: '1.6',
};

const urgentText = {
  margin: '20px 0 0 0',
  fontSize: '14px',
  color: '#dc2626',
  fontWeight: '500',
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
