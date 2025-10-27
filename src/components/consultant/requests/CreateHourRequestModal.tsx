'use client';

import { useState, useEffect, useRef } from 'react';
import { FaTimes, FaSave, FaPlus, FaClock, FaInfoCircle, FaExclamationTriangle, FaProjectDiagram, FaSearch } from 'react-icons/fa';
import { formatHours } from '@/lib/dates';
import { validateHourChangeRequest } from '@/lib/validation';
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
    };
  };
  weeklyAllocations?: Array<{
    proposedHours?: number | null;
    approvedHours?: number | null;
  }>;
}

interface CreateHourRequestModalProps {
  phaseAllocations: PhaseAllocation[];
  userId: string;
  onClose: () => void;
  onRequestCreated: () => void;
  preFilledProjectId?: string;
  preFilledPhaseAllocationId?: string;
}

// Predefined hour change reasons
const HOUR_CHANGE_REASONS = [
  { value: 'SCOPE_CHANGE', label: 'Scope changed' },
  { value: 'UNDERESTIMATED', label: 'Task complexity underestimated' },
  { value: 'OVERESTIMATED', label: 'Task complexity overestimated' },
  { value: 'SKILL_MISMATCH', label: 'Skills don\'t match requirements' },
  { value: 'SCHEDULE_CONFLICT', label: 'Schedule conflict / availability change' },
  { value: 'WORKLOAD_BALANCE', label: 'Workload balancing needed' },
  { value: 'CLIENT_REQUEST', label: 'Client requested changes' },
  { value: 'TECHNICAL_BLOCKER', label: 'Technical blocker or dependency' },
  { value: 'RESOURCE_CHANGE', label: 'Team resource changes' },
  { value: 'OTHER', label: 'Other (please specify)' }
];

export default function CreateHourRequestModal({
  phaseAllocations,
  userId,
  onClose,
  onRequestCreated,
  preFilledProjectId,
  preFilledPhaseAllocationId
}: CreateHourRequestModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const phaseDropdownRef = useRef<HTMLDivElement>(null);

  const [selectedProjectId, setSelectedProjectId] = useState(preFilledProjectId || '');
  const [selectedAllocationId, setSelectedAllocationId] = useState(preFilledPhaseAllocationId || '');
  const [adjustmentHours, setAdjustmentHours] = useState<string>('');
  const [selectedReasonType, setSelectedReasonType] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search states
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [phaseSearchQuery, setPhaseSearchQuery] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showPhaseDropdown, setShowPhaseDropdown] = useState(false);

  const selectedAllocation = phaseAllocations.find(alloc => alloc.id === selectedAllocationId);

  // Calculate total planned hours for selected allocation
  const getPlannedHours = (allocation: PhaseAllocation | undefined): number => {
    if (!allocation?.weeklyAllocations) return 0;
    return allocation.weeklyAllocations.reduce((total, weekly) => {
      // Use approved hours if available, otherwise use proposed hours
      const hours = weekly.approvedHours ?? weekly.proposedHours ?? 0;
      return total + hours;
    }, 0);
  };

  const plannedHours = getPlannedHours(selectedAllocation);

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

  // Filter projects based on search
  const getFilteredProjects = (searchQuery: string) => {
    if (!searchQuery.trim()) return availableProjects;
    return availableProjects.filter(({ project }) =>
      project.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Filter phases based on search
  const getFilteredPhases = (searchQuery: string) => {
    if (!searchQuery.trim()) return availablePhases;
    return availablePhases.filter(allocation =>
      allocation.phase.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Set initial search queries for pre-filled values
  useEffect(() => {
    if (preFilledProjectId && selectedProject) {
      setProjectSearchQuery(selectedProject.project.title);
    }
    if (preFilledPhaseAllocationId && selectedAllocation) {
      setPhaseSearchQuery(`${selectedAllocation.phase.name} (${formatHours(selectedAllocation.totalHours)})`);
    }
  }, [preFilledProjectId, preFilledPhaseAllocationId, selectedProject, selectedAllocation]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current === event.target) {
        onClose();
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setShowProjectDropdown(false);
      }
      if (phaseDropdownRef.current && !phaseDropdownRef.current.contains(event.target as Node)) {
        setShowPhaseDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, isSubmitting]);

  // Scroll to error when it appears
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [error]);

  // Reset phase selection when project changes
  const handleProjectSelect = (projectId: string) => {
    const project = projectsWithAllocations[projectId];
    setSelectedProjectId(projectId);
    setProjectSearchQuery(project.project.title);
    setShowProjectDropdown(false);
    setSelectedAllocationId('');
    setPhaseSearchQuery('');
    setFieldErrors({});
    setError(null);
    setValidationWarning(null);
  };

  const handlePhaseSelect = (allocationId: string) => {
    const allocation = availablePhases.find(a => a.id === allocationId);
    if (allocation) {
      setSelectedAllocationId(allocationId);
      setPhaseSearchQuery(`${allocation.phase.name} (${formatHours(allocation.totalHours)})`);
      setShowPhaseDropdown(false);
    }
  };

  // Handle adjustment hours change with real-time validation
  const handleAdjustmentHoursChange = (value: string) => {
    setAdjustmentHours(value);

    // Only validate if there's a value and it's a valid number
    if (value !== '' && value !== '-') {
      const hoursValue = parseFloat(value);
      if (!isNaN(hoursValue)) {
        validateField('adjustmentHours');
      }
    } else {
      // Clear errors when field is empty or just has a minus sign
      const errors = { ...fieldErrors };
      delete errors.adjustmentHours;
      setFieldErrors(errors);
      setValidationWarning(null);
    }
  };

  // Validate field on blur
  const validateField = (field: string) => {
    const errors: Record<string, string> = { ...fieldErrors };
    delete errors[field];
    setValidationWarning(null);

    switch (field) {
      case 'allocation':
        if (!selectedAllocationId) {
          errors[field] = 'Please select a phase allocation';
        }
        break;
      case 'adjustmentHours':
        const hoursValue = parseFloat(adjustmentHours);
        if (adjustmentHours === '' || isNaN(hoursValue)) {
          errors[field] = 'Please enter an adjustment amount';
        } else if (hoursValue === 0) {
          errors[field] = 'Adjustment amount cannot be zero';
        } else if (hoursValue % 0.5 !== 0) {
          errors[field] = 'Hours must be in increments of 0.5';
        } else if (selectedAllocation) {
          const newTotal = selectedAllocation.totalHours + hoursValue;

          // Check planned hours constraint first (most restrictive for allocated hours with planning)
          if (newTotal < plannedHours) {
            errors[field] = `Cannot reduce below ${formatHours(plannedHours)} already planned. Maximum reduction: -${formatHours(selectedAllocation.totalHours - plannedHours)}`;
          }
          // Then check if reduction would make allocation zero or negative
          else if (newTotal <= 0) {
            const maxReduction = plannedHours > 0
              ? selectedAllocation.totalHours - plannedHours
              : selectedAllocation.totalHours - 0.5;
            errors[field] = `Cannot reduce allocation to ${formatHours(newTotal)}. Maximum reduction: -${formatHours(maxReduction)}`;
          }
          // Warning for large changes
          else if (Math.abs(hoursValue) > 20) {
            setValidationWarning(`Large hour change: ${hoursValue > 0 ? '+' : ''}${formatHours(hoursValue)}`);
          }
        }
        break;
      case 'reasonType':
        if (!selectedReasonType) {
          errors[field] = 'Please select a reason';
        }
        break;
      case 'customReason':
        if (selectedReasonType === 'OTHER') {
          if (!customReason.trim()) {
            errors[field] = 'Please provide a detailed reason';
          } else if (customReason.trim().length < 10) {
            errors[field] = 'Please provide a more detailed reason (minimum 10 characters)';
          } else if (customReason.trim().length > 500) {
            errors[field] = 'Reason is too long (maximum 500 characters)';
          }
        }
        break;
    }

    setFieldErrors(errors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationWarning(null);

    if (!selectedAllocation) {
      setError('Please select a phase allocation');
      return;
    }

    if (!selectedReasonType) {
      setError('Please select a reason for the request');
      return;
    }

    // Build the full reason text
    const selectedReasonLabel = HOUR_CHANGE_REASONS.find(r => r.value === selectedReasonType)?.label || '';
    const fullReason = selectedReasonType === 'OTHER'
      ? customReason.trim()
      : `${selectedReasonLabel}${customReason.trim() ? `: ${customReason.trim()}` : ''}`;

    if (!fullReason || fullReason.length < 10) {
      setError('Please provide a more detailed reason (minimum 10 characters)');
      return;
    }

    // Parse adjustment hours
    const hoursChange = parseFloat(adjustmentHours);
    if (isNaN(hoursChange) || adjustmentHours === '') {
      setError('Please enter a valid hour adjustment amount');
      return;
    }

    const newTotal = selectedAllocation.totalHours + hoursChange;

    // Check planned hours constraint first (most restrictive)
    if (newTotal < plannedHours) {
      setError(`Cannot reduce allocation below ${formatHours(plannedHours)} already planned. You have already distributed ${formatHours(plannedHours)} across your weekly schedule. Maximum reduction allowed: -${formatHours(selectedAllocation.totalHours - plannedHours)}`);
      return;
    }

    // Check if reduction would make allocation zero or negative
    if (newTotal <= 0) {
      const maxReduction = plannedHours > 0
        ? selectedAllocation.totalHours - plannedHours
        : selectedAllocation.totalHours - 0.5;
      setError(`Cannot reduce allocation to ${formatHours(newTotal)}. Allocation must remain positive. Maximum reduction allowed: -${formatHours(maxReduction)}`);
      return;
    }

    // Comprehensive validation using the utility function
    const validationData = {
      changeType: 'ADJUSTMENT' as const,
      originalHours: selectedAllocation.totalHours,
      requestedHours: newTotal,
      reason: fullReason
    };

    const validation = validateHourChangeRequest(validationData);

    if (!validation.isValid) {
      setError(validation.error || 'Validation failed');
      return;
    }

    if (validation.warning) {
      setValidationWarning(validation.warning);
    }

    setIsSubmitting(true);
    try {
      const requestData = {
        changeType: 'ADJUSTMENT',
        phaseId: selectedAllocation.phase.id,
        reason: fullReason,
        phaseAllocationId: selectedAllocationId,
        originalHours: selectedAllocation.totalHours,
        requestedHours: selectedAllocation.totalHours + hoursChange
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
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <FaClock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Hour Change Request</h1>
              <p className="text-blue-100">Request an adjustment to your phase allocation</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg flex items-center justify-center transition-all duration-200 disabled:opacity-50"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Form wrapper for entire modal content */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          {/* Modal Content - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-6 p-6">
              {error && (
              <div ref={errorRef} className="p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-700 rounded-r-lg">
                <div className="flex items-center gap-3">
                  <FaExclamationTriangle className="text-red-500 dark:text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              </div>
            )}

            {validationWarning && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-500 dark:border-yellow-700 rounded-r-lg">
                <div className="flex items-center gap-3">
                  <FaInfoCircle className="text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">{validationWarning}</p>
                </div>
              </div>
            )}

            {/* Project and Phase Selection */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-800/20 p-6 rounded-lg border border-purple-100 dark:border-purple-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-purple-600 text-white rounded-lg flex items-center justify-center">
                  <FaProjectDiagram className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Select Project & Phase</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Project Selection with Search */}
                <div>
                  <label htmlFor="project" className="block text-sm font-semibold text-card-foreground mb-2">
                    Project *
                  </label>
                  <div className="relative" ref={projectDropdownRef}>
                    <div className="relative">
                      <input
                        type="text"
                        value={projectSearchQuery}
                        onChange={(e) => {
                          setProjectSearchQuery(e.target.value);
                          setShowProjectDropdown(true);
                        }}
                        onFocus={() => setShowProjectDropdown(true)}
                        className={`block w-full px-3 py-2 pr-8 rounded-lg border-2 ${
                          fieldErrors.project
                            ? 'border-red-500 dark:border-red-500'
                            : 'border-gray-200 dark:border-gray-600'
                        } dark:bg-gray-900 shadow-sm focus:border-purple-500 focus:ring-purple-500 focus:ring-opacity-50 transition-all duration-200 text-foreground placeholder-gray-400`}
                        placeholder="Search for a project..."
                        disabled={isSubmitting}
                        required
                      />
                      <FaSearch className="absolute right-3 top-3 h-3 w-3 text-muted-foreground" />
                    </div>

                    {showProjectDropdown && (
                      <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {getFilteredProjects(projectSearchQuery).length === 0 ? (
                          <div className="px-3 py-2 text-muted-foreground text-sm">No projects found</div>
                        ) : (
                          getFilteredProjects(projectSearchQuery).map(({ project }) => (
                            <button
                              key={project.id}
                              type="button"
                              onClick={() => handleProjectSelect(project.id)}
                              className="w-full text-left px-3 py-2 hover:bg-purple-50 dark:hover:bg-purple-900/30 focus:bg-purple-50 dark:focus:bg-purple-900/30 focus:outline-none border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                            >
                              <div className="font-medium text-foreground text-sm">{project.title}</div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  {fieldErrors.project && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                      <FaExclamationTriangle className="w-3 h-3" />
                      {fieldErrors.project}
                    </p>
                  )}
                </div>

                {/* Phase Selection with Search */}
                <div>
                  <label htmlFor="allocation" className="block text-sm font-semibold text-card-foreground mb-2">
                    Phase Allocation *
                  </label>
                  <div className="relative" ref={phaseDropdownRef}>
                    <div className="relative">
                      <input
                        type="text"
                        value={phaseSearchQuery}
                        onChange={(e) => {
                          setPhaseSearchQuery(e.target.value);
                          setShowPhaseDropdown(true);
                        }}
                        onFocus={() => selectedProjectId && setShowPhaseDropdown(true)}
                        className={`block w-full px-3 py-2 pr-8 rounded-lg border-2 ${
                          fieldErrors.allocation
                            ? 'border-red-500 dark:border-red-500'
                            : 'border-gray-200 dark:border-gray-600'
                        } dark:bg-gray-900 shadow-sm focus:border-purple-500 focus:ring-purple-500 focus:ring-opacity-50 transition-all duration-200 text-foreground placeholder-gray-400`}
                        placeholder={selectedProjectId ? 'Search for a phase...' : 'Select project first'}
                        disabled={isSubmitting || !selectedProjectId}
                        required
                      />
                      <FaSearch className="absolute right-3 top-3 h-3 w-3 text-muted-foreground" />
                    </div>

                    {showPhaseDropdown && selectedProjectId && (
                      <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {getFilteredPhases(phaseSearchQuery).length === 0 ? (
                          <div className="px-3 py-2 text-muted-foreground text-sm">No phases found</div>
                        ) : (
                          getFilteredPhases(phaseSearchQuery).map((allocation) => (
                            <button
                              key={allocation.id}
                              type="button"
                              onClick={() => handlePhaseSelect(allocation.id)}
                              className="w-full text-left px-3 py-2 hover:bg-purple-50 dark:hover:bg-purple-900/30 focus:bg-purple-50 dark:focus:bg-purple-900/30 focus:outline-none border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                            >
                              <div className="flex justify-between items-center">
                                <div className="font-medium text-foreground text-sm">{allocation.phase.name}</div>
                                <div className="text-xs text-purple-600 dark:text-purple-400 font-semibold">
                                  {formatHours(allocation.totalHours)}
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  {fieldErrors.allocation && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                      <FaExclamationTriangle className="w-3 h-3" />
                      {fieldErrors.allocation}
                    </p>
                  )}
                </div>
              </div>

              {selectedAllocation && (
                <div className="mt-4 p-4 bg-white dark:bg-gray-900/50 border-2 border-purple-200 dark:border-purple-700 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <FaClock className="text-purple-600 dark:text-purple-400" />
                    <span className="font-semibold text-purple-800 dark:text-purple-200">Current Allocation</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400 block">Project:</span>
                      <span className="font-medium text-foreground">{selectedAllocation.phase.project.title}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400 block">Phase:</span>
                      <span className="font-medium text-foreground">{selectedAllocation.phase.name}</span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-purple-200 dark:border-purple-700">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400 block text-xs mb-1">Allocated:</span>
                        <span className="font-semibold text-purple-700 dark:text-purple-300 text-lg">{formatHours(selectedAllocation.totalHours)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400 block text-xs mb-1">Already Planned:</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400 text-lg">{formatHours(plannedHours)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400 block text-xs mb-1">Unplanned:</span>
                        <span className={`font-semibold text-lg ${
                          selectedAllocation.totalHours - plannedHours > 0
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}>
                          {formatHours(selectedAllocation.totalHours - plannedHours)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {plannedHours > 0 && (
                    <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-700">
                      <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                        <FaInfoCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>
                          Maximum reduction: <strong>{formatHours(selectedAllocation.totalHours - plannedHours)}</strong> (cannot reduce below hours already distributed)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Hour Adjustment */}
            {selectedAllocation && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-800/20 p-6 rounded-lg border border-green-100 dark:border-green-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-green-600 text-white rounded-lg flex items-center justify-center">
                    <FaPlus className="w-4 h-4" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground">Hour Adjustment</h2>
                </div>

                <div className="flex flex-col md:flex-row items-start gap-4">
                  <div className="flex-1 w-full">
                    <label htmlFor="adjustmentHours" className="block text-sm font-semibold text-card-foreground mb-2">
                      Adjustment Amount *
                    </label>
                    <input
                      type="number"
                      id="adjustmentHours"
                      value={adjustmentHours}
                      onChange={(e) => handleAdjustmentHoursChange(e.target.value)}
                      onBlur={() => validateField('adjustmentHours')}
                      step="0.5"
                      className={`block w-full px-3 py-2 rounded-lg border-2 ${
                        fieldErrors.adjustmentHours
                          ? 'border-red-500 dark:border-red-500'
                          : 'border-gray-200 dark:border-gray-600'
                      } dark:bg-gray-900 shadow-sm focus:border-green-500 focus:ring-green-500 focus:ring-opacity-50 transition-all duration-200 text-foreground`}
                      placeholder="Enter adjustment (+5 or -3)"
                      disabled={isSubmitting}
                      required
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      Use positive numbers to increase hours, negative to decrease (e.g., +5 or -3)
                    </p>
                    {fieldErrors.adjustmentHours && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                        <FaExclamationTriangle className="w-3 h-3" />
                        {fieldErrors.adjustmentHours}
                      </p>
                    )}
                  </div>

                  {adjustmentHours !== '' && !isNaN(parseFloat(adjustmentHours)) && parseFloat(adjustmentHours) !== 0 && (
                    <div className="flex-1 w-full">
                      <div className="text-sm font-semibold text-card-foreground mb-2">Preview</div>
                      <div className="space-y-2 p-3 bg-white dark:bg-gray-900/50 rounded-lg border-2 border-green-200 dark:border-green-700">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Current:</span>
                          <span className="font-medium text-foreground">{formatHours(selectedAllocation.totalHours)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Change:</span>
                          <span className={`font-semibold ${parseFloat(adjustmentHours) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {parseFloat(adjustmentHours) >= 0 ? '+' : ''}{formatHours(parseFloat(adjustmentHours))}
                          </span>
                        </div>
                        <div className="border-t border-green-200 dark:border-green-700 pt-2 flex items-center justify-between font-semibold">
                          <span className="text-foreground">New Total:</span>
                          <span className="text-green-700 dark:text-green-300 text-lg">
                            {formatHours(selectedAllocation.totalHours + parseFloat(adjustmentHours))}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reason Selection */}
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/50 dark:to-slate-800/30 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gray-600 text-white rounded-lg flex items-center justify-center">
                  <FaInfoCircle className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Reason for Request</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="reasonType" className="block text-sm font-semibold text-card-foreground mb-2">
                    Reason Type *
                  </label>
                  <select
                    id="reasonType"
                    value={selectedReasonType}
                    onChange={(e) => {
                      setSelectedReasonType(e.target.value);
                      setCustomReason('');
                    }}
                    onBlur={() => validateField('reasonType')}
                    className={`block w-full px-3 py-2 rounded-lg border-2 ${
                      fieldErrors.reasonType
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-200 dark:border-gray-600'
                    } dark:bg-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200 text-foreground`}
                    disabled={isSubmitting}
                    required
                  >
                    <option value="">Select a reason...</option>
                    {HOUR_CHANGE_REASONS.map((reason) => (
                      <option key={reason.value} value={reason.value}>
                        {reason.label}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.reasonType && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                      <FaExclamationTriangle className="w-3 h-3" />
                      {fieldErrors.reasonType}
                    </p>
                  )}
                </div>

                {selectedReasonType === 'OTHER' && (
                  <div>
                    <label htmlFor="customReason" className="block text-sm font-semibold text-card-foreground mb-2">
                      Please Specify *
                    </label>
                    <textarea
                      id="customReason"
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      onBlur={() => validateField('customReason')}
                      rows={4}
                      maxLength={500}
                      className={`block w-full px-3 py-2 rounded-lg border-2 ${
                        fieldErrors.customReason
                          ? 'border-red-500 dark:border-red-500'
                          : 'border-gray-200 dark:border-gray-600'
                      } dark:bg-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200 resize-none text-foreground`}
                      placeholder="Please provide a detailed explanation... (minimum 10 characters)"
                      disabled={isSubmitting}
                      required
                    />
                    <div className="flex justify-between items-center mt-2">
                      {fieldErrors.customReason && (
                        <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                          <FaExclamationTriangle className="w-3 h-3" />
                          {fieldErrors.customReason}
                        </p>
                      )}
                      <div className={`text-xs ml-auto ${
                        customReason.length < 10
                          ? 'text-red-600 dark:text-red-400'
                          : customReason.length > 450
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {customReason.length}/500 characters
                      </div>
                    </div>
                  </div>
                )}

                {selectedReasonType && selectedReasonType !== 'OTHER' && (
                  <div>
                    <label htmlFor="additionalDetails" className="block text-sm font-semibold text-card-foreground mb-2">
                      Additional Details (Optional)
                    </label>
                    <textarea
                      id="additionalDetails"
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      rows={3}
                      maxLength={500}
                      className="block w-full px-3 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200 resize-none text-foreground"
                      placeholder="Add any additional context or details..."
                      disabled={isSubmitting}
                    />
                    <div className="text-right text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {customReason.length}/500 characters
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>

          {/* Modal Footer - Fixed at Bottom */}
          <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 flex-shrink-0">
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 border border-transparent rounded-lg shadow-sm hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                disabled={isSubmitting}
              >
                <FaSave className="w-4 h-4" />
                {isSubmitting ? 'Creating Request...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
