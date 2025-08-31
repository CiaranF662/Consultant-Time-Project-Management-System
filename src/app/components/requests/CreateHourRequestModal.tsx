'use client';

import { useState } from 'react';
import { FaTimes, FaSave } from 'react-icons/fa';
import { formatHours } from '@/lib/dates';
import axios from 'axios';

interface PhaseAllocation {
  id: string;
  totalHours: number;
  phase: {
    id: string;
    name: string;
    project: {
      id: string;
      title: string;
      consultants: Array<{
        userId: string;
        user: {
          id: string;
          name: string | null;
          email: string | null;
        };
      }>;
    };
  };
}

interface CreateHourRequestModalProps {
  phaseAllocations: PhaseAllocation[];
  userId: string;
  onClose: () => void;
  onRequestCreated: () => void;
}

export default function CreateHourRequestModal({ 
  phaseAllocations, 
  userId, 
  onClose, 
  onRequestCreated 
}: CreateHourRequestModalProps) {
  const [requestType, setRequestType] = useState<'ADJUSTMENT' | 'SHIFT'>('ADJUSTMENT');
  const [selectedAllocationId, setSelectedAllocationId] = useState('');
  const [adjustmentHours, setAdjustmentHours] = useState<number>(0);
  const [shiftToConsultantId, setShiftToConsultantId] = useState('');
  const [shiftHours, setShiftHours] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedAllocation = phaseAllocations.find(alloc => alloc.id === selectedAllocationId);
  const otherConsultants = selectedAllocation?.phase.project.consultants.filter(
    consultant => consultant.userId !== userId
  ) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedAllocation) {
      setError('Please select a phase allocation');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason for the request');
      return;
    }

    if (requestType === 'ADJUSTMENT') {
      if (adjustmentHours === 0) {
        setError('Please specify the hour adjustment amount');
        return;
      }
      
      const newTotal = selectedAllocation.totalHours + adjustmentHours;
      if (newTotal < 0) {
        setError('Cannot reduce hours below zero');
        return;
      }
    } else {
      if (!shiftToConsultantId) {
        setError('Please select a consultant to transfer hours to');
        return;
      }
      
      if (shiftHours <= 0) {
        setError('Please specify a positive amount of hours to transfer');
        return;
      }
      
      if (shiftHours > selectedAllocation.totalHours) {
        setError('Cannot transfer more hours than currently allocated');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const requestData = {
        changeType: requestType,
        phaseId: selectedAllocation.phase.id,
        reason: reason.trim(),
        ...(requestType === 'ADJUSTMENT' ? {
          phaseAllocationId: selectedAllocationId,
          originalHours: selectedAllocation.totalHours,
          requestedHours: selectedAllocation.totalHours + adjustmentHours
        } : {
          fromConsultantId: userId,
          toConsultantId: shiftToConsultantId,
          shiftHours: shiftHours
        })
      };

      await axios.post('/api/requests/hours', requestData);
      onRequestCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Create Hour Change Request</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded"
              disabled={isSubmitting}
            >
              <FaTimes />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Request Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Request Type *
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="ADJUSTMENT"
                  checked={requestType === 'ADJUSTMENT'}
                  onChange={(e) => setRequestType(e.target.value as 'ADJUSTMENT')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  disabled={isSubmitting}
                />
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-700">Hour Adjustment</div>
                  <div className="text-xs text-gray-500">Increase or decrease your allocated hours for a phase</div>
                </div>
              </label>
              
              <label className="flex items-center">
                <input
                  type="radio"
                  value="SHIFT"
                  checked={requestType === 'SHIFT'}
                  onChange={(e) => setRequestType(e.target.value as 'SHIFT')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  disabled={isSubmitting}
                />
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-700">Hour Transfer</div>
                  <div className="text-xs text-gray-500">Transfer some of your hours to another team member</div>
                </div>
              </label>
            </div>
          </div>

          {/* Phase Selection */}
          <div className="mb-6">
            <label htmlFor="phaseAllocation" className="block text-sm font-medium text-gray-700 mb-2">
              Select Phase Allocation *
            </label>
            <select
              id="phaseAllocation"
              value={selectedAllocationId}
              onChange={(e) => setSelectedAllocationId(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={isSubmitting}
              required
            >
              <option value="">Choose a phase allocation</option>
              {phaseAllocations.map((allocation) => (
                <option key={allocation.id} value={allocation.id}>
                  {allocation.phase.project.title} - {allocation.phase.name} ({formatHours(allocation.totalHours)})
                </option>
              ))}
            </select>
          </div>

          {/* Adjustment Fields */}
          {requestType === 'ADJUSTMENT' && (
            <div className="mb-6">
              <label htmlFor="adjustmentHours" className="block text-sm font-medium text-gray-700 mb-2">
                Hour Adjustment *
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  id="adjustmentHours"
                  value={adjustmentHours}
                  onChange={(e) => setAdjustmentHours(parseFloat(e.target.value) || 0)}
                  step="0.5"
                  className="block w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                  disabled={isSubmitting}
                  required
                />
                <div className="text-sm text-gray-600">
                  {selectedAllocation && (
                    <>
                      Current: {formatHours(selectedAllocation.totalHours)} → 
                      New: {formatHours(selectedAllocation.totalHours + adjustmentHours)}
                      {adjustmentHours > 0 && (
                        <span className="text-green-600 ml-2">+{formatHours(adjustmentHours)}</span>
                      )}
                      {adjustmentHours < 0 && (
                        <span className="text-red-600 ml-2">{formatHours(adjustmentHours)}</span>
                      )}
                    </>
                  )}
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Use positive numbers to increase hours, negative to decrease
              </p>
            </div>
          )}

          {/* Transfer Fields */}
          {requestType === 'SHIFT' && (
            <>
              <div className="mb-4">
                <label htmlFor="shiftToConsultant" className="block text-sm font-medium text-gray-700 mb-2">
                  Transfer To *
                </label>
                <select
                  id="shiftToConsultant"
                  value={shiftToConsultantId}
                  onChange={(e) => setShiftToConsultantId(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={isSubmitting || !selectedAllocation}
                  required
                >
                  <option value="">Select team member</option>
                  {otherConsultants.map((consultant) => (
                    <option key={consultant.userId} value={consultant.userId}>
                      {consultant.user.name || consultant.user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label htmlFor="shiftHours" className="block text-sm font-medium text-gray-700 mb-2">
                  Hours to Transfer *
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    id="shiftHours"
                    value={shiftHours}
                    onChange={(e) => setShiftHours(parseFloat(e.target.value) || 0)}
                    min="0.5"
                    max={selectedAllocation?.totalHours || 0}
                    step="0.5"
                    className="block w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                    disabled={isSubmitting}
                    required
                  />
                  <div className="text-sm text-gray-600">
                    {selectedAllocation && (
                      <>
                        Available: {formatHours(selectedAllocation.totalHours)}
                        {shiftHours > 0 && (
                          <span className="ml-2">
                            → Remaining: {formatHours(selectedAllocation.totalHours - shiftHours)}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Reason */}
          <div className="mb-6">
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Request *
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Please explain why this change is needed..."
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={isSubmitting}
            >
              <FaSave />
              {isSubmitting ? 'Creating...' : 'Create Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}