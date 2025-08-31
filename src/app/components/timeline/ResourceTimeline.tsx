'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { formatWeekLabel, getUtilizationColor, formatHours, generateTimelineWeeks } from '@/lib/dates';

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
    }>;
  }>;
}

export default function ResourceTimeline({ consultants, weeks, onConsultantClick }: ResourceTimelineProps) {
  const [timelineData, setTimelineData] = useState<TimelineData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<{consultant: string; week: string} | null>(null);
  const [weekHeaders, setWeekHeaders] = useState<Array<{label: string; isCurrent: boolean; isPast: boolean}>>([]);

  useEffect(() => {
    fetchTimelineData();
  }, [weeks]);

  const fetchTimelineData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/timeline?weeks=${weeks}`);
      setTimelineData(response.data.timeline);
      
      // Generate week headers
      const generatedWeeks = generateTimelineWeeks(weeks);
      setWeekHeaders(generatedWeeks.map(w => ({
        label: w.label,
        isCurrent: w.isCurrent,
        isPast: w.isPast
      })));
    } catch (error) {
      console.error('Failed to fetch timeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWeekClick = (consultantId: string, weekIndex: number) => {
    const weekKey = `${consultantId}-${weekIndex}`;
    setSelectedWeek(selectedWeek?.consultant === consultantId && selectedWeek?.week === weekKey 
      ? null 
      : { consultant: consultantId, week: weekKey });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[1200px]">
        {/* Header */}
        <div className="flex border-b bg-gray-50">
          <div className="w-48 p-4 font-semibold text-gray-700 border-r">Consultant</div>
          <div className="flex-1 flex">
            {weekHeaders.map((week, index) => (
              <div
                key={index}
                className={`flex-1 min-w-[80px] p-2 text-center text-xs font-medium border-r ${
                  week.isCurrent ? 'bg-blue-50 text-blue-700 font-bold' : 
                  week.isPast ? 'text-gray-400' : 'text-gray-600'
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
        {consultants.map((consultant) => {
          const consultantData = timelineData.find(td => td.consultantId === consultant.id);
          
          return (
            <div key={consultant.id} className="flex border-b hover:bg-gray-50">
              <div 
                className="w-48 p-4 font-medium text-gray-700 border-r cursor-pointer hover:text-blue-600"
                onClick={() => onConsultantClick?.(consultant.id)}
              >
                <div className="truncate">{consultant.name || consultant.email}</div>
              </div>
              <div className="flex-1 flex">
                {weekHeaders.map((week, weekIndex) => {
                  const weekData = consultantData?.weeklyData[weekIndex];
                  const totalHours = weekData?.totalHours || 0;
                  const bgColor = getUtilizationColor(totalHours);
                  const isSelected = selectedWeek?.consultant === consultant.id && 
                                   selectedWeek?.week === `${consultant.id}-${weekIndex}`;
                  
                  return (
                    <div key={weekIndex} className="flex-1 min-w-[80px] relative group">
                      <div
                        className={`p-2 text-center border-r cursor-pointer transition-all ${bgColor} hover:opacity-80 ${
                          isSelected ? 'ring-2 ring-blue-500' : ''
                        }`}
                        onClick={() => handleWeekClick(consultant.id, weekIndex)}
                      >
                        <div className="text-sm font-medium">
                          {totalHours > 0 ? formatHours(totalHours) : '-'}
                        </div>
                      </div>
                      
                      {/* Tooltip */}
                      {totalHours > 0 && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                          <div className="bg-gray-900 text-white text-xs rounded-lg p-2 whitespace-nowrap">
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
                      
                      {/* Expanded Details */}
                      {isSelected && weekData && weekData.allocations.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg p-3 z-20">
                          <div className="text-xs font-semibold text-gray-700 mb-2">
                            Week Allocations
                          </div>
                          {weekData.allocations.map((alloc) => (
                            <div key={alloc.id} className="text-xs py-1 border-b last:border-0">
                              <div className="font-medium text-gray-800">{alloc.project}</div>
                              <div className="text-gray-600">
                                {alloc.phase}: {formatHours(alloc.hours)}
                              </div>
                            </div>
                          ))}
                          <div className="mt-2 pt-2 border-t text-xs font-semibold text-gray-700">
                            Total: {formatHours(totalHours)}
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
    </div>
  );
}