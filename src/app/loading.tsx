import React from "react";

interface LoadingProps {
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
}

export default function Loading({ size = "md", fullScreen = true }: LoadingProps) {
  if (!fullScreen) return null;

  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-12 h-12",
  };

  const dotSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-3 h-3",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-100/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 rounded-xl ">
        {/* Spinner */}
        <div className={`relative ${sizeClasses[size]}`}>
          <div className="absolute inset-0 rounded-full border-4 border-gray-300 animate-spin"></div>
          <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
          <div
            className="absolute inset-2 rounded-full border-2 border-blue-400 border-b-transparent animate-spin"
            style={{ animationDirection: "reverse", animationDuration: "0.8s" }}
          ></div>
        </div>

        {/* Pulsing dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`rounded-full bg-blue-600 animate-pulse ${dotSizes[size]}`}
              style={{ animationDelay: `${i * 0.2}s`, animationDuration: "1s" }}
            ></div>
          ))}
        </div>

        {/* Loading text */}
        <p className="text-gray-700 font-medium animate-pulse">Loading...</p>
      </div>
    </div>
  );
}

// Convenience export
export function PageLoading() {
  return <Loading fullScreen size="lg" />;
}
