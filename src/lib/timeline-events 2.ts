// Utility functions for timeline data update events

/**
 * Triggers a timeline data update event that will cause the ResourceTimeline component to refetch data
 * Call this after any operation that modifies allocation data
 */
export function triggerTimelineUpdate() {
  // Dispatch custom event for same-tab updates
  window.dispatchEvent(new CustomEvent('timeline-data-updated'));

  // Use localStorage to trigger updates in other tabs
  localStorage.setItem('timeline-data-updated', Date.now().toString());

  // Remove the localStorage item after a short delay to clean up
  setTimeout(() => {
    localStorage.removeItem('timeline-data-updated');
  }, 100);
}

/**
 * Helper function to call after API operations that affect timeline data
 * This should be called after:
 * - Creating/updating/deleting weekly allocations
 * - Creating/updating/deleting phase allocations
 * - Creating/updating/deleting projects or phases
 * - Any hour change request approvals
 */
export function notifyTimelineDataChanged() {
  triggerTimelineUpdate();
}