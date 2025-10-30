import { Section, Img, Text } from '@react-email/components';
import * as React from 'react';

interface EmailHeaderProps {
  title?: string;
}

export const EmailHeader = ({ title }: EmailHeaderProps) => {
  return (
    <Section style={header}>
      <div style={logoContainer}>
        {/* Logo SVG */}
        <svg width="48" height="48" viewBox="0 0 64 64" style={logo}>
          <defs>
            <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#2563eb', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#1d4ed8', stopOpacity: 1 }} />
            </linearGradient>
          </defs>
          <rect width="64" height="64" rx="16" fill="url(#bg-gradient)"/>
          <text x="32" y="38" fontFamily="system-ui, -apple-system, sans-serif" fontSize="32" fontWeight="700" textAnchor="middle" fill="white">a</text>
          <circle cx="26" cy="46" r="1.5" fill="white"/>
          <rect x="30" y="45" width="8" height="2" rx="1" fill="white"/>
        </svg>
        <Text style={brandName}>agility</Text>
      </div>
      {title && <Text style={headerTitle}>{title}</Text>}
    </Section>
  );
};

const header: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderBottom: '3px solid #2563eb',
  padding: '24px 0',
  marginBottom: '32px',
};

const logoContainer: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
  marginBottom: '8px',
};

const logo: React.CSSProperties = {
  width: '48px',
  height: '48px',
};

const brandName: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: '300',
  color: '#1e293b',
  margin: '0',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  letterSpacing: '-0.02em',
};

const headerTitle: React.CSSProperties = {
  fontSize: '14px',
  color: '#64748b',
  textAlign: 'center',
  margin: '0',
  fontFamily: 'system-ui, -apple-system, sans-serif',
};
