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

interface ProjectAssignmentEmailProps {
  consultantName: string;
  projectName: string;
  projectDescription?: string;
  userRole: 'Product Manager' | 'Team Member';
  productManagerName: string;
  productManagerEmail: string;
  otherConsultants: Array<{ name: string; email: string }>;
  projectStartDate: string;
  projectEndDate?: string;
}

export const ProjectAssignmentEmail = ({
  consultantName,
  projectName,
  projectDescription,
  userRole,
  productManagerName,
  productManagerEmail,
  otherConsultants,
  projectStartDate,
  projectEndDate,
}: ProjectAssignmentEmailProps) => {
  const previewText = `You've been assigned as ${userRole} to project: ${projectName}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>New Project Assignment</Heading>
          
          <Section style={section}>
            <Text style={text}>
              Hi {consultantName},
            </Text>
            <Text style={text}>
              You've been assigned to a new project: <strong>{projectName}</strong>
            </Text>
            
            <Text style={{...text, backgroundColor: userRole === 'Product Manager' ? '#dbeafe' : '#f0fdf4', padding: '12px', borderRadius: '6px', border: `2px solid ${userRole === 'Product Manager' ? '#3b82f6' : '#22c55e'}`, margin: '15px 0'}}>
              <strong>Your Role:</strong> <span style={{fontSize: '16px', fontWeight: 'bold', color: userRole === 'Product Manager' ? '#1e40af' : '#15803d'}}>{userRole}</span>
              {userRole === 'Product Manager' && <span style={{display: 'block', fontSize: '14px', color: '#1e40af', marginTop: '5px'}}>You will be responsible for managing this project and its phases.</span>}
            </Text>
            
            {projectDescription && (
              <Text style={text}>
                <strong>Description:</strong> {projectDescription}
              </Text>
            )}
            
            <Text style={text}>
              <strong>Start Date:</strong> {new Date(projectStartDate).toLocaleDateString()}
            </Text>
            
            {projectEndDate && (
              <Text style={text}>
                <strong>End Date:</strong> {new Date(projectEndDate).toLocaleDateString()}
              </Text>
            )}
            
            <Text style={text}>
              <strong>Product Manager:</strong> {productManagerName} ({productManagerEmail})
            </Text>
          </Section>

          {otherConsultants.length > 0 && (
            <Section style={section}>
              <Text style={text}>
                <strong>Team Members:</strong>
              </Text>
              {otherConsultants.map((consultant, index) => (
                <Text key={index} style={text}>
                  • {consultant.name} ({consultant.email})
                </Text>
              ))}
            </Section>
          )}

          <Section style={section}>
            <Text style={text}>
              You can view project details in the{' '}
              <Link href={`${process.env.NEXTAUTH_URL}/dashboard/projects`} style={link}>
                Projects Dashboard
              </Link>
            </Text>
            <Text style={text}>
              The Product Manager will allocate hours to you for different project phases.
            </Text>
          </Section>

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

export default ProjectAssignmentEmail;

// Styles (reuse from previous template)
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