'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FaExchangeAlt, FaTimes, FaInfoCircle, FaUser, FaCalendarAlt, FaExclamationTriangle } from 'react-icons/fa';
import axios from 'axios';
import { isPhaseLocked } from '@/lib/phase-lock';

interface Phase {
  id: string;
  name: string;
  startDate: Date | string;
  endDate: Date | string;
}

interface ReallocationFormModalProps {
  projectId: string;
  expiredAllocation: {
    id: string; // PhaseAllocation ID
    unplannedExpiredHoursId?: string; // UnplannedExpiredHours ID
    phaseId: string;
    phaseName: string;
    consultantId: string;
    consultantName: string;
    unplannedHours: number;
  };
  availablePhases: Phase[];
  onClose: () => void;
  onSuccess: () => void;
}

const REALLOCATION_REASONS = [
  'Hours were planned but not needed before phase ended',
  'Work was delayed and needs to continue in next phase',
  'Scope changed and work moved to different phase',
  'Phase ended earlier than expected with hours remaining',
  'Consultant was unavailable during the phase timeline',
  'Other'
] as const;

export default function ReallocationFormModal({
  projectId,
  expiredAllocation,
  availablePhases,
  onClose,
  onSuccess
}: ReallocationFormModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const modalContentRef = useRef<HTMLFormElement>(null);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter out locked phases (phases that have ended)
  const activePhases = useMemo(() => {
    return availablePhases.filter(phase => !isPhaseLocked(phase));
  }, [availablePhases]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current === event.target) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Scroll to error when error is set
  useEffect(() => {
    if (error && errorRef.current && modalContentRef.current) {
      modalContentRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [error]);

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!selectedPhaseId) {
      setError('Please select a phase to reallocate to');
      return;
    }

    if (!selectedReason) {
      setError('Please select a reason for reallocation');
      return;
    }

    if (selectedReason === 'Other' && !customReason.trim()) {
      setError('Please provide a custom reason for reallocation');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const finalReason = selectedReason === 'Other' ? customReason : selectedReason;

    try {
      // First, check if consultant already has an allocation in the target phase
      // Only look for PARENT allocations (not child reallocations)
      const existingAllocationsResponse = await axios.get(`/api/phases/${selectedPhaseId}/allocations`);
      const existingAllocation = existingAllocationsResponse.data.find(
        (alloc: any) =>
          alloc.consultantId === expiredAllocation.consultantId &&
          !alloc.isReallocation && // Only find parent allocations
          !alloc.parentAllocationId // Not a child reallocation
      );

      let totalHoursForNewAllocation;
      if (existingAllocation) {
        // Add to existing allocation
        totalHoursForNewAllocation = existingAllocation.totalHours + expiredAllocation.unplannedHours;
      } else {
        // No existing allocation, create new one
        totalHoursForNewAllocation = expiredAllocation.unplannedHours;
      }

      // POST endpoint expects flat object with reallocation metadata
      const payload = {
        consultantId: expiredAllocation.consultantId,
        totalHours: totalHoursForNewAllocation,
        isReallocation: true,
        reallocatedFromPhaseId: expiredAllocation.phaseId,
        reallocatedFromUnplannedId: expiredAllocation.unplannedExpiredHoursId
      };

      // 1. Create or update phase allocation with PENDING status
      // This will go through the existing phase allocation approval workflow
      // The API will implement hybrid logic based on whether existing allocation is APPROVED or PENDING
      const response = await axios.post(`/api/phases/${selectedPhaseId}/allocations`, payload);

      // 2. Mark the UnplannedExpiredHours as REALLOCATED (if we have the ID)
      if (expiredAllocation.unplannedExpiredHoursId) {
        await axios.patch(
          `/api/phases/${expiredAllocation.phaseId}/allocations/${expiredAllocation.id}`,
          {
            action: 'reallocate',
            targetPhaseId: selectedPhaseId,
            newAllocationId: response.data.id, // Use the returned allocation ID
            notes: finalReason
          }
        );
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create reallocation request');
      setIsSubmitting(false);
    }
  };

  const selectedPhase = activePhases.find(p => p.id === selectedPhaseId);

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <FaExchangeAlt className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Reallocate Hours to Another Phase</h1>
              <p className="text-blue-100">Move unplanned hours to an active phase</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg flex items-center justify-center transition-all duration-200"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} ref={modalContentRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div ref={errorRef} className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <FaExclamationTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            </div>
          )}

          {/* Current Allocation Info */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-800/20 p-6 rounded-lg border border-yellow-100 dark:border-yellow-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-yellow-600 text-white rounded-lg flex items-center justify-center">
                <FaUser className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Current Allocation</h2>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-white dark:bg-gray-900 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">From Phase:</span>
                <span className="font-semibold text-foreground">{expiredAllocation.phaseName}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white dark:bg-gray-900 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">Consultant:</span>
                <span className="font-semibold text-foreground">{expiredAllocation.consultantName}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/50 dark:to-orange-900/50 rounded-lg border-2 border-yellow-300 dark:border-yellow-700">
                <span className="text-sm font-bold text-yellow-800 dark:text-yellow-300">Hours to Reallocate:</span>
                <span className="font-bold text-2xl text-yellow-900 dark:text-yellow-200">{expiredAllocation.unplannedHours.toFixed(1)}h</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="flex items-start gap-2">
                <FaInfoCircle className="w-4 h-4 text-blue-700 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  This reallocation will require Growth Team approval before becoming active.
                </p>
              </div>
            </div>
          </div>

          {/* Phase Selection */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-800/20 p-6 rounded-lg border border-blue-100 dark:border-blue-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center">
                <FaCalendarAlt className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Select Target Phase</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="targetPhase" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Target Phase <span className="text-red-500">*</span>
                </label>
                <select
                  id="targetPhase"
                  value={selectedPhaseId}
                  onChange={(e) => setSelectedPhaseId(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-foreground focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  required
                >
                  <option value="">Select a phase...</option>
                  {activePhases.map((phase) => (
                    <option key={phase.id} value={phase.id}>
                      {phase.name}
                    </option>
                  ))}
                </select>
                {activePhases.length === 0 && (
                  <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      {availablePhases.length === 0
                        ? 'No other phases available for reallocation. The consultant must have access to the target phase.'
                        : 'No active phases available for reallocation. All other phases have ended.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Selected Phase Info */}
              {selectedPhase && (
                <div className="bg-white dark:bg-gray-900 border-2 border-blue-200 dark:border-blue-700 rounded-lg p-4">
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <FaInfoCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Selected Phase Details
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <span className="text-gray-600 dark:text-gray-400">Phase Name:</span>
                      <span className="font-medium text-foreground">{selectedPhase.name}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <span className="text-gray-600 dark:text-gray-400">Start Date:</span>
                      <span className="text-foreground">{new Date(selectedPhase.startDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <span className="text-gray-600 dark:text-gray-400">End Date:</span>
                      <span className="text-foreground">{new Date(selectedPhase.endDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 rounded border border-blue-200 dark:border-blue-700">
                      <span className="font-medium text-blue-800 dark:text-blue-300">Hours to Reallocate:</span>
                      <span className="font-bold text-lg text-blue-900 dark:text-blue-200">{expiredAllocation.unplannedHours.toFixed(1)}h</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reason Section */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-800/20 p-6 rounded-lg border border-purple-100 dark:border-purple-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-purple-600 text-white rounded-lg flex items-center justify-center">
                <FaInfoCircle className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Reason for Reallocation</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Reason <span className="text-red-500">*</span>
                </label>
                <select
                  id="reason"
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-foreground focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-500 dark:focus:border-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  required
                >
                  <option value="">Select a reason...</option>
                  {REALLOCATION_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              {selectedReason === 'Other' && (
                <div>
                  <label htmlFor="customReason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Custom Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="customReason"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    disabled={isSubmitting}
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-foreground focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-500 dark:focus:border-purple-400 disabled:opacity-50 disabled:cursor-not-allowed resize-none transition-all"
                    placeholder="Please explain your specific reason for reallocation..."
                    required
                  />
                </div>
              )}

              <p className="text-xs text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/50 p-2 rounded">
                This reason will be visible to the Growth Team when they review your reallocation request.
              </p>
            </div>
          </div>
        </form>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-6 py-3 text-sm font-medium text-card-foreground bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !selectedPhaseId ||
              !selectedReason ||
              (selectedReason === 'Other' && !customReason.trim()) ||
              activePhases.length === 0
            }
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <FaExchangeAlt className="w-4 h-4" />
            )}
            {isSubmitting ? 'Submitting...' : 'Submit Reallocation Request'}
          </button>
        </div>
      </div>
    </div>
  );
}
