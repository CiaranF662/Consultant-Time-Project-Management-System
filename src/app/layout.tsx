import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AuthProvider from '@/app/components/auth/AuthProvider';
import { ThemeProvider } from '@/app/contexts/ThemeContext';
import { NotificationProvider } from '@/app/contexts/NotificationContext';
import { AccessibilityProvider } from '@/app/contexts/AccessibilityContext';
import NavigationLoader from '@/app/components/ui/NavigationLoader';
import SkipLinks from '@/app/components/accessibility/SkipLinks';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AgileRS',
  description: 'Project Resource System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} transition-colors duration-200`}>
        <SkipLinks />
        <ThemeProvider>
          <NotificationProvider>
            <AccessibilityProvider>
              <NavigationLoader />
              <AuthProvider>{children}</AuthProvider>
            </AccessibilityProvider>
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}