'use client';

import { useState, useEffect, useRef } from 'react';
import type { Sprint } from '@prisma/client';
import axios from 'axios';
import { FaTimes, FaSave, FaProjectDiagram, FaCalendarAlt, FaInfoCircle, FaCheckCircle, FaExclamationTriangle, FaUsers, FaClock, FaUser, FaSearch, FaCalculator } from 'react-icons/fa';
import ConsultantScheduleView from '../allocations/ConsultantScheduleView';

interface Consultant {
  id: string;
  name: string;
  email: string;
  allocatedHours: number;
  role?: 'PRODUCT_MANAGER' | 'TEAM_MEMBER';
}

interface PhaseCreationModalProps {
  project: {
    id: string;
    title: string;
    sprints: Sprint[];
  };
  onClose: () => void;
  onPhaseCreated: () => void;
}

export default function PhaseCreationModal({ project, onClose, onPhaseCreated }: PhaseCreationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const consultantDropdownRef = useRef<HTMLDivElement>(null);

  // Phase details
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSprintIds, setSelectedSprintIds] = useState<string[]>([]);

  // Consultant allocation
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [allocatedToPhases, setAllocatedToPhases] = useState<Record<string, number>>({});
  const [selectedConsultantIds, setSelectedConsultantIds] = useState<string[]>([]);
  const [consultantHours, setConsultantHours] = useState<Record<string, number>>({});
  const [consultantSearchQuery, setConsultantSearchQuery] = useState('');
  const [showConsultantDropdown, setShowConsultantDropdown] = useState(false);

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjectConsultants();
  }, []);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current === event.target) {
        onClose();
      }
      if (consultantDropdownRef.current && !consultantDropdownRef.current.contains(event.target as Node)) {
        setShowConsultantDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  
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

  const fetchProjectConsultants = async () => {
    try {
      // Fetch project team members with allocated hours
      const { data: teamData } = await axios.get(`/api/projects/${project.id}/consultants`);
      const teamMembers = teamData.map((member: any) => ({
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        allocatedHours: member.allocatedHours || 0,
        role: member.role
      }));
      setConsultants(teamMembers);

      // Calculate allocated hours from existing phases
      const { data: projectData } = await axios.get(`/api/projects/${project.id}`);
      const allocatedToPhasesMap: Record<string, number> = {};

      if (projectData.phases) {
        projectData.phases.forEach((phase: any) => {
          if (phase.allocations) {
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
    }
  };

  // Check if Sprint is available for selection
  const isSprintAvailableForSelection = (sprint: Sprint): boolean => {
    const today = new Date();
    const sprintEndDate = new Date(sprint.endDate);

    // Sprint 0 cannot be selected for new phases (reserved for Project Kickoff)
    if (sprint.sprintNumber === 0) {
      return false;
    }

    // Past sprints (end date has passed) cannot be selected
    if (sprintEndDate < today) {
      return false;
    }

    return true;
  };

  // Validate that selected sprints are consecutive
  const validateConsecutiveSprints = (sprintIds: string[]): boolean => {
    if (sprintIds.length <= 1) return true;

    const selectedSprints = project.sprints
      .filter(sprint => sprintIds.includes(sprint.id))
      .sort((a, b) => a.sprintNumber - b.sprintNumber);

    for (let i = 1; i < selectedSprints.length; i++) {
      if (selectedSprints[i].sprintNumber !== selectedSprints[i - 1].sprintNumber + 1) {
        return false;
      }
    }

    return true;
  };

  // Auto-select consecutive sprints
  const autoSelectConsecutiveSprints = (newSprintId: string, checked: boolean) => {
    if (!checked) {
      // If unchecking, just remove the sprint
      setSelectedSprintIds(prev => prev.filter(id => id !== newSprintId));
      return;
    }

    const availableSprints = project.sprints
      .filter(sprint => isSprintAvailableForSelection(sprint))
      .sort((a, b) => a.sprintNumber - b.sprintNumber);

    const newSprint = availableSprints.find(s => s.id === newSprintId);
    if (!newSprint) return;

    let newSelection = [...selectedSprintIds];

    // Add the new sprint
    if (!newSelection.includes(newSprintId)) {
      newSelection.push(newSprintId);
    }

    // Find the range that should be selected
    const selectedSprints = availableSprints
      .filter(sprint => newSelection.includes(sprint.id))
      .sort((a, b) => a.sprintNumber - b.sprintNumber);

    if (selectedSprints.length > 1) {
      const minSprintNumber = selectedSprints[0].sprintNumber;
      const maxSprintNumber = selectedSprints[selectedSprints.length - 1].sprintNumber;

      // Auto-select all sprints in the range to make it consecutive
      const sprintsToSelect = availableSprints.filter(
        sprint => sprint.sprintNumber >= minSprintNumber && sprint.sprintNumber <= maxSprintNumber
      );

      newSelection = sprintsToSelect.map(s => s.id);
    }

    setSelectedSprintIds(newSelection);
  };

  const handleSprintSelection = (sprintId: string, checked: boolean) => {
    autoSelectConsecutiveSprints(sprintId, checked);
    setError(null);
  };

  // Consultant allocation functions
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

  // Calculate maximum realistic hours per consultant based on phase duration
  const getPhaseHourLimits = () => {
    if (selectedSprintIds.length === 0) {
      return {
        totalWeeks: 0,
        maxHoursPerConsultant: 0,
        totalPhaseHours: 0
      };
    }

    const selectedSprints = project.sprints
      .filter(sprint => selectedSprintIds.includes(sprint.id))
      .sort((a, b) => a.sprintNumber - b.sprintNumber);

    // Calculate total weeks (each sprint is 2 weeks)
    const totalWeeks = selectedSprints.length * 2;

    // Maximum realistic hours per consultant (40 hours/week)
    const maxHoursPerConsultant = totalWeeks * 40;

    // Total phase capacity if all consultants worked full time
    const totalPhaseHours = consultants.length * maxHoursPerConsultant;

    return {
      totalWeeks,
      maxHoursPerConsultant,
      totalPhaseHours,
      sprintCount: selectedSprints.length
    };
  };

  const phaseLimits = getPhaseHourLimits();

  const getSelectedSprintsSummary = () => {
    if (selectedSprintIds.length === 0) return null;

    const selectedSprints = project.sprints
      .filter(sprint => selectedSprintIds.includes(sprint.id))
      .sort((a, b) => a.sprintNumber - b.sprintNumber);

    const startDate = new Date(selectedSprints[0].startDate);
    const endDate = new Date(selectedSprints[selectedSprints.length - 1].endDate);

    const sprintNumbers = selectedSprints.map(s => s.sprintNumber);
    const isConsecutive = validateConsecutiveSprints(selectedSprintIds);

    return {
      count: selectedSprints.length,
      startDate,
      endDate,
      sprintNumbers,
      isConsecutive
    };
  };

  const validateAllocations = () => {
    // Check for over-allocation only if consultants are selected
    if (selectedConsultantIds.length > 0) {
      for (const consultantId of selectedConsultantIds) {
        const consultant = consultants.find(c => c.id === consultantId);
        if (consultant) {
          const projectAllocated = consultant.allocatedHours || 0;
          const currentAllocatedToPhases = allocatedToPhases[consultantId] || 0;
          const availableHours = projectAllocated - currentAllocatedToPhases;
          const phaseHours = consultantHours[consultantId] || 0;

          // Check project allocation limits
          if (phaseHours > availableHours) {
            setError(`${consultant.name} is over-allocated by ${phaseHours - availableHours} hours from their project allocation.`);
            return false;
          }

          // Check phase capacity limits
          if (phaseHours > phaseLimits.maxHoursPerConsultant) {
            setError(`${consultant.name} exceeds the maximum phase capacity of ${phaseLimits.maxHoursPerConsultant} hours. This phase is only ${phaseLimits.totalWeeks} weeks long.`);
            return false;
          }
        }
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (isLoading) return;

    setError(null);

    if (!name.trim()) {
      setError('Phase name is required');
      return;
    }

    if (selectedSprintIds.length === 0) {
      setError('Please select at least one sprint');
      return;
    }

    if (!validateConsecutiveSprints(selectedSprintIds)) {
      setError('Selected sprints must be consecutive');
      return;
    }

    if (!validateAllocations()) {
      return;
    }

    setIsLoading(true);

    try {
      // Calculate start and end dates from selected sprints
      const selectedSprints = project.sprints
        .filter(sprint => selectedSprintIds.includes(sprint.id))
        .sort((a, b) => a.sprintNumber - b.sprintNumber);

      const startDate = selectedSprints[0].startDate;
      const endDate = selectedSprints[selectedSprints.length - 1].endDate;

      // Create the phase first
      const phaseResponse = await axios.post(`/api/projects/${project.id}/phases`, {
        name: name.trim(),
        description: description.trim(),
        startDate: startDate,
        endDate: endDate,
        sprintIds: selectedSprintIds
      });

      // If consultants are allocated, create allocations (these will be pending approval)
      if (selectedConsultantIds.length > 0) {
        await axios.put(`/api/phases/${phaseResponse.data.id}/allocations`, {
          allocations: selectedConsultantIds.map(consultantId => ({
            consultantId: consultantId,
            totalHours: consultantHours[consultantId] || 0
          }))
        });
      }

      onPhaseCreated();
    } catch (error: any) {
      console.error('Error creating phase:', error);
      setError(error.response?.data?.error || 'Failed to create phase');
    } finally {
      setIsLoading(false);
    }
  };

  const summary = getSelectedSprintsSummary();
  const availableSprints = project.sprints
    .filter(sprint => sprint.sprintNumber > 0) // Hide Sprint 0
    .sort((a, b) => a.sprintNumber - b.sprintNumber);

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <FaProjectDiagram className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Create New Phase</h1>
              <p className="text-indigo-100">Add a new phase to: <strong>{project.title}</strong></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg flex items-center justify-center transition-all duration-200"
            disabled={isLoading}
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                  <FaExclamationTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </div>
            )}

            {/* Phase Details Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-800/20 p-6 rounded-lg border border-blue-100 dark:border-blue-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center">
                  <FaProjectDiagram className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Phase Information</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="phaseName" className="block text-sm font-medium text-card-foreground mb-2">
                    Phase Name *
                  </label>
                  <input
                    type="text"
                    id="phaseName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:placeholder-gray-400 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200"
                    placeholder="Enter a descriptive phase name..."
                    required
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label htmlFor="phaseDescription" className="block text-sm font-medium text-card-foreground mb-2">
                    Description
                  </label>
                  <textarea
                    id="phaseDescription"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:placeholder-gray-400 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200"
                    placeholder="Describe the objectives and scope of this phase..."
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Sprint Selection Section */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-800/20 p-6 rounded-lg border border-green-100 dark:border-green-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-green-600 text-white rounded-lg flex items-center justify-center">
                  <FaCalendarAlt className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Sprint Assignment</h2>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Select sprints for this phase. The system will automatically select consecutive sprints to ensure no gaps.
              </p>

              <div className="space-y-3 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900">
                {availableSprints.map((sprint) => {
                  const isAvailable = isSprintAvailableForSelection(sprint);
                  const isSelected = selectedSprintIds.includes(sprint.id);

                  return (
                    <div
                      key={sprint.id}
                      className={`p-3 rounded-lg border transition-all duration-200 ${
                        isSelected
                          ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/30'
                          : isAvailable
                          ? 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 hover:bg-green-50 dark:hover:bg-green-900/30'
                          : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900'
                      }`}
                    >
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`sprint-${sprint.id}`}
                          checked={isSelected}
                          onChange={(e) => handleSprintSelection(sprint.id, e.target.checked)}
                          disabled={!isAvailable || isLoading}
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded disabled:opacity-50"
                        />
                        <label
                          htmlFor={`sprint-${sprint.id}`}
                          className={`ml-3 flex-1 cursor-pointer ${isAvailable ? 'text-foreground' : 'text-muted-foreground'}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">Sprint {sprint.sprintNumber}</span>
                              {!isAvailable && <span className="text-red-500 text-sm ml-2">(Past sprint)</span>}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(sprint.startDate).toLocaleDateString('en-GB')} - {new Date(sprint.endDate).toLocaleDateString('en-GB')}
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                <div className="flex items-start gap-2 text-blue-700 dark:text-blue-300">
                  <FaInfoCircle className="w-4 h-4 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium mb-1">Smart Sprint Selection:</p>
                    <ul className="text-xs space-y-1 text-blue-600 dark:text-blue-400">
                      <li>• System automatically selects consecutive sprints</li>
                      <li>• Sprint 0 is reserved for the Project Kickoff phase</li>
                      <li>• Past sprints cannot be selected</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Consultant Allocation Section */}
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/30 dark:to-yellow-800/20 p-6 rounded-lg border border-orange-100 dark:border-orange-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-orange-600 text-white rounded-lg flex items-center justify-center">
                  <FaUsers className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Consultant Hour Allocations</h2>
                <span className="text-xs text-gray-600 dark:text-gray-400">(Optional)</span>
              </div>

              {/* Phase Hour Limits Information */}
              {selectedSprintIds.length > 0 && (
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <FaCalculator className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">Phase Capacity Guidelines</h3>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-center">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-100 dark:border-blue-800">
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{phaseLimits.totalWeeks}</div>
                      <div className="text-xs text-blue-700 dark:text-blue-300">Total Weeks</div>
                      <div className="text-xs text-muted-foreground">({phaseLimits.sprintCount} sprints)</div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-yellow-100 dark:border-yellow-800">
                      <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{phaseLimits.maxHoursPerConsultant}</div>
                      <div className="text-xs text-yellow-700 dark:text-yellow-300">Maximum Hours</div>
                      <div className="text-xs text-muted-foreground">per consultant</div>
                    </div>


                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-purple-100 dark:border-purple-800">
                      <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{getTotalHours()}</div>
                      <div className="text-xs text-purple-700 dark:text-purple-300">Currently Allocated</div>
                      <div className="text-xs text-muted-foreground">across all consultants</div>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-blue-600 dark:text-blue-400 space-y-1">
                    <p>• <strong>Maximum Hours:</strong> 40 hours/week per consultant (full-time capacity)</p>
                    <p>• <strong>Phase Duration:</strong> {phaseLimits.sprintCount} sprint{phaseLimits.sprintCount !== 1 ? 's' : ''} = {phaseLimits.totalWeeks} weeks</p>
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                Assign specific hour allocations to consultants for this phase. All allocations require Growth Team approval.
              </p>

              {/* Selected Team Members with Professional Hour Allocation */}
              {selectedConsultantIds.length > 0 && (
                <div className="mb-4">
                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-orange-100 dark:border-orange-800 p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-6 h-6 bg-orange-600 text-white rounded-lg flex items-center justify-center">
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

                        // Check if allocation exceeds phase capacity limits
                        const exceedsMaximum = phaseHours > phaseLimits.maxHoursPerConsultant;
                        const hasCapacityWarning = exceedsMaximum;

                        return (
                          <div key={consultantId} className={`relative p-4 rounded-lg border shadow-sm transition-all duration-200 ${
                            consultant?.role === 'PRODUCT_MANAGER'
                              ? 'bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-800/20 border-purple-200 dark:border-purple-700'
                              : 'bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-800/20 border-blue-200 dark:border-blue-700'
                          } ${
                            isOverAllocated ? 'ring-2 ring-red-200 dark:ring-red-700' :
                            exceedsMaximum ? 'ring-2 ring-orange-200 dark:ring-orange-700' : ''
                          }`}>

                            <div className="flex items-center justify-between relative z-10">
                              <div className="flex items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium mr-4 ${
                                  consultant?.role === 'PRODUCT_MANAGER' ? 'bg-purple-600' : 'bg-blue-600'
                                }`}>
                                  <FaUser className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-semibold text-foreground">{consultant?.name}</p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                      consultant?.role === 'PRODUCT_MANAGER'
                                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                    }`}>
                                      {consultant?.role === 'PRODUCT_MANAGER' ? 'Product Manager' : 'Team Member'}
                                    </span>
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-2">{consultant?.email}</p>

                                  {/* Project allocation summary */}
                                  <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                      <span className="text-muted-foreground">Project:</span>
                                      <span className="font-semibold text-blue-600 dark:text-blue-400 ml-1">{projectAllocated}h</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Available:</span>
                                      <span className={`font-semibold ml-1 ${availableHours > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {availableHours}h
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Phase Maximum:</span>
                                      <span className="font-semibold text-yellow-600 dark:text-yellow-400 ml-1">{phaseLimits.maxHoursPerConsultant}h</span>
                                    </div>
                                  </div>

                                  {/* Capacity warnings */}
                                  {hasCapacityWarning && (
                                    <div className="mt-2 text-xs">
                                      {exceedsMaximum && (
                                        <div className="text-red-600 font-medium">
                                          ⚠️ Exceeds phase maximum by {phaseHours - phaseLimits.maxHoursPerConsultant}h
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <div className="flex items-center gap-2 mb-1">
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.5"
                                      max={Math.min(availableHours, phaseLimits.maxHoursPerConsultant)}
                                      value={consultantHours[consultantId] ? consultantHours[consultantId] : ''}
                                      onChange={(e) => updateConsultantHours(consultantId, parseFloat(e.target.value) || 0)}
                                      className={`w-24 px-3 py-2 text-sm border-2 rounded-lg focus:ring-2 focus:ring-opacity-50 text-center transition-all duration-200 ${
                                        isOverAllocated
                                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50'
                                          : exceedsMaximum
                                          ? 'border-orange-300 focus:border-orange-500 focus:ring-orange-500 bg-orange-50'
                                          : consultant?.role === 'PRODUCT_MANAGER'
                                          ? 'border-purple-200 focus:border-purple-500 focus:ring-purple-500'
                                          : 'border-blue-200 focus:border-blue-500 focus:ring-blue-500'
                                      }`}
                                      placeholder="0"
                                      disabled={isLoading}
                                    />
                                    <span className={`text-sm font-medium ${
                                      consultant?.role === 'PRODUCT_MANAGER' ? 'text-purple-700' : 'text-blue-700'
                                    }`}>hours</span>
                                  </div>

                                  {/* Multiple warning types */}
                                  <div className="text-xs space-y-1">
                                    {isOverAllocated && (
                                      <div className="text-red-600 font-medium">
                                        ⚠️ Project: Over by {phaseHours - availableHours}h
                                      </div>
                                    )}
                                    {exceedsMaximum && (
                                      <div className="text-orange-600 font-medium">
                                        ⚠️ Phase: Exceeds maximum
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => removeConsultant(consultantId)}
                                  className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
                                  title="Remove from phase"
                                  disabled={isLoading}
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
                    className="block w-full px-3 py-2 pr-8 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-foreground shadow-sm focus:border-orange-500 focus:ring-orange-500 focus:ring-opacity-50 transition-all duration-200"
                    placeholder="Search and select consultants to allocate hours..."
                    disabled={isLoading}
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
                            className="w-full text-left px-3 py-3 hover:bg-orange-50 dark:hover:bg-orange-900/30 focus:bg-orange-50 dark:focus:bg-orange-900/30 focus:outline-none border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                            disabled={isLoading}
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

              {/* Consultant Workload Schedule */}
              {selectedConsultantIds.length > 0 && selectedSprintIds.length > 0 && (
                <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-lg border border-indigo-100 dark:border-indigo-800">
                  <ConsultantScheduleView
                    sprintIds={selectedSprintIds}
                    projectId={project.id}
                    selectedConsultantIds={selectedConsultantIds}
                  />
                </div>
              )}

              {/* Allocation Summary */}
              {selectedConsultantIds.length > 0 && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-green-800 dark:text-green-300 font-semibold mb-2">
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
                  <div className="mt-2 text-xs text-green-600 dark:text-green-400">
                    Note: All allocations will be pending Growth Team approval
                  </div>
                </div>
              )}
            </div>

            {/* Phase Summary */}
            {summary && (
              <div className={`p-6 rounded-lg border ${
                summary.isConsecutive
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-800/20 border-green-200 dark:border-green-700'
                  : 'bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-800/20 border-red-200 dark:border-red-700'
              }`}>
                <div className="flex items-center gap-2 mb-4">
                  {summary.isConsecutive ? (
                    <FaCheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <FaExclamationTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  )}
                  <h3 className={`font-semibold ${summary.isConsecutive ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                    Phase Summary
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="text-2xl font-bold text-card-foreground">{summary.count}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Sprints Selected</div>
                  </div>
                  <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="text-sm font-medium text-card-foreground">{summary.startDate.toLocaleDateString('en-GB')}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Start Date</div>
                  </div>
                  <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="text-sm font-medium text-card-foreground">{summary.endDate.toLocaleDateString('en-GB')}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">End Date</div>
                  </div>
                </div>

                {!summary.isConsecutive && (
                  <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                    <p className="text-sm text-red-700 dark:text-red-300">
                      ⚠️ Selected sprints are not consecutive. Please ensure there are no gaps between selected sprints.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-sm font-medium text-card-foreground bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !summary?.isConsecutive || selectedSprintIds.length === 0}
                className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 border border-transparent rounded-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                )}
                <FaSave className="mr-2" />
                Create Phase
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}