'use client';

import { useState, useMemo, useCallback } from 'react';
import { FaChevronLeft, FaChevronRight, FaCalendar, FaClock, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import { formatHours, formatDate } from '@/lib/dates';

interface PhaseAllocation {
  id: string;
  totalHours: number;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
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
    proposedHours?: number | null;
    approvedHours?: number | null;
    planningStatus: 'PENDING' | 'APPROVED' | 'MODIFIED' | 'REJECTED';
    weekStartDate: Date;
    weekEndDate: Date;
  }>;
}

interface UpcomingAllocation {
  id: string;
  weekNumber: number;
  year: number;
  proposedHours?: number | null;
  approvedHours?: number | null;
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

interface WeeklyCalendarViewProps {
  phaseAllocations: PhaseAllocation[];
  upcomingAllocations: UpcomingAllocation[];
}

export default function WeeklyCalendarView({ phaseAllocations }: WeeklyCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getWeekNumber = useCallback((date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }, []);

  const getProjectColor = useCallback((projectId: string) => {
    return `hsl(${Math.abs(projectId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % 360}, 70%, 60%)`;
  }, []);

  // Generate weekly calendar data
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Get first Monday of the month view (including previous month if needed)
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);

    // Find the Monday of the week containing the first day
    const dayOfWeek = firstDay.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDate.setDate(firstDay.getDate() - daysFromMonday);

    // Generate 6 weeks of data (covers any month)
    const weeks = [];
    for (let weekIndex = 0; weekIndex < 6; weekIndex++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(startDate.getDate() + (weekIndex * 7));

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const weekNumber = getWeekNumber(weekStart);
      const weekYear = weekStart.getFullYear();

      // Calculate week data by matching actual week dates instead of week numbers
      const weekAllocations: Array<{
        project: string;
        phase: string;
        hours: number;
        status: 'PENDING' | 'APPROVED' | 'MODIFIED' | 'REJECTED';
        approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
        color: string;
        phaseId: string;
      }> = [];

      let totalWeekHours = 0;

      phaseAllocations.forEach((phaseAlloc) => {
        phaseAlloc.weeklyAllocations.forEach((weeklyAlloc) => {
          const allocWeekStart = new Date(weeklyAlloc.weekStartDate);
          const allocWeekEnd = new Date(weeklyAlloc.weekEndDate);

          // Check if this allocation's week overlaps with our calendar week
          // We'll consider it a match if the week start dates are the same (within a day tolerance)
          const daysDifference = Math.abs((weekStart.getTime() - allocWeekStart.getTime()) / (1000 * 60 * 60 * 24));

          if (daysDifference < 7) { // If within a week, consider it the same week
            const hours = weeklyAlloc.approvedHours || weeklyAlloc.proposedHours || 0;

            if (hours > 0) {
              totalWeekHours += hours;

              weekAllocations.push({
                project: phaseAlloc.phase.project.title,
                phase: phaseAlloc.phase.name,
                hours,
                status: weeklyAlloc.planningStatus,
                approvalStatus: phaseAlloc.approvalStatus,
                color: getProjectColor(phaseAlloc.phase.project.id),
                phaseId: phaseAlloc.phase.id
              });
            }
          }
        });
      });

      const isCurrentWeek = weekNumber === getWeekNumber(new Date()) && weekYear === new Date().getFullYear();
      const isInCurrentMonth = weekStart.getMonth() === month || weekEnd.getMonth() === month;

      weeks.push({
        weekStart,
        weekEnd,
        weekNumber,
        year: weekYear,
        allocations: weekAllocations,
        totalHours: totalWeekHours,
        isCurrentWeek,
        isInCurrentMonth,
        capacityStatus: totalWeekHours > 40 ? 'overloaded' : totalWeekHours >= 30 ? 'optimal' : totalWeekHours > 0 ? 'light' : 'empty'
      });
    }

    return {
      year,
      month,
      weeks,
      monthName: new Date(year, month, 1).toLocaleString('default', { month: 'long' })
    };
  }, [currentDate, phaseAllocations, getWeekNumber, getProjectColor]);

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

  const goToCurrentWeek = () => {
    setCurrentDate(new Date());
  };

  const getTotalHoursForMonth = () => {
    return calendarData.weeks
      .filter(week => week.isInCurrentMonth)
      .reduce((sum, week) => sum + week.totalHours, 0);
  };

  return (
    <div className="space-y-4">
      {/* Professional Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <FaCalendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">Weekly Calendar View</h2>
                <p className="text-blue-100 text-sm">Week-by-week allocation overview</p>
              </div>
            </div>
            <div className="text-blue-100 text-sm">
              Month Total: <span className="font-bold text-white">{formatHours(getTotalHoursForMonth())}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
              {calendarData.monthName} {calendarData.year}
            </h3>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={goToCurrentWeek}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            Current Week
          </button>
        </div>
      </div>

      {/* Weekly Grid - More compact and responsive */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {calendarData.weeks.map((week, index) => (
          <div
            key={index}
            className={`rounded-xl border-2 transition-all hover:shadow-lg ${
              !week.isInCurrentMonth ? 'opacity-50' :
              week.isCurrentWeek ? 'border-blue-300 bg-blue-50 shadow-md' :
              week.capacityStatus === 'overloaded' ? 'border-red-200 bg-red-50' :
              week.capacityStatus === 'optimal' ? 'border-green-200 bg-green-50' :
              week.capacityStatus === 'light' ? 'border-yellow-200 bg-yellow-50' :
              'border-gray-200 bg-gray-50'
            } p-3 sm:p-4`}
          >
            {/* Week Header - Compact */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className={`text-base sm:text-lg font-bold ${
                  week.isCurrentWeek ? 'text-blue-600' :
                  week.capacityStatus === 'overloaded' ? 'text-red-600' :
                  week.capacityStatus === 'optimal' ? 'text-green-600' :
                  'text-gray-700'
                }`}>
                  Week {week.weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div className="text-xs text-gray-600">
                  {week.weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {week.weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                {week.isCurrentWeek && <div className="text-xs font-semibold text-blue-600">Current</div>}
              </div>

              <div className="text-right">
                <div className={`text-2xl font-bold ${
                  week.isCurrentWeek ? 'text-blue-700' :
                  week.capacityStatus === 'overloaded' ? 'text-red-700' :
                  week.capacityStatus === 'optimal' ? 'text-green-700' :
                  week.capacityStatus === 'light' ? 'text-yellow-700' :
                  'text-gray-400'
                }`}>
                  {formatHours(week.totalHours)}
                </div>
              </div>
            </div>

            {/* Capacity Status - Compact */}
            <div className="mb-3">
              <div className="flex items-center gap-1 mb-1">
                {week.capacityStatus === 'overloaded' && <FaExclamationTriangle className="w-3 h-3 text-red-600" />}
                {week.capacityStatus === 'optimal' && <FaCheckCircle className="w-3 h-3 text-green-600" />}
                {week.capacityStatus === 'light' && <FaClock className="w-3 h-3 text-yellow-600" />}
                <span className={`text-xs font-medium ${
                  week.capacityStatus === 'overloaded' ? 'text-red-700' :
                  week.capacityStatus === 'optimal' ? 'text-green-700' :
                  week.capacityStatus === 'light' ? 'text-yellow-700' :
                  'text-gray-500'
                }`}>
                  {week.capacityStatus === 'overloaded' ? `+${week.totalHours - 40}h` :
                   week.capacityStatus === 'optimal' ? 'Balanced' :
                   week.capacityStatus === 'light' ? `${40 - week.totalHours}h free` :
                   'No work'}
                </span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    week.capacityStatus === 'overloaded' ? 'bg-red-500' :
                    week.capacityStatus === 'optimal' ? 'bg-green-500' :
                    week.capacityStatus === 'light' ? 'bg-yellow-500' :
                    'bg-gray-400'
                  }`}
                  style={{ width: `${Math.min((week.totalHours / 40) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Project Allocations - Compact */}
            <div className="space-y-2">
              {week.allocations.length > 0 ? (
                week.allocations.map((allocation, allocIndex) => (
                  <div
                    key={allocIndex}
                    className="bg-white rounded-lg p-2 border border-gray-100 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: allocation.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-900 text-sm truncate">
                            {allocation.project}
                          </div>
                          <div className="text-xs text-gray-600 truncate">
                            {allocation.phase}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-bold text-indigo-600 text-sm">
                          {formatHours(allocation.hours)}
                        </div>
                        <div className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          allocation.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                          allocation.status === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                          allocation.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {allocation.status.charAt(0)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-400">
                  <FaCalendar className="w-6 h-6 mx-auto mb-1 opacity-50" />
                  <p className="text-xs">No work planned</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Compact Legend */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Capacity Guide</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="font-medium text-red-700">Overloaded</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="font-medium text-green-700">Optimal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="font-medium text-yellow-700">Light</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            <span className="font-medium text-gray-600">None</span>
          </div>
        </div>
      </div>
    </div>
  );
}