'use client';

import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'secondary' | 'white';
  className?: string;
  text?: string;
  centered?: boolean;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
};

const variantClasses = {
  primary: 'border-blue-500',
  secondary: 'border-gray-400',
  white: 'border-white'
};

export default function LoadingSpinner({
  size = 'md',
  variant = 'primary',
  className,
  text,
  centered = false
}: LoadingSpinnerProps) {
  const spinnerContent = (
    <div className={cn("flex items-center gap-3", centered && "justify-center")}>
      <div
        className={cn(
          "animate-spin rounded-full border-2 border-t-transparent",
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
      />
      {text && (
        <span className={cn(
          "text-sm font-medium",
          variant === 'white' ? 'text-white' : 'text-gray-600'
        )}>
          {text}
        </span>
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
export function LoadingOverlay({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-6 flex items-center gap-4">
        <LoadingSpinner size="lg" />
        <span className="text-lg font-medium text-gray-700">{text}</span>
      </div>
    </div>
  );
}

// Inline loading state for buttons
export function ButtonSpinner({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return (
    <LoadingSpinner
      size={size}
      variant="white"
      className="mr-2"
    />
  );
}

// Page section loading
export function SectionLoader({ text }: { text?: string }) {
  return (
    <LoadingSpinner
      size="lg"
      text={text}
      centered
    />
  );
}