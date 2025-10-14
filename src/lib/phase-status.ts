/**
 * Enhanced Phase Status System
 * Combines planning completion, time-based progress, and weekly-allocation-based work completion
 */

interface PhaseWithAllocations {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  sprints?: Array<{
    id: string;
    sprintNumber: number;
    startDate: Date;
    endDate: Date;
  }>;
  allocations: Array<{
    id: string;
    totalHours: number;
    approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'FORFEITED';
    weeklyAllocations: Array<{
      id: string;
      plannedHours: number;
      weekStartDate: Date;
      weekEndDate: Date;
      weekNumber: number;
      year: number;
    }>;
  }>;
}

export interface PhaseStatus {
  status: 'not_started' | 'planning' | 'ready' | 'in_progress' | 'complete' | 'overdue';
  label: string;
  color: 'gray' | 'yellow' | 'purple' | 'blue' | 'green' | 'red';
  details: {
    planning: PlanningStatus;
    time: TimeStatus;
    work: WorkStatus;
    overall: OverallProgress;
  };
}

export interface PlanningStatus {
  status: 'pending' | 'complete';
  totalAllocatedHours: number;
  totalDistributedHours: number;
  remainingToDistribute: number;
  completionPercentage: number;
}

export interface TimeStatus {
  status: 'future' | 'active' | 'past';
  daysUntilStart: number;
  daysUntilEnd: number;
  totalDuration: number;
  elapsedDuration: number;
  timeElapsedPercentage: number;
}

export interface WorkStatus {
  status: 'not_started' | 'in_progress' | 'complete' | 'behind_schedule';
  expectedCompletionByNow: number; // Hours that should be complete based on weekly allocations
  totalPlannedHours: number;
  workCompletionPercentage: number;
  currentWeekProgress: {
    weekNumber: number;
    year: number;
    sprintNumber?: number; // Project-specific sprint number
    sprintWeek?: number;   // Week within the sprint (1 or 2)
    plannedHours: number;
    expectedHoursComplete: number;
    weekProgress: number; // 0-1
  } | null;
  weeklyBreakdown: Array<{
    weekNumber: number;
    year: number;
    sprintNumber?: number; // Project-specific sprint number
    sprintWeek?: number;   // Week within the sprint (1 or 2)
    weekStartDate: Date;
    weekEndDate: Date;
    plannedHours: number;
    status: 'future' | 'current' | 'complete';
    hoursExpectedComplete: number;
  }>;
}

export interface OverallProgress {
  completionPercentage: number;
  isOnTrack: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Get comprehensive phase status
 */
export function getPhaseStatus(phase: PhaseWithAllocations, currentDate: Date = new Date()): PhaseStatus {
  const planning = getPlanningStatus(phase);
  const time = getTimeStatus(phase, currentDate);
  const work = getWorkStatusEnhanced(phase, currentDate);
  const overall = getOverallProgress(planning, time, work);

  // Determine primary status
  const primaryStatus = determinePrimaryStatus(planning, time, work);

  return {
    status: primaryStatus.status,
    label: primaryStatus.label,
    color: primaryStatus.color,
    details: {
      planning,
      time,
      work,
      overall
    }
  };
}

/**
 * Calculate planning completion status
 * Excludes FORFEITED and EXPIRED allocations from the calculation
 */
function getPlanningStatus(phase: PhaseWithAllocations): PlanningStatus {
  // Filter out FORFEITED and EXPIRED allocations
  // These hours should not be counted towards the planning total
  const activeAllocations = phase.allocations.filter(
    allocation => allocation.approvalStatus !== 'FORFEITED' && allocation.approvalStatus !== 'EXPIRED'
  );

  const totalAllocatedHours = activeAllocations.reduce(
    (sum, allocation) => sum + allocation.totalHours, 0
  );

  const totalDistributedHours = activeAllocations.reduce(
    (sum, allocation) => sum + allocation.weeklyAllocations.reduce(
      (weekSum, week) => weekSum + week.plannedHours, 0
    ), 0
  );

  const remainingToDistribute = totalAllocatedHours - totalDistributedHours;
  const completionPercentage = totalAllocatedHours > 0
    ? Math.round((totalDistributedHours / totalAllocatedHours) * 100)
    : 0;

  return {
    status: remainingToDistribute <= 0 ? 'complete' : 'pending',
    totalAllocatedHours,
    totalDistributedHours,
    remainingToDistribute,
    completionPercentage
  };
}

/**
 * Calculate time-based status relative to phase dates (unchanged)
 */
function getTimeStatus(phase: PhaseWithAllocations, currentDate: Date): TimeStatus {
  const startDate = new Date(phase.startDate);
  const endDate = new Date(phase.endDate);
  const now = new Date(currentDate);

  const daysUntilStart = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const totalDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  let elapsedDuration = 0;
  let timeElapsedPercentage = 0;
  let status: TimeStatus['status'] = 'future';

  if (now < startDate) {
    status = 'future';
  } else if (now > endDate) {
    status = 'past';
    elapsedDuration = totalDuration;
    timeElapsedPercentage = 100;
  } else {
    status = 'active';
    elapsedDuration = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    timeElapsedPercentage = totalDuration > 0 ? Math.round((elapsedDuration / totalDuration) * 100) : 0;
  }

  return {
    status,
    daysUntilStart,
    daysUntilEnd,
    totalDuration,
    elapsedDuration,
    timeElapsedPercentage
  };
}

/**
 * Enhanced work completion based on actual weekly allocations
 * Excludes FORFEITED and EXPIRED allocations from work progress
 */
function getWorkStatusEnhanced(phase: PhaseWithAllocations, currentDate: Date): WorkStatus {
  const currentWeekStart = getWeekStart(currentDate);
  const currentWeekNumber = getWeekNumber(currentDate);
  const currentYear = currentDate.getFullYear();

  // Filter out FORFEITED and EXPIRED allocations
  const activeAllocations = phase.allocations.filter(
    allocation => allocation.approvalStatus !== 'FORFEITED' && allocation.approvalStatus !== 'EXPIRED'
  );

  // Get all weekly allocations across all consultants and group by week
  const allWeeklyAllocations = activeAllocations.flatMap(allocation =>
    allocation.weeklyAllocations
  );
  
  // Group by week and sum hours for all consultants
  const weeklyTotals = new Map<string, {
    weekNumber: number;
    year: number;
    weekStartDate: Date;
    weekEndDate: Date;
    plannedHours: number;
  }>();
  
  allWeeklyAllocations.forEach(week => {
    const weekKey = `${week.year}-${week.weekNumber}`;
    const existing = weeklyTotals.get(weekKey);
    
    if (existing) {
      existing.plannedHours += week.plannedHours;
    } else {
      weeklyTotals.set(weekKey, {
        weekNumber: week.weekNumber,
        year: week.year,
        weekStartDate: new Date(week.weekStartDate),
        weekEndDate: new Date(week.weekEndDate),
        plannedHours: week.plannedHours
      });
    }
  });
  
  // Sort weeks chronologically
  const sortedWeeks = Array.from(weeklyTotals.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.weekNumber - b.weekNumber;
  });
  
