'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FaExclamationTriangle, FaTimes, FaBan, FaExchangeAlt, FaUser, FaInfoCircle } from 'react-icons/fa';
import axios from 'axios';

interface ExpiredAllocationModalProps {
  allocation: {
    id: string;
    phaseId: string;
    phaseName: string;
    consultantId: string;
    consultantName: string;
    totalHours: number;
    plannedHours: number;
    unplannedHours: number;
  };
  onClose: () => void;
  onForfeit: () => void;
  onReallocationRequest: () => void;
}

export default function ExpiredAllocationModal({
  allocation,
  onClose,
  onForfeit,
  onReallocationRequest
}: ExpiredAllocationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleForfeit = async () => {
    if (!confirm(`Are you sure you want to forfeit ${allocation.unplannedHours.toFixed(1)} hours? This action cannot be undone.`)) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      await axios.patch(
        `/api/phases/${allocation.phaseId}/allocations/${allocation.id}`,
        { action: 'forfeit' }
      );

      onForfeit();
      onClose();
    } catch (err: any) {
      console.error('Error forfeiting allocation:', err);
      setError(err.response?.data?.error || 'Failed to forfeit allocation');
      setIsProcessing(false);
    }
  };

  const handleReallocate = () => {
    onReallocationRequest();
  };

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <FaExclamationTriangle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Expired Phase Allocation</h1>
              <p className="text-yellow-100">Phase ended with unplanned hours</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="w-8 h-8 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg flex items-center justify-center transition-all duration-200"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <FaExclamationTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            </div>
          )}

          {/* Allocation Details Section */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-800/20 p-6 rounded-lg border border-yellow-100 dark:border-yellow-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-yellow-600 text-white rounded-lg flex items-center justify-center">
                <FaUser className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Allocation Details</h2>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-white dark:bg-gray-900 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">Phase:</span>
                <span className="font-semibold text-foreground">{allocation.phaseName}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white dark:bg-gray-900 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">Consultant:</span>
                <span className="font-semibold text-foreground">{allocation.consultantName}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white dark:bg-gray-900 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Allocated:</span>
                <span className="font-semibold text-foreground">{allocation.totalHours.toFixed(1)}h</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white dark:bg-gray-900 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">Planned:</span>
                <span className="font-semibold text-foreground">{allocation.plannedHours.toFixed(1)}h</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/50 dark:to-orange-900/50 rounded-lg border-2 border-yellow-300 dark:border-yellow-700">
                <span className="text-sm font-bold text-yellow-800 dark:text-yellow-300">Unplanned Hours:</span>
                <span className="font-bold text-2xl text-yellow-900 dark:text-yellow-200">{allocation.unplannedHours.toFixed(1)}h</span>
              </div>
            </div>
          </div>

          {/* Options Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-800/20 p-6 rounded-lg border border-blue-100 dark:border-blue-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center">
                <FaInfoCircle className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-foreground">What would you like to do?</h2>
            </div>

            <div className="space-y-3">
              {/* Forfeit Option */}
              <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-700 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <FaBan className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground mb-1">Forfeit Hours</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Permanently discard these {allocation.unplannedHours.toFixed(1)} hours. They will not be available for future phases.
                    </p>
                  </div>
                </div>
              </div>

              {/* Reallocate Option */}
              <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <FaExchangeAlt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground mb-1">Reallocate to Another Phase</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Move these hours to another phase for {allocation.consultantName}. Requires Growth Team approval.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-6 py-3 text-sm font-medium text-card-foreground bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>

          <button
            onClick={handleForfeit}
            disabled={isProcessing}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {isProcessing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <FaBan className="w-4 h-4" />
            )}
            {isProcessing ? 'Forfeiting...' : 'Forfeit Hours'}
          </button>

          <button
            onClick={handleReallocate}
            disabled={isProcessing}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            <FaExchangeAlt className="w-4 h-4" />
            Reallocate to Another Phase
          </button>
        </div>
      </div>
    </div>
  );
}
