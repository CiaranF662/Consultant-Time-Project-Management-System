'use client';

import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'secondary' | 'white';
  className?: string;
  message?: string;
  centered?: boolean;
}

export default function LoadingSpinner({
  size = 'md',
  variant = 'primary',
  className,
  message,
  centered = false
}: LoadingSpinnerProps) {
  const { theme } = useTheme();

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4'
  };

  const spinnerContent = (
    <div className="flex flex-col items-center gap-4">
      {/* Enhanced multi-layer spinner matching universal design */}
      <div className={cn("relative", sizeClasses[size])}>
        <div className={cn(
          "absolute inset-0 rounded-full border-4 animate-spin",
          theme === 'dark' ? 'border-gray-600' : 'border-gray-300'
        )}></div>
        <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
        <div
          className="absolute inset-2 rounded-full border-2 border-blue-400 border-b-transparent animate-spin"
          style={{ animationDirection: "reverse", animationDuration: "0.8s" }}
        ></div>
      </div>

      {/* Enhanced pulsing dots matching universal design */}
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "rounded-full bg-blue-600 animate-pulse",
              dotSizes[size]
            )}
            style={{
              animationDelay: `${i * 0.2}s`,
              animationDuration: '1s'
            }}
          ></div>
        ))}
      </div>

      {/* Enhanced loading text matching universal design */}
      {message && (
        <div className="text-center">
          <p className={cn(
            "text-sm font-medium animate-pulse",
            theme === 'dark' ? 'text-gray-300' : 'text-card-foreground'
          )}>
            {message}
          </p>
        </div>
      )}
    </div>
  );

  if (centered) {
    return (
      <div className="flex justify-center items-center py-12">
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
}

// Full page loading overlay
export function LoadingOverlay({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <LoadingSpinner size="lg" message={message} />
      </div>
    </div>
  );
}

// Inline loading state for buttons
export function ButtonSpinner({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return (
    <div className="flex items-center">
      <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
    </div>
  );
}

// Page section loading
export function SectionLoader({ message }: { message?: string }) {
  return (
    <LoadingSpinner
      size="lg"
      message={message}
      centered
    />
  );
}

// Component loading (alias for consistency with universal loading)
export function ComponentLoading({ message, className }: { message?: string; className?: string }) {
  return (
    <div className={cn("py-8", className)}>
      <LoadingSpinner size="md" message={message} centered />
    </div>
  );
}