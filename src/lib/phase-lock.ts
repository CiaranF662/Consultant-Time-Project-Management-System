/**
 * Phase Lock Utility
 * Determines if a phase can be edited based on its completion status and dates
 */

export interface PhaseForLockCheck {
  endDate: Date | string;
}

/**
 * Check if a phase is locked from editing
 * A phase is locked if:
 * - Its end date has passed (phase is in the past)
 *
 * @param phase - Phase to check
 * @param currentDate - Current date (defaults to now, useful for testing)
 * @returns true if phase is locked, false if editable
 */
export function isPhaseLocked(
  phase: PhaseForLockCheck,
  currentDate: Date = new Date()
): boolean {
  const endDate = new Date(phase.endDate);
  const now = new Date(currentDate);

  // Phase is locked if end date has passed
  return endDate < now;
}

/**
 * Check if a phase can be edited by the current user
 * Growth Team can override locks for corrections
 *
 * @param phase - Phase to check
 * @param isGrowthTeam - Whether the current user is on the Growth Team
 * @param currentDate - Current date (defaults to now)
 * @returns true if phase can be edited, false otherwise
 */
export function canEditPhase(
  phase: PhaseForLockCheck,
  isGrowthTeam: boolean = false,
  currentDate: Date = new Date()
): boolean {
  // Growth Team can always edit (for corrections)
  if (isGrowthTeam) {
    return true;
  }

  // Check if phase is locked
  return !isPhaseLocked(phase, currentDate);
}

/**
 * Get a user-friendly message explaining why a phase is locked
 */
export function getPhaseLockMessage(phase: PhaseForLockCheck): string {
  const endDate = new Date(phase.endDate);
  const now = new Date();

  if (endDate < now) {
    const daysPast = Math.floor((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
    return `This phase ended ${daysPast} day${daysPast !== 1 ? 's' : ''} ago and can no longer be edited.`;
  }

  return 'This phase cannot be edited.';
}

/**
 * Validation error for API responses
 */
export class PhaseLockError extends Error {
  constructor(message?: string) {
    super(message || 'This phase is locked and cannot be edited because it has ended.');
    this.name = 'PhaseLockError';
  }
}
