'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { formatHours, getUtilizationColor } from '@/lib/dates';
import { ComponentLoading } from '@/components/ui/LoadingSpinner';
import { FaSearch, FaTimes } from 'react-icons/fa';

interface ResourceTimelineProps {
  consultants: Array<{
    id: string;
    name: string | null;
    email: string | null;
  }>;
  weeks: number;
  onConsultantClick?: (consultantId: string) => void;
  initialTimelineData?: {
    timeline: TimelineData[];
    weeks: Array<{label: string; isCurrent: boolean; isPast: boolean}>;
  };
}

interface TimelineData {
  consultantId: string;
  consultantName: string;
  isProductManager: boolean;
  managedProjects: Array<{
    id: string;
    title: string;
  }>;
  weeklyData: Array<{
    week: string;
    weekStart: Date;
    weekEnd: Date;
    totalHours: number;
    allocations: Array<{
      id: string;
      hours: number;
      project: string;
      projectId: string;
      phase: string;
      phaseId: string;
      phaseAllocationId: string;
      consultantDescription?: string;
      isProductManager: boolean;
      sprint?: {
        sprintNumber: number;
        weekOfSprint: number;
        sprintId: string;
      } | null;
    }>;
  }>;
}

export default function ResourceTimeline({ consultants, weeks, onConsultantClick, initialTimelineData }: ResourceTimelineProps) {
  const [timelineData, setTimelineData] = useState<TimelineData[]>(initialTimelineData?.timeline || []);
  const [loading, setLoading] = useState(!initialTimelineData);
  const [selectedWeek, setSelectedWeek] = useState<{
    consultant: string;
    week: string;
    consultantName: string;
    weekData: any;
    weekLabel: string;
  } | null>(null);
  const [weekHeaders, setWeekHeaders] = useState<Array<{label: string; isCurrent: boolean; isPast: boolean}>>([]);
  const [lastFetchedWeeks, setLastFetchedWeeks] = useState<number>(initialTimelineData ? weeks : 0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);

  // Initialize week headers from initial data
  useEffect(() => {
    if (initialTimelineData?.weeks) {
      setWeekHeaders(initialTimelineData.weeks);
    }
  }, [initialTimelineData]);

  useEffect(() => {
    // Only fetch if weeks changed or if we don't have initial data
    if (!initialTimelineData || weeks !== lastFetchedWeeks) {
      fetchTimelineData();
    }
  }, [weeks, lastFetchedWeeks, initialTimelineData]);

  // Add real-time refetch capability for data updates
  useEffect(() => {
    // Listen for custom events that indicate data has changed
    const handleDataUpdate = () => {
      console.log('Timeline data update detected, refetching...');
      fetchTimelineData();
    };

    // Listen for storage events (for cross-tab updates)
    const handleStorageUpdate = (e: StorageEvent) => {
      if (e.key === 'timeline-data-updated') {
        handleDataUpdate();
      }
    };

    window.addEventListener('timeline-data-updated', handleDataUpdate as EventListener);
    window.addEventListener('storage', handleStorageUpdate);

    return () => {
      window.removeEventListener('timeline-data-updated', handleDataUpdate as EventListener);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  const fetchTimelineData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/timeline?weeks=${weeks}`);
      const { timeline, weeks: apiWeeks } = response.data;

      // Ensure all consultants have exactly the same number of weeks
      const normalizedTimeline = timeline.map((consultant: any) => ({
        ...consultant,
        weeklyData: apiWeeks.map((week: any, index: number) => {
          // Find matching week data or return empty week
          const existingWeek = consultant.weeklyData[index];
          if (existingWeek &&
              new Date(existingWeek.weekStart).getTime() === new Date(week.weekStart).getTime()) {
            return existingWeek;
          }

          // Return empty week with correct structure
          return {
            week: week.label,
            weekStart: new Date(week.weekStart),
            weekEnd: new Date(week.weekEnd),
            totalHours: 0,
            allocations: []
          };
        })
      }));

      setTimelineData(normalizedTimeline);
      setLastFetchedWeeks(weeks);

      // Use API weeks for headers to ensure perfect alignment
      setWeekHeaders(apiWeeks.map((w: any) => {
        const weekDate = new Date(w.weekStart);
        const today = new Date();
        const isCurrentWeek = weekDate <= today && today <= new Date(w.weekEnd);
        const isPastWeek = new Date(w.weekEnd) < today;

        return {
          label: w.label,
          isCurrent: isCurrentWeek,
          isPast: isPastWeek
        };
      }));
    } catch (error) {
      console.error('Failed to fetch timeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWeekClick = (consultantId: string, weekIndex: number) => {
    const consultant = consultants.find(c => c.id === consultantId);
    const consultantData = timelineData.find(td => td.consultantId === consultantId);
    const weekData = consultantData?.weeklyData[weekIndex];
    const weekKey = `${consultantId}-${weekIndex}`;
    
    if (selectedWeek?.consultant === consultantId && selectedWeek?.week === weekKey) {
      setSelectedWeek(null);
    } else if (weekData && weekData.allocations.length > 0) {
      setSelectedWeek({
        consultant: consultantId,
        week: weekKey,
        consultantName: consultant?.name || consultant?.email || 'Unknown',
        weekData,
        weekLabel: weekHeaders[weekIndex]?.label || `Week ${weekIndex + 1}`
      });
    }
  };

  // Filter consultants based on search query
  const filteredConsultants = consultants.filter(consultant => {
    if (!searchQuery.trim()) return true;
    const name = (consultant.name || consultant.email || '').toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return <ComponentLoading message="Loading resource timeline..." />;
  }

  return (
    <div className="overflow-x-auto max-h-[600px] overflow-y-auto bg-white dark:bg-gray-900">
      <div className={`${weeks >= 32 ? 'min-w-[3600px]' : weeks >= 24 ? 'min-w-[2400px]' : weeks >= 12 ? 'min-w-[1300px]' : 'min-w-[1000px]'} ${weeks >= 32 ? 'pr-4' : ''}`}>
        {/* Header */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 sticky top-0 z-20 shadow-[0_2px_4px_-1px_rgba(0,0,0,0.1)]">
          <div className="w-56 md:w-64 p-4 font-semibold text-card-foreground border-r border-gray-200 dark:border-gray-700 flex-shrink-0 sticky left-0 bg-gray-50 dark:bg-gray-800 z-30 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.1)] flex items-center justify-between">
            <span>Consultant</span>
            <div className="flex items-center gap-2">
              {showSearch && (
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
                  autoFocus
                />
              )}
              <button
                onClick={() => {
                  setShowSearch(!showSearch);
                  if (showSearch) {
                    setSearchQuery('');
                  }
                }}
                className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title={showSearch ? "Close search" : "Search consultants"}
              >
                {showSearch ? (
                  <FaTimes className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                ) : (
                  <FaSearch className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                )}
              </button>
            </div>
          </div>
          <div className="flex-1 flex">
            {weekHeaders.map((week, index) => (
              <div
                key={index}
                className={`flex-1 ${weeks >= 32 ? 'min-w-[100px]' : weeks >= 24 ? 'min-w-[90px]' : 'min-w-[80px]'} p-2 text-center text-xs font-medium border-r border-gray-200 dark:border-gray-700 ${
                  week.isCurrent ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-100 font-bold' :
                  week.isPast ? 'bg-gray-50 dark:bg-gray-800 text-muted-foreground' : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}
              >
                {week.label}
                {week.isCurrent && (
                  <div className="text-[10px] font-normal">Current</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* No Results Message */}
        {filteredConsultants.length === 0 && searchQuery.trim() && (
          <div className="flex items-center justify-center p-8 text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <FaSearch className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No consultants found matching &quot;{searchQuery}&quot;</p>
            </div>
          </div>
        )}

        {/* Consultant Rows */}
        {filteredConsultants
          .sort((a, b) => {
            const consultantDataA = timelineData.find(td => td.consultantId === a.id);
            const consultantDataB = timelineData.find(td => td.consultantId === b.id);

            // Sort by Product Manager status first (PMs at top), then by name
            if (consultantDataA?.isProductManager !== consultantDataB?.isProductManager) {
              return consultantDataB?.isProductManager ? 1 : -1;
            }

            // If both are PMs or both are not PMs, sort alphabetically by name
            const nameA = (a.name || a.email || '').toLowerCase();
            const nameB = (b.name || b.email || '').toLowerCase();
            return nameA.localeCompare(nameB);
          })
          .map((consultant) => {
          const consultantData = timelineData.find(td => td.consultantId === consultant.id);
          
          return (
            <div key={consultant.id} className="flex border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
              <div
                className="w-56 md:w-64 p-4 font-medium text-card-foreground border-r border-gray-200 dark:border-gray-700 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 flex-shrink-0 sticky left-0 bg-white dark:bg-gray-900 z-10 hover:bg-gray-50 dark:hover:bg-gray-800 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.1)]"
                onClick={() => onConsultantClick?.(consultant.id)}
              >
                <div className="flex items-center gap-2">
                  <div className="truncate flex-1">{consultant.name || consultant.email}</div>
                  {consultantData?.isProductManager && (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-100 rounded-full whitespace-nowrap">
                      PM
                    </span>
                  )}
                </div>
                {consultantData?.isProductManager && consultantData.managedProjects.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-1 truncate">
                    Manages {consultantData.managedProjects.length} project{consultantData.managedProjects.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
              <div className="flex-1 flex">
                {weekHeaders.map((weekHeader, weekIndex) => {
                  const weekData = consultantData?.weeklyData[weekIndex];
                  const totalHours = weekData?.totalHours || 0;
                  const bgColor = getUtilizationColor(totalHours);
                  const isSelected = selectedWeek?.consultant === consultant.id && 
                                   selectedWeek?.week === `${consultant.id}-${weekIndex}`;
                  const hasAllocations = weekData && weekData.allocations.length > 0;
                  
                  return (
                    <div key={weekIndex} className={`flex-1 ${weeks >= 32 ? 'min-w-[100px]' : weeks >= 24 ? 'min-w-[90px]' : 'min-w-[80px]'} relative group`}>
                      <div
                        className={`p-2 text-center border-r border-gray-200 dark:border-gray-700 transition-all ${bgColor} ${
                          hasAllocations ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                        } ${isSelected ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}`}
                        onClick={() => hasAllocations && handleWeekClick(consultant.id, weekIndex)}
                      >
                        <div className={`text-sm font-medium ${hasAllocations ? 'hover:text-blue-600 dark:hover:text-blue-400' : ''} ${weekHeader.isPast ? 'text-muted-foreground' : ''}`}>
                          {totalHours > 0 ? formatHours(totalHours) : '-'}
                        </div>
                        {hasAllocations && (
                          <div className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5">Click for details</div>
                        )}
                      </div>
                      
                      {/* Tooltip */}
                      {totalHours > 0 && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                          <div className="bg-gray-900 text-white text-xs rounded-lg p-2 whitespace-nowrap max-w-xs">
                            <div className="font-semibold mb-1">{formatHours(totalHours)} total</div>
                            {weekData?.allocations.slice(0, 3).map((alloc, i) => (
                              <div key={i} className="py-0.5">
                                {alloc.project}: {formatHours(alloc.hours)}
                              </div>
                            ))}
                            {weekData?.allocations && weekData.allocations.length > 3 && (
                              <div className="text-gray-300">+{weekData.allocations.length - 3} more</div>
                            )}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                              <div className="border-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Week Details Modal */}
      {selectedWeek && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedWeek(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 text-white p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold">{selectedWeek.consultantName}</h2>
                  <p className="text-blue-100 dark:text-blue-200">{selectedWeek.weekLabel} Allocation Details</p>
                </div>
                <button
                  onClick={() => setSelectedWeek(null)}
                  className="text-blue-100 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <div className="bg-white bg-opacity-20 rounded-lg px-3 py-1">
                  <span className="text-sm">Total Hours: </span>
                  <span className="font-bold">{formatHours(selectedWeek.weekData.totalHours)}</span>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg px-3 py-1">
                  <span className="text-sm">Projects: </span>
                  <span className="font-bold">{new Set(selectedWeek.weekData.allocations.map((a: any) => a.project)).size}</span>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                {selectedWeek.weekData.allocations.map((alloc: any, index: number) => (
                  <div key={alloc.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: `hsl(${Math.abs(alloc.projectId.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0)) % 360}, 70%, 60%)` }}
                          ></div>
                          <h3 className="font-semibold text-foreground">{alloc.project}</h3>
                          {alloc.isProductManager && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 rounded-full">
                              You manage this project
                            </span>
                          )}
                        </div>
                        <div className="ml-7">
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">{alloc.phase}</p>
                          {alloc.sprint && (
                            <div className="flex items-center gap-2 mb-2">
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-100 rounded-full">
                                Sprint {alloc.sprint.sprintNumber}
                              </span>
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 rounded-full">
                                Week {alloc.sprint.weekOfSprint} of 2
                              </span>
                            </div>
                          )}
                          {alloc.consultantDescription && (
                            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-md border-l-4 border-blue-200 dark:border-blue-700">
                              <div className="text-xs font-medium text-card-foreground mb-1">Consultant Plan:</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">{alloc.consultantDescription}</div>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatHours(alloc.hours)}</span>
                            <span className="text-sm text-muted-foreground">
                              ({Math.round((alloc.hours / selectedWeek.weekData.totalHours) * 100)}% of week)
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Allocation #{index + 1}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Weekly Summary */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-foreground mb-4">Week Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                    <div className="text-sm text-blue-600 dark:text-blue-300 font-medium">Total Allocation</div>
                    <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{formatHours(selectedWeek.weekData.totalHours)}</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
                    <div className="text-sm text-green-600 dark:text-green-300 font-medium">Utilization</div>
                    <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                      {Math.round((selectedWeek.weekData.totalHours / 40) * 100)}%
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400">Based on 40h work week</div>
                  </div>
                  {(() => {
                    const pmHours = selectedWeek.weekData.allocations.filter((a: any) => a.isProductManager).reduce((sum: number, a: any) => sum + a.hours, 0);
                    const teamHours = selectedWeek.weekData.allocations.filter((a: any) => !a.isProductManager).reduce((sum: number, a: any) => sum + a.hours, 0);
                    return (
                      <>
                        <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-4">
                          <div className="text-sm text-yellow-600 dark:text-yellow-300 font-medium">PM Work</div>
                          <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{formatHours(pmHours)}</div>
                          <div className="text-xs text-yellow-600 dark:text-yellow-400">Projects you manage</div>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4">
                          <div className="text-sm text-purple-600 dark:text-purple-300 font-medium">Team Work</div>
                          <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{formatHours(teamHours)}</div>
                          <div className="text-xs text-purple-600 dark:text-purple-400">As team member</div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 flex justify-end">
              <button
                onClick={() => setSelectedWeek(null)}
                className="px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}