'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Clock } from 'lucide-react';
import { WidgetProps } from '../../types';

// #region Project Stats Widget Component
interface ProjectStats {
  activeProjects: number;
  totalHours: number;
  teamMembers: number;
  completionRate: number;
}

export default function ProjectStatsWidget({ size }: WidgetProps) {
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data - replace with real API call
    const mockStats: ProjectStats = {
      activeProjects: 8,
      totalHours: 1240,
      teamMembers: 12,
      completionRate: 78
    };
    
    setTimeout(() => {
      setStats(mockStats);
      setLoading(false);
    }, 800);
  }, []);

  if (loading) {
    return <div className="animate-pulse bg-gray-200 rounded-lg h-full" />;
  }

  const isSmall = size === 'small';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 h-full">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-5 h-5 text-blue-600" />
        <span className="font-semibold text-gray-800">Project Stats</span>
      </div>

      <div className={`grid ${isSmall ? 'grid-cols-2 gap-2' : 'grid-cols-2 gap-4'} h-full`}>
        <div className="text-center">
          <div className={`${isSmall ? 'text-lg' : 'text-2xl'} font-bold text-blue-600`}>
            {stats?.activeProjects}
          </div>
          <div className="text-xs text-gray-600">Active Projects</div>
        </div>

        <div className="text-center">
          <div className={`${isSmall ? 'text-lg' : 'text-2xl'} font-bold text-green-600`}>
            {stats?.totalHours}h
          </div>
          <div className="text-xs text-gray-600">Total Hours</div>
        </div>

        {!isSmall && (
          <>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {stats?.teamMembers}
              </div>
              <div className="text-xs text-gray-600">Team Members</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {stats?.completionRate}%
              </div>
              <div className="text-xs text-gray-600">Completion</div>
            </div>
          </>
        )}
      </div>

      {!isSmall && (
        <div className="mt-4 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
          <span className="text-xs text-green-600">+12% this month</span>
        </div>
      )}
    </div>
  );
}
// #endregion