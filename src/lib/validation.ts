/**
 * Validation utilities for the consultant progress tracking system
 */

import { formatHours } from './dates';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

// Validate hour input
export function validateHours(hours: number, options?: {
  min?: number;
  max?: number;
  allowZero?: boolean;
}): ValidationResult {
  const { min = 0, max = 60, allowZero = true } = options || {};

  if (isNaN(hours)) {
    return { isValid: false, error: 'Please enter a valid number' };
  }

  if (hours < 0) {
    return { isValid: false, error: 'Hours cannot be negative' };
  }

  if (!allowZero && hours === 0) {
    return { isValid: false, error: 'Hours must be greater than zero' };
  }

  if (hours < min) {
    return { isValid: false, error: `Hours must be at least ${formatHours(min)}` };
  }

  if (hours > max) {
    return { isValid: false, error: `Hours cannot exceed ${formatHours(max)}` };
  }

  if (hours % 0.5 !== 0) {
    return { isValid: false, error: 'Hours must be in increments of 0.5' };
  }

  // Warning for very high hours
  if (hours > 40) {
    return { 
      isValid: true, 
      warning: 'High weekly hours - consider work-life balance' 
    };
  }

  return { isValid: true };
}

// Validate phase allocation
export function validatePhaseAllocation(
  totalHours: number,
  distributedHours: number,
  phaseName?: string
): ValidationResult {
  if (distributedHours === totalHours) {
    return { isValid: true };
  }

  const remaining = totalHours - distributedHours;
  const phaseLabel = phaseName ? ` for ${phaseName}` : '';

  if (remaining > 0) {
    return {
      isValid: true,
      warning: `${formatHours(remaining)} remaining to distribute${phaseLabel}`
    };
  } else {
    return {
      isValid: false,
      error: `Over-allocated by ${formatHours(Math.abs(remaining))}${phaseLabel}`
    };
  }
}

// Validate consultant workload
export function validateConsultantWorkload(
  weeklyHours: number[],
  maxHoursPerWeek: number = 40
): ValidationResult {
  const totalWeeks = weeklyHours.length;
  const totalHours = weeklyHours.reduce((sum, hours) => sum + hours, 0);
  const averageHours = totalHours / totalWeeks;
  
  const overloadedWeeks = weeklyHours.filter(hours => hours > maxHoursPerWeek);
  
  if (overloadedWeeks.length > 0) {
    const maxWeekHours = Math.max(...overloadedWeeks);
    return {
      isValid: false,
      error: `${overloadedWeeks.length} week(s) exceed ${formatHours(maxHoursPerWeek)} limit (max: ${formatHours(maxWeekHours)})`
    };
  }

  if (averageHours > maxHoursPerWeek * 0.9) {
    return {
      isValid: true,
      warning: `High average workload: ${formatHours(averageHours)} per week`
    };
  }

  if (averageHours < maxHoursPerWeek * 0.5) {
    return {
      isValid: true,
      warning: `Low utilization: ${formatHours(averageHours)} per week average`
    };
  }

  return { isValid: true };
}

// Validate project budget
export function validateProjectBudget(
  budgetedHours: number,
  allocatedHours: number,
  projectTitle?: string
): ValidationResult {
  const utilization = budgetedHours > 0 ? (allocatedHours / budgetedHours) * 100 : 0;
  const projectLabel = projectTitle ? ` for ${projectTitle}` : '';

  if (utilization > 100) {
    return {
      isValid: false,
      error: `Budget exceeded by ${formatHours(allocatedHours - budgetedHours)}${projectLabel}`
    };
  }

  if (utilization > 90) {
    return {
      isValid: true,
      warning: `High budget utilization: ${Math.round(utilization)}%${projectLabel}`
    };
  }

  if (utilization < 50) {
    return {
      isValid: true,
      warning: `Low budget utilization: ${Math.round(utilization)}%${projectLabel}`
    };
  }

  return { isValid: true };
}

