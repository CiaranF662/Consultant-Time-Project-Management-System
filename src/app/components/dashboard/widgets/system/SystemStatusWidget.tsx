'use client';

import { useState, useEffect } from 'react';
import { Activity, Cpu, HardDrive, Wifi } from 'lucide-react';
import { WidgetProps } from '../../types';

// #region System Status Widget Component
interface SystemStatus {
  cpu: number;
  memory: number;
  storage: number;
  network: 'online' | 'offline';
}

export default function SystemStatusWidget({ size }: WidgetProps) {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock system data - replace with real system monitoring
    const mockStatus: SystemStatus = {
      cpu: Math.floor(Math.random() * 40) + 20,
      memory: Math.floor(Math.random() * 30) + 50,
      storage: Math.floor(Math.random() * 20) + 65,
      network: 'online'
    };
    
    setTimeout(() => {
      setStatus(mockStatus);
      setLoading(false);
    }, 600);

    // Update every 5 seconds
    const interval = setInterval(() => {
      setStatus(prev => prev ? {
        ...prev,
        cpu: Math.floor(Math.random() * 40) + 20,
        memory: Math.floor(Math.random() * 30) + 50
      } : null);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="animate-pulse bg-gray-200 rounded-lg h-full" />;
  }

  const getStatusColor = (value: number) => {
    if (value > 80) return 'text-red-500';
    if (value > 60) return 'text-yellow-500';
    return 'text-green-500';
  };

  const isSmall = size === 'small';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 h-full">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-5 h-5 text-green-600" />
        <span className="font-semibold text-gray-800">System</span>
        <div className={`ml-auto w-2 h-2 rounded-full ${status?.network === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-gray-600" />
            <span className="text-sm">CPU</span>
          </div>
          <span className={`text-sm font-semibold ${getStatusColor(status?.cpu || 0)}`}>
            {status?.cpu}%
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-gray-600" />
            <span className="text-sm">Memory</span>
          </div>
          <span className={`text-sm font-semibold ${getStatusColor(status?.memory || 0)}`}>
            {status?.memory}%
          </span>
        </div>

        {!isSmall && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-gray-600" />
              <span className="text-sm">Storage</span>
            </div>
            <span className={`text-sm font-semibold ${getStatusColor(status?.storage || 0)}`}>
              {status?.storage}%
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-gray-600" />
            <span className="text-sm">Network</span>
          </div>
          <span className={`text-sm font-semibold ${status?.network === 'online' ? 'text-green-500' : 'text-red-500'}`}>
            {status?.network}
          </span>
        </div>
      </div>
    </div>
  );
}
// #endregion