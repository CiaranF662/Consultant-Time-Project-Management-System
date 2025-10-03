'use client';

import { useState, useEffect, useRef } from 'react';
import { FaTimes, FaEdit } from 'react-icons/fa';

interface ModifyHoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (approvedHours: number) => void;
  title?: string;
  itemName?: string;
  originalHours: number;
  maxHours?: number;
  isSubmitting?: boolean;
}

export default function ModifyHoursModal({
  isOpen,
  onClose,
  onSubmit,
  title = 'Modify Hours',
  itemName = 'this allocation',
  originalHours,
  maxHours,
  isSubmitting = false
}: ModifyHoursModalProps) {
  const [hours, setHours] = useState(originalHours.toString());
  const [error, setError] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  // Reset state when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setHours(originalHours.toString());
      setError('');
    }
  }, [isOpen, originalHours]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current === event.target) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSubmitting, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const hoursValue = parseFloat(hours);

    if (!hours.trim() || isNaN(hoursValue)) {
      setError('Please enter a valid number');
      return;
    }

    if (hoursValue < 0) {
      setError('Hours cannot be negative');
      return;
    }

    if (hoursValue === 0) {
      setError('Hours must be greater than 0. Use reject if you want to deny this allocation.');
      return;
    }

    if (hoursValue === originalHours) {
      setError('Modified hours must be different from the original request');
      return;
    }

    if (maxHours !== undefined && hoursValue > maxHours) {
      setError(`Hours cannot exceed the phase allocation of ${maxHours}h`);
      return;
    }

    onSubmit(hoursValue);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <FaEdit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{title}</h2>
              <p className="text-blue-100 text-sm">Adjust approved hours for this allocation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg flex items-center justify-center transition-all duration-200 disabled:opacity-50"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 mb-2">
              <strong>Allocation:</strong> {itemName}
            </p>
            <p className="text-sm text-blue-700 mb-1">
              <strong>Original Request:</strong> {originalHours}h
            </p>
            {maxHours !== undefined && (
              <p className="text-sm text-blue-700">
                <strong>Phase Allocation Limit:</strong> {maxHours}h
              </p>
            )}
          </div>

          <div>
            <label htmlFor="modified-hours" className="block text-sm font-medium text-card-foreground mb-2">
              Approved Hours <span className="text-red-500">*</span>
            </label>
            <input
              ref={inputRef}
              type="number"
              id="modified-hours"
              value={hours}
              onChange={(e) => {
                setHours(e.target.value);
                setError('');
              }}
              placeholder="e.g., 15"
              step="0.5"
              min="0"
              max={maxHours}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {maxHours !== undefined
                ? `Enter hours between 0 and ${maxHours}h (phase allocation limit). Must be different from original request.`
                : 'Enter the hours you want to approve. Must be different from original request.'
              }
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Comparison Preview */}
          {!error && hours.trim() && !isNaN(parseFloat(hours)) && parseFloat(hours) !== originalHours && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                {parseFloat(hours) > originalHours ? (
                  <>
                    <strong>Increase:</strong> +{(parseFloat(hours) - originalHours).toFixed(1)}h
                    <span className="ml-1">({originalHours}h → {parseFloat(hours)}h)</span>
                  </>
                ) : (
                  <>
                    <strong>Decrease:</strong> -{(originalHours - parseFloat(hours)).toFixed(1)}h
                    <span className="ml-1">({originalHours}h → {parseFloat(hours)}h)</span>
                  </>
                )}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-card-foreground hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !hours.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Modifying...
                </>
              ) : (
                'Modify & Approve'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
