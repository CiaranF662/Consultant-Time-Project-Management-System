import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import AuthProvider from '@/components/auth/AuthProvider';
import { ThemeProvider } from '@/contexts/ThemeContext';
import SessionTimeout from '@/components/auth/SessionTimeout';
import GlobalShortcutsProvider from '@/components/accessibility/GlobalShortcutsProvider';
import ThemeModeEnforcer from '@/components/ThemeModeEnforcer';
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
        {/* Inline script to avoid flash of dark mode on always-light pages.
            Runs immediately before React hydrates. Updates documentElement
            for the common landing/login/register routes. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){ try{
              var p = location.pathname;
              var alwaysLight = ['/', '/auth/login', '/auth/register', '/login', '/register'];
              var shouldForce = alwaysLight.some(function(r){ return p===r || p.indexOf(r + '/')===0; });
              if (shouldForce){ document.documentElement.classList.remove('dark'); document.documentElement.setAttribute('data-force-theme','light'); }
            }catch(e){} })();`
          }}
        />
        <ThemeProvider>
          <AuthProvider>
            <GlobalShortcutsProvider>
              <ThemeModeEnforcer />
              {children}
              <SessionTimeout />
            </GlobalShortcutsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}