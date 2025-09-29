'use client';

import { FaQuestionCircle, FaInfoCircle } from 'react-icons/fa';
import { useTheme } from '@/app/contexts/ThemeContext';
import Tooltip from './Tooltip';

interface HelpTextProps {
  content: string;
  type?: 'info' | 'help';
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export default function HelpText({ 
  content, 
  type = 'help', 
  position = 'top',
  className = '' 
}: HelpTextProps) {
  const { theme } = useTheme();
  
  const Icon = type === 'info' ? FaInfoCircle : FaQuestionCircle;
  const iconColor = type === 'info' 
    ? (theme === 'dark' ? 'text-blue-400' : 'text-blue-500')
    : (theme === 'dark' ? 'text-gray-400' : 'text-gray-500');

  return (
    <Tooltip content={content} position={position}>
      <Icon 
        className={`h-4 w-4 cursor-help ${iconColor} ${className}`}
        aria-label={content}
        tabIndex={0}
      />
    </Tooltip>
  );
}