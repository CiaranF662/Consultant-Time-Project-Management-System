import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import AuthProvider from '@/components/auth/AuthProvider';
import { ThemeProvider } from '@/contexts/ThemeContext';
import SessionTimeout from '@/components/SessionTimeout';
import GlobalShortcutsProvider from '@/components/GlobalShortcutsProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });
const poppins = Poppins({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins'
});

export const metadata: Metadata = {
  title: 'Agility',
  description: 'Consultant Resource & Progress Insight System',
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
            <GlobalShortcutsProvider>
              {children}
              <SessionTimeout />
            </GlobalShortcutsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}