  // Helper function to find sprint info for a week
  const getSprintInfoForWeek = (weekStartDate: Date) => {
    if (!phase.sprints) return { sprintNumber: undefined, sprintWeek: undefined };
    
    for (const sprint of phase.sprints) {
      const sprintStart = new Date(sprint.startDate);
      const sprintEnd = new Date(sprint.endDate);
      
      if (weekStartDate >= sprintStart && weekStartDate <= sprintEnd) {
        // Calculate which week within the sprint (1 or 2)
        const daysDiff = Math.floor((weekStartDate.getTime() - sprintStart.getTime()) / (1000 * 60 * 60 * 24));
        const sprintWeek = Math.floor(daysDiff / 7) + 1;
        
        return { 
          sprintNumber: sprint.sprintNumber, 
          sprintWeek: Math.min(sprintWeek, 2) // Cap at 2 since sprints are 2 weeks
        };
      }
    }
    
    return { sprintNumber: undefined, sprintWeek: undefined };
  };

  // Calculate expected completion by now and create weekly breakdown
  let expectedCompletionByNow = 0;
  let totalPlannedHours = 0;
  let currentWeekProgress: WorkStatus['currentWeekProgress'] = null;
  
  const weeklyBreakdown = sortedWeeks.map(week => {
    totalPlannedHours += week.plannedHours;
    let hoursExpectedComplete = 0;
    let weekStatus: 'future' | 'current' | 'complete' = 'future';
    
    const sprintInfo = getSprintInfoForWeek(week.weekStartDate);
    
    // Check if this week has completely passed
    if (week.weekEndDate < currentDate) {
      weekStatus = 'complete';
      hoursExpectedComplete = week.plannedHours;
      expectedCompletionByNow += week.plannedHours;
    }
    // Check if we're currently in this week
    else if (week.weekStartDate <= currentDate && currentDate <= week.weekEndDate) {
      weekStatus = 'current';
      
      // Calculate progress within the current week
      const weekDuration = week.weekEndDate.getTime() - week.weekStartDate.getTime();
      const timeIntoWeek = currentDate.getTime() - week.weekStartDate.getTime();
      const weekProgress = Math.min(Math.max(timeIntoWeek / weekDuration, 0), 1);
      
      hoursExpectedComplete = week.plannedHours * weekProgress;
      expectedCompletionByNow += hoursExpectedComplete;
      
      currentWeekProgress = {
        weekNumber: week.weekNumber,
        year: week.year,
        sprintNumber: sprintInfo.sprintNumber,
        sprintWeek: sprintInfo.sprintWeek,
        plannedHours: week.plannedHours,
        expectedHoursComplete: hoursExpectedComplete,
        weekProgress: weekProgress
      };
    }
    // Future week - no completion yet
    else {
      weekStatus = 'future';
      hoursExpectedComplete = 0;
    }
    
    return {
      weekNumber: week.weekNumber,
      year: week.year,
      sprintNumber: sprintInfo.sprintNumber,
      sprintWeek: sprintInfo.sprintWeek,
      weekStartDate: week.weekStartDate,
      weekEndDate: week.weekEndDate,
      plannedHours: week.plannedHours,
      status: weekStatus,
      hoursExpectedComplete: hoursExpectedComplete
    };
  });
  
