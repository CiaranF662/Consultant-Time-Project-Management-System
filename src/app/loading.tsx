import React from "react";
import { cn } from "@/lib/utils";

interface LoadingProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
  message?: string;
}

export default function Loading({ className, size = "md", fullScreen = false, message = "Loading..." }: LoadingProps) {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-20 h-20",
  };

  const dotSizes = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  const LoadingSpinner = () => (
    <div className="flex flex-col items-center gap-6">
      {/* Enhanced multi-layer spinner */}
      <div className={cn("relative", sizeClasses[size])}>
        <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
        <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
        <div
          className="absolute inset-2 rounded-full border-2 border-blue-400 border-b-transparent animate-spin"
          style={{ animationDirection: "reverse", animationDuration: "0.8s" }}
        ></div>
      </div>

      {/* Enhanced pulsing dots */}
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

      {/* Enhanced loading text */}
      <div className="text-center">
        <p className="text-sm font-medium text-card-foreground dark:text-gray-300 animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="rounded-xl bg-white dark:bg-gray-800 p-8 shadow-2xl border border-gray-200 dark:border-gray-700">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center p-8", className)}>
      <LoadingSpinner />
    </div>
  );
}

// Enhanced exports with better naming and functionality
export function PageLoading({ message }: { message?: string } = {}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Loading size="lg" message={message} />
    </div>
  );
}

export function ComponentLoading({ className, message }: { className?: string; message?: string } = {}) {
  return <Loading className={className} size="md" message={message} />;
}

export function InlineLoading({ size = "sm", message }: { size?: "sm" | "md"; message?: string } = {}) {
  return <Loading size={size} message={message} />;
}