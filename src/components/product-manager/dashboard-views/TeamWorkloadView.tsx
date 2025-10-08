'use client';

import { useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import { formatHours } from '@/lib/dates';

interface TeamWorkloadViewProps {
  stats: {
    teamWorkloadData: Array<{
      consultantId: string;
      consultantName: string;
      upcomingHours: number;
      avgHoursPerWeek: number;
      projectCount: number;
      status: 'overloaded' | 'moderate' | 'available';
    }>;
  };
}

export default function TeamWorkloadView({ stats }: TeamWorkloadViewProps) {
  const [consultantSearch, setConsultantSearch] = useState('');

  const overloadedCount = stats.teamWorkloadData.filter(c => c.status === 'overloaded').length;
  const availableCount = stats.teamWorkloadData.filter(c => c.status === 'available').length;
  const moderateCount = stats.teamWorkloadData.filter(c => c.status === 'moderate').length;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/20 rounded-xl border border-red-200 dark:border-red-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-1">{overloadedCount}</div>
              <div className="text-sm font-medium text-red-900 dark:text-red-200">Overloaded</div>
              <div className="text-xs text-red-700 dark:text-red-300 mt-1">&gt;40h/week</div>
            </div>
            <div className="text-4xl">⚠️</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/20 rounded-xl border border-yellow-200 dark:border-yellow-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">{moderateCount}</div>
              <div className="text-sm font-medium text-yellow-900 dark:text-yellow-200">Moderate Load</div>
              <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">25-40h/week</div>
            </div>
            <div className="text-4xl">⚡</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 rounded-xl border border-green-200 dark:border-green-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">{availableCount}</div>
              <div className="text-sm font-medium text-green-900 dark:text-green-200">Available</div>
              <div className="text-xs text-green-700 dark:text-green-300 mt-1">&lt;25h/week</div>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </div>
      </div>

      {/* Consultant List */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground mb-2">Team Members</h3>
          <p className="text-sm text-muted-foreground">Workload for the next 4 weeks</p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 text-xs flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-muted-foreground">Overloaded (&gt;40h/week)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-muted-foreground">Moderate (25-40h/week)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-muted-foreground">Available (&lt;25h/week)</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search consultants..."
              value={consultantSearch}
              onChange={(e) => setConsultantSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </div>
        </div>

        {/* Scrollable Consultant List */}
        <div className="max-h-[600px] overflow-y-auto space-y-2 pr-2">
          {stats.teamWorkloadData.length > 0 ? (
            stats.teamWorkloadData
              .filter(consultant =>
                consultant.consultantName.toLowerCase().includes(consultantSearch.toLowerCase())
              )
              .map((consultant) => {
                const statusColors = {
                  overloaded: 'border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20',
                  moderate: 'border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
                  available: 'border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20'
                };
                const statusIcons = {
                  overloaded: '⚠️',
                  moderate: '⚡',
                  available: '✅'
                };
                const statusLabels = {
                  overloaded: 'Overloaded',
                  moderate: 'Moderate Load',
                  available: 'Available'
                };

                return (
                  <div
                    key={consultant.consultantId}
                    className={`p-4 rounded-lg transition-colors ${statusColors[consultant.status]}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-xl">{statusIcons[consultant.status]}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground truncate">{consultant.consultantName}</div>
                          <div className="text-xs text-muted-foreground">
                            {consultant.projectCount} {consultant.projectCount === 1 ? 'project' : 'projects'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-2">
                        <div className="text-lg font-bold text-foreground">{consultant.avgHoursPerWeek}h/week</div>
                        <div className="text-xs text-muted-foreground">{formatHours(consultant.upcomingHours)} total</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                      <span className={`text-xs font-medium ${
                        consultant.status === 'overloaded' ? 'text-red-700 dark:text-red-300' :
                        consultant.status === 'moderate' ? 'text-yellow-700 dark:text-yellow-300' :
                        'text-green-700 dark:text-green-300'
                      }`}>
                        {statusLabels[consultant.status]}
                      </span>
                      {consultant.status === 'overloaded' && (
                        <span className="text-xs text-red-600 dark:text-red-400 font-semibold">
                          ⚠️ Avoid new assignments
                        </span>
                      )}
                      {consultant.status === 'available' && (
                        <span className="text-xs text-green-600 dark:text-green-400 font-semibold">
                          ✓ Can take new work
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
          ) : (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <div className="text-4xl mb-2">📊</div>
              <p className="font-medium mb-1">No workload data available</p>
              <p className="text-xs">Consultants need weekly allocations to show workload</p>
            </div>
          )}
          {stats.teamWorkloadData.length > 0 &&
           stats.teamWorkloadData.filter(c => c.consultantName.toLowerCase().includes(consultantSearch.toLowerCase())).length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <div className="text-4xl mb-2">🔍</div>
              <p className="font-medium">No consultants found</p>
              <p className="text-xs">Try a different search term</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
