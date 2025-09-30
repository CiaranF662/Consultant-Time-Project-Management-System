'use client';

import { useState } from 'react';
import { FaTimes, FaSave, FaExchangeAlt, FaPlus, FaClock, FaInfoCircle } from 'react-icons/fa';
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
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedAllocationId, setSelectedAllocationId] = useState('');
  const [adjustmentHours, setAdjustmentHours] = useState<number>(0);
  const [shiftToConsultantId, setShiftToConsultantId] = useState('');
  const [shiftHours, setShiftHours] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedAllocation = phaseAllocations.find(alloc => alloc.id === selectedAllocationId);
  
  // Group phase allocations by project
  const projectsWithAllocations = phaseAllocations.reduce((acc, allocation) => {
    const projectId = allocation.phase.project.id;
    if (!acc[projectId]) {
      acc[projectId] = {
        project: allocation.phase.project,
        allocations: []
      };
    }
    acc[projectId].allocations.push(allocation);
    return acc;
  }, {} as Record<string, { project: any, allocations: PhaseAllocation[] }>);

  const availableProjects = Object.values(projectsWithAllocations);
  const selectedProject = projectsWithAllocations[selectedProjectId];
  const availablePhases = selectedProject?.allocations || [];
  
  // Get other consultants from the selected project
  const otherConsultants = selectedProject?.project.consultants.filter(
    consultant => consultant.userId !== userId
  ) || [];

  // Reset phase selection when project changes
  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedAllocationId('');
    setShiftToConsultantId('');
  };

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <FaClock className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Hour Change Request</h2>
                <p className="text-blue-100 text-sm">Adjust or transfer your phase allocations</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              <FaTimes size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(95vh-80px)]">

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-r-lg">
                <div className="flex items-center">
                  <FaInfoCircle className="text-red-400 mr-3" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* Request Type */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FaInfoCircle className="text-blue-500" />
                <label className="text-lg font-semibold text-gray-800">
                  Request Type
                </label>
                <span className="text-red-500">*</span>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <label className={`relative flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  requestType === 'ADJUSTMENT' 
                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    value="ADJUSTMENT"
                    checked={requestType === 'ADJUSTMENT'}
                    onChange={(e) => setRequestType(e.target.value as 'ADJUSTMENT')}
                    className="sr-only"
                    disabled={isSubmitting}
                  />
                  <div className="flex items-start gap-3 w-full">
                    <div className={`p-2 rounded-lg ${
                      requestType === 'ADJUSTMENT' ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <FaPlus className={requestType === 'ADJUSTMENT' ? 'text-blue-600' : 'text-gray-400'} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">Hour Adjustment</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Increase or decrease your allocated hours for a specific phase
                      </div>
                    </div>
                  </div>
                  {requestType === 'ADJUSTMENT' && (
                    <div className="absolute top-2 right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </label>
                
                <label className={`relative flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  requestType === 'SHIFT' 
                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    value="SHIFT"
                    checked={requestType === 'SHIFT'}
                    onChange={(e) => setRequestType(e.target.value as 'SHIFT')}
                    className="sr-only"
                    disabled={isSubmitting}
                  />
                  <div className="flex items-start gap-3 w-full">
                    <div className={`p-2 rounded-lg ${
                      requestType === 'SHIFT' ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <FaExchangeAlt className={requestType === 'SHIFT' ? 'text-blue-600' : 'text-gray-400'} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">Hour Transfer</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Transfer some of your hours to another team member
                      </div>
                    </div>
                  </div>
                  {requestType === 'SHIFT' && (
                    <div className="absolute top-2 right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Project and Phase Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FaInfoCircle className="text-blue-500" />
                <label className="text-lg font-semibold text-gray-800">
                  Select Project & Phase
                </label>
                <span className="text-red-500">*</span>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                {/* Project Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    disabled={isSubmitting}
                    required
                  >
                    <option value="">Choose a project...</option>
                    {availableProjects.map(({ project }) => (
                      <option key={project.id} value={project.id}>
                        {project.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Phase Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phase Allocation
                  </label>
                  <select
                    value={selectedAllocationId}
                    onChange={(e) => setSelectedAllocationId(e.target.value)}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    disabled={isSubmitting || !selectedProjectId}
                    required
                  >
                    <option value="">
                      {selectedProjectId ? 'Choose a phase...' : 'Select project first'}
                    </option>
                    {availablePhases.map((allocation) => (
                      <option key={allocation.id} value={allocation.id}>
                        {allocation.phase.name} ({formatHours(allocation.totalHours)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
                
              {selectedAllocation && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <FaClock className="text-blue-600" />
                    <span className="font-medium text-blue-800">Selected Allocation Details</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 block">Project:</span>
                      <span className="font-medium text-gray-800">{selectedAllocation.phase.project.title}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 block">Phase:</span>
                      <span className="font-medium text-gray-800">{selectedAllocation.phase.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 block">Current Hours:</span>
                      <span className="font-semibold text-blue-700">{formatHours(selectedAllocation.totalHours)}</span>
                    </div>
                  </div>
                  {otherConsultants.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <span className="text-gray-600 text-sm block mb-1">Team Members:</span>
                      <div className="flex flex-wrap gap-2">
                        {otherConsultants.map((consultant) => (
                          <span key={consultant.userId} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            {consultant.user.name || consultant.user.email}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Adjustment Fields */}
            {requestType === 'ADJUSTMENT' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FaPlus className="text-green-500" />
                  <label className="text-lg font-semibold text-gray-800">
                    Hour Adjustment
                  </label>
                  <span className="text-red-500">*</span>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label htmlFor="adjustmentHours" className="block text-sm font-medium text-gray-700 mb-2">
                        Adjustment Amount
                      </label>
                      <input
                        type="number"
                        id="adjustmentHours"
                        value={adjustmentHours}
                        onChange={(e) => setAdjustmentHours(parseFloat(e.target.value) || 0)}
                        step="0.5"
                        className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                        disabled={isSubmitting}
                        required
                      />
                      <p className="mt-2 text-xs text-gray-500">
                        Use positive numbers to increase hours, negative to decrease
                      </p>
                    </div>
                    
                    {selectedAllocation && adjustmentHours !== 0 && (
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-700 mb-2">Preview</div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Current:</span>
                            <span className="font-medium">{formatHours(selectedAllocation.totalHours)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Change:</span>
                            <span className={`font-medium ${adjustmentHours >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {adjustmentHours >= 0 ? '+' : ''}{formatHours(adjustmentHours)}
                            </span>
                          </div>
                          <div className="border-t pt-2 flex items-center justify-between text-sm font-semibold">
                            <span>New Total:</span>
                            <span className="text-blue-600">
                              {formatHours(selectedAllocation.totalHours + adjustmentHours)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Transfer Fields */}
            {requestType === 'SHIFT' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FaExchangeAlt className="text-orange-500" />
                  <label className="text-lg font-semibold text-gray-800">
                    Hour Transfer
                  </label>
                  <span className="text-red-500">*</span>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="shiftToConsultant" className="block text-sm font-medium text-gray-700 mb-2">
                      Transfer To
                    </label>
                    <select
                      id="shiftToConsultant"
                      value={shiftToConsultantId}
                      onChange={(e) => setShiftToConsultantId(e.target.value)}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      disabled={isSubmitting || !selectedAllocation}
                      required
                    >
                      <option value="">Select team member...</option>
                      {otherConsultants.map((consultant) => (
                        <option key={consultant.userId} value={consultant.userId}>
                          {consultant.user.name || consultant.user.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="shiftHours" className="block text-sm font-medium text-gray-700 mb-2">
                      Hours to Transfer
                    </label>
                    <input
                      type="number"
                      id="shiftHours"
                      value={shiftHours}
                      onChange={(e) => setShiftHours(parseFloat(e.target.value) || 0)}
                      min="0.5"
                      max={selectedAllocation?.totalHours || 0}
                      step="0.5"
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                </div>
                
                {selectedAllocation && shiftHours > 0 && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <FaExchangeAlt className="text-orange-600" />
                      <span className="font-medium text-orange-800">Transfer Preview</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Available Hours:</span>
                        <span className="ml-2 font-medium">{formatHours(selectedAllocation.totalHours)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Transferring:</span>
                        <span className="ml-2 font-semibold text-orange-700">{formatHours(shiftHours)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Your Remaining:</span>
                        <span className="ml-2 font-semibold text-blue-700">
                          {formatHours(selectedAllocation.totalHours - shiftHours)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reason */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FaInfoCircle className="text-blue-500" />
                <label className="text-lg font-semibold text-gray-800">
                  Reason for Request
                </label>
                <span className="text-red-500">*</span>
              </div>
              
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Please provide a detailed explanation for why this hour change is needed. This helps with approval decisions..."
                disabled={isSubmitting}
                required
              />
              <div className="text-right text-xs text-gray-500">
                {reason.length}/500 characters
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 border border-transparent rounded-xl shadow-sm hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                disabled={isSubmitting}
              >
                <FaSave />
                {isSubmitting ? 'Creating Request...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}