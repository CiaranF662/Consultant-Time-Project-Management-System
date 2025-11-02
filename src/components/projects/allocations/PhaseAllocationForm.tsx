// src/app/components/PhaseAllocationForm.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaTimes, FaPlus, FaTrash, FaSave, FaUsers, FaClock, FaInfoCircle, FaUser, FaHourglassHalf, FaSearch, FaTimesCircle, FaExclamationTriangle } from 'react-icons/fa';
import { generateColorFromString } from '@/lib/colors';
import { sortConsultantIds, calculateAvailabilityStatus, type ConsultantAvailabilityStatus } from '@/lib/consultant-sorting';
import ConsultantScheduleView from './ConsultantScheduleView';

interface Consultant {
  id: string;
  name: string;
  email: string;
  allocatedHours: number;
  role?: 'PRODUCT_MANAGER' | 'TEAM_MEMBER';
}

interface PhaseAllocation {
  id: string;
  consultantId: string;
  hours: number;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

interface PhaseAllocationFormProps {
  projectId: string;
  phaseId: string;
  phaseName: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  existingAllocations?: {
    consultantId: string;
    consultantName: string;
    hours: number;
    plannedHours?: number; // Add this to track already planned hours
    approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'FORFEITED' | 'DELETION_PENDING';
    rejectionReason?: string | null;
  }[];
}

export default function PhaseAllocationForm({
  projectId,
  phaseId,
  phaseName,
  isOpen,
  onClose,
  onSaved,
  existingAllocations = []
}: PhaseAllocationFormProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [allocations, setAllocations] = useState<PhaseAllocation[]>([]);
  const [allocatedToPhases, setAllocatedToPhases] = useState<Record<string, number>>({});
  const [selectedConsultantIds, setSelectedConsultantIds] = useState<string[]>([]);
  const [consultantHours, setConsultantHours] = useState<Record<string, number>>({});
  const [consultantSearchQuery, setConsultantSearchQuery] = useState('');
  const [showConsultantDropdown, setShowConsultantDropdown] = useState(false);
  const consultantDropdownRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<Record<string, string>>({});
  const [consultantAvailability, setConsultantAvailability] = useState<Record<string, number>>({});
  const [consultantAvailabilityStatus, setConsultantAvailabilityStatus] = useState<Record<string, ConsultantAvailabilityStatus>>({});
  const [consultantPlannedHours, setConsultantPlannedHours] = useState<Record<string, number>>({});
  const [deletionConfirmModal, setDeletionConfirmModal] = useState<{
    isOpen: boolean;
    consultantId: string | null;
    consultantName: string;
    plannedHours: number;
  }>({
    isOpen: false,
    consultantId: null,
    consultantName: '',
    plannedHours: 0
  });

  useEffect(() => {
    if (isOpen) {
      fetchProjectConsultants();
      initializeAllocations();
      fetchConsultantAvailability();
      setError(null);
    }
  }, [isOpen, existingAllocations]);

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
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const fetchProjectConsultants = async () => {
    try {
      setIsLoading(true);
      // Fetch project team members with allocated hours
      const { data: teamData } = await axios.get(`/api/projects/${projectId}/consultants`);
      const teamMembers = teamData.map((member: any) => ({
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        allocatedHours: member.allocatedHours || 0,
        role: member.role
      }));
      setConsultants(teamMembers);

      // Calculate allocated hours from existing phases (excluding current phase)
      const { data: projectData } = await axios.get(`/api/projects/${projectId}`);
      const allocatedToPhasesMap: Record<string, number> = {};

      if (projectData.phases) {
        projectData.phases.forEach((phase: any) => {
          // Skip current phase to avoid counting its allocations
          if (phase.id !== phaseId && phase.allocations) {
            phase.allocations.forEach((allocation: any) => {
              // Exclude FORFEITED and EXPIRED allocations from the calculation
              // These hours should be available for reallocation
              if (allocation.approvalStatus === 'FORFEITED' || allocation.approvalStatus === 'EXPIRED') {
                return;
              }

              if (!allocatedToPhasesMap[allocation.consultantId]) {
                allocatedToPhasesMap[allocation.consultantId] = 0;
              }
              allocatedToPhasesMap[allocation.consultantId] += allocation.totalHours || 0;
            });
          }
        });
      }

      setAllocatedToPhases(allocatedToPhasesMap);
    } catch (error) {
      setError('Failed to load project team data.');
    } finally {
      setIsLoading(false);
    }
  };

  const initializeAllocations = () => {
    if (existingAllocations.length > 0) {
      // Load existing allocations into the new format
      const consultantIds = existingAllocations.map(ea => ea.consultantId);
      const hours: Record<string, number> = {};
      const planned: Record<string, number> = {};

      existingAllocations.forEach(ea => {
        hours[ea.consultantId] = ea.hours;
        planned[ea.consultantId] = ea.plannedHours || 0;
      });

      setSelectedConsultantIds(consultantIds);
      setConsultantHours(hours);
      setConsultantPlannedHours(planned);
    }
  };

  const fetchConsultantAvailability = async () => {
    try {
      // Fetch consultant workload availability for this phase
      const response = await axios.get(`/api/phases/${phaseId}/consultant-availability`);

      // Build maps for consultant ID -> total available hours and availability status
      const availabilityMap: Record<string, number> = {};
      const statusMap: Record<string, ConsultantAvailabilityStatus> = {};

      response.data.consultants.forEach((consultant: any) => {
        const totalAvailable = consultant.weeklyBreakdown.reduce(
          (sum: number, week: any) => sum + week.availableHours,
          0
        );
        const consultantId = consultant.consultant.id;

        availabilityMap[consultantId] = totalAvailable;
        statusMap[consultantId] = consultant.overallStatus;
      });

      setConsultantAvailability(availabilityMap);
      setConsultantAvailabilityStatus(statusMap);
    } catch (error) {
      // Don't show error to user, just log it - availability is informational
    }
  };

  const handleConsultantToggle = (consultantId: string) => {
    if (selectedConsultantIds.includes(consultantId)) {
      setSelectedConsultantIds(prev => prev.filter(id => id !== consultantId));
      setConsultantHours(prev => {
        const newHours = { ...prev };
        delete newHours[consultantId];
        return newHours;
      });
    } else {
      setSelectedConsultantIds(prev => [...prev, consultantId]);
      setConsultantHours(prev => ({ ...prev, [consultantId]: 0 }));
    }
  };

  const removeConsultant = (consultantId: string) => {
    const plannedHours = consultantPlannedHours[consultantId] || 0;
    const consultant = consultants.find(c => c.id === consultantId);
    const consultantName = consultant?.name || consultant?.email || 'Consultant';

    // If there are planned hours, show confirmation modal
    if (plannedHours > 0) {
      setDeletionConfirmModal({
        isOpen: true,
        consultantId,
        consultantName,
        plannedHours
      });
    } else {
      // No planned hours, remove immediately
      confirmRemoveConsultant(consultantId);
    }
  };

  const confirmRemoveConsultant = (consultantId: string) => {
    setSelectedConsultantIds(prev => prev.filter(id => id !== consultantId));
    setConsultantHours(prev => {
      const newHours = { ...prev };
      delete newHours[consultantId];
      return newHours;
    });
    setDeletionConfirmModal({
      isOpen: false,
      consultantId: null,
      consultantName: '',
      plannedHours: 0
    });
  };

  const updateConsultantHours = (consultantId: string, hours: number) => {
    setConsultantHours(prev => ({ ...prev, [consultantId]: hours }));

    // Check for warnings based on available capacity during phase
    const newWarnings = { ...warnings };
    const availableCapacity = consultantAvailability[consultantId];
    const consultant = consultants.find(c => c.id === consultantId);

    if (availableCapacity !== undefined && hours > availableCapacity && consultant) {
      const overBy = Math.round((hours - availableCapacity) * 10) / 10;
      newWarnings[consultantId] = `⚠️ Allocation (${hours}h) exceeds available capacity (${availableCapacity}h) by ${overBy}h during this phase. This may result in unplanned hours.`;
    } else {
      delete newWarnings[consultantId];
    }

    setWarnings(newWarnings);
  };

  const getFilteredConsultants = () => {
    return consultants.filter(consultant =>
      consultant.name.toLowerCase().includes(consultantSearchQuery.toLowerCase()) ||
      consultant.email.toLowerCase().includes(consultantSearchQuery.toLowerCase())
    );
  };

  const getTotalHours = () => {
    return Object.values(consultantHours).reduce((sum, hours) => sum + (hours || 0), 0);
  };

  // Get sorted consultant IDs for consistent ordering
  const getSortedConsultantIds = () => {
    const consultantDataMap: Record<string, { name: string; availabilityStatus?: ConsultantAvailabilityStatus }> = {};

    selectedConsultantIds.forEach(id => {
      const consultant = consultants.find(c => c.id === id);
      if (consultant) {
        consultantDataMap[id] = {
          name: consultant.name,
          availabilityStatus: consultantAvailabilityStatus[id]
        };
      }
    });

    return sortConsultantIds(selectedConsultantIds, consultantDataMap);
  };

  // Click outside handler for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (consultantDropdownRef.current && !consultantDropdownRef.current.contains(event.target as Node)) {
        setShowConsultantDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Scroll to error when error is set
  useEffect(() => {
    if (error && errorRef.current && modalContentRef.current) {
      modalContentRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [error]);

  const validateAllocations = () => {
    setError(null);

    // Check if at least one consultant is selected
    if (selectedConsultantIds.length === 0) {
      setError('Please select at least one consultant.');
      return false;
    }

    // Check for negative hours
    const hasNegativeHours = Object.values(consultantHours).some(hours => hours < 0);
    if (hasNegativeHours) {
      setError('Hours cannot be negative.');
      return false;
    }

    // Check for hours below planned hours
    for (const consultantId of selectedConsultantIds) {
      const currentHours = consultantHours[consultantId] || 0;
      const plannedHours = consultantPlannedHours[consultantId] || 0;

      if (currentHours < plannedHours) {
        const consultant = consultants.find(c => c.id === consultantId);
        const name = consultant?.name || consultant?.email || 'Consultant';
        setError(`${name}: Cannot reduce phase allocation below ${plannedHours}h (already planned in weekly allocations). Please adjust or remove weekly plans first.`);
        return false;
      }
    }

    // Check for over-allocation
    for (const consultantId of selectedConsultantIds) {
      const consultant = consultants.find(c => c.id === consultantId);
      if (consultant) {
        const projectAllocated = consultant.allocatedHours || 0;
        const currentAllocatedToPhases = allocatedToPhases[consultantId] || 0;
        const availableHours = projectAllocated - currentAllocatedToPhases;
        const phaseHours = consultantHours[consultantId] || 0;

        if (phaseHours > availableHours) {
          setError(`${consultant.name} is over-allocated by ${phaseHours - availableHours} hours.`);
          return false;
        }
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateAllocations()) return;

    setIsSaving(true);
    try {
      // Use PUT for bulk allocation updates
      await axios.put(`/api/phases/${phaseId}/allocations`, {
        allocations: selectedConsultantIds.map(consultantId => ({
          consultantId: consultantId,
          totalHours: consultantHours[consultantId] || 0
        }))
      });
      onSaved();
      onClose();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to save allocations. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-700 dark:to-purple-700 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white dark:bg-gray-900 bg-opacity-20 dark:bg-opacity-30 rounded-lg flex items-center justify-center">
              <FaClock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Phase Hour Allocation</h1>
              <p className="text-indigo-100 dark:text-indigo-200">Manage consultant hours for: <strong>{phaseName}</strong></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white dark:bg-gray-900 bg-opacity-20 dark:bg-opacity-30 hover:bg-opacity-30 dark:hover:bg-opacity-40 rounded-lg flex items-center justify-center transition-all duration-200"
            disabled={isSaving}
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div ref={modalContentRef} className="flex-1 overflow-y-auto">
          <div className="space-y-6 p-6">

            {/* Error Message */}
            {error && (
              <div ref={errorRef} className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                  <FaTimesCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </div>
            )}

            {/* Hour Allocation Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 p-6 rounded-lg border border-blue-100 dark:border-blue-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-600 dark:bg-blue-700 text-white rounded-lg flex items-center justify-center">
                  <FaUsers className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Consultant Hour Allocations</h2>
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                Assign specific hour allocations to consultants for this phase.
              </p>

              {/* Pending Approvals Notice */}
              {existingAllocations.some(ea => ea.approvalStatus === 'PENDING') && (
                <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-lg">
                  <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                    <FaHourglassHalf className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Some allocations are pending Growth Team approval
                    </span>
                  </div>
                </div>
              )}

              {/* Rejected Allocations Notice */}
              {existingAllocations.some(ea => ea.approvalStatus === 'REJECTED') && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-300 mb-2">
                    <FaTimesCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Some allocations were rejected by Growth Team
                    </span>
                  </div>
                  <div className="ml-6 space-y-1">
                    {existingAllocations
                      .filter(ea => ea.approvalStatus === 'REJECTED' && ea.rejectionReason)
                      .map((ea, index) => (
                        <div key={index} className="text-xs text-red-600 dark:text-red-400">
                          <span className="font-semibold">{ea.consultantName}:</span> {ea.rejectionReason}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Selected Team Members with Professional Hour Allocation */}
              {selectedConsultantIds.length > 0 && (
                <div className="mb-4">
                  <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/30 dark:to-yellow-900/30 rounded-lg border border-orange-100 dark:border-orange-800 p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-6 h-6 bg-orange-600 dark:bg-orange-700 text-white rounded-lg flex items-center justify-center">
                        <FaClock className="w-3 h-3" />
                      </div>
                      <div className="text-sm font-semibold text-foreground">Phase Hour Allocation</div>
                    </div>

                    <div className="space-y-3">
                      {getSortedConsultantIds().map((consultantId) => {
                        const consultant = consultants.find(c => c.id === consultantId);
                        const projectAllocated = consultant?.allocatedHours || 0;
                        const currentAllocatedToPhases = allocatedToPhases[consultantId] || 0;
                        const availableHours = projectAllocated - currentAllocatedToPhases;
                        const phaseHours = consultantHours[consultantId] || 0;
                        const isOverAllocated = phaseHours > availableHours;

                        // Check if this consultant has a pending or rejected allocation from existing data
                        const existingAllocation = existingAllocations.find(ea => ea.consultantId === consultantId);
                        const isPending = existingAllocation?.approvalStatus === 'PENDING';
                        const isRejected = existingAllocation?.approvalStatus === 'REJECTED';

                        return (
                          <div key={consultantId} className={`relative p-4 rounded-lg border shadow-sm transition-all duration-200 ${
                            isRejected
                              ? 'bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/30 border-red-200 dark:border-red-700'
                              : isPending
                              ? 'bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/30 dark:to-yellow-900/30 border-orange-200 dark:border-orange-700'
                              : consultant?.role === 'PRODUCT_MANAGER'
                              ? 'bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 border-purple-200 dark:border-purple-700'
                              : 'bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 border-blue-200 dark:border-blue-700'
                          } ${isOverAllocated ? 'ring-2 ring-red-200 dark:ring-red-700' : ''}`}>

                            {/* Pending approval diagonal stripes */}
                            {isPending && (
                              <div className="absolute inset-0 pointer-events-none opacity-20 rounded-lg"
                                   style={{
                                     backgroundImage: `repeating-linear-gradient(
                                       45deg,
                                       transparent,
                                       transparent 8px,
                                       rgba(249, 115, 22, 0.3) 8px,
                                       rgba(249, 115, 22, 0.3) 16px
                                     )`
                                   }}>
                              </div>
                            )}

                            {/* Rejected diagonal stripes */}
                            {isRejected && (
                              <div className="absolute inset-0 pointer-events-none opacity-20 rounded-lg"
                                   style={{
                                     backgroundImage: `repeating-linear-gradient(
                                       45deg,
                                       transparent,
                                       transparent 8px,
                                       rgba(239, 68, 68, 0.3) 8px,
                                       rgba(239, 68, 68, 0.3) 16px
                                     )`
                                   }}>
                              </div>
                            )}

                            <div className="flex items-center justify-between relative z-10">
                              <div className="flex items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium mr-4 ${
                                  consultant?.role === 'PRODUCT_MANAGER' ? 'bg-purple-600 dark:bg-purple-700' : 'bg-blue-600 dark:bg-blue-700'
                                }`}>
                                  <FaUser className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-semibold text-foreground">{consultant?.name}</p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                      consultant?.role === 'PRODUCT_MANAGER'
                                        ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200'
                                        : 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
                                    }`}>
                                      {consultant?.role === 'PRODUCT_MANAGER' ? 'Product Manager' : 'Team Member'}
                                    </span>
                                    {isPending && (
                                      <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-200 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200 rounded-full text-xs font-medium">
                                        <FaHourglassHalf className="w-2 h-2" />
                                        Pending
                                      </span>
                                    )}
                                    {isRejected && (
                                      <span className="flex items-center gap-1 px-2 py-0.5 bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-200 rounded-full text-xs font-medium">
                                        <FaTimesCircle className="w-2 h-2" />
                                        Rejected
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-2">{consultant?.email}</p>

                                  {/* Project allocation summary */}
                                  <div className="flex items-center gap-4 flex-wrap">
                                    <div className="text-xs">
                                      <span className="text-muted-foreground">Project:</span>
                                      <span className="font-semibold text-blue-600 dark:text-blue-400 ml-1">{projectAllocated}h</span>
                                    </div>
                                    <div className="text-xs">
                                      <span className="text-muted-foreground">Allocated:</span>
                                      <span className="font-semibold text-card-foreground ml-1">{currentAllocatedToPhases}h</span>
                                    </div>
                                    <div className="text-xs">
                                      <span className="text-muted-foreground">Available:</span>
                                      <span className={`font-semibold ml-1 ${availableHours > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {availableHours}h
                                      </span>
                                    </div>
                                    {consultantPlannedHours[consultantId] > 0 && (
                                      <div className="flex items-center gap-1 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 rounded-full text-xs font-medium">
                                        <FaClock className="w-2.5 h-2.5" />
                                        <span>{consultantPlannedHours[consultantId]}h planned</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <div className="flex items-center gap-2">
                                    {(() => {
                                      const currentHours = consultantHours[consultantId] || 0;
                                      const plannedHours = consultantPlannedHours[consultantId] || 0;
                                      const isBelowPlanned = currentHours < plannedHours;

                                      return (
                                        <>
                                          <input
                                            type="number"
                                            min={plannedHours}
                                            step="0.5"
                                            max={availableHours}
                                            value={currentHours || ''}
                                            onChange={(e) => updateConsultantHours(consultantId, parseFloat(e.target.value) || 0)}
                                            className={`w-20 px-3 py-2 text-sm border-2 rounded-lg focus:ring-2 focus:ring-opacity-50 text-center transition-all duration-200 bg-white dark:bg-gray-900 text-foreground ${
                                              isBelowPlanned
                                                ? 'border-amber-300 dark:border-amber-700 focus:border-amber-500 focus:ring-amber-500 bg-amber-50 dark:bg-amber-900/30'
                                                : isOverAllocated
                                                ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500 bg-red-50 dark:bg-red-900/30'
                                                : consultant?.role === 'PRODUCT_MANAGER'
                                                ? 'border-purple-200 dark:border-purple-700 focus:border-purple-500 focus:ring-purple-500'
                                                : 'border-blue-200 dark:border-blue-700 focus:border-blue-500 focus:ring-blue-500'
                                            }`}
                                            placeholder={plannedHours > 0 ? String(plannedHours) : "0"}
                                            disabled={isSaving}
                                          />
                                          <span className={`text-sm font-medium ${
                                            consultant?.role === 'PRODUCT_MANAGER' ? 'text-purple-700 dark:text-purple-300' : 'text-blue-700 dark:text-blue-300'
                                          }`}>hours</span>
                                        </>
                                      );
                                    })()}
                                  </div>

                                  {(() => {
                                    const currentHours = consultantHours[consultantId] || 0;
                                    const plannedHours = consultantPlannedHours[consultantId] || 0;
                                    const isBelowPlanned = currentHours < plannedHours;

                                    if (isBelowPlanned) {
                                      return (
                                        <div className="absolute top-full left-0 mt-1 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 whitespace-nowrap">
                                          <FaExclamationTriangle className="w-3 h-3" />
                                          Cannot reduce below {plannedHours}h
                                        </div>
                                      );
                                    }

                                    if (isOverAllocated) {
                                      return (
                                        <div className="absolute top-full left-0 mt-1 text-xs text-red-600 dark:text-red-400 whitespace-nowrap">
                                          ⚠️ Over by {phaseHours - availableHours}h
                                        </div>
                                      );
                                    }

                                    return null;
                                  })()}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => removeConsultant(consultantId)}
                                  className="p-2 text-muted-foreground hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all duration-200"
                                  title="Remove from phase"
                                  disabled={isSaving}
                                >
                                  <FaTimes className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Capacity warning - now displayed below the card */}
                            {warnings[consultantId] && (
                              <div className="mt-3 p-2.5 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-lg">
                                <div className="flex items-start gap-2">
                                  <div className="text-orange-500 dark:text-orange-400 mt-0.5">
                                    <FaInfoCircle className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="text-xs text-orange-700 dark:text-orange-300 leading-relaxed">
                                    {warnings[consultantId]}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="relative" ref={consultantDropdownRef}>
                <div className="relative">
                  <input
                    type="text"
                    value={consultantSearchQuery}
                    onChange={(e) => {
                      setConsultantSearchQuery(e.target.value);
                      setShowConsultantDropdown(true);
                    }}
                    onFocus={() => setShowConsultantDropdown(true)}
                    className="block w-full px-3 py-2 pr-8 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-foreground shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200"
                    placeholder="Search and select consultants..."
                    disabled={isSaving}
                  />
                  <FaSearch className="absolute right-3 top-3 h-3 w-3 text-muted-foreground" />
                </div>

                {showConsultantDropdown && (
                  <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {getFilteredConsultants().filter(c => !selectedConsultantIds.includes(c.id)).length === 0 ? (
                      <div className="px-3 py-2 text-muted-foreground text-sm">No available consultants found</div>
                    ) : (
                      getFilteredConsultants().filter(c => !selectedConsultantIds.includes(c.id)).map((consultant) => {
                        const projectAllocated = consultant.allocatedHours || 0;
                        const currentAllocatedToPhases = allocatedToPhases[consultant.id] || 0;
                        const availableHours = projectAllocated - currentAllocatedToPhases;
                        const phaseAvailableCapacity = consultantAvailability[consultant.id] || 0;

                        return (
                          <button
                            key={consultant.id}
                            type="button"
                            onClick={() => {
                              handleConsultantToggle(consultant.id);
                              setConsultantSearchQuery('');
                              setShowConsultantDropdown(false);
                            }}
                            className="w-full text-left px-3 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/30 focus:bg-blue-50 dark:focus:bg-blue-900/30 focus:outline-none border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                            disabled={isSaving}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="font-medium text-foreground text-sm truncate">{consultant.name}</div>
                                  {consultant.role === 'PRODUCT_MANAGER' && (
                                    <span className="bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                                      PM
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 truncate">{consultant.email}</div>
                              </div>
                              <div className="flex gap-3 flex-shrink-0">
                                {/* Project Availability */}
                                <div className="text-right">
                                  <div className="text-xs text-muted-foreground whitespace-nowrap">Project</div>
                                  <div className={`text-sm font-semibold ${availableHours > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {availableHours}h
                                  </div>
                                </div>
                                {/* Phase Availability */}
                                <div className="text-right border-l border-gray-200 dark:border-gray-700 pl-3">
                                  <div className="text-xs text-muted-foreground whitespace-nowrap">Phase Availability</div>
                                  <div className={`text-sm font-semibold ${phaseAvailableCapacity > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                    {phaseAvailableCapacity}h
                                  </div>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Consultant Workload Schedule */}
            {selectedConsultantIds.length > 0 && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 p-6 rounded-lg border border-indigo-100 dark:border-indigo-800">
                <ConsultantScheduleView
                  phaseId={phaseId}
                  selectedConsultantIds={getSortedConsultantIds()}
                />
              </div>
            )}

            {/* Summary Section */}
            {selectedConsultantIds.length > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 p-6 rounded-lg border border-green-100 dark:border-green-800">
                <div className="flex items-center gap-2 text-sm text-green-800 dark:text-green-300 font-semibold mb-4">
                  <FaInfoCircle className="w-4 h-4" />
                  Allocation Summary
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-700">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{getTotalHours()}</div>
                    <div className="text-sm text-green-700 dark:text-green-300">Total Hours</div>
                  </div>
                  <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-700">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{selectedConsultantIds.length}</div>
                    <div className="text-sm text-green-700 dark:text-green-300">Consultants</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-card-foreground bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200"
                            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || selectedConsultantIds.length === 0}
            className="py-2 px-6 border-2 border-transparent rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl inline-flex items-center gap-2"
          >
            <FaSave className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Allocations'}
          </button>
        </div>
      </div>

      {/* Deletion Confirmation Modal */}
      {deletionConfirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
                <FaExclamationTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  Confirm Deletion
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This action will delete planned hours
                </p>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-900 dark:text-gray-100 mb-3">
                You are about to remove <span className="font-semibold text-amber-900 dark:text-amber-100">{deletionConfirmModal.consultantName}</span> from this phase.
              </p>
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <FaClock className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {deletionConfirmModal.plannedHours}h of weekly planning will be deleted
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              This allocation and all associated weekly plans will be sent for Growth Team approval before final deletion.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletionConfirmModal({ isOpen: false, consultantId: null, consultantName: '', plannedHours: 0 })}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deletionConfirmModal.consultantId) {
                    confirmRemoveConsultant(deletionConfirmModal.consultantId);
                  }
                }}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 dark:bg-red-700 border border-transparent rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors flex items-center gap-2"
              >
                <FaTimes className="w-4 h-4" />
                Remove Consultant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}