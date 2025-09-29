'use client';

import { useTheme } from '@/app/contexts/ThemeContext';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepNames: string[];
  className?: string;
}

export default function ProgressIndicator({ 
  currentStep, 
  totalSteps, 
  stepNames, 
  className = '' 
}: ProgressIndicatorProps) {
  const { theme } = useTheme();

  return (
    <nav 
      aria-label="Progress" 
      role="progressbar" 
      aria-valuenow={currentStep + 1} 
      aria-valuemax={totalSteps}
      aria-valuetext={`Step ${currentStep + 1} of ${totalSteps}: ${stepNames[currentStep]}`}
      className={className}
    >
      <ol className="flex items-center space-x-4">
        {stepNames.map((name, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isPending = index > currentStep;

          return (
            <li key={index} className="flex items-center">
              <div className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    isCompleted
                      ? 'bg-green-600 text-white'
                      : isCurrent
                      ? 'bg-blue-600 text-white'
                      : theme === 'dark'
                      ? 'bg-gray-600 text-gray-300'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                  aria-hidden="true"
                >
                  {isCompleted ? '✓' : index + 1}
                </div>
                <span
                  className={`ml-2 text-sm font-medium ${
                    isCompleted || isCurrent
                      ? theme === 'dark' ? 'text-white' : 'text-gray-900'
                      : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  <span className="sr-only">
                    {isCompleted ? 'Completed: ' : isCurrent ? 'Current: ' : 'Upcoming: '}
                  </span>
                  {name}
                </span>
              </div>
              {index < stepNames.length - 1 && (
                <div
                  className={`ml-4 w-8 h-0.5 ${
                    isCompleted ? 'bg-green-600' : theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}