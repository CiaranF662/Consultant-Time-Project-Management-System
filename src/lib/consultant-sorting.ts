/**
 * Shared utility for consistent consultant ordering across the application
 * Sorts consultants by availability status (most available first), then alphabetically
 */

export type ConsultantAvailabilityStatus = 'available' | 'partially-busy' | 'busy' | 'overloaded';

/**
 * Determines the sort priority for availability statuses
 * Lower numbers = higher priority (shown first)
 */
const statusPriority: Record<ConsultantAvailabilityStatus, number> = {
  'available': 1,
  'partially-busy': 2,
  'busy': 3,
  'overloaded': 4
};

/**
 * Calculates availability status based on average hours per week
 */
export function calculateAvailabilityStatus(averageHoursPerWeek: number): ConsultantAvailabilityStatus {
  if (averageHoursPerWeek <= 15) return 'available';
  if (averageHoursPerWeek <= 30) return 'partially-busy';
  if (averageHoursPerWeek <= 40) return 'busy';
  return 'overloaded';
}

/**
 * Sorts consultants by availability status (most available first), then alphabetically by name
 * @param consultants Array of consultant objects with status and name
 * @returns Sorted array
 */
export function sortConsultantsByAvailability<T extends {
  overallStatus?: ConsultantAvailabilityStatus;
  name?: string;
  consultant?: { name?: string; };
}>(consultants: T[]): T[] {
  return [...consultants].sort((a, b) => {
    // Get status for comparison
    const statusA = a.overallStatus;
    const statusB = b.overallStatus;

    // Get name for comparison (handle both direct name and nested consultant.name)
    const nameA = a.name || a.consultant?.name || '';
    const nameB = b.name || b.consultant?.name || '';

    // If both have status, sort by status first
    if (statusA && statusB) {
      const priorityDiff = statusPriority[statusA] - statusPriority[statusB];
      if (priorityDiff !== 0) return priorityDiff;
    }

    // If status is same (or missing), sort alphabetically
    return nameA.localeCompare(nameB);
  });
}

/**
 * Sorts consultant IDs based on a map of consultant data
 * Useful for sorting selectedConsultantIds array in PhaseAllocationForm
 */
export function sortConsultantIds(
  consultantIds: string[],
  consultantDataMap: Record<string, {
    name: string;
    availabilityStatus?: ConsultantAvailabilityStatus;
  }>
): string[] {
  return [...consultantIds].sort((idA, idB) => {
    const consultantA = consultantDataMap[idA];
    const consultantB = consultantDataMap[idB];

    if (!consultantA || !consultantB) {
      return 0; // Keep original order if data missing
    }

    // Sort by availability status if available
    if (consultantA.availabilityStatus && consultantB.availabilityStatus) {
      const priorityDiff = statusPriority[consultantA.availabilityStatus] - statusPriority[consultantB.availabilityStatus];
      if (priorityDiff !== 0) return priorityDiff;
    }

    // Then sort alphabetically by name
    return consultantA.name.localeCompare(consultantB.name);
  });
}
