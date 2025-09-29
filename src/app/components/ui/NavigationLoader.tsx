'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/app/contexts/ThemeContext';

export default function NavigationLoader() {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  const { theme } = useTheme();

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timer);
  }, [pathname]);

  if (!isLoading) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900/90' : 'bg-white/90'} backdrop-blur-sm`}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className={`absolute inset-0 rounded-full border-4 animate-spin ${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'}`}></div>
          <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
        </div>
        <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Loading...</p>
      </div>
    </div>
  );
}