// Validate hour change request
export function validateHourChangeRequest(request: {
  changeType: 'ADJUSTMENT' | 'SHIFT';
  originalHours: number;
  requestedHours?: number;
  shiftHours?: number;
  fromConsultantId?: string;
  toConsultantId?: string;
  reason: string;
}): ValidationResult {
  const { changeType, originalHours, requestedHours, shiftHours, fromConsultantId, toConsultantId, reason } = request;

  if (!reason.trim()) {
    return { isValid: false, error: 'Reason is required' };
  }

  if (reason.trim().length < 10) {
    return { isValid: false, error: 'Please provide a more detailed reason (minimum 10 characters)' };
  }

  if (changeType === 'ADJUSTMENT') {
    if (requestedHours === undefined) {
      return { isValid: false, error: 'Requested hours is required for adjustment' };
    }

    const hoursValidation = validateHours(requestedHours, { min: 0, max: 100 });
    if (!hoursValidation.isValid) {
      return hoursValidation;
    }

    if (requestedHours === originalHours) {
      return { isValid: false, error: 'Requested hours must be different from current hours' };
    }

    const change = requestedHours - originalHours;
    if (Math.abs(change) < 0.5) {
      return { isValid: false, error: 'Change must be at least 0.5 hours' };
    }

    if (Math.abs(change) > 20) {
      return {
        isValid: true,
        warning: `Large hour change requested: ${change > 0 ? '+' : ''}${formatHours(change)}`
      };
    }
  }

  if (changeType === 'SHIFT') {
    if (!fromConsultantId || !toConsultantId) {
      return { isValid: false, error: 'Both source and target consultants are required for transfer' };
    }

    if (fromConsultantId === toConsultantId) {
      return { isValid: false, error: 'Cannot transfer hours to the same consultant' };
    }

    if (shiftHours === undefined || shiftHours <= 0) {
      return { isValid: false, error: 'Transfer hours must be greater than zero' };
    }

    if (shiftHours > originalHours) {
      return { isValid: false, error: 'Cannot transfer more hours than currently allocated' };
    }

    const hoursValidation = validateHours(shiftHours, { min: 0.5, max: originalHours });
    if (!hoursValidation.isValid) {
      return hoursValidation;
    }
  }

  return { isValid: true };
}

// Validate sprint duration
export function validateSprintDuration(startDate: Date, endDate: Date): ValidationResult {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const diffWeeks = diffDays / 7;

  if (startDate >= endDate) {
    return { isValid: false, error: 'End date must be after start date' };
  }

  if (diffWeeks < 1) {
    return { isValid: false, error: 'Sprint must be at least 1 week long' };
  }

  if (diffWeeks > 4) {
    return {
      isValid: true,
      warning: `Long sprint duration: ${Math.round(diffWeeks)} weeks`
    };
  }

  return { isValid: true };
}

// Validate phase dates against sprint dates
export function validatePhaseDates(
  phaseStart: Date,
  phaseEnd: Date,
  sprintDates: Array<{ startDate: Date; endDate: Date }>
): ValidationResult {
  if (sprintDates.length === 0) {
    return { isValid: false, error: 'At least one sprint must be assigned to the phase' };
  }

  const earliestSprintStart = new Date(Math.min(...sprintDates.map(s => s.startDate.getTime())));
  const latestSprintEnd = new Date(Math.max(...sprintDates.map(s => s.endDate.getTime())));

  if (phaseStart > earliestSprintStart || phaseEnd < latestSprintEnd) {
    return {
      isValid: false,
      error: 'Phase dates must encompass all assigned sprint dates'
    };
  }

  return { isValid: true };
}

// Get validation status color
export function getValidationColor(result: ValidationResult): string {
  if (!result.isValid) {
    return 'text-red-600 bg-red-50 border-red-200';
  }
  if (result.warning) {
    return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  }
  return 'text-green-600 bg-green-50 border-green-200';
}

// Format validation message for display
export function formatValidationMessage(result: ValidationResult): string {
  return result.error || result.warning || 'Valid';
}