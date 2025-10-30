import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import AuthProvider from '@/components/auth/AuthProvider';
import { ThemeProvider } from '@/contexts/ThemeContext';
import SessionTimeout from '@/components/SessionTimeout';

const inter = Inter({ subsets: ['latin'] });
const poppins = Poppins({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins'
});

export const metadata: Metadata = {
  title: 'Agility - Consultant Planning All in One Place',
  description: 'Consultant Resource & Progress Insight System - All your consultant planning in one unified platform',
  applicationName: 'Agility',
  keywords: ['consultant planning', 'resource planning', 'consultant management', 'project management', 'sprint planning', 'resource allocation'],
  authors: [{ name: 'Agility' }],
  creator: 'Agility',
  publisher: 'Agility',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon.svg', type: 'image/svg+xml', sizes: '180x180' },
    ],
    apple: [
      { url: '/icon.svg', sizes: '180x180', type: 'image/svg+xml' },
    ],
  },
  openGraph: {
    type: 'website',
    title: 'Agility - Consultant Planning All in One Place',
    description: 'All your consultant planning in one unified platform',
    siteName: 'Agility',
  },
  twitter: {
    card: 'summary',
    title: 'Agility - Consultant Planning All in One Place',
    description: 'All your consultant planning in one unified platform',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${poppins.variable}`}>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <SessionTimeout />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}