  const workCompletionPercentage = totalPlannedHours > 0 
    ? Math.round((expectedCompletionByNow / totalPlannedHours) * 100)
    : 0;
  
  // Determine work status
  let status: WorkStatus['status'] = 'not_started';
  
  if (workCompletionPercentage >= 100) {
    status = 'complete';
  } else if (expectedCompletionByNow > 0) {
    status = 'in_progress';
  } else if (sortedWeeks.length > 0) {
    // Check if we should have started based on PHASE start date, not first weekly allocation
    const phaseStartDate = new Date(phase.startDate);
    if (currentDate >= phaseStartDate) {
      // We're past the phase start date but no progress - truly behind schedule
      status = 'behind_schedule';
    } else {
      // Phase hasn't started yet, regardless of weekly allocation dates
      status = 'not_started';
    }
  } else {
    status = 'not_started';
  }
  
  return {
    status,
    expectedCompletionByNow,
    totalPlannedHours,
    workCompletionPercentage,
    currentWeekProgress,
    weeklyBreakdown
  };
}

/**
 * Calculate overall progress and risk assessment
 */
function getOverallProgress(
  planning: PlanningStatus, 
  time: TimeStatus, 
  work: WorkStatus
): OverallProgress {
  // Overall completion considers both planning and work
  const completionPercentage = Math.min(planning.completionPercentage, work.workCompletionPercentage);
  
  const isOnTrack = work.status !== 'behind_schedule' && (
    planning.status === 'complete' || time.status === 'future'
  );

  // Risk assessment
  let riskLevel: OverallProgress['riskLevel'] = 'low';
  
  if (work.status === 'behind_schedule' || (time.status === 'past' && work.workCompletionPercentage < 100)) {
    riskLevel = 'high';
  } else if (
    (time.status === 'active' && planning.status === 'pending') ||
    (time.timeElapsedPercentage > 75 && work.workCompletionPercentage < 50)
  ) {
    riskLevel = 'medium';
  }

  return {
    completionPercentage,
    isOnTrack,
    riskLevel
  };
}

/**
 * Determine the primary status for display
 */
function determinePrimaryStatus(
  planning: PlanningStatus,
  time: TimeStatus,
  work: WorkStatus
): { status: PhaseStatus['status']; label: string; color: PhaseStatus['color'] } {

  // Complete: Both planning and work are done
  if (planning.status === 'complete' && work.status === 'complete') {
    return { status: 'complete', label: 'Complete', color: 'green' };
  }

  // Overdue: Past end date and significantly incomplete (< 95%)
  // Allow for phases that are nearly complete (>= 95%) to show as "In Progress" instead of "Overdue"
  if (time.status === 'past' && work.status !== 'complete') {
    if (work.workCompletionPercentage < 95) {
      return { status: 'overdue', label: 'Overdue', color: 'red' };
    }
    // Nearly complete (>= 95%), treat as in progress rather than overdue
    return { status: 'in_progress', label: 'Nearly Complete', color: 'blue' };
  }

  // Behind schedule during active phase
  if (work.status === 'behind_schedule') {
    return { status: 'overdue', label: 'Behind Schedule', color: 'red' };
  }

  // In Progress: Active timeline with work in progress
  if (work.status === 'in_progress') {
    return { status: 'in_progress', label: 'In Progress', color: 'blue' };
  }

  // Ready: Planning complete but work not started yet
  if (time.status === 'future' && planning.status === 'complete') {
    return { status: 'ready', label: 'Ready to Start', color: 'purple' };
  }

  // Planning: Hours not distributed
  if (planning.status === 'pending') {
    if (time.status === 'active') {
      return { status: 'planning', label: 'Needs Planning', color: 'red' };
    } else {
      return { status: 'planning', label: 'Planning Phase', color: 'yellow' };
    }
  }

  // Not Started: Default state
  return { status: 'not_started', label: 'Not Started', color: 'gray' };
}

/**
 * Utility functions for date/week calculations
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

/**
 * Helper functions for formatting and styling
 */
export function formatHours(hours: number): string {
  return `${Math.round(hours * 10) / 10}h`;
}

export function getStatusColorClasses(color: PhaseStatus['color']) {
  const colorMap = {
    gray: 'bg-gray-100 text-gray-800 border-gray-300',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300', 
    purple: 'bg-purple-100 text-purple-800 border-purple-300',
    blue: 'bg-blue-100 text-blue-800 border-blue-300',
    green: 'bg-green-100 text-green-800 border-green-300',
    red: 'bg-red-100 text-red-800 border-red-300'
  };
  
  return colorMap[color];
}

export function getProgressBarColor(status: PhaseStatus['status'], isOnSchedule: boolean = true) {
  if (status === 'complete') return 'bg-green-500';
  if (status === 'overdue' || !isOnSchedule) return 'bg-red-500';
  if (status === 'in_progress') return 'bg-blue-500';
  return 'bg-yellow-500';
}