'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import formatDate from '@/lib/formatDate';
import { WidgetProps } from '../../types';

// #region Time Widget Component
export default function TimeWidget({ size, config }: WidgetProps) {
  const [time, setTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!mounted) return <div className="animate-pulse bg-gray-200 rounded-lg h-full" />;

  const timeFormat = config?.format24h ? 'HH:mm:ss' : 'h:mm:ss A';
  const showDate = config?.showDate !== false;
  const timezone = config?.timezone || 'local';

  return (
    <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white p-4 rounded-lg h-full flex flex-col justify-center items-center">
      <Clock className="w-8 h-8 mb-2 opacity-80" />
      <div className="text-center">
        <div className={`font-mono font-bold ${size === 'small' ? 'text-lg' : 'text-2xl'}`}>
          {time.toLocaleTimeString([], { 
            hour12: !config?.format24h,
            hour: '2-digit',
            minute: '2-digit',
            second: size !== 'small' ? '2-digit' : undefined
          })}
        </div>
        {showDate && (
          <div className="text-sm opacity-80 mt-1">
            {formatDate(time)}
          </div>
        )}
      </div>
    </div>
  );
}
// #endregion