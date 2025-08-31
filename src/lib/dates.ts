import { 
    startOfWeek, 
    endOfWeek, 
    format, 
    addWeeks, 
    differenceInWeeks,
    getISOWeek,
    getYear as dateFnsGetYear,
    isWithinInterval,
    eachWeekOfInterval
  } from 'date-fns';
  
  /**
   * Get the start of the week (Monday) for a given date
   */
  export function getWeekStart(date: Date): Date {
    if (!date || isNaN(date.getTime())) {
      console.error('Invalid date passed to getWeekStart:', date);
      return new Date(); // Return current date as fallback
    }
    return startOfWeek(date, { weekStartsOn: 1 });
  }
  
  /**
   * Get the end of the week (Sunday) for a given date
   */
  export function getWeekEnd(date: Date): Date {
    if (!date || isNaN(date.getTime())) {
      console.error('Invalid date passed to getWeekEnd:', date);
      return new Date(); // Return current date as fallback
    }
    return endOfWeek(date, { weekStartsOn: 1 });
  }
  
  /**
   * Get ISO week number for a date
   */
  export function getWeekNumber(date: Date): number {
    if (!date || isNaN(date.getTime())) {
      console.error('Invalid date passed to getWeekNumber:', date);
      return 1; // Return week 1 as fallback
    }
    return getISOWeek(date);
  }
  
  /**
   * Get year for a date
   */
  export function getYear(date: Date): number {
    if (!date || isNaN(date.getTime())) {
      console.error('Invalid date passed to getYear:', date);
      return new Date().getFullYear(); // Return current year as fallback
    }
    return dateFnsGetYear(date);
  }
  
  /**
   * Format a date range for display
   */
  export function formatDateRange(start: Date, end: Date): string {
    const startStr = format(start, 'MMM d');
    const endStr = format(end, 'MMM d, yyyy');
    return `${startStr} - ${endStr}`;
  }
  
  /**
   * Format week label for timeline
   */
  export function formatWeekLabel(date: Date): string {
    const weekStart = getWeekStart(date);
    return format(weekStart, 'MMM d');
  }
  
  /**
   * Get all weeks between two dates
   */
  export function getWeeksBetween(startDate: Date, endDate: Date): Array<{
    weekStart: Date;
    weekEnd: Date;
    weekNumber: number;
    year: number;
    label: string;
  }> {
    // Validate input dates
    if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error('Invalid dates passed to getWeeksBetween:', { startDate, endDate });
      return [];
    }

    // Ensure end date is after start date
    if (endDate < startDate) {
      console.warn('End date is before start date, swapping:', { startDate, endDate });
      [startDate, endDate] = [endDate, startDate];
    }

    try {
      const weeks = eachWeekOfInterval(
        { start: startDate, end: endDate },
        { weekStartsOn: 1 }
      );
    
      return weeks.map(weekStart => ({
        weekStart,
        weekEnd: getWeekEnd(weekStart),
        weekNumber: getWeekNumber(weekStart),
        year: getYear(weekStart),
        label: formatWeekLabel(weekStart)
      }));
    } catch (error) {
      console.error('Error in getWeeksBetween:', error, { startDate, endDate });
      return [];
    }
  }
  
  /**
   * Calculate the number of weeks for a sprint
   */
  export function getSprintWeeks(startDate: Date, endDate: Date): number {
    return Math.ceil(differenceInWeeks(endDate, startDate)) || 1;
  }
  
  /**
   * Check if a date falls within a sprint
   */
  export function isDateInSprint(date: Date, sprintStart: Date, sprintEnd: Date): boolean {
    return isWithinInterval(date, { start: sprintStart, end: sprintEnd });
  }
  
  /**
   * Get current week info
   */
  export function getCurrentWeekInfo(): {
    weekStart: Date;
    weekEnd: Date;
    weekNumber: number;
    year: number;
    label: string;
  } {
    const now = new Date();
    return {
      weekStart: getWeekStart(now),
      weekEnd: getWeekEnd(now),
      weekNumber: getWeekNumber(now),
      year: getYear(now),
      label: formatWeekLabel(now)
    };
  }
  
  /**
   * Generate timeline weeks starting from current week
   */
  export function generateTimelineWeeks(weeksCount: number = 12): Array<{
    weekStart: Date;
    weekEnd: Date;
    weekNumber: number;
    year: number;
    label: string;
    isCurrent: boolean;
    isPast: boolean;
  }> {
    const currentWeek = getWeekStart(new Date());
    const weeks = [];
  
    for (let i = -2; i < weeksCount - 2; i++) {
      const weekStart = addWeeks(currentWeek, i);
      const weekEnd = getWeekEnd(weekStart);
      
      weeks.push({
        weekStart,
        weekEnd,
        weekNumber: getWeekNumber(weekStart),
        year: getYear(weekStart),
        label: formatWeekLabel(weekStart),
        isCurrent: i === 0,
        isPast: i < 0
      });
    }
  
    return weeks;
  }
  
  /**
   * Format hours for display
   */
  export function formatHours(hours: number): string {
    if (hours === 0) return '-';
    if (hours % 1 === 0) return `${hours}h`;
    return `${hours.toFixed(1)}h`;
  }
  
  /**
   * Calculate budget utilization percentage
   */
  export function calculateUtilization(used: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((used / total) * 100);
  }
  
  /**
   * Get week color based on utilization
   */
  export function getUtilizationColor(hours: number, maxHours: number = 40): string {
    const utilization = (hours / maxHours) * 100;
    
    if (utilization === 0) return 'bg-gray-100';
    if (utilization <= 25) return 'bg-green-100';
    if (utilization <= 50) return 'bg-green-200';
    if (utilization <= 75) return 'bg-yellow-200';
    if (utilization <= 100) return 'bg-orange-200';
    return 'bg-red-200'; // Over-allocated
  }
  
  /**
   * Group allocations by week
   */
  export function groupAllocationsByWeek(allocations: any[]): Map<string, any[]> {
    const grouped = new Map<string, any[]>();
    
    allocations.forEach(allocation => {
      const weekKey = `${allocation.year}-${allocation.weekNumber}`;
      if (!grouped.has(weekKey)) {
        grouped.set(weekKey, []);
      }
      grouped.get(weekKey)!.push(allocation);
    });
    
    return grouped;
  }