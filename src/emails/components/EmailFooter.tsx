import { Section, Text, Hr } from '@react-email/components';
import * as React from 'react';

export const EmailFooter = () => {
  return (
    <>
      <Hr style={divider} />
      <Section style={footer}>
        <Text style={footerText}>
          This email was sent by <strong style={brandText}>Agility</strong> - Your Resource Planning Solution
        </Text>
        <Text style={footerSubtext}>
          Consultant planning all in one place
        </Text>
      </Section>
    </>
  );
};

const divider: React.CSSProperties = {
  borderColor: '#e2e8f0',
  margin: '32px 0 24px 0',
};

const footer: React.CSSProperties = {
  textAlign: 'center',
  padding: '0 0 24px 0',
};

const footerText: React.CSSProperties = {
  fontSize: '13px',
  color: '#64748b',
  margin: '0 0 8px 0',
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

const brandText: React.CSSProperties = {
  color: '#2563eb',
  fontWeight: '600',
};

const footerSubtext: React.CSSProperties = {
  fontSize: '12px',
  color: '#94a3b8',
  margin: '0',
  fontFamily: 'system-ui, -apple-system, sans-serif',
};
