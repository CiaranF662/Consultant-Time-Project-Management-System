'use client';

import { useTheme } from '@/contexts/ThemeContext';

interface PageLoaderProps {
  message?: string;
}

export default function PageLoader({ message = "Loading..." }: PageLoaderProps) {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen flex items-center justify-center pt-16 lg:pt-0 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="flex flex-col items-center gap-6">
        <div className="relative w-16 h-16">
          <div className={`absolute inset-0 rounded-full border-4 animate-spin ${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'}`}></div>
          <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
          <div
            className="absolute inset-2 rounded-full border-2 border-blue-400 border-b-transparent animate-spin"
            style={{ animationDirection: "reverse", animationDuration: "0.8s" }}
          ></div>
        </div>

        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full bg-blue-600 animate-pulse"
              style={{ animationDelay: `${i * 0.2}s`, animationDuration: "1s" }}
            ></div>
          ))}
        </div>

        <p className={`font-medium animate-pulse ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{message}</p>
      </div>
    </div>
  );
}