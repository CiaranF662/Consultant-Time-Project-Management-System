'use client';

import { useState, useEffect, useRef } from 'react';
import { FaTimes, FaSave, FaLayerGroup, FaCalendarAlt, FaClock, FaInfoCircle, FaUser, FaUsers, FaBriefcase, FaSearch } from 'react-icons/fa';
import axios from 'axios';

interface Sprint {
  id: string;
  sprintNumber: number;
  startDate: Date | string;
  endDate: Date | string;
}

interface User {
  id: string;
  name: string | null;
  email: string | null;
  allocatedHours?: number;
  role?: string;
}

interface Project {
  id: string;
  title: string;
  sprints: Sprint[];
}

interface PhaseCreationModalProps {
  project: Project;
  existingPhases?: Array<{
    id: string;
    name: string;
    sprints: Sprint[];
  }>;
  onClose: () => void;
  onPhaseCreated: () => void;
}

export default function PhaseCreationModal({ project, onClose, onPhaseCreated }: PhaseCreationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const consultantDropdownRef = useRef<HTMLDivElement>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSprintIds, setSelectedSprintIds] = useState<string[]>([]);
  const [selectedConsultantIds, setSelectedConsultantIds] = useState<string[]>([]);
  const [consultantHours, setConsultantHours] = useState<Record<string, number>>({});
  const [consultants, setConsultants] = useState<User[]>([]);
  const [allocatedToPhases, setAllocatedToPhases] = useState<Record<string, number>>({});
  
  // UI state
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consultantSearchQuery, setConsultantSearchQuery] = useState('');
  const [showConsultantDropdown, setShowConsultantDropdown] = useState(false);

  // Fetch project team members and their used hours when modal opens
  useEffect(() => {
    const fetchProjectTeamData = async () => {
      try {
        // Fetch team members with their project allocations
        const { data: teamData } = await axios.get(`/api/projects/${project.id}/consultants`);
        const teamMembers = teamData.map((member: any) => ({
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          allocatedHours: member.allocatedHours || 0,
          role: member.role
        }));
        setConsultants(teamMembers);

        // Fetch used hours for each consultant from existing phase allocations
        const { data: projectData } = await axios.get(`/api/projects/${project.id}`);
        const allocatedToPhasesMap: Record<string, number> = {};

        if (projectData.phases) {
          projectData.phases.forEach((phase: any) => {
            if (phase.allocations) {
              phase.allocations.forEach((allocation: any) => {
                if (!allocatedToPhasesMap[allocation.consultantId]) {
                  allocatedToPhasesMap[allocation.consultantId] = 0;
                }
                allocatedToPhasesMap[allocation.consultantId] += allocation.totalHours || 0;
              });
            }
          });
        }

        setAllocatedToPhases(allocatedToPhasesMap);
      } catch (err) {
        setError('Failed to load project team data.');
      }
    };
    fetchProjectTeamData();
  }, [project.id]);

  // Reset form when modal opens/closes
  useEffect(() => {
    setName('');
    setDescription('');
    setSelectedSprintIds([]);
    setSelectedConsultantIds([]);
    setConsultantHours({});
    setConsultantSearchQuery('');
    setShowConsultantDropdown(false);
    setError(null);
    setIsSubmitting(false);
  }, [project]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current === event.target) {
        onClose();
        return;
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

  // Handle ESC key
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

  // Check if Sprint 0 is available for selection (only for Project Kickoff phase)
  const isSprintAvailableForSelection = (sprint: Sprint): boolean => {
    const today = new Date();
    const sprintEndDate = new Date(sprint.endDate);

    // Sprint 0 can NEVER be selected when creating new phases - it's reserved for Project Kickoff only
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
      .filter(s => sprintIds.includes(s.id))
      .sort((a, b) => a.sprintNumber - b.sprintNumber);

    for (let i = 1; i < selectedSprints.length; i++) {
      if (selectedSprints[i].sprintNumber !== selectedSprints[i-1].sprintNumber + 1) {
        return false;
      }
    }
    return true;
  };

  const handleSprintToggle = (sprintId: string) => {
    setSelectedSprintIds(prev => {
      let newSelection;
      
      if (prev.includes(sprintId)) {
        // Removing a sprint
        newSelection = prev.filter(id => id !== sprintId);
      } else {
        // Adding a sprint
        newSelection = [...prev, sprintId].sort((a, b) => {
          const sprintA = project.sprints.find(s => s.id === a);
          const sprintB = project.sprints.find(s => s.id === b);
          return (sprintA?.sprintNumber || 0) - (sprintB?.sprintNumber || 0);
        });
      }
      
      // Check if the new selection is consecutive
      if (!validateConsecutiveSprints(newSelection)) {
        // If not consecutive, don't update selection and show error
        setError('Selected sprints must be consecutive within a phase');
        return prev;
      } else {
        // Clear any previous error if it was about consecutive sprints
        if (error === 'Selected sprints must be consecutive within a phase') {
          setError(null);
        }
        return newSelection;
      }
    });
  };

  // Consultant management functions
  const getFilteredConsultants = () => {
    if (!consultantSearchQuery.trim()) return consultants;
    
    return consultants.filter(consultant => {
      const searchLower = consultantSearchQuery.toLowerCase();
      const nameMatch = consultant.name?.toLowerCase().includes(searchLower);
      const emailMatch = consultant.email?.toLowerCase().includes(searchLower);
      return nameMatch || emailMatch;
    });
  };

  const handleConsultantToggle = (consultantId: string) => {
    setSelectedConsultantIds(prev => {
      const newSelected = prev.includes(consultantId) 
        ? prev.filter(id => id !== consultantId)
        : [...prev, consultantId];
      
      // Initialize hours for new consultant or clean up removed consultant
      if (!prev.includes(consultantId)) {
        setConsultantHours(prevHours => ({ ...prevHours, [consultantId]: 0 }));
      } else {
        setConsultantHours(prevHours => {
          const { [consultantId]: removed, ...rest } = prevHours;
          return rest;
        });
      }
      
      return newSelected;
    });
  };

  const removeConsultant = (consultantId: string) => {
    setSelectedConsultantIds(prev => prev.filter(id => id !== consultantId));
    setConsultantHours(prevHours => {
      const { [consultantId]: removed, ...rest } = prevHours;
      return rest;
    });
  };

  const updateConsultantHours = (consultantId: string, hours: number) => {
    setConsultantHours(prev => ({
      ...prev,
      [consultantId]: Math.max(0, hours) // Ensure non-negative hours
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!name.trim()) {
      setError('Phase name is required');
      return;
    }
    
    if (selectedSprintIds.length === 0) {
      setError('At least one sprint must be selected');
      return;
    }

    setIsSubmitting(true);
    try {
      // Calculate startDate and endDate from selected sprints
      const selectedSprints = project.sprints
        .filter(s => selectedSprintIds.includes(s.id))
        .sort((a, b) => a.sprintNumber - b.sprintNumber);
      
      if (selectedSprints.length === 0) {
        setError('At least one sprint must be selected');
        setIsSubmitting(false);
        return;
      }
      
      const startDate = new Date(selectedSprints[0].startDate);
      const endDate = new Date(selectedSprints[selectedSprints.length - 1].endDate);
      
      await axios.post(`/api/projects/${project.id}/phases`, {
        name: name.trim(),
        description: description.trim() || null,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        sprintIds: selectedSprintIds,
        consultantAllocations: selectedConsultantIds.map(consultantId => ({
          consultantId,
          hours: consultantHours[consultantId] || 0
        }))
      });
      
      onPhaseCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create phase');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate phase dates based on selected sprints
  const getPhasePreview = () => {
    if (selectedSprintIds.length === 0) return null;
    
    const selectedSprints = project.sprints
      .filter(s => selectedSprintIds.includes(s.id))
      .sort((a, b) => a.sprintNumber - b.sprintNumber);
    
    if (selectedSprints.length === 0) return null;
    
    const startDate = new Date(selectedSprints[0].startDate);
    const endDate = new Date(selectedSprints[selectedSprints.length - 1].endDate);
    
    return {
      startDate: startDate.toLocaleDateString(),
      endDate: endDate.toLocaleDateString(),
      sprintRange: `Sprint ${selectedSprints[0].sprintNumber} - Sprint ${selectedSprints[selectedSprints.length - 1].sprintNumber}`
    };
  };

  const phasePreview = getPhasePreview();

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <FaLayerGroup className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Create New Phase</h1>
              <p className="text-purple-100">Define project phase with sprint allocation and team assignment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg flex items-center justify-center transition-all duration-200"
            disabled={isSubmitting}
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            
            {/* Basic Phase Information */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-lg border border-purple-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-purple-600 text-white rounded-lg flex items-center justify-center">
                  <FaLayerGroup className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-gray-800">Phase Details</h2>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="phaseName" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <FaLayerGroup className="w-3 h-3 text-purple-600" />
                    Phase Name *
                  </label>
                  <input
                    type="text"
                    id="phaseName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full px-3 py-2 rounded-lg border-2 border-gray-200 shadow-sm focus:border-purple-500 focus:ring-purple-500 focus:ring-opacity-50 transition-all duration-200"
                    placeholder="e.g., Discovery Phase, Development Phase"
                    disabled={isSubmitting}
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="phaseDescription" className="block text-sm font-semibold text-gray-700 mb-2">
                    Phase Description
                  </label>
                  <textarea
                    id="phaseDescription"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="block w-full px-3 py-2 rounded-lg border-2 border-gray-200 shadow-sm focus:border-purple-500 focus:ring-purple-500 focus:ring-opacity-50 transition-all duration-200 resize-none"
                    placeholder="Describe the objectives and scope of this phase..."
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            {/* Sprint Selection */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-lg border border-blue-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center">
                  <FaCalendarAlt className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-gray-800">Sprint Assignment</h2>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <FaCalendarAlt className="w-3 h-3 text-blue-600" />
                  Select Sprints *
                </label>
                <p className="text-xs text-gray-600 mb-3">
                  Select consecutive sprints for this phase. Phase dates will be automatically calculated.
                </p>
                
                {project.sprints.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-4">
                    {project.sprints.map((sprint) => {
                      const isAvailable = isSprintAvailableForSelection(sprint);
                      const isSelected = selectedSprintIds.includes(sprint.id);
                      const isPastSprint = new Date(sprint.endDate) < new Date();

                      return (
                        <label
                          key={sprint.id}
                          className={`flex items-center p-3 rounded-lg transition-all duration-200 ${
                            !isAvailable
                              ? 'cursor-not-allowed bg-gray-100 border border-gray-200 opacity-60'
                              : 'cursor-pointer hover:bg-gray-50'
                          } ${
                            isSelected ? 'bg-blue-50 border-2 border-blue-300' : 'border border-gray-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => isAvailable && handleSprintToggle(sprint.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            disabled={isSubmitting || !isAvailable}
                          />
                          <div className="ml-3 flex-1">
                            <div className={`text-sm font-semibold ${!isAvailable ? 'text-gray-500' : 'text-gray-800'}`}>
                              Sprint {sprint.sprintNumber}
                              {sprint.sprintNumber === 0 && (
                                <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                                  Project Kickoff
                                </span>
                              )}
                            </div>
                            <div className={`text-xs ${!isAvailable ? 'text-gray-400' : 'text-gray-600'}`}>
                              {new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}
                            </div>
                            {!isAvailable && (
                              <div className="text-xs text-red-500 mt-1">
                                {isPastSprint && 'Phase has ended'}
                                {sprint.sprintNumber === 0 && 'Sprint 0 reserved for Project Kickoff only'}
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FaCalendarAlt className="mx-auto mb-2 h-8 w-8" />
                    <p>No sprints available for this project</p>
                  </div>
                )}
              </div>

              {/* Phase Preview */}
              {phasePreview && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 text-sm text-blue-700 mb-2">
                    <FaInfoCircle className="w-4 h-4" />
                    <span className="font-semibold">Phase Preview</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="font-medium text-blue-800">Duration:</span>
                      <p className="text-blue-700">{phasePreview.startDate} - {phasePreview.endDate}</p>
                    </div>
                    <div>
                      <span className="font-medium text-blue-800">Sprints:</span>
                      <p className="text-blue-700">{phasePreview.sprintRange}</p>
                    </div>
                    <div>
                      <span className="font-medium text-blue-800">Sprint Count:</span>
                      <p className="text-blue-700">{selectedSprintIds.length} sprint(s)</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Team Assignment */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-green-600 text-white rounded-lg flex items-center justify-center">
                  <FaUsers className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-gray-800">Team Assignment</h2>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <FaUsers className="w-3 h-3 text-green-600" />
                  Phase Team Members
                </label>
                <p className="text-xs text-gray-600 mb-3">
                  Select consultants who will work on this phase and optionally set their initial hour allocation.
                </p>
                
                {/* Selected Team Members with Professional Hour Allocation */}
                {selectedConsultantIds.length > 0 && (
                  <div className="mb-4">
                    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-100 p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-6 h-6 bg-orange-600 text-white rounded-lg flex items-center justify-center">
                          <FaClock className="w-3 h-3" />
                        </div>
                        <div className="text-sm font-semibold text-gray-800">Phase Hour Allocation</div>
                      </div>

                      <div className="space-y-3">
                        {selectedConsultantIds.map((consultantId) => {
                          const consultant = consultants.find(c => c.id === consultantId);
                          const allocatedHours = consultant?.allocatedHours || 0;
                          const currentAllocatedToPhases = allocatedToPhases[consultantId] || 0;
                          const availableHours = allocatedHours - currentAllocatedToPhases;
                          const phaseHours = consultantHours[consultantId] || 0;
                          const isOverAllocated = phaseHours > availableHours;

                          return (
                            <div key={consultantId} className={`p-4 rounded-lg border shadow-sm transition-all duration-200 ${
                              consultant?.role === 'PRODUCT_MANAGER'
                                ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200'
                                : 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200'
                            } ${isOverAllocated ? 'ring-2 ring-red-200' : ''}`}>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium mr-4 ${
                                    consultant?.role === 'PRODUCT_MANAGER' ? 'bg-purple-600' : 'bg-blue-600'
                                  }`}>
                                    <FaUser className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="font-semibold text-gray-900">{consultant?.name}</p>
                                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                        consultant?.role === 'PRODUCT_MANAGER'
                                          ? 'bg-purple-100 text-purple-800'
                                          : 'bg-blue-100 text-blue-800'
                                      }`}>
                                        {consultant?.role === 'PRODUCT_MANAGER' ? 'Product Manager' : 'Team Member'}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-500 mb-2">{consultant?.email}</p>

                                    {/* Project allocation summary */}
                                    <div className="flex items-center gap-4">
                                      <div className="text-xs">
                                        <span className="text-gray-500">Project:</span>
                                        <span className="font-semibold text-blue-600 ml-1">{allocatedHours}h</span>
                                      </div>
                                      <div className="text-xs">
                                        <span className="text-gray-500">Allocated:</span>
                                        <span className="font-semibold text-gray-700 ml-1">{currentAllocatedToPhases}h</span>
                                      </div>
                                      <div className="text-xs">
                                        <span className="text-gray-500">Available:</span>
                                        <span className={`font-semibold ml-1 ${availableHours > 0 ? 'text-green-600' : 'text-red-600'}`}>
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
                                        className={`w-20 px-3 py-2 text-sm border-2 rounded-lg focus:ring-2 focus:ring-opacity-50 text-center transition-all duration-200 ${
                                          isOverAllocated
                                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50'
                                            : consultant?.role === 'PRODUCT_MANAGER'
                                            ? 'border-purple-200 focus:border-purple-500 focus:ring-purple-500'
                                            : 'border-blue-200 focus:border-blue-500 focus:ring-blue-500'
                                        }`}
                                        placeholder="0"
                                      />
                                      <span className={`text-sm font-medium ${
                                        consultant?.role === 'PRODUCT_MANAGER' ? 'text-purple-700' : 'text-blue-700'
                                      }`}>hours</span>
                                    </div>

                                    {isOverAllocated && (
                                      <div className="text-xs text-red-600">
                                        ⚠️ Over by {phaseHours - availableHours}h
                                      </div>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => removeConsultant(consultantId)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
                                    title="Remove from phase"
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
                      className="block w-full px-3 py-2 pr-8 rounded-lg border-2 border-gray-200 shadow-sm focus:border-green-500 focus:ring-green-500 focus:ring-opacity-50 transition-all duration-200"
                      placeholder="Search and select consultants..."
                    />
                    <FaSearch className="absolute right-3 top-3 h-3 w-3 text-gray-400" />
                  </div>
                  
                  {showConsultantDropdown && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {getFilteredConsultants().filter(c => !selectedConsultantIds.includes(c.id)).length === 0 ? (
                        <div className="px-3 py-2 text-gray-500 text-sm">No available consultants found</div>
                      ) : (
                        getFilteredConsultants().filter(c => !selectedConsultantIds.includes(c.id)).map((consultant) => {
                          const allocatedHours = consultant.allocatedHours || 0;
                          const currentAllocatedToPhases = allocatedToPhases[consultant.id] || 0;
                          const availableHours = allocatedHours - currentAllocatedToPhases;

                          return (
                            <button
                              key={consultant.id}
                              type="button"
                              onClick={() => {
                                handleConsultantToggle(consultant.id);
                                setConsultantSearchQuery('');
                                setShowConsultantDropdown(false);
                              }}
                              className="w-full text-left px-3 py-3 hover:bg-green-50 focus:bg-green-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <div className="font-medium text-gray-800 text-sm">{consultant.name}</div>
                                    {consultant.role === 'PRODUCT_MANAGER' && (
                                      <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded-full font-medium">
                                        PM
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-600">{consultant.email}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs text-gray-500">Available</div>
                                  <div className={`text-sm font-semibold ${availableHours > 0 ? 'text-green-600' : 'text-gray-400'}`}>
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

                {/* Team Summary */}
                {selectedConsultantIds.length > 0 && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 text-sm text-green-800 font-semibold mb-2">
                      <FaUsers className="w-3 h-3" />
                      Team Summary
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-green-700">
                      <div>
                        <span className="font-medium">{selectedConsultantIds.length}</span> consultant(s) assigned
                      </div>
                      <div>
                        <span className="font-medium">
                          {Object.values(consultantHours).reduce((total, hours) => total + (hours || 0), 0)}
                        </span> total hours allocated
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-500 text-sm">{error}</p>
              </div>
            )}
          </form>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition-all duration-200"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="py-2 px-6 border-2 border-transparent rounded-lg text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl inline-flex items-center gap-2"
          >
            <FaSave className="w-4 h-4" />
            {isSubmitting ? 'Creating...' : 'Create Phase'}
          </button>
        </div>
      </div>
    </div>
  );
}