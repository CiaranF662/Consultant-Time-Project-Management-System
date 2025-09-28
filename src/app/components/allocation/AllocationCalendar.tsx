'use client';

import { useState, useMemo, useCallback } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { formatHours } from '@/lib/dates';

interface PhaseAllocation {
  id: string;
  totalHours: number;
  phase: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    project: {
      id: string;
      title: string;
    };
  };
  weeklyAllocations: Array<{
    id: string;
    weekNumber: number;
    year: number;
    plannedHours: number;
    weekStartDate: Date;
    weekEndDate: Date;
  }>;
}

interface UpcomingAllocation {
  id: string;
  weekNumber: number;
  year: number;
  plannedHours: number;
  weekStartDate: Date;
  weekEndDate: Date;
  phaseAllocation: {
    phase: {
      name: string;
      project: {
        title: string;
      };
    };
  };
}

interface AllocationCalendarProps {
  phaseAllocations: PhaseAllocation[];
  upcomingAllocations: UpcomingAllocation[];
}

export default function AllocationCalendar({ phaseAllocations, upcomingAllocations }: AllocationCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const isToday = useCallback((date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }, []);

  const getProjectColor = useCallback((projectId: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-red-500',
      'bg-yellow-500',
      'bg-indigo-500',
      'bg-pink-500',
      'bg-gray-500'
    ];
    
    // Simple hash to get consistent colors per project
    let hash = 0;
    for (let i = 0; i < projectId.length; i++) {
      hash = projectId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }, []);

  // Generate calendar data
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
    
    // Create array of days for the calendar
    const days = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayAllocations: Array<{
        hours: number;
        project: string;
        phase: string;
        color: string;
      }> = [];
      
      // Find allocations for this day
      phaseAllocations.forEach((phaseAlloc) => {
        phaseAlloc.weeklyAllocations.forEach((weekAlloc) => {
          const weekStart = new Date(weekAlloc.weekStartDate);
          const weekEnd = new Date(weekAlloc.weekEndDate);
          
          // Check if this day falls within the week
          if (date >= weekStart && date <= weekEnd) {
            // Calculate daily hours (assuming 5 working days per week)
            const dailyHours = weekAlloc.plannedHours / 5;
            
            if (dailyHours > 0) {
              dayAllocations.push({
                hours: dailyHours,
                project: phaseAlloc.phase.project.title,
                phase: phaseAlloc.phase.name,
                color: getProjectColor(phaseAlloc.phase.project.id)
              });
            }
          }
        });
      });
      
      days.push({
        date: day,
        fullDate: date,
        allocations: dayAllocations,
        totalHours: dayAllocations.reduce((sum, alloc) => sum + alloc.hours, 0),
        isToday: isToday(date),
        isWeekend: date.getDay() === 0 || date.getDay() === 6
      });
    }
    
    return {
      year,
      month,
      days,
      monthName: firstDay.toLocaleString('default', { month: 'long' })
    };
  }, [currentDate, phaseAllocations, getProjectColor, isToday]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getTotalHoursForMonth = () => {
    return calendarData.days
      .filter(day => day !== null)
      .reduce((sum, day) => sum + (day?.totalHours || 0), 0);
  };

  return (
    <div className="p-4">
      {/* Calendar Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded"
          >
            <FaChevronLeft />
          </button>
          <h2 className="text-xl font-semibold text-gray-800">
            {calendarData.monthName} {calendarData.year}
          </h2>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded"
          >
            <FaChevronRight />
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Total: {formatHours(getTotalHoursForMonth())}
          </div>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm font-medium text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
          >
            Today
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
        {/* Day Headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="bg-gray-100 p-2 text-center text-sm font-medium text-gray-700">
            {day}
          </div>
        ))}
        
        {/* Calendar Days */}
        {calendarData.days.map((day, index) => (
          <div
            key={index}
            className={`bg-white p-2 min-h-[100px] ${
              day === null ? 'bg-gray-50' : ''
            } ${
              day?.isToday ? 'ring-2 ring-blue-500' : ''
            } ${
              day?.isWeekend ? 'bg-gray-50' : ''
            }`}
          >
            {day && (
              <>
                <div className={`text-sm font-medium mb-1 ${
                  day.isToday ? 'text-blue-600' : 
                  day.isWeekend ? 'text-gray-500' : 'text-gray-800'
                }`}>
                  {day.date}
                </div>
                
                {day.allocations.length > 0 && (
                  <div className="space-y-1">
                    {day.allocations.slice(0, 2).map((allocation, idx) => (
                      <div
                        key={idx}
                        className={`text-xs p-1 rounded text-white ${allocation.color}`}
                        title={`${allocation.project} - ${allocation.phase}: ${formatHours(allocation.hours)}`}
                      >
                        <div className="truncate">{allocation.project}</div>
                        <div className="truncate opacity-75">{formatHours(allocation.hours)}</div>
                      </div>
                    ))}
                    
                    {day.allocations.length > 2 && (
                      <div className="text-xs text-gray-600 p-1">
                        +{day.allocations.length - 2} more
                      </div>
                    )}
                  </div>
                )}
                
                {day.totalHours > 0 && (
                  <div className="mt-1 text-xs font-medium text-gray-600">
                    {formatHours(day.totalHours)} total
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Project Legend</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {Array.from(new Set(phaseAllocations.map(alloc => alloc.phase.project.id))).map(projectId => {
            const project = phaseAllocations.find(alloc => alloc.phase.project.id === projectId)?.phase.project;
            if (!project) return null;
            
            return (
              <div key={projectId} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${getProjectColor(projectId)}`}></div>
                <span className="text-sm text-gray-700 truncate">{project.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Calendar View</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Daily hours are calculated by dividing weekly allocations across 5 working days</li>
          <li>• Hover over colored blocks to see project and phase details</li>
          <li>• Weekend days are shown in gray</li>
          <li>• Today's date is highlighted with a blue border</li>
        </ul>
      </div>
    </div>
  );
}