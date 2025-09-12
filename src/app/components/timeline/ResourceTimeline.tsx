'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { formatHours, getUtilizationColor } from '@/lib/dates';

interface ResourceTimelineProps {
  consultants: Array<{
    id: string;
    name: string | null;
    email: string | null;
  }>;
  weeks: number;
  onConsultantClick?: (consultantId: string) => void;
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

export default function ResourceTimeline({ consultants, weeks, onConsultantClick }: ResourceTimelineProps) {
  const [timelineData, setTimelineData] = useState<TimelineData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<{
    consultant: string; 
    week: string; 
    consultantName: string; 
    weekData: any; 
    weekLabel: string;
  } | null>(null);
  const [weekHeaders, setWeekHeaders] = useState<Array<{label: string; isCurrent: boolean; isPast: boolean}>>([]);

  useEffect(() => {
    fetchTimelineData();
  }, [weeks]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
      <div className={`${weeks >= 32 ? 'min-w-[3600px]' : weeks >= 24 ? 'min-w-[2400px]' : weeks >= 12 ? 'min-w-[1300px]' : 'min-w-[1000px]'} ${weeks >= 32 ? 'pr-4' : ''}`}>
        {/* Header */}
        <div className="flex border-b bg-gray-50 sticky top-0 z-20 shadow-[0_2px_4px_-1px_rgba(0,0,0,0.1)]">
          <div className="w-56 md:w-64 p-4 font-semibold text-gray-700 border-r flex-shrink-0 sticky left-0 bg-gray-50 z-30 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.1)]">Consultant</div>
          <div className="flex-1 flex">
            {weekHeaders.map((week, index) => (
              <div
                key={index}
                className={`flex-1 ${weeks >= 32 ? 'min-w-[100px]' : weeks >= 24 ? 'min-w-[90px]' : 'min-w-[80px]'} p-2 text-center text-xs font-medium border-r ${
                  week.isCurrent ? 'bg-blue-50 text-blue-700 font-bold' : 
                  week.isPast ? 'bg-gray-50 text-gray-400' : 'bg-gray-50 text-gray-600'
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

        {/* Consultant Rows */}
        {consultants
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
            <div key={consultant.id} className="flex border-b hover:bg-gray-50">
              <div 
                className="w-56 md:w-64 p-4 font-medium text-gray-700 border-r cursor-pointer hover:text-blue-600 flex-shrink-0 sticky left-0 bg-white z-10 hover:bg-gray-50 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.1)]"
                onClick={() => onConsultantClick?.(consultant.id)}
              >
                <div className="flex items-center gap-2">
                  <div className="truncate flex-1">{consultant.name || consultant.email}</div>
                  {consultantData?.isProductManager && (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full whitespace-nowrap">
                      PM
                    </span>
                  )}
                </div>
                {consultantData?.isProductManager && consultantData.managedProjects.length > 0 && (
                  <div className="text-xs text-gray-500 mt-1 truncate">
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
                        className={`p-2 text-center border-r transition-all ${bgColor} ${
                          hasAllocations ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                        } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                        onClick={() => hasAllocations && handleWeekClick(consultant.id, weekIndex)}
                      >
                        <div className={`text-sm font-medium ${hasAllocations ? 'hover:text-blue-600' : ''} ${weekHeader.isPast ? 'text-gray-400' : ''}`}>
                          {totalHours > 0 ? formatHours(totalHours) : '-'}
                        </div>
                        {hasAllocations && (
                          <div className="text-[10px] text-gray-600 mt-0.5">Click for details</div>
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
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold">{selectedWeek.consultantName}</h2>
                  <p className="text-blue-100">{selectedWeek.weekLabel} Allocation Details</p>
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
                  <div key={alloc.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: `hsl(${Math.abs(alloc.projectId.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0)) % 360}, 70%, 60%)` }}
                          ></div>
                          <h3 className="font-semibold text-gray-900">{alloc.project}</h3>
                          {alloc.isProductManager && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                              You manage this project
                            </span>
                          )}
                        </div>
                        <div className="ml-7">
                          <p className="text-gray-600 text-sm mb-1">{alloc.phase}</p>
                          {alloc.sprint && (
                            <div className="flex items-center gap-2 mb-2">
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                                Sprint {alloc.sprint.sprintNumber}
                              </span>
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                Week {alloc.sprint.weekOfSprint} of 2
                              </span>
                            </div>
                          )}
                          {alloc.consultantDescription && (
                            <div className="mt-2 p-3 bg-gray-50 rounded-md border-l-4 border-blue-200">
                              <div className="text-xs font-medium text-gray-700 mb-1">Consultant Plan:</div>
                              <div className="text-sm text-gray-600">{alloc.consultantDescription}</div>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-lg font-bold text-blue-600">{formatHours(alloc.hours)}</span>
                            <span className="text-sm text-gray-500">
                              ({Math.round((alloc.hours / selectedWeek.weekData.totalHours) * 100)}% of week)
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Allocation #{index + 1}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Weekly Summary */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Week Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-sm text-blue-600 font-medium">Total Allocation</div>
                    <div className="text-2xl font-bold text-blue-900">{formatHours(selectedWeek.weekData.totalHours)}</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-sm text-green-600 font-medium">Utilization</div>
                    <div className="text-2xl font-bold text-green-900">
                      {Math.round((selectedWeek.weekData.totalHours / 40) * 100)}%
                    </div>
                    <div className="text-xs text-green-600">Based on 40h work week</div>
                  </div>
                  {(() => {
                    const pmHours = selectedWeek.weekData.allocations.filter((a: any) => a.isProductManager).reduce((sum: number, a: any) => sum + a.hours, 0);
                    const teamHours = selectedWeek.weekData.allocations.filter((a: any) => !a.isProductManager).reduce((sum: number, a: any) => sum + a.hours, 0);
                    return (
                      <>
                        <div className="bg-yellow-50 rounded-lg p-4">
                          <div className="text-sm text-yellow-600 font-medium">PM Work</div>
                          <div className="text-2xl font-bold text-yellow-900">{formatHours(pmHours)}</div>
                          <div className="text-xs text-yellow-600">Projects you manage</div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4">
                          <div className="text-sm text-purple-600 font-medium">Team Work</div>
                          <div className="text-2xl font-bold text-purple-900">{formatHours(teamHours)}</div>
                          <div className="text-xs text-purple-600">As team member</div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end">
              <button
                onClick={() => setSelectedWeek(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
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