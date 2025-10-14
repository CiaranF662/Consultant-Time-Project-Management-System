// src/app/components/PhaseAllocationForm.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaTimes, FaPlus, FaTrash, FaSave, FaUsers, FaClock, FaInfoCircle, FaUser, FaHourglassHalf, FaSearch, FaTimesCircle } from 'react-icons/fa';
import { generateColorFromString } from '@/lib/colors';
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
    approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
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

  useEffect(() => {
    if (isOpen) {
      fetchProjectConsultants();
      initializeAllocations();
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
      console.error('Failed to fetch project consultants:', error);
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

      existingAllocations.forEach(ea => {
        hours[ea.consultantId] = ea.hours;
      });

      setSelectedConsultantIds(consultantIds);
      setConsultantHours(hours);
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
    setSelectedConsultantIds(prev => prev.filter(id => id !== consultantId));
    setConsultantHours(prev => {
      const newHours = { ...prev };
      delete newHours[consultantId];
      return newHours;
    });
  };

  const updateConsultantHours = (consultantId: string, hours: number) => {
    setConsultantHours(prev => ({ ...prev, [consultantId]: hours }));
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
      console.error('Failed to save phase allocations:', error);
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
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 p-6">
            
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
                      {selectedConsultantIds.map((consultantId) => {
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
                                  <div className="flex items-center gap-4">
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
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <div className="flex items-center gap-2 mb-1">
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.5"
                                      max={availableHours}
                                      value={consultantHours[consultantId] ? consultantHours[consultantId] : ''}
                                      onChange={(e) => updateConsultantHours(consultantId, parseFloat(e.target.value) || 0)}
                                      className={`w-20 px-3 py-2 text-sm border-2 rounded-lg focus:ring-2 focus:ring-opacity-50 text-center transition-all duration-200 bg-white dark:bg-gray-900 text-foreground ${
                                        isOverAllocated
                                          ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500 bg-red-50 dark:bg-red-900/30'
                                          : consultant?.role === 'PRODUCT_MANAGER'
                                          ? 'border-purple-200 dark:border-purple-700 focus:border-purple-500 focus:ring-purple-500'
                                          : 'border-blue-200 dark:border-blue-700 focus:border-blue-500 focus:ring-blue-500'
                                      }`}
                                      placeholder="0"
                                      disabled={isSaving}
                                    />
                                    <span className={`text-sm font-medium ${
                                      consultant?.role === 'PRODUCT_MANAGER' ? 'text-purple-700 dark:text-purple-300' : 'text-blue-700 dark:text-blue-300'
                                    }`}>hours</span>
                                  </div>

                                  {isOverAllocated && (
                                    <div className="text-xs text-red-600 dark:text-red-400">
                                      ⚠️ Over by {phaseHours - availableHours}h
                                    </div>
                                  )}
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
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="font-medium text-foreground text-sm">{consultant.name}</div>
                                  {consultant.role === 'PRODUCT_MANAGER' && (
                                    <span className="bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 text-xs px-2 py-0.5 rounded-full font-medium">
                                      PM
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">{consultant.email}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-muted-foreground">Available</div>
                                <div className={`text-sm font-semibold ${availableHours > 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                                  {availableHours}h
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
                  selectedConsultantIds={selectedConsultantIds}
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

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>
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
    </div>
  